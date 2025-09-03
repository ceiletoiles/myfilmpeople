// Database and Authentication Fix - ENHANCED VERSION
// This file fixes critical database sync and deletion issues
// WITHOUT changing any existing UI features or functions

(function() {
  'use strict';
  
  console.log('🔧 Loading enhanced database and auth fixes...');
  
  // Global state tracking
  let isCurrentlyDeleting = false;
  let lastOperationTime = 0;
  let authStateChangeInProgress = false;
  
  // Wait for existing systems to load
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeFixes, 1500);
  });
  
  function initializeFixes() {
    if (!window.db || !window.uiManager) {
      console.log('⚠️ Original systems not ready, retrying...');
      setTimeout(initializeFixes, 1000);
      return;
    }
    
    console.log('🔧 Applying enhanced database and auth fixes...');
    
    // Apply enhanced database fixes
    applyEnhancedDatabaseFixes();
    
    // Apply enhanced auth fixes
    applyEnhancedAuthFixes();
    
    // Apply TMDB-based tracking
    applyTmdbTracking();
    
    // Apply logout data clearing
    applyLogoutDataClearing();
    
    console.log('✅ Enhanced database and auth fixes applied successfully');
  }
  
  // === ENHANCED DATABASE FIXES ===
  
  function applyEnhancedDatabaseFixes() {
    const originalDb = window.db;
    
    // Enhanced state tracking
    originalDb.deletedItemsMap = originalDb.deletedItemsMap || new Map();
    originalDb.operationInProgress = false;
    originalDb.lastSaveData = null;
    
    // Load enhanced deletion tracking
    loadDeletionTracking(originalDb);
    
    // COMPLETELY OVERRIDE saveToStorage with enhanced version
    originalDb.saveToStorage = function() {
      if (this.operationInProgress) {
        console.log('🔒 Operation in progress, queuing save...');
        setTimeout(() => this.saveToStorage(), 500);
        return;
      }
      
      try {
        this.operationInProgress = true;
        
        // Validate data before saving
        const validPeople = this.people.filter(person => {
          if (!person || !person.name || !person.role) {
            console.log('�️ Removing invalid person:', person);
            return false;
          }
          
          // Check if recently deleted using TMDB ID priority
          if (this.isPersonDeleted(person)) {
            console.log('🚫 Filtering deleted person:', person.name);
            return false;
          }
          
          return true;
        });
        
        // Only save if data actually changed
        const dataString = JSON.stringify(validPeople);
        if (this.lastSaveData === dataString) {
          console.log('📱 Data unchanged, skipping save');
          return true;
        }
        
        // Create backup before saving
        const existingData = localStorage.getItem('myfilmpeople_data');
        if (existingData && existingData !== '[]' && existingData !== dataString) {
          localStorage.setItem('myfilmpeople_backup', existingData);
          console.log('💾 Created backup of', JSON.parse(existingData).length, 'people');
        }
        
        // Save main data
        localStorage.setItem('myfilmpeople_data', dataString);
        this.lastSaveData = dataString;
        
        // Save metadata with TMDB tracking
        const metadata = {
          lastSave: Date.now(),
          count: validPeople.length,
          version: '3.0',
          tmdbIds: validPeople.filter(p => p.tmdbId).map(p => ({
            tmdbId: p.tmdbId,
            name: p.name,
            role: p.role,
            type: p.role === 'studio' ? 'company' : 'person'
          }))
        };
        localStorage.setItem('myfilmpeople_metadata', JSON.stringify(metadata));
        
        // Update array reference
        this.people = validPeople;
        
        console.log('✅ Enhanced save completed:', validPeople.length, 'people');
        return true;
        
      } catch (error) {
        console.error('❌ Enhanced save failed:', error);
        return false;
      } finally {
        this.operationInProgress = false;
      }
    };
    
    // COMPLETELY OVERRIDE deletePerson with TMDB-aware deletion
    originalDb.deletePerson = function(id) {
      if (isCurrentlyDeleting) {
        console.log('🔒 Deletion already in progress, ignoring...');
        return;
      }
      
      console.log('🗑️ ENHANCED DELETION starting for ID:', id);
      isCurrentlyDeleting = true;
      
      try {
        // Find person to delete
        const personToDelete = this.people.find(p => p.id === id);
        if (!personToDelete) {
          console.warn('❌ Person not found for deletion:', id);
          return;
        }
        
        console.log('🗑️ Deleting person:', {
          name: personToDelete.name,
          role: personToDelete.role,
          tmdbId: personToDelete.tmdbId,
          localId: personToDelete.id
        });
        
        // Mark as deleted FIRST (before removing from array)
        this.markPersonAsDeleted(personToDelete);
        
        // Remove from array using EXACT ID match
        const beforeCount = this.people.length;
        this.people = this.people.filter(p => p.id !== id);
        const afterCount = this.people.length;
        
        if (beforeCount === afterCount) {
          console.error('❌ CRITICAL: Person was not removed from array!');
          console.log('Available IDs:', this.people.map(p => ({ id: p.id, name: p.name })));
          return;
        }
        
        console.log('✅ Removed from array:', beforeCount, '→', afterCount);
        
        // Force immediate save
        this.saveToStorage();
        
        // Update UI immediately
        if (window.uiManager) {
          window.uiManager.people = [...this.people]; // Create new reference
          window.uiManager.renderPeople();
        }
        
        // Cloud deletion (async, don't wait)
        if (window.firebaseAuth && window.firebaseAuth.user) {
          setTimeout(() => {
            window.firebaseAuth.deletePersonFromCloudByTmdbId(personToDelete).catch(error => {
              console.log('⚠️ Cloud deletion failed (local deletion successful):', error);
            });
          }, 200);
        }
        
        console.log('✅ ENHANCED DELETION completed for:', personToDelete.name);
        
      } catch (error) {
        console.error('❌ Enhanced deletion failed:', error);
      } finally {
        isCurrentlyDeleting = false;
        lastOperationTime = Date.now();
      }
    };
    
    // Enhanced addPerson to prevent duplicates and ensure persistence
    const originalAddPerson = originalDb.addPerson.bind(originalDb);
    originalDb.addPerson = function(personData) {
      console.log('➕ ENHANCED ADD starting for:', personData.name);
      
      try {
        // Check for duplicates using TMDB ID first, then name+role
        const existingByTmdb = personData.tmdbId ? 
          this.people.find(p => p.tmdbId === personData.tmdbId && p.role === personData.role) : null;
        
        const existingByName = this.people.find(p => 
          p.name.toLowerCase() === personData.name.toLowerCase() && p.role === personData.role
        );
        
        if (existingByTmdb) {
          throw new Error(`${personData.name} already exists (TMDB ID: ${personData.tmdbId})`);
        }
        
        if (existingByName) {
          throw new Error(`${personData.name} already exists as a ${personData.role}`);
        }
        
        // Create person with enhanced tracking
        const person = {
          id: this.nextId++,
          name: personData.name,
          role: personData.role,
          letterboxdUrl: personData.letterboxdUrl || '',
          profilePicture: personData.profilePicture || '',
          notes: personData.notes || '',
          tmdbId: personData.tmdbId || null,
          dateAdded: new Date().toISOString(),
          addedTimestamp: Date.now(),
          source: 'user-added'
        };
        
        // Add to array
        this.people.push(person);
        
        // Force save immediately
        this.saveToStorage();
        
        console.log('✅ ENHANCED ADD completed:', {
          name: person.name,
          id: person.id,
          tmdbId: person.tmdbId,
          total: this.people.length
        });
        
        return person;
        
      } catch (error) {
        console.error('❌ Enhanced add failed:', error);
        throw error;
      }
    };
    
    // Enhanced loadFromStorage that prevents deleted items from returning
    originalDb.loadFromStorage = function() {
      if (this.operationInProgress) {
        console.log('� Operation in progress, using current data');
        return this.people;
      }
      
      try {
        const data = localStorage.getItem('myfilmpeople_data');
        if (!data || data === '[]') {
          console.log('📱 No localStorage data found');
          return [];
        }
        
        const parsedData = JSON.parse(data);
        console.log('📱 Found localStorage data:', parsedData.length, 'people');
        
        // Filter out invalid and deleted items
        const validData = parsedData.filter(person => {
          // Basic validation
          if (!person || !person.name || !person.role) {
            console.log('🗑️ Removing invalid:', person);
            return false;
          }
          
          // Check if deleted
          if (this.isPersonDeleted(person)) {
            console.log('🚫 Filtering deleted:', person.name);
            return false;
          }
          
          return true;
        });
        
        console.log('✅ Filtered data:', parsedData.length, '→', validData.length);
        
        this.people = validData;
        this.nextId = this.getNextId();
        this.lastSaveData = JSON.stringify(validData);
        
        return validData;
        
      } catch (error) {
        console.error('❌ Enhanced load failed:', error);
        return [];
      }
    };
    
    // Add enhanced deletion tracking methods
    originalDb.markPersonAsDeleted = function(person) {
      const now = Date.now();
      
      // Create multiple keys for robust tracking
      const keys = [];
      
      if (person.tmdbId) {
        keys.push(`tmdb-${person.tmdbId}-${person.role}`);
      }
      keys.push(`name-${person.name.toLowerCase()}-${person.role}`);
      keys.push(`id-${person.id}`);
      
      // Mark with all keys
      keys.forEach(key => {
        this.deletedItemsMap.set(key, {
          timestamp: now,
          person: { ...person },
          reason: 'user-deleted'
        });
      });
      
      // Save deletion records
      this.saveDeletionTracking();
      
      console.log('📝 Marked as deleted with keys:', keys);
    };
    
    originalDb.isPersonDeleted = function(person) {
      if (!person) return false;
      
      const now = Date.now();
      const timeLimit = 10 * 60 * 1000; // 10 minutes
      
      // Check multiple keys
      const keys = [];
      if (person.tmdbId) {
        keys.push(`tmdb-${person.tmdbId}-${person.role}`);
      }
      keys.push(`name-${person.name.toLowerCase()}-${person.role}`);
      if (person.id) {
        keys.push(`id-${person.id}`);
      }
      
      for (const key of keys) {
        const deleted = this.deletedItemsMap.get(key);
        if (deleted && (now - deleted.timestamp) < timeLimit) {
          return true;
        }
      }
      
      return false;
    };
    
    originalDb.saveDeletionTracking = function() {
      try {
        const deletedArray = Array.from(this.deletedItemsMap.entries());
        localStorage.setItem('myfilmpeople_deleted_v3', JSON.stringify(deletedArray));
      } catch (error) {
        console.log('⚠️ Could not save deletion tracking:', error);
      }
    };
  }
  
  // === ENHANCED AUTH FIXES ===
  
  function applyEnhancedAuthFixes() {
    // Wait for Firebase auth to load, then apply enhanced fixes
    const checkForFirebaseAuth = () => {
      if (window.firebaseAuth) {
        console.log('🔐 Applying enhanced auth fixes...');
        
        // Enhanced explicit logout with complete data clearing
        if (window.firebaseAuth.handleExplicitLogout) {
          const originalExplicitLogout = window.firebaseAuth.handleExplicitLogout.bind(window.firebaseAuth);
          window.firebaseAuth.handleExplicitLogout = async function() {
            console.log('👋 ENHANCED EXPLICIT LOGOUT starting...');
            authStateChangeInProgress = true;
            
            try {
              // Clear ALL localStorage data immediately
              console.log('🗑️ Clearing ALL user data...');
              
              const keysToRemove = [
                'myfilmpeople_data',
                'myfilmpeople_backup',
                'myfilmpeople_metadata',
                'myfilmpeople_deleted_v3',
                'myfilmpeople_deleted',
                'firebase_auth_user',
                'firebase_user_name'
              ];
              
              keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log('🗑️ Removed:', key);
              });
              
              // Clear in-memory data
              if (window.db) {
                window.db.people = [];
                window.db.nextId = 1;
                window.db.deletedItemsMap = new Map();
                window.db.lastSaveData = null;
                console.log('🧹 Cleared database memory');
              }
              
              if (window.uiManager) {
                window.uiManager.people = [];
                window.uiManager.renderPeople();
                console.log('🧹 Cleared UI memory');
              }
              
              // Call original logout
              await originalExplicitLogout();
              
              console.log('✅ Enhanced explicit logout completed');
              
            } catch (error) {
              console.error('❌ Enhanced logout failed:', error);
            } finally {
              authStateChangeInProgress = false;
            }
          };
        }
        
        // Enhanced cloud data loading that prevents data conflicts
        if (window.firebaseAuth.loadUserDataFromCloud) {
          const originalLoadFromCloud = window.firebaseAuth.loadUserDataFromCloud.bind(window.firebaseAuth);
          window.firebaseAuth.loadUserDataFromCloud = async function() {
            if (authStateChangeInProgress || this.syncInProgress) {
              console.log('⏳ Auth operation in progress, skipping cloud load...');
              return;
            }
            
            this.syncInProgress = true;
            
            try {
              console.log('☁️ ENHANCED cloud data loading...');
              
              // Get current local data state
              const localData = JSON.parse(localStorage.getItem('myfilmpeople_data') || '[]');
              const localCount = localData.length;
              
              console.log('📱 Current local data:', localCount, 'people');
              
              if (localCount > 0) {
                console.log('📱 Local data exists, migrating to cloud first...');
                await this.migrateLocalStorageData();
              } else {
                console.log('☁️ No local data, loading from cloud...');
                await originalLoadFromCloud.call(this);
              }
              
            } catch (error) {
              console.error('❌ Enhanced cloud loading failed:', error);
            } finally {
              this.syncInProgress = false;
            }
          };
        }
        
        // Enhanced cloud deletion that prevents resurrection
        if (window.firebaseAuth.deletePersonFromCloudByTmdbId) {
          const originalCloudDelete = window.firebaseAuth.deletePersonFromCloudByTmdbId.bind(window.firebaseAuth);
          window.firebaseAuth.deletePersonFromCloudByTmdbId = async function(personData) {
            console.log('☁️ ENHANCED cloud deletion for:', personData.name);
            
            try {
              // Perform cloud deletion
              await originalCloudDelete.call(this, personData);
              
              // Wait and verify the person is not in local data
              setTimeout(() => {
                if (window.db && window.db.people) {
                  const found = window.db.people.find(p => {
                    if (personData.tmdbId && p.tmdbId === personData.tmdbId && p.role === personData.role) {
                      return true;
                    }
                    return p.name === personData.name && p.role === personData.role;
                  });
                  
                  if (found) {
                    console.log('🔄 Person still in local data after cloud deletion, removing...');
                    window.db.people = window.db.people.filter(p => p.id !== found.id);
                    window.db.markPersonAsDeleted(found);
                    window.db.saveToStorage();
                    
                    if (window.uiManager) {
                      window.uiManager.people = [...window.db.people];
                      window.uiManager.renderPeople();
                    }
                  }
                }
              }, 1500);
              
              console.log('✅ Enhanced cloud deletion completed');
              
            } catch (error) {
              console.error('❌ Enhanced cloud deletion failed:', error);
              throw error;
            }
          };
        }
        
      } else {
        // Firebase not loaded yet, check again
        setTimeout(checkForFirebaseAuth, 1000);
      }
    };
    
    checkForFirebaseAuth();
  }
  
  // === TMDB TRACKING ===
  
  function applyTmdbTracking() {
    // Load existing deletion tracking
    function loadDeletionTracking(db) {
      try {
        // Try new format first
        let deletedData = localStorage.getItem('myfilmpeople_deleted_v3');
        if (!deletedData) {
          // Fallback to old format
          deletedData = localStorage.getItem('myfilmpeople_deleted');
        }
        
        if (deletedData) {
          const deletedArray = JSON.parse(deletedData);
          db.deletedItemsMap = new Map(deletedArray);
          console.log('📥 Loaded deletion tracking:', db.deletedItemsMap.size, 'items');
        }
      } catch (error) {
        console.log('⚠️ Could not load deletion tracking:', error);
        db.deletedItemsMap = new Map();
      }
    }
    
    // Ensure deletion tracking is loaded
    if (window.db && !window.db.deletedItemsMap) {
      loadDeletionTracking(window.db);
    }
    
    // Periodic cleanup of old deletion records
    setInterval(() => {
      if (window.db && window.db.deletedItemsMap && window.db.deletedItemsMap.size > 0) {
        const tenMinutes = 10 * 60 * 1000;
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, deleted] of window.db.deletedItemsMap) {
          if (now - deleted.timestamp > tenMinutes) {
            window.db.deletedItemsMap.delete(key);
            cleaned++;
          }
        }
        
        if (cleaned > 0) {
          console.log('🧹 Cleaned', cleaned, 'old deletion records');
          window.db.saveDeletionTracking();
        }
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }
  
  // === LOGOUT DATA CLEARING ===
  
  function applyLogoutDataClearing() {
    // Override any logout buttons to use enhanced logout
    function setupEnhancedLogout() {
      const logoutElements = [
        '#logoutBtn',
        '#logoutConfirm',
        '[data-action="logout"]'
      ];
      
      logoutElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element && !element.hasAttribute('enhanced-logout')) {
          element.setAttribute('enhanced-logout', 'true');
          element.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (window.firebaseAuth && window.firebaseAuth.handleExplicitLogout) {
              console.log('🔄 Using enhanced logout...');
              window.firebaseAuth.handleExplicitLogout();
            } else if (window.firebaseAuth && window.firebaseAuth.signOut) {
              console.log('🔄 Using fallback logout with data clearing...');
              
              // Clear data before logout
              const keysToRemove = [
                'myfilmpeople_data',
                'myfilmpeople_backup',
                'myfilmpeople_metadata',
                'myfilmpeople_deleted_v3'
              ];
              
              keysToRemove.forEach(key => localStorage.removeItem(key));
              
              if (window.db) {
                window.db.people = [];
                window.db.nextId = 1;
              }
              
              if (window.uiManager) {
                window.uiManager.people = [];
                window.uiManager.renderPeople();
              }
              
              window.firebaseAuth.signOut();
            }
          });
        }
      });
    }
    
    // Setup logout enhancement periodically (in case elements are added dynamically)
    setupEnhancedLogout();
    setInterval(setupEnhancedLogout, 5000);
  }
  
  // === ENHANCED DELETION TRACKING ===
  
  function applyDeletionTracking() {
    // Enhanced UI manager deletion
    if (window.uiManager && window.uiManager.deletePerson) {
      const originalUIDeletePerson = window.uiManager.deletePerson.bind(window.uiManager);
      
      window.uiManager.deletePerson = function(id) {
        console.log('🎨 UI ENHANCED deletion request for ID:', id);
        
        if (isCurrentlyDeleting) {
          console.log('🔒 Deletion already in progress, ignoring UI request');
          return;
        }
        
        // Use database's enhanced deletion
        if (window.db && window.db.deletePerson) {
          window.db.deletePerson(id);
          
          // Force UI update with new reference
          this.people = [...window.db.people];
          this.renderPeople();
          
          console.log('✅ UI enhanced deletion completed');
        } else {
          // Fallback to original method
          originalUIDeletePerson(id);
        }
      };
    }
    
    // Periodic data integrity check
    setInterval(() => {
      if (window.db && window.uiManager && !isCurrentlyDeleting && !authStateChangeInProgress) {
        const dbCount = window.db.people.length;
        const uiCount = window.uiManager.people.length;
        
        // Only sync if there's a significant difference
        if (Math.abs(dbCount - uiCount) > 0) {
          console.log('🔄 Data integrity check - syncing UI with database:', uiCount, '→', dbCount);
          window.uiManager.people = [...window.db.people];
          window.uiManager.renderPeople();
        }
      }
    }, 15000); // Every 15 seconds
  }
  
  // Load deletion tracking helper
  function loadDeletionTracking(db) {
    try {
      // Try new format first
      let deletedData = localStorage.getItem('myfilmpeople_deleted_v3');
      if (!deletedData) {
        // Fallback to old format and upgrade
        deletedData = localStorage.getItem('myfilmpeople_deleted');
        if (deletedData) {
          console.log('📈 Upgrading deletion tracking format...');
          localStorage.setItem('myfilmpeople_deleted_v3', deletedData);
          localStorage.removeItem('myfilmpeople_deleted');
        }
      }
      
      if (deletedData) {
        const deletedArray = JSON.parse(deletedData);
        db.deletedItemsMap = new Map(deletedArray);
        console.log('📥 Loaded deletion tracking:', db.deletedItemsMap.size, 'items');
      } else {
        db.deletedItemsMap = new Map();
      }
    } catch (error) {
      console.log('⚠️ Could not load deletion tracking:', error);
      db.deletedItemsMap = new Map();
    }
  }
  
  
  // === INITIALIZATION ===
  
  function initializeEnhancedFixes() {
    console.log('🚀 MyFilmPeople Enhanced Database & Auth Fixes v2.0');
    console.log('📊 Targeting: deletion persistence, data conflicts, auth state clearing');
    
    // Initialize state variables
    let dbLoaded = false;
    let uiLoaded = false;
    
    const checkAndApplyFixes = () => {
      // Check for database
      if (window.db && !dbLoaded) {
        console.log('🔍 Database object found, applying enhanced database fixes...');
        applyEnhancedDatabaseFixes();
        dbLoaded = true;
      }
      
      // Check for UI manager
      if (window.uiManager && !uiLoaded) {
        console.log('🎨 UI Manager found, applying deletion tracking...');
        applyDeletionTracking();
        uiLoaded = true;
      }
      
      // Apply auth fixes (will wait for Firebase internally)
      applyEnhancedAuthFixes();
      
      // Apply TMDB tracking
      applyTmdbTracking();
      
      // Apply logout data clearing
      applyLogoutDataClearing();
      
      if (dbLoaded && uiLoaded) {
        console.log('✅ All enhanced fixes applied successfully!');
        console.log('🎯 Focus: TMDB-aware deletion, auth state clearing, data persistence');
        
        // Final integrity check
        setTimeout(() => {
          if (window.db && window.uiManager) {
            console.log('🔍 Final integrity check...');
            console.log('📊 Database people count:', window.db.people?.length || 0);
            console.log('🎨 UI people count:', window.uiManager.people?.length || 0);
            console.log('🗑️ Deletion tracking:', window.db.deletedItemsMap?.size || 0, 'items');
          }
        }, 2000);
      }
    };
    
    // Apply fixes immediately and keep checking
    checkAndApplyFixes();
    const intervalId = setInterval(() => {
      if (!dbLoaded || !uiLoaded) {
        checkAndApplyFixes();
      } else {
        clearInterval(intervalId);
      }
    }, 1000);
    
    // Add global error handling for database operations
    window.addEventListener('error', function(event) {
      if (event.error && event.error.message && 
          (event.error.message.includes('database') || 
           event.error.message.includes('storage') ||
           event.error.message.includes('tmdb'))) {
        console.warn('🚨 Database-related error caught:', event.error.message);
        
        // Attempt recovery
        if (window.db && window.db.saveToStorage) {
          try {
            window.db.saveToStorage();
            console.log('🔄 Attempted database recovery save');
          } catch (e) {
            console.error('❌ Recovery save failed:', e);
          }
        }
      }
    });
  }
  
  // Start the enhanced fixes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedFixes);
  } else {
    initializeEnhancedFixes();
  }
  
  // === EMERGENCY RECOVERY ===
  
  window.emergencyDataRecovery = function() {
    console.log('🚨 Starting emergency data recovery...');
    
    try {
      // Try to recover from backup
      const backup = localStorage.getItem('myfilmpeople_backup');
      if (backup) {
        const backupData = JSON.parse(backup);
        console.log('🔄 Found backup with', backupData.length, 'people');
        
        if (window.db) {
          window.db.people = backupData.filter(person => 
            person && person.name && person.role
          );
          window.db.saveToStorage();
          
          if (window.uiManager) {
            window.uiManager.people = window.db.people;
            window.uiManager.renderPeople();
          }
          
          console.log('✅ Emergency recovery completed');
          return true;
        }
      }
      
      console.log('❌ No backup found for recovery');
      return false;
      
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error);
      return false;
    }
  };
  
  // Make recovery function available globally
  window.recoverData = window.emergencyDataRecovery;
  
  console.log('✅ Enhanced Database and Auth Fixes v2.0 loaded successfully');
  console.log('🎯 Ready to fix: deletion persistence, data conflicts, TMDB tracking, auth clearing');
  
})();
