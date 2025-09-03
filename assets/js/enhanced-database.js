// Enhanced Database Manager for MyFilmPeople
// Handles proper sync between localStorage and Firebase with transaction safety

class EnhancedPeopleDatabase {
  constructor() {
    this.people = [];
    this.nextId = 1;
    this.isCloudSyncEnabled = false;
    this.user = null;
    this.syncInProgress = false;
    this.operationQueue = [];
    this.deletedItems = new Map(); // Track recently deleted items
    this.lastSyncTime = 0;
    
    // Initialize from localStorage first
    this.loadFromLocalStorage();
    
    // Setup cleanup for deleted items (cleanup after 5 minutes)
    setInterval(() => this.cleanupDeletedItems(), 5 * 60 * 1000);
  }
  
  // === CORE DATA MANAGEMENT ===
  
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      const metadata = localStorage.getItem('myfilmpeople_metadata');
      
      if (data) {
        const parsedData = JSON.parse(data);
        // Validate and clean data
        this.people = parsedData.filter(person => 
          person && 
          person.name && 
          person.role && 
          !this.wasRecentlyDeleted(person)
        );
        
        this.nextId = this.getNextId();
        console.log('✅ Loaded', this.people.length, 'people from localStorage');
        
        // Load metadata
        if (metadata) {
          const meta = JSON.parse(metadata);
          this.lastSyncTime = meta.lastSync || 0;
        }
      } else {
        this.people = [];
        this.nextId = 1;
        console.log('📱 No local data found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      this.people = [];
      this.nextId = 1;
    }
  }
  
  saveToLocalStorage() {
    try {
      // Create backup before saving
      const existingData = localStorage.getItem('myfilmpeople_data');
      if (existingData) {
        localStorage.setItem('myfilmpeople_backup', existingData);
      }
      
      // Save main data
      localStorage.setItem('myfilmpeople_data', JSON.stringify(this.people));
      
      // Save metadata
      const metadata = {
        lastSync: this.lastSyncTime,
        lastSave: Date.now(),
        count: this.people.length,
        nextId: this.nextId
      };
      localStorage.setItem('myfilmpeople_metadata', JSON.stringify(metadata));
      
      console.log('💾 Saved', this.people.length, 'people to localStorage');
      return true;
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
      return false;
    }
  }
  
  // === CRUD OPERATIONS WITH TRANSACTION SAFETY ===
  
  async addPerson(personData) {
    return this.executeTransaction(async () => {
      // Check for duplicates
      const duplicate = this.people.find(p => 
        p.name.toLowerCase() === personData.name.toLowerCase() && 
        p.role === personData.role
      );
      
      if (duplicate) {
        throw new Error(`${personData.name} already exists as a ${personData.role}`);
      }
      
      const person = {
        id: this.nextId++,
        name: personData.name,
        role: personData.role,
        letterboxdUrl: personData.letterboxdUrl || '',
        profilePicture: personData.profilePicture || '',
        notes: personData.notes || '',
        tmdbId: personData.tmdbId || null,
        dateAdded: new Date().toISOString(),
        localId: this.nextId - 1, // Store original local ID
        lastModified: Date.now()
      };
      
      // Add to local array
      this.people.push(person);
      
      // Save locally first
      if (!this.saveToLocalStorage()) {
        // Rollback on save failure
        this.people.pop();
        throw new Error('Failed to save to local storage');
      }
      
      // Queue cloud sync if enabled
      if (this.isCloudSyncEnabled) {
        this.queueCloudOperation('add', person);
      }
      
      console.log('✅ Added person:', person.name, '(ID:', person.id, ')');
      return person;
    });
  }
  
