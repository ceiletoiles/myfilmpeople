// Data Migration Utility
// Handles automatic migration from localStorage to Firestore when users first sign in

import { FirestoreSchema, FirestoreRefs } from './firestore-schema.js';
import { 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc,
  collection
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class DataMigration {
  constructor(db) {
    this.db = db;
    this.migrationInProgress = false;
  }

  // Main migration function called when user first signs in
  async handleUserFirstSignIn(user) {
    console.log('🔄 Checking if data migration is needed for user:', user.email);
    
    try {
      // Check what data exists where
      const hasLocalData = this.hasLocalStorageData();
      const hasCloudData = await this.hasCloudData(user.uid);
      
      console.log(`Local data: ${hasLocalData ? '✅' : '❌'}, Cloud data: ${hasCloudData ? '✅' : '❌'}`);
      
      if (hasLocalData && !hasCloudData) {
        // Perfect scenario: migrate localStorage to cloud
        return await this.migrateLocalStorageToCloud(user.uid);
        
      } else if (!hasLocalData && hasCloudData) {
        // User has cloud data but no local data - sync down
        return await this.syncCloudDataToLocal(user.uid);
        
      } else if (hasLocalData && hasCloudData) {
        // Both exist - handle conflict
        return await this.handleDataConflict(user.uid);
        
      } else {
        // Neither has data - fresh start
        console.log('🆕 Fresh start - no migration needed');
        return { success: true, action: 'fresh_start' };
      }
      
    } catch (error) {
      console.error('❌ Migration check failed:', error);
      return { success: false, error: error.message };
    }
  }

  hasLocalStorageData() {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      if (!data) return false;
      
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch (error) {
      console.error('Error checking localStorage:', error);
      return false;
    }
  }

  async hasCloudData(userId) {
    try {
      const peopleRef = FirestoreRefs.getPeopleCollection(userId);
      const snapshot = await getDocs(peopleRef);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking cloud data:', error);
      return false;
    }
  }

  async migrateLocalStorageToCloud(userId) {
    if (this.migrationInProgress) {
      console.log('⏳ Migration already in progress');
      return { success: false, error: 'Migration already in progress' };
    }

    this.migrationInProgress = true;
    
    try {
      console.log('🚀 Starting migration from localStorage to cloud...');
      
      // Get localStorage data
      const localData = this.getLocalStorageData();
      if (!localData || localData.length === 0) {
        console.log('📭 No local data to migrate');
        return { success: true, action: 'no_data_to_migrate' };
      }

      console.log(`📦 Found ${localData.length} items to migrate`);

      // Emit progress event
      this.emitMigrationProgress(0, localData.length);

      // Create backup of original data
      await this.createDataBackup(userId, localData, 'pre_migration_backup');

      // Migrate each person
      const results = [];
      for (let i = 0; i < localData.length; i++) {
        const person = localData[i];
        
        try {
          const preparedPerson = FirestoreSchema.preparePersonForFirestore(person);
          const personRef = FirestoreRefs.getPersonDoc(userId, preparedPerson.id);
          
          await setDoc(personRef, preparedPerson);
          results.push({ success: true, person: preparedPerson });
          
          console.log(`✅ Migrated: ${preparedPerson.name}`);
          
        } catch (error) {
          console.error(`❌ Failed to migrate ${person.name}:`, error);
          results.push({ success: false, person, error: error.message });
        }
        
        // Emit progress
        this.emitMigrationProgress(i + 1, localData.length);
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`🎉 Migration completed: ${successful} successful, ${failed} failed`);

      // Emit completion event
      this.emitMigrationComplete({
        totalItems: localData.length,
        successful,
        failed,
        results
      });

      return {
        success: true,
        action: 'migration_completed',
        totalItems: localData.length,
        successful,
        failed
      };

    } catch (error) {
      console.error('💥 Migration failed:', error);
      this.emitMigrationError(error);
      return { success: false, error: error.message };
      
    } finally {
      this.migrationInProgress = false;
    }
  }

  async syncCloudDataToLocal(userId) {
    try {
      console.log('⬇️ Syncing cloud data to localStorage...');
      
      const peopleRef = FirestoreRefs.getPeopleCollection(userId);
      const snapshot = await getDocs(peopleRef);
      
      const cloudData = [];
      snapshot.forEach((doc) => {
        cloudData.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📥 Found ${cloudData.length} items in cloud`);

      // Save to localStorage
      localStorage.setItem('myfilmpeople_data', JSON.stringify(cloudData));
      
      console.log('✅ Cloud data synced to localStorage');
      
      return {
        success: true,
        action: 'cloud_sync_completed',
        itemCount: cloudData.length
      };

    } catch (error) {
      console.error('❌ Cloud sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataConflict(userId) {
    console.log('⚠️ Data conflict detected - both localStorage and cloud have data');
    
    try {
      const localData = this.getLocalStorageData();
      const cloudData = await this.getCloudData(userId);
      
      console.log(`Local: ${localData.length} items, Cloud: ${cloudData.length} items`);

      // Create backup of local data before any changes
      const backupId = await this.createDataBackup(userId, localData, 'conflict_resolution_local_backup');
      
      // For now, prioritize cloud data (user can always restore from backup)
      // In a future version, we could show a merge UI
      localStorage.setItem('myfilmpeople_data', JSON.stringify(cloudData));
      
      // Also create a backup with timestamp for user reference
      const timestamp = new Date().toISOString();
      const localBackupKey = `myfilmpeople_backup_${timestamp}`;
      localStorage.setItem(localBackupKey, JSON.stringify(localData));
      
      console.log('✅ Conflict resolved: prioritized cloud data, local data backed up');
      
      this.showDataConflictNotification(localData.length, cloudData.length, localBackupKey);
      
      return {
        success: true,
        action: 'conflict_resolved',
        cloudItems: cloudData.length,
        localItemsBackedUp: localData.length,
        backupKey: localBackupKey
      };

    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
      return { success: false, error: error.message };
    }
  }

  getLocalStorageData() {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return [];
    }
  }

  async getCloudData(userId) {
    try {
      const peopleRef = FirestoreRefs.getPeopleCollection(userId);
      const snapshot = await getDocs(peopleRef);
      
      const cloudData = [];
      snapshot.forEach((doc) => {
        cloudData.push({ id: doc.id, ...doc.data() });
      });
      
      return cloudData;
    } catch (error) {
      console.error('Error reading cloud data:', error);
      return [];
    }
  }

  async createDataBackup(userId, data, reason) {
    try {
      const backup = FirestoreSchema.createBackupDocument(data, reason);
      const backupsRef = FirestoreRefs.getBackupsCollection(userId);
      
      const docRef = await addDoc(backupsRef, backup);
      console.log(`💾 Backup created with ID: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  // Event emitters for UI feedback
  emitMigrationProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    window.dispatchEvent(new CustomEvent('migrationProgress', {
      detail: { current, total, percentage }
    }));
  }

  emitMigrationComplete(summary) {
    window.dispatchEvent(new CustomEvent('migrationComplete', {
      detail: summary
    }));
  }

  emitMigrationError(error) {
    window.dispatchEvent(new CustomEvent('migrationError', {
      detail: error
    }));
  }

  showDataConflictNotification(localCount, cloudCount, backupKey) {
    // Show a notification about conflict resolution
    const message = `Data sync completed! Found ${cloudCount} items in cloud and ${localCount} local items. Cloud data was used, local data backed up as ${backupKey}.`;
    
    window.dispatchEvent(new CustomEvent('dataConflictResolved', {
      detail: {
        message,
        localCount,
        cloudCount,
        backupKey
      }
    }));
  }

  // Utility method to restore from backup (if needed)
  async restoreFromBackup(userId, backupId) {
    try {
      const backupRef = FirestoreRefs.getBackupDoc(userId, backupId);
      const backupDoc = await getDoc(backupRef);
      
      if (!backupDoc.exists()) {
        throw new Error('Backup not found');
      }
      
      const backupData = backupDoc.data();
      const restoredData = backupData.data;
      
      // Restore to localStorage
      localStorage.setItem('myfilmpeople_data', JSON.stringify(restoredData));
      
      console.log(`✅ Restored ${restoredData.length} items from backup ${backupId}`);
      
      return {
        success: true,
        itemCount: restoredData.length
      };
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export { DataMigration };
