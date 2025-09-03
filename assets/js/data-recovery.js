// Data Recovery System for MyFilmPeople
// Handles backup, recovery, and data integrity checks

class DataRecoveryManager {
  constructor(database) {
    this.database = database;
    this.backupInterval = 5 * 60 * 1000; // 5 minutes
    this.maxBackups = 10;
    this.recoveryInProgress = false;
    
    this.startPeriodicBackups();
    this.loadDeletedItems();
  }
  
  // === AUTOMATIC BACKUP SYSTEM ===
  
  startPeriodicBackups() {
    // Only run backups for logged-in users or when there's significant data
    setInterval(() => {
      if (this.shouldCreateBackup()) {
        this.createBackup('automatic');
      }
    }, this.backupInterval);
    
    console.log('🔄 Automatic backup system started');
  }
  
  shouldCreateBackup() {
    const people = this.database.getAllPeople();
    
    // Don't backup if no data
    if (people.length === 0) return false;
    
    // Always backup for logged-in users
    if (localStorage.getItem('firebase_auth_user') === 'true') return true;
    
    // Backup for non-logged users only if they have significant data
    return people.length >= 3;
  }
  
  createBackup(type = 'manual') {
    try {
      const people = this.database.getAllPeople();
      const backup = {
        id: `backup_${Date.now()}`,
        type: type,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        peopleCount: people.length,
        data: people,
        metadata: {
          version: '2.0',
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };
      
      // Save to localStorage with rotation
      this.saveBackupWithRotation(backup);
      
      console.log(`💾 ${type} backup created:`, backup.id, `(${people.length} people)`);
      return backup.id;
      
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      return null;
    }
  }
  
  saveBackupWithRotation(backup) {
    try {
      // Get existing backups
      const existingBackups = this.getAllBackups();
      
      // Add new backup
      existingBackups.push(backup);
      
      // Sort by timestamp (newest first)
      existingBackups.sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the latest backups
      const backupsToKeep = existingBackups.slice(0, this.maxBackups);
      
      // Save individual backups
      backupsToKeep.forEach(backup => {
        localStorage.setItem(`myfilmpeople_backup_${backup.id}`, JSON.stringify(backup));
      });
      
      // Save backup index
      const backupIndex = backupsToKeep.map(b => ({
        id: b.id,
        type: b.type,
        timestamp: b.timestamp,
        date: b.date,
        peopleCount: b.peopleCount
      }));
      
      localStorage.setItem('myfilmpeople_backup_index', JSON.stringify(backupIndex));
      
      // Clean up old backups
      this.cleanupOldBackups(backupsToKeep.map(b => b.id));
      
    } catch (error) {
      console.error('❌ Backup rotation failed:', error);
    }
  }
  
  cleanupOldBackups(keepIds) {
    try {
      // Find all backup keys in localStorage
      const backupKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('myfilmpeople_backup_') && !key.includes('index')) {
          backupKeys.push(key);
        }
      }
      
      // Remove backups not in keep list
      backupKeys.forEach(key => {
        const backupId = key.replace('myfilmpeople_backup_', '');
        if (!keepIds.includes(backupId)) {
          localStorage.removeItem(key);
          console.log('🗑️ Cleaned up old backup:', backupId);
        }
      });
      
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
    }
  }
  
  // === RECOVERY METHODS ===
  
  getAllBackups() {
    try {
      const index = localStorage.getItem('myfilmpeople_backup_index');
      if (!index) return [];
      
      const backupIndex = JSON.parse(index);
      const backups = [];
      
      for (const entry of backupIndex) {
        const backupData = localStorage.getItem(`myfilmpeople_backup_${entry.id}`);
        if (backupData) {
          backups.push(JSON.parse(backupData));
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.error('❌ Error loading backups:', error);
      return [];
    }
  }
  
  async recoverFromBackup(backupId) {
    if (this.recoveryInProgress) {
      throw new Error('Recovery already in progress');
    }
    
    try {
      this.recoveryInProgress = true;
      
      console.log('🔄 Starting recovery from backup:', backupId);
      
      // Load backup data
      const backupData = localStorage.getItem(`myfilmpeople_backup_${backupId}`);
      if (!backupData) {
        throw new Error('Backup not found');
      }
      
      const backup = JSON.parse(backupData);
      
      // Validate backup data
      if (!backup.data || !Array.isArray(backup.data)) {
        throw new Error('Invalid backup data');
      }
      
      // Create current state backup before recovery
      const preRecoveryBackup = this.createBackup('pre-recovery');
      
      // Restore data
      this.database.people = backup.data.filter(person => 
        person && person.name && person.role
      );
      this.database.nextId = this.database.getNextId();
      
      // Save restored data
      if (!this.database.saveToLocalStorage()) {
        throw new Error('Failed to save recovered data');
      }
      
      // Update UI if available
      if (window.uiManager) {
        window.uiManager.people = this.database.getAllPeople();
        window.uiManager.renderPeople();
      }
      
      console.log('✅ Recovery completed:', backup.peopleCount, 'people restored');
      
      return {
        success: true,
        peopleCount: backup.peopleCount,
        backupDate: backup.date,
        preRecoveryBackup: preRecoveryBackup
      };
      
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      throw error;
    } finally {
      this.recoveryInProgress = false;
    }
  }
  
  // === DATA INTEGRITY CHECKS ===
  
  checkDataIntegrity() {
    const issues = [];
    const people = this.database.getAllPeople();
    
    // Check for duplicate entries
    const seen = new Map();
    people.forEach((person, index) => {
      const key = `${person.name.toLowerCase()}-${person.role}`;
      if (seen.has(key)) {
        issues.push({
          type: 'duplicate',
          message: `Duplicate entry: ${person.name} (${person.role})`,
          indices: [seen.get(key), index]
        });
      } else {
        seen.set(key, index);
      }
    });
    
    // Check for missing required fields
    people.forEach((person, index) => {
      if (!person.name || !person.role) {
        issues.push({
          type: 'invalid',
          message: `Invalid entry at index ${index}: missing name or role`,
          index: index
        });
      }
      
      if (!person.id) {
        issues.push({
          type: 'missing_id',
          message: `Missing ID for ${person.name || 'unknown'}`,
          index: index
        });
      }
    });
    
    // Check for ID conflicts
    const ids = people.map(p => p.id).filter(id => id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push({
        type: 'id_conflict',
        message: 'Duplicate IDs found in data'
      });
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      peopleCount: people.length
    };
  }
  
  repairDataIntegrity() {
    console.log('🔧 Starting data integrity repair...');
    
    const people = this.database.getAllPeople();
    const repairedPeople = [];
    const seen = new Set();
    let nextId = 1;
    
    people.forEach(person => {
      // Skip invalid entries
      if (!person || !person.name || !person.role) {
        console.log('🗑️ Removing invalid entry:', person);
        return;
      }
      
      // Handle duplicates
      const key = `${person.name.toLowerCase()}-${person.role}`;
      if (seen.has(key)) {
        console.log('🔄 Removing duplicate:', person.name, person.role);
        return;
      }
      seen.add(key);
      
      // Fix missing or conflicting IDs
      const repairedPerson = { ...person };
      if (!repairedPerson.id || repairedPeople.some(p => p.id === repairedPerson.id)) {
        repairedPerson.id = nextId++;
      } else {
        nextId = Math.max(nextId, repairedPerson.id + 1);
      }
      
      // Ensure required fields
      repairedPerson.dateAdded = repairedPerson.dateAdded || new Date().toISOString();
      repairedPerson.notes = repairedPerson.notes || '';
      repairedPerson.letterboxdUrl = repairedPerson.letterboxdUrl || '';
      repairedPerson.profilePicture = repairedPerson.profilePicture || '';
      
      repairedPeople.push(repairedPerson);
    });
    
    // Update database
    this.database.people = repairedPeople;
    this.database.nextId = nextId;
    
    // Save repaired data
    this.database.saveToLocalStorage();
    
    console.log('✅ Data integrity repair completed:', repairedPeople.length, 'people');
    
    return {
      originalCount: people.length,
      repairedCount: repairedPeople.length,
      removedCount: people.length - repairedPeople.length
    };
  }
  
  // === DELETION TRACKING ===
  
  loadDeletedItems() {
    try {
      const deletedData = localStorage.getItem('myfilmpeople_deleted');
      if (deletedData) {
        const deletedArray = JSON.parse(deletedData);
        this.database.deletedItems = new Map(deletedArray);
        console.log('📥 Loaded deletion tracking:', this.database.deletedItems.size, 'items');
      }
    } catch (error) {
      console.error('❌ Error loading deleted items:', error);
    }
  }
  
  // === EXPORT/IMPORT ===
  
  exportAllData() {
    const people = this.database.getAllPeople();
    const backups = this.getAllBackups();
    
    return {
      version: '2.0',
      exportDate: new Date().toISOString(),
      exportTimestamp: Date.now(),
      people: people,
      backups: backups.map(b => ({
        id: b.id,
        type: b.type,
        date: b.date,
        peopleCount: b.peopleCount
      })),
      metadata: {
        totalPeople: people.length,
        totalBackups: backups.length,
        userAgent: navigator.userAgent
      }
    };
  }
  
  async importData(importData) {
    if (!importData || !importData.people) {
      throw new Error('Invalid import data');
    }
    
    try {
      // Create backup before import
      const preImportBackup = this.createBackup('pre-import');
      
      // Import data through database
      const importedCount = await this.database.importData(importData);
      
      // Update UI
      if (window.uiManager) {
        window.uiManager.people = this.database.getAllPeople();
        window.uiManager.renderPeople();
      }
      
      return {
        success: true,
        importedCount: importedCount,
        preImportBackup: preImportBackup
      };
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }
  
  // === EMERGENCY RECOVERY ===
  
  emergencyRecovery() {
    console.log('🚨 Starting emergency recovery...');
    
    const recoveryMethods = [
      () => this.recoverFromSessionStorage(),
      () => this.recoverFromMostRecentBackup(),
      () => this.recoverFromBrowserHistory(),
      () => this.recoverFromFirebaseCache()
    ];
    
    for (const method of recoveryMethods) {
      try {
        const result = method();
        if (result && result.success) {
          console.log('✅ Emergency recovery successful:', result.method);
          return result;
        }
      } catch (error) {
        console.log('⚠️ Recovery method failed:', error.message);
      }
    }
    
    console.log('❌ All emergency recovery methods failed');
    return { success: false };
  }
  
  recoverFromSessionStorage() {
    const sessionData = sessionStorage.getItem('myfilmpeople_backup');
    if (sessionData) {
      const people = JSON.parse(sessionData);
      this.database.people = people;
      this.database.saveToLocalStorage();
      return { success: true, method: 'sessionStorage', count: people.length };
    }
    return { success: false };
  }
  
  recoverFromMostRecentBackup() {
    const backups = this.getAllBackups();
    if (backups.length > 0) {
      const latestBackup = backups[0];
      this.database.people = latestBackup.data;
      this.database.saveToLocalStorage();
      return { success: true, method: 'backup', count: latestBackup.data.length };
    }
    return { success: false };
  }
  
  recoverFromBrowserHistory() {
    // This is a placeholder - in a real implementation, you might
    // try to recover from browser's back/forward cache or other sources
    return { success: false };
  }
  
  recoverFromFirebaseCache() {
    // Try to get cached Firebase data if available
    if (window.firebaseAuth && window.firebaseAuth.user) {
      // This would attempt to reload from Firebase
      return { success: false, reason: 'Firebase recovery not implemented yet' };
    }
    return { success: false };
  }
  
  // === UTILITIES ===
  
  getRecoveryStats() {
    const backups = this.getAllBackups();
    const integrity = this.checkDataIntegrity();
    
    return {
      backupCount: backups.length,
      latestBackup: backups.length > 0 ? backups[0].date : null,
      dataIntegrity: integrity.isValid,
      issues: integrity.issues.length,
      peopleCount: this.database.getAllPeople().length
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataRecoveryManager };
} else {
  window.DataRecoveryManager = DataRecoveryManager;
}
