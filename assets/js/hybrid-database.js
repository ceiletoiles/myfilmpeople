// Hybrid Database System - localStorage + Firestore
// This handles data storage that works offline-first with optional cloud sync

import { auth, db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class HybridPeopleDatabase {
  constructor() {
    this.people = [];
    this.nextId = 1;
    this.isCloudSyncEnabled = false;
    this.unsubscribeFirestore = null;
    
    // Always load from localStorage first
    this.loadFromLocalStorage();
    
    // Set up auth state listener for automatic cloud sync
    if (window.authManager) {
      window.authManager.onAuthStateChange((user) => {
        if (user) {
          this.enableCloudSync(user);
        } else {
          this.disableCloudSync();
        }
      });
    }
  }
  
  // === LOCAL STORAGE METHODS ===
  
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      if (data) {
        this.people = JSON.parse(data);
        this.nextId = this.getNextId();
        console.log('📱 Loaded', this.people.length, 'people from localStorage');
      } else {
        this.people = [];
        this.nextId = 1;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.people = [];
      this.nextId = 1;
    }
  }
  
  saveToLocalStorage() {
    try {
      localStorage.setItem('myfilmpeople_data', JSON.stringify(this.people));
      console.log('💾 Saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // === CLOUD SYNC METHODS ===
  
  async enableCloudSync(user) {
    this.isCloudSyncEnabled = true;
    console.log('☁️ Enabling cloud sync for user:', user.email);
    
    try {
      // Check if user has existing data in Firestore
      const hasCloudData = await this.hasExistingCloudData(user.uid);
      const hasLocalData = this.people.length > 0;
      
      if (hasLocalData && !hasCloudData) {
        // Migrate localStorage data to Firestore
        await this.migrateLocalDataToCloud(user.uid);
      } else if (hasCloudData && !hasLocalData) {
        // Load cloud data to local
        await this.loadFromCloud(user.uid);
      } else if (hasCloudData && hasLocalData) {
        // Both exist - show merge options to user
        await this.handleDataConflict(user.uid);
      } else {
        // Neither has data - just start fresh with cloud sync
        await this.setupCloudListener(user.uid);
      }
      
    } catch (error) {
      console.error('Error enabling cloud sync:', error);
      // Fall back to localStorage only
      this.isCloudSyncEnabled = false;
    }
  }
  
  disableCloudSync() {
    this.isCloudSyncEnabled = false;
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    console.log('📱 Disabled cloud sync, using localStorage only');
  }
  
  async hasExistingCloudData(userId) {
    try {
      const peopleRef = collection(db, 'users', userId, 'people');
      const snapshot = await getDocs(peopleRef);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking cloud data:', error);
      return false;
    }
  }
  
  async migrateLocalDataToCloud(userId) {
    console.log('🔄 Migrating', this.people.length, 'people from localStorage to cloud...');
    
    try {
      // Show migration progress to user
      this.showMigrationProgress(0, this.people.length);
      
      for (let i = 0; i < this.people.length; i++) {
        const person = this.people[i];
        await this.savePersonToCloud(userId, person);
        this.showMigrationProgress(i + 1, this.people.length);
      }
      
      // Set up real-time listener
      await this.setupCloudListener(userId);
      
      console.log('✅ Migration completed successfully!');
      this.showMigrationComplete();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.showMigrationError(error);
    }
  }
  
  async loadFromCloud(userId) {
    try {
      console.log('☁️ Loading data from cloud...');
      const peopleRef = collection(db, 'users', userId, 'people');
      const snapshot = await getDocs(peopleRef);
      
      this.people = [];
      snapshot.forEach((doc) => {
        this.people.push({ id: doc.id, ...doc.data() });
      });
      
      this.nextId = this.getNextId();
      this.saveToLocalStorage(); // Keep local backup
      
      // Set up real-time listener
      await this.setupCloudListener(userId);
      
      console.log('✅ Loaded', this.people.length, 'people from cloud');
      
    } catch (error) {
      console.error('Error loading from cloud:', error);
      throw error;
    }
  }
  
  async setupCloudListener(userId) {
    console.log('🚫 Real-time listener disabled - using PeopleDatabase sync instead');
    // DISABLED: This was causing conflicts with PeopleDatabase
    // The PeopleDatabase handles all local operations and cloud sync
    // Real-time listeners were overwriting local IDs with Firestore IDs
    // causing deletion and update operations to target wrong records
    return;
    
    /* ORIGINAL CODE DISABLED:
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
    }
    
    const peopleRef = collection(db, 'users', userId, 'people');
    
    this.unsubscribeFirestore = onSnapshot(peopleRef, (snapshot) => {
      console.log('☁️ Real-time update received from cloud');
      
      // Don't completely replace data - instead, merge changes intelligently
      const cloudData = [];
      snapshot.forEach((doc) => {
        cloudData.push({ 
          id: doc.id, 
          firestoreId: doc.id, // Make sure we track Firestore ID
          ...doc.data() 
        });
      });
      
      // Check if this is just an echo of our own local changes
      if (this.isLocalChangeEcho(cloudData)) {
        console.log('🔄 Ignoring echo of local changes');
        return;
      }
      
      console.log('📊 Cloud data:', cloudData.length, 'people');
      console.log('📊 Local data:', this.people.length, 'people');
      
      // Only update if there's a meaningful difference
      if (!this.areDataSetsSame(this.people, cloudData)) {
        console.log('🔄 Applying cloud changes to local data');
        this.people = cloudData;
        this.nextId = this.getNextId();
        this.saveToLocalStorage(); // Keep local backup
        
        // Notify UI to refresh
        if (window.uiManager) {
          window.uiManager.people = this.people;
          window.uiManager.renderPeople();
        }
      } else {
        console.log('✅ Cloud and local data are in sync');
      }
    });
    */
  }
  
  // Helper method to detect if cloud changes are echoes of local changes
  isLocalChangeEcho(cloudData) {
    // If we recently made a local change, this might be an echo
    // Simple heuristic: if cloud data count matches local data count
    // and we made a change in the last 2 seconds, it's likely an echo
    const now = Date.now();
    const recentChangeThreshold = 2000; // 2 seconds
    
    if (this.lastLocalChangeTime && (now - this.lastLocalChangeTime) < recentChangeThreshold) {
      // If counts match, it's likely an echo
      if (cloudData.length === this.people.length) {
        return true;
      }
    }
    
    return false;
  }
  
  // Helper method to compare if two data sets are essentially the same
  areDataSetsSame(localData, cloudData) {
    if (localData.length !== cloudData.length) {
      return false;
    }
    
    // Create maps for efficient comparison
    const localMap = new Map(localData.map(p => [p.name + p.role, p]));
    const cloudMap = new Map(cloudData.map(p => [p.name + p.role, p]));
    
    // Check if all cloud items exist in local data
    for (const [key, cloudPerson] of cloudMap) {
      const localPerson = localMap.get(key);
      if (!localPerson) {
        return false; // Cloud has something local doesn't
      }
    }
    
    // Check if all local items exist in cloud data
    for (const [key, localPerson] of localMap) {
      const cloudPerson = cloudMap.get(key);
      if (!cloudPerson) {
        return false; // Local has something cloud doesn't
      }
    }
    
    return true; // All items match
  }

  async handleDataConflict(userId) {
    // For now, prioritize cloud data and backup local data
    const localBackup = [...this.people];
    
    try {
      await this.loadFromCloud(userId);
      
      // Save local backup with timestamp
      const backupKey = `myfilmpeople_backup_${new Date().toISOString()}`;
      localStorage.setItem(backupKey, JSON.stringify(localBackup));
      
      console.log('⚠️ Data conflict resolved: cloud data loaded, local data backed up');
      
    } catch (error) {
      console.error('Error resolving data conflict:', error);
      // Keep local data if cloud load fails
      this.people = localBackup;
    }
  }
  
  // === CRUD METHODS (work with both local and cloud) ===
  
  async addPerson(personData) {
    // Check for duplicates
    const existingPerson = this.people.find(p => 
      p.name.toLowerCase() === personData.name.toLowerCase() && 
      p.role === personData.role
    );

    if (existingPerson) {
      throw new Error(`${personData.name} already exists as a ${personData.role}.`);
    }

    const person = {
      id: this.nextId++,
      name: personData.name,
      role: personData.role,
      letterboxdUrl: personData.letterboxdUrl || '',
      profilePicture: personData.profilePicture || '',
      notes: personData.notes || '',
      tmdbId: personData.tmdbId || null,
      dateAdded: new Date().toISOString()
    };

    // Add to local array
    this.people.push(person);
    this.saveToLocalStorage();

    // Sync to cloud if enabled
    if (this.isCloudSyncEnabled && window.authManager?.getCurrentUser()) {
      try {
        await this.savePersonToCloud(window.authManager.getCurrentUser().uid, person);
      } catch (error) {
        console.error('Failed to sync to cloud:', error);
        // Continue with local-only operation
      }
    }

    return person;
  }
  
  async updatePerson(id, updates) {
    const index = this.people.findIndex(p => p.id === id);
    if (index === -1) return null;

    // Update local data
    this.people[index] = { ...this.people[index], ...updates };
    this.saveToLocalStorage();

    // Sync to cloud if enabled
    if (this.isCloudSyncEnabled && window.authManager?.getCurrentUser()) {
      try {
        await this.updatePersonInCloud(window.authManager.getCurrentUser().uid, this.people[index]);
      } catch (error) {
        console.error('Failed to sync update to cloud:', error);
      }
    }

    return this.people[index];
  }
  
  async deletePerson(id) {
    const personIndex = this.people.findIndex(p => p.id === id);
    if (personIndex === -1) return;

    const person = this.people[personIndex];

    // Remove from local array
    this.people = this.people.filter(p => p.id !== id);
    this.saveToLocalStorage();

    // Remove from cloud if enabled
    if (this.isCloudSyncEnabled && window.authManager?.getCurrentUser()) {
      try {
        await this.deletePersonFromCloud(window.authManager.getCurrentUser().uid, id);
      } catch (error) {
        console.error('Failed to sync deletion to cloud:', error);
      }
    }
  }
  
  // === CLOUD OPERATION HELPERS ===
  
  async savePersonToCloud(userId, person) {
    const personRef = doc(db, 'users', userId, 'people', person.id.toString());
    await setDoc(personRef, {
      ...person,
      updatedAt: new Date().toISOString()
    });
  }
  
  async updatePersonInCloud(userId, person) {
    const personRef = doc(db, 'users', userId, 'people', person.id.toString());
    await updateDoc(personRef, {
      ...person,
      updatedAt: new Date().toISOString()
    });
  }
  
  async deletePersonFromCloud(userId, personId) {
    const personRef = doc(db, 'users', userId, 'people', personId.toString());
    await deleteDoc(personRef);
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
    return this.people;
  }
  
  clearLocalData() {
    this.people = [];
    this.nextId = 1;
    localStorage.removeItem('myfilmpeople_data');
  }
  
  // === UI FEEDBACK METHODS ===
  
  showMigrationProgress(current, total) {
    // This will be called during migration to show progress
    const percentage = Math.round((current / total) * 100);
    console.log(`🔄 Migration progress: ${current}/${total} (${percentage}%)`);
    
    // You can emit events here for UI updates
    window.dispatchEvent(new CustomEvent('migrationProgress', {
      detail: { current, total, percentage }
    }));
  }
  
  showMigrationComplete() {
    console.log('✅ Data migration completed!');
    window.dispatchEvent(new CustomEvent('migrationComplete'));
  }
  
  showMigrationError(error) {
    console.error('❌ Migration failed:', error);
    window.dispatchEvent(new CustomEvent('migrationError', { detail: error }));
  }
}

// Export for use in other files
export { HybridPeopleDatabase };