  async updatePerson(id, updates) {
    return this.executeTransaction(async () => {
      const index = this.people.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Person not found');
      }
      
      const oldPerson = { ...this.people[index] };
      
      // Apply updates
      this.people[index] = { 
        ...this.people[index], 
        ...updates, 
        lastModified: Date.now() 
      };
      
      // Save locally first
      if (!this.saveToLocalStorage()) {
        // Rollback on save failure
        this.people[index] = oldPerson;
        throw new Error('Failed to save to local storage');
      }
      
      // Queue cloud sync if enabled
      if (this.isCloudSyncEnabled) {
        this.queueCloudOperation('update', this.people[index]);
      }
      
      console.log('✅ Updated person:', this.people[index].name);
      return this.people[index];
    });
  }
  
  async deletePerson(id) {
    return this.executeTransaction(async () => {
      const personIndex = this.people.findIndex(p => p.id === id);
      if (personIndex === -1) {
        throw new Error('Person not found');
      }
      
      const person = this.people[personIndex];
      console.log('🗑️ Deleting person:', person.name, '(ID:', person.id, ')');
      
      // Mark as recently deleted to prevent reappearing
      this.markAsDeleted(person);
      
      // Remove from array
      this.people.splice(personIndex, 1);
      
      // Save locally first
      if (!this.saveToLocalStorage()) {
        // Rollback on save failure
        this.people.splice(personIndex, 0, person);
        this.deletedItems.delete(this.getPersonKey(person));
        throw new Error('Failed to save to local storage');
      }
      
      // Queue cloud sync if enabled
      if (this.isCloudSyncEnabled) {
        this.queueCloudOperation('delete', person);
      }
      
      console.log('✅ Deleted person:', person.name);
      return person;
    });
  }
  
  // === TRANSACTION SAFETY ===
  
  async executeTransaction(operation) {
    if (this.syncInProgress) {
      console.log('⏳ Waiting for sync to complete...');
      await this.waitForSync();
    }
    
    try {
      this.syncInProgress = true;
      const result = await operation();
      return result;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
      this.processOperationQueue();
    }
  }
  
  async waitForSync() {
    return new Promise(resolve => {
      const checkSync = () => {
        if (!this.syncInProgress) {
          resolve();
        } else {
          setTimeout(checkSync, 100);
        }
      };
      checkSync();
    });
  }
  
  // === CLOUD SYNC OPERATIONS ===
  
  enableCloudSync(user) {
    this.user = user;
    this.isCloudSyncEnabled = true;
    console.log('☁️ Cloud sync enabled for:', user.email);
    
    // Process any queued operations
    this.processOperationQueue();
  }
  
  disableCloudSync() {
    this.user = null;
    this.isCloudSyncEnabled = false;
    this.operationQueue = [];
    console.log('📱 Cloud sync disabled');
  }
  
  queueCloudOperation(type, data) {
    if (!this.isCloudSyncEnabled) return;
    
    this.operationQueue.push({
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Process queue after a short delay to batch operations
    setTimeout(() => this.processOperationQueue(), 500);
  }
  
  async processOperationQueue() {
    if (!this.isCloudSyncEnabled || this.operationQueue.length === 0) return;
    
    console.log('⚡ Processing', this.operationQueue.length, 'cloud operations');
    
    const operations = [...this.operationQueue];
    this.operationQueue = [];
    
    for (const operation of operations) {
      try {
        await this.executeCloudOperation(operation);
      } catch (error) {
        console.error('❌ Cloud operation failed:', error);
        
        // Retry logic
        if (operation.retries < 3) {
          operation.retries++;
          this.operationQueue.push(operation);
        } else {
          console.error('❌ Cloud operation failed permanently:', operation);
        }
      }
    }
  }
  
  async executeCloudOperation(operation) {
    if (!window.firebaseAuth || !window.firebaseAuth.user) {
      throw new Error('No Firebase user available');
    }
    
    switch (operation.type) {
      case 'add':
        await window.firebaseAuth.savePersonToCloud(operation.data);
        break;
      case 'update':
        await window.firebaseAuth.savePersonToCloud(operation.data);
        break;
      case 'delete':
        await window.firebaseAuth.deletePersonFromCloudByTmdbId(operation.data);
        break;
      default:
        throw new Error('Unknown operation type: ' + operation.type);
    }
  }
  
  // === CLOUD DATA LOADING WITH PROPER MERGE ===
  
  async loadFromCloud() {
    if (!this.isCloudSyncEnabled || !window.firebaseAuth) {
      return false;
    }
    
    try {
      console.log('☁️ Loading data from cloud...');
      
      // Get cloud data through Firebase auth manager
      const cloudData = await window.firebaseAuth.getAllCloudPeople();
      
      if (!cloudData || cloudData.length === 0) {
        console.log('☁️ No cloud data found');
        return false;
      }
      
      // Merge with local data intelligently
      await this.mergeCloudData(cloudData);
      
      this.lastSyncTime = Date.now();
      this.saveToLocalStorage();
      
      console.log('✅ Cloud data loaded and merged');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load from cloud:', error);
      return false;
    }
  }
  
  async mergeCloudData(cloudData) {
    const localMap = new Map();
    const cloudMap = new Map();
    
    // Create maps for efficient comparison
    this.people.forEach(person => {
      const key = this.getPersonKey(person);
      localMap.set(key, person);
    });
    
    cloudData.forEach(person => {
      const key = this.getPersonKey(person);
      cloudMap.set(key, person);
    });
    
    const mergedPeople = [];
    const addedFromCloud = [];
    
    // Process cloud data
    for (const [key, cloudPerson] of cloudMap) {
      const localPerson = localMap.get(key);
      
      if (localPerson) {
        // Person exists in both - use most recent
        const useCloud = cloudPerson.lastModified > localPerson.lastModified;
        mergedPeople.push(useCloud ? cloudPerson : localPerson);
        localMap.delete(key); // Mark as processed
      } else if (!this.wasRecentlyDeleted(cloudPerson)) {
        // New from cloud and not recently deleted
        mergedPeople.push({
          ...cloudPerson,
          id: this.nextId++
        });
        addedFromCloud.push(cloudPerson.name);
      }
    }
    
    // Add remaining local items that aren't in cloud
    for (const [key, localPerson] of localMap) {
      mergedPeople.push(localPerson);
    }
    
    this.people = mergedPeople;
    
    if (addedFromCloud.length > 0) {
      console.log('📥 Added from cloud:', addedFromCloud.join(', '));
    }
  }
  
  // === DELETION TRACKING ===
  
  markAsDeleted(person) {
    const key = this.getPersonKey(person);
    this.deletedItems.set(key, {
      timestamp: Date.now(),
      person: { ...person }
    });
    
    // Save deleted items to localStorage
    const deletedArray = Array.from(this.deletedItems.entries());
    localStorage.setItem('myfilmpeople_deleted', JSON.stringify(deletedArray));
  }
  
  wasRecentlyDeleted(person) {
    const key = this.getPersonKey(person);
    const deleted = this.deletedItems.get(key);
    
    if (!deleted) return false;
    
    // Consider deleted if within last 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - deleted.timestamp) < fiveMinutes;
  }
  
  cleanupDeletedItems() {
    const fiveMinutes = 5 * 60 * 1000;
    const now = Date.now();
    
    for (const [key, deleted] of this.deletedItems) {
      if (now - deleted.timestamp > fiveMinutes) {
        this.deletedItems.delete(key);
      }
    }
    
    // Update localStorage
    const deletedArray = Array.from(this.deletedItems.entries());
    localStorage.setItem('myfilmpeople_deleted', JSON.stringify(deletedArray));
  }
  
  getPersonKey(person) {
    // Use TMDB ID if available, otherwise name + role
    return person.tmdbId ? `tmdb-${person.tmdbId}` : `${person.name.toLowerCase()}-${person.role}`;
  }
  
  // === UTILITY METHODS ===
  
  getNextId() {
    if (this.people.length === 0) return 1;
    return Math.max(...this.people.map(p => p.id || 0)) + 1;
  }
  
  getPeopleByRole(role) {
    return this.people.filter(p => p.role === role);
  }
  
  getAllPeople() {
    return [...this.people]; // Return copy to prevent external modification
  }
  
  getStats() {
    return {
      total: this.people.length,
      directors: this.getPeopleByRole('director').length,
      actors: this.getPeopleByRole('actor').length,
      others: this.people.filter(p => !['director', 'actor'].includes(p.role)).length,
      lastSync: this.lastSyncTime,
      cloudSyncEnabled: this.isCloudSyncEnabled,
      queuedOperations: this.operationQueue.length
    };
  }
  
  // === RECOVERY METHODS ===
  
  async recoverFromBackup() {
    try {
      const backup = localStorage.getItem('myfilmpeople_backup');
      if (backup) {
        const backupData = JSON.parse(backup);
        console.log('🔄 Recovering from backup:', backupData.length, 'people');
        
        this.people = backupData.filter(person => 
          person && person.name && person.role
        );
        this.nextId = this.getNextId();
        this.saveToLocalStorage();
        
        return true;
      }
    } catch (error) {
      console.error('❌ Recovery failed:', error);
    }
    return false;
  }
  
  exportData() {
    return {
      people: this.people,
      metadata: {
        exportDate: new Date().toISOString(),
        count: this.people.length,
        version: '2.0'
      }
    };
  }
  
  async importData(importedData) {
    if (!importedData || !importedData.people) {
      throw new Error('Invalid import data');
    }
    
    return this.executeTransaction(async () => {
      // Backup current data
      const currentBackup = this.exportData();
      localStorage.setItem('myfilmpeople_import_backup', JSON.stringify(currentBackup));
      
      // Import new data
      this.people = importedData.people.filter(person => 
        person && person.name && person.role
      );
      this.nextId = this.getNextId();
      
      if (!this.saveToLocalStorage()) {
        throw new Error('Failed to save imported data');
      }
      
      console.log('✅ Imported', this.people.length, 'people');
      return this.people.length;
    });
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedPeopleDatabase };
} else {
  window.EnhancedPeopleDatabase = EnhancedPeopleDatabase;
}
