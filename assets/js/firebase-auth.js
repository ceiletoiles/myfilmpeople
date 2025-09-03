// Firebase Authentication Module
// Clean, organized Firebase authentication implementation

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class FirebaseAuthManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.user = null;
    this.googleProvider = new GoogleAuthProvider();
    this.hasCloudDataLoaded = false; // Prevent duplicate merging
    this.isHandlingSignIn = false; // Prevent duplicate sign-in handling
    this.isExplicitLogout = false; // Flag to track explicit logout
    
    this.init();
  }
  
  init() {
    try {
      console.log('🔄 Initializing Firebase...');
      
      // Get Firebase config
      const firebaseConfig = {
        apiKey: CONFIG?.FIREBASE?.API_KEY,
        authDomain: CONFIG?.FIREBASE?.AUTH_DOMAIN,
        projectId: CONFIG?.FIREBASE?.PROJECT_ID,
        storageBucket: CONFIG?.FIREBASE?.STORAGE_BUCKET,
        messagingSenderId: CONFIG?.FIREBASE?.MESSAGING_SENDER_ID,
        appId: CONFIG?.FIREBASE?.APP_ID
      };
      
      // Validate config
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key-here') {
        console.log('📱 Firebase config not available');
        return;
      }
      
      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      
      // Set up auth state listener
      onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        if (user) {
          console.log('✅ User signed in:', user.email);
          // Don't immediately handle sign in - let explicit login handle it
          if (!this.isHandlingSignIn) {
            this.handleUserSignedIn(user);
          }
        } else {
          console.log('📤 User signed out');
          this.handleUserSignedOut();
        }
      });
      
      // Connect to UI immediately
      this.connectAuthUI();
      
      // Add window focus handlers to force UI updates
      this.setupWindowHandlers();
      
      console.log('✅ Firebase initialized successfully');
      
    } catch (error) {
      console.log('❌ Firebase initialization failed:', error.message);
    }
  }
  
  // Authentication methods
  async signUpWithEmail(email, password, displayName = '') {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Create user document in Firestore
      await this.createUserDocument(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error.code));
    }
  }
  
  async signInWithEmail(email, password) {
    try {
      this.isHandlingSignIn = true; // Prevent auth state listener from interfering
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Explicitly handle sign in after successful authentication
      setTimeout(() => {
        this.handleUserSignedIn(userCredential.user);
        this.isHandlingSignIn = false;
      }, 100);
      
      return userCredential.user;
    } catch (error) {
      this.isHandlingSignIn = false;
      throw new Error(this.getReadableErrorMessage(error.code));
    }
  }
  
  async signInWithGoogle() {
    try {
      this.isHandlingSignIn = true; // Prevent auth state listener from interfering
      const userCredential = await signInWithPopup(this.auth, this.googleProvider);
      
      // Create user document if new user
      await this.createUserDocument(userCredential.user);
      
      // Explicitly handle sign in after successful authentication
      setTimeout(() => {
        this.handleUserSignedIn(userCredential.user);
        this.isHandlingSignIn = false;
      }, 100);
      
      return userCredential.user;
    } catch (error) {
      this.isHandlingSignIn = false;
      throw new Error(this.getReadableErrorMessage(error.code));
    }
  }
  
  // Separate function for explicit logout action
  async handleExplicitLogout() {
    try {
      console.log('👋 EXPLICIT LOGOUT - clearing all user data');
      console.log('📊 Current localStorage before logout:', {
        myfilmpeople_data: !!localStorage.getItem('myfilmpeople_data'),
        firebase_auth_user: localStorage.getItem('firebase_auth_user'),
        firebase_user_name: localStorage.getItem('firebase_user_name')
      });
      
      // Set flag to indicate this is an explicit logout
      this.isExplicitLogout = true;
      
      // Clear ALL user data on explicit logout
      localStorage.removeItem('myfilmpeople_data');
      localStorage.removeItem('myfilmpeople_backup');
      localStorage.removeItem('myfilmpeople_metadata');
      
      console.log('🗑️ Cleared all localStorage data for explicit logout');
      
      // Clear in-memory data as well
      if (window.db) {
        window.db.people = [];
        window.db.nextId = 1;
        console.log('🧹 Cleared in-memory database');
      }
      
      if (window.uiManager) {
        window.uiManager.people = [];
        window.uiManager.renderPeople();
        console.log('🧹 Cleared UI data and rendered empty state');
      }
      
      // Sign out from Firebase
      await this.signOut();
      
      console.log('✅ Explicit logout complete - all data cleared');
      
    } catch (error) {
      console.error('❌ Error during explicit logout:', error);
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.log('Sign out error:', error);
    }
  }
  
  // User document management
  async createUserDocument(user) {
    try {
      const userDocRef = doc(this.db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        console.log('✅ User document created');
      } else {
        // Update last login
        await updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log('User document error:', error);
    }
  }
  
  // Data migration from localStorage to Firestore
  async migrateLocalStorageData() {
    if (!this.user || !window.uiManager) return;
    
    try {
      console.log('🔄 Migrating localStorage data to cloud...');
      
      // Get FRESH data from localStorage (not UI state)
      const freshLocalData = JSON.parse(localStorage.getItem('myfilmpeople_data') || '[]');
      const localPeople = freshLocalData.filter(person => person && person.name);
      const peopleCount = localPeople.length;
      
      console.log('📱 Fresh local data for migration:', peopleCount, 'people');
      console.log('📱 People to migrate:', localPeople.map(p => `${p.name} (${p.role})`));
      
      if (peopleCount === 0) {
        console.log('📱 No local data to migrate');
        
        // Still update UI to show empty state
        window.uiManager.people = [];
        this.forceUIUpdate();
        
        this.showMessage('Account ready! Start adding people.', 'success');
        return;
      }
      
      // Create user document in Firestore
      const userDocRef = doc(this.db, 'users', this.user.uid);
      await setDoc(userDocRef, {
        email: this.user.email,
        displayName: this.user.displayName || 'Film Lover',
        lastSync: new Date().toISOString(),
        peopleCount: peopleCount
      }, { merge: true });
      
      // Migrate each person to Firestore with batch write
      const userPeopleRef = collection(this.db, 'users', this.user.uid, 'people');
      const batch = writeBatch(this.db);
      const newPeopleData = [];
      
      for (const person of localPeople) {
        const personDocRef = doc(userPeopleRef);
        const personData = {
          ...person,
          migratedAt: new Date().toISOString(),
          originalLocalId: person.id
        };
        
        batch.set(personDocRef, personData);
        
        // Add to new data array with Firestore ID
        newPeopleData.push({
          ...personData,
          firestoreId: personDocRef.id
        });
      }
      
      await batch.commit();
      
      // Update local storage with Firestore IDs and force UI update
      window.uiManager.people = newPeopleData;
      window.uiManager.savePeopleData();
      this.forceUIUpdate();
      
      console.log(`✅ Migrated ${peopleCount} people to cloud`);
      this.showMessage(`Synced ${peopleCount} people to cloud!`, 'success');
      
      // IMPORTANT: After successful migration, clear any temporary localStorage flags
      // The data is now safely in cloud and will be managed from there
      localStorage.removeItem('myfilmpeople_meta');
      console.log('🧹 Cleared migration metadata - data now fully cloud-managed');
      
    } catch (error) {
      console.log('Migration error:', error);
      this.showMessage('Migration failed, but your local data is safe', 'error');
    }
  }
  
  // Save person to cloud when added/edited
  async savePersonToCloud(person) {
    if (!this.user) return;
    
    try {
      const userPeopleRef = collection(this.db, 'users', this.user.uid, 'people');
      
      if (person.firestoreId) {
        // Existing cloud person - update using Firestore ID
        const personDoc = doc(this.db, 'users', this.user.uid, 'people', person.firestoreId);
        await updateDoc(personDoc, {
          ...person,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Person updated in cloud:', person.name);
      } else {
        // New person - add to cloud
        const docRef = await addDoc(userPeopleRef, {
          ...person,
          originalLocalId: person.id, // Save the original local ID
          createdAt: new Date().toISOString()
        });
        
        // Update local data with Firestore ID
        person.firestoreId = docRef.id;
        
        // Find and update the person in both UI and database arrays
        const personIndex = window.uiManager.people.findIndex(p => p.id === person.id);
        if (personIndex !== -1) {
          window.uiManager.people[personIndex] = person;
          window.uiManager.savePeopleData();
        }
        
        // Also update the main database
        const dbPersonIndex = window.db.people.findIndex(p => p.id === person.id);
        if (dbPersonIndex !== -1) {
          window.db.people[dbPersonIndex] = person;
          window.db.saveToStorage();
        }
        
        console.log('✅ Person added to cloud with Firestore ID:', person.name, docRef.id);
      }
      
    } catch (error) {
      console.log('Error saving person to cloud:', error);
    }
  }
  
  // Delete person from cloud using TMDB ID as primary identifier
  async deletePersonFromCloudByTmdbId(personData) {
    if (!this.user) {
      console.log('❌ No user logged in for cloud deletion');
      return;
    }
    
    try {
      console.log('🗑️ Starting STRICT cloud deletion by TMDB ID:', {
        name: personData.name,
        role: personData.role,
        tmdbId: personData.tmdbId,
        localId: personData.id,
        firestoreId: personData.firestoreId
      });
      
      // Set flag to prevent automatic cloud reloading during deletion
      this.isDeletingFromCloud = true;
      
      const userDoc = doc(this.db, 'users', this.user.uid);
      const peopleCollection = collection(userDoc, 'people');
      let deletedCount = 0;
      
      // Strategy 1: If we have a Firestore ID, use it directly
      if (personData.firestoreId) {
        console.log('🗑️ Deleting by Firestore ID:', personData.firestoreId);
        const personDoc = doc(this.db, 'users', this.user.uid, 'people', personData.firestoreId);
        await deleteDoc(personDoc);
        deletedCount++;
        console.log('✅ Person deleted from cloud using Firestore ID');
      }
      
      // Strategy 2: Search and delete by TMDB ID (for companies and people)
      if (personData.tmdbId) {
        console.log('🔍 Searching for ALL matches by TMDB ID:', personData.tmdbId);
        
        const tmdbQuery = query(
          peopleCollection,
          where('tmdbId', '==', personData.tmdbId)
          // Note: Removed role filter to catch companies that might have different role representations
        );
        
        const tmdbSnapshot = await getDocs(tmdbQuery);
        
        if (!tmdbSnapshot.empty) {
          console.log(`🔍 Found ${tmdbSnapshot.docs.length} documents with TMDB ID ${personData.tmdbId}`);
          
          const deletePromises = tmdbSnapshot.docs.map(async (docSnap) => {
            const docData = docSnap.data();
            console.log('🗑️ Deleting TMDB match:', {
              docId: docSnap.id,
              name: docData.name,
              role: docData.role,
              tmdbId: docData.tmdbId
            });
            await deleteDoc(docSnap.ref);
            return 1;
          });
          
          const results = await Promise.all(deletePromises);
          deletedCount += results.length;
          console.log(`✅ Deleted ${results.length} documents by TMDB ID`);
        }
      }
      
      // Strategy 3: Search and delete by name + role (comprehensive cleanup)
      console.log('🔍 Additional search by name + role for comprehensive cleanup');
      const nameQuery = query(
        peopleCollection, 
        where('name', '==', personData.name),
        where('role', '==', personData.role)
      );
      
      const nameSnapshot = await getDocs(nameQuery);
      
      if (!nameSnapshot.empty) {
        console.log(`🔍 Found ${nameSnapshot.docs.length} additional documents by name+role`);
        
        const deletePromises = nameSnapshot.docs.map(async (docSnap) => {
          const docData = docSnap.data();
          console.log('🗑️ Deleting name+role match:', {
            docId: docSnap.id,
            name: docData.name,
            role: docData.role,
            tmdbId: docData.tmdbId
          });
          await deleteDoc(docSnap.ref);
          return 1;
        });
        
        const results = await Promise.all(deletePromises);
        deletedCount += results.length;
        console.log(`✅ Deleted ${results.length} additional documents by name+role`);
      }
      
      console.log(`🎯 STRICT DELETION COMPLETE: Deleted ${deletedCount} total documents for ${personData.name}`);
      
      // Wait a moment to ensure Firestore sync is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Error in strict cloud deletion:', error);
      // Don't throw - local deletion should still work
    } finally {
      // Always clear the flag
      this.isDeletingFromCloud = false;
    }
  }

  // Legacy method - keeping for backward compatibility
  async deletePersonFromCloud(personId, personData = null) {
    if (!this.user) {
      console.log('❌ No user logged in for cloud deletion');
      return;
    }
    
    try {
      console.log('🗑️ Starting cloud deletion for ID:', personId);
      
      // Try to find the person data if not provided
      if (!personData) {
        personData = window.uiManager?.people?.find(p => p.id === personId) || 
                     window.db?.people?.find(p => p.id === personId);
      }
      
      if (!personData) {
        console.log('❌ Person data not found for cloud deletion:', personId);
        return;
      }
      
      console.log('🗑️ Found person for cloud deletion:', {
        name: personData.name,
        role: personData.role,
        localId: personData.id,
        firestoreId: personData.firestoreId
      });
      
      // If we have a Firestore ID, delete directly
      if (personData.firestoreId) {
        console.log('🗑️ Deleting from cloud using Firestore ID:', personData.firestoreId);
        const personDoc = doc(this.db, 'users', this.user.uid, 'people', personData.firestoreId);
        await deleteDoc(personDoc);
        console.log('✅ Person deleted from cloud using Firestore ID:', personData.name);
        return;
      }
      
      // If no Firestore ID, find by matching data
      console.log('🔍 No Firestore ID, searching for person in cloud...');
      const userDoc = doc(this.db, 'users', this.user.uid);
      const peopleCollection = collection(userDoc, 'people');
      
      // Query for the person by name and role (unique combination)
      const q = query(
        peopleCollection, 
        where('name', '==', personData.name),
        where('role', '==', personData.role)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('❌ Person not found in cloud for deletion:', personData.name);
        return;
      }
      
      // Delete all matching documents (should be only one)
      const deletePromises = snapshot.docs.map(doc => {
        console.log('🗑️ Deleting cloud document:', doc.id, 'for', personData.name);
        return deleteDoc(doc.ref);
      });
      await Promise.all(deletePromises);
      
      console.log('✅ Person deleted from cloud (by search):', personData.name, `(${deletePromises.length} docs)`);
      
    } catch (error) {
      console.error('❌ Error deleting person from cloud:', error);
      // Don't throw - local deletion should still work
    }
  }
  
  // UI Integration
  connectAuthUI() {
    try {
      console.log('🔗 Connecting Firebase to auth forms...');
      
      // Login form
      const loginForm = document.getElementById('loginForm');
      if (loginForm && !loginForm.hasAttribute('firebase-connected')) {
        loginForm.setAttribute('firebase-connected', 'true');
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.handleLoginSubmit();
        });
      }
      
      // Register form
      const registerForm = document.getElementById('registerForm');
      if (registerForm && !registerForm.hasAttribute('firebase-connected')) {
        registerForm.setAttribute('firebase-connected', 'true');
        registerForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.handleRegisterSubmit();
        });
      }
      
      // Google sign-in buttons
      const googleBtns = document.querySelectorAll('#googleSignInBtn, #googleSignInRegisterBtn');
      googleBtns.forEach(btn => {
        if (!btn.hasAttribute('firebase-connected')) {
          btn.setAttribute('firebase-connected', 'true');
          btn.addEventListener('click', () => this.handleGoogleSignIn());
        }
      });
      
      // Setup logout modal
      this.setupLogoutModal();
      
      console.log('✅ Auth UI connected');
    } catch (error) {
      console.log('UI connection error:', error);
    }
  }
  
  // Setup window event handlers to force UI updates
  setupWindowHandlers() {
    let lastUpdate = 0;
    const UPDATE_THROTTLE = 1000; // Limit updates to once per second
    
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate > UPDATE_THROTTLE && window.uiManager) {
        lastUpdate = now;
        console.log('� Throttled UI update triggered');
        this.forceUIUpdate();
      }
    };
    
    // Force UI update when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 Page visible - forcing UI update');
        throttledUpdate();
      }
    });
    
    // Force UI update on window focus
    window.addEventListener('focus', () => {
      console.log('🎯 Window focused - forcing UI update');
      throttledUpdate();
    });
  }

  // Setup logout confirmation modal
  setupLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    const logoutCancel = document.getElementById('logoutCancel');
    const logoutConfirm = document.getElementById('logoutConfirm');
    const logoutModalClose = document.getElementById('logoutModalClose');
    
    if (logoutCancel) {
      logoutCancel.addEventListener('click', () => {
        logoutModal.classList.add('hidden');
        logoutModal.style.display = 'none';
      });
    }
    
    if (logoutConfirm) {
      logoutConfirm.addEventListener('click', () => {
        logoutModal.classList.add('hidden');
        logoutModal.style.display = 'none';
        this.handleExplicitLogout(); // Use explicit logout to clear all data
      });
    }
    
    if (logoutModalClose) {
      logoutModalClose.addEventListener('click', () => {
        logoutModal.classList.add('hidden');
        logoutModal.style.display = 'none';
      });
    }
    
    // Click outside to close
    if (logoutModal) {
      logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
          logoutModal.classList.add('hidden');
          logoutModal.style.display = 'none';
        }
      });
    }
  }
  
  // Show logout confirmation modal
  showLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
      logoutModal.classList.remove('hidden');
      logoutModal.style.display = 'block';
    }
  }
  
  // Form handlers
  async handleLoginSubmit() {
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      this.showMessage('Signing in...', 'info');
      await this.signInWithEmail(email, password);
      
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }
  
  async handleRegisterSubmit() {
    try {
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('registerConfirmPassword').value;
      const displayName = document.getElementById('registerDisplayName').value;
      
      if (password !== confirmPassword) {
        this.showMessage('Passwords do not match', 'error');
        return;
      }
      
      this.showMessage('Creating account...', 'info');
      await this.signUpWithEmail(email, password, displayName);
      
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }
  
  async handleGoogleSignIn() {
    try {
      this.showMessage('Signing in with Google...', 'info');
      await this.signInWithGoogle();
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }
  
  // Auth state handlers
  handleUserSignedIn(user) {
    try {
      // Store auth state for fast loading
      localStorage.setItem('firebase_auth_user', 'true');
      localStorage.setItem('firebase_user_name', user.displayName || user.email.split('@')[0] || 'User');
      
      // Close auth modal
      const authModal = document.getElementById('authModal');
      if (authModal) {
        authModal.classList.add('hidden');
        authModal.style.display = 'none';
      }
      
      // Update sign-in button
      this.updateSignInButton(user);
      
      // Remove migration prompt if it exists (user is now logged in)
      const migrationPrompt = document.querySelector('.migration-prompt');
      if (migrationPrompt) {
        migrationPrompt.remove();
      }
      
      // Show welcome message
      this.showMessage('Welcome! Loading your data...', 'success');
      
      // CRITICAL: Delay cloud data loading to prevent overwriting fresh local data
      setTimeout(() => {
        this.loadUserDataFromCloud();
      }, 1000);
      
    } catch (error) {
      console.log('Sign-in handler error:', error);
    }
  }
  
  // Load user data from Firestore
  async loadUserDataFromCloud() {
    if (!this.user || !window.uiManager) return;
    
    try {
      console.log('🔄 Loading user data from cloud...');
      
      // IMPORTANT: Get FRESH local data from localStorage (not from UI state)
      const freshLocalData = JSON.parse(localStorage.getItem('myfilmpeople_data') || '[]');
      const currentLocalPeople = freshLocalData.filter(person => person && person.name); // Remove invalid entries
      const localCount = currentLocalPeople.length;
      
      console.log('📱 Fresh local data count:', localCount);
      console.log('📱 Local people:', currentLocalPeople.map(p => `${p.name} (${p.role})`));
      
      const userPeopleRef = collection(this.db, 'users', this.user.uid, 'people');
      const querySnapshot = await getDocs(userPeopleRef);
      
      // Convert Firestore docs to array format (app uses arrays)
      const cloudPeople = [];
      let nextLocalId = window.db ? window.db.getNextId() : 1; // Get next available local ID
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const person = { 
          id: docData.originalLocalId || nextLocalId++, // Use original local ID or assign new one
          ...docData,
          firestoreId: doc.id // Keep track of Firestore document ID for future operations
        };
        
        // Skip if this person was recently deleted locally
        if (window.db && window.db.wasRecentlyDeleted && window.db.wasRecentlyDeleted(person)) {
          console.log(`⏭️ Skipping recently deleted cloud person: ${person.name} (${person.role})`);
          return;
        }
        
        cloudPeople.push(person);
      });
      
      const cloudCount = cloudPeople.length;
      
      console.log(`📊 Found ${cloudCount} people in cloud, ${localCount} locally`);
      
      if (cloudCount > 0) {
        // Deduplicate cloud data first
        const deduplicatedCloudPeople = this.deduplicateArray(cloudPeople);
        console.log(`🧹 Deduplicated cloud data: ${cloudPeople.length} → ${deduplicatedCloudPeople.length}`);
        
        // User has cloud data - decide merge strategy
        if (localCount > 0) {
          // ALWAYS merge if there's local data (even if we've loaded cloud before)
          console.log('🔄 Merging local data with cloud data...');
          console.log(`📊 Before merge: ${deduplicatedCloudPeople.length} cloud + ${localCount} local`);
          await this.mergeLocalAndCloudData(deduplicatedCloudPeople, currentLocalPeople);
        } else {
          // Only cloud data, no local data
          console.log('☁️ Loading cloud data only (no local data)');
          window.uiManager.people = deduplicatedCloudPeople;
          window.uiManager.savePeopleData();
          
          // Force immediate UI update with multiple approaches
          this.forceUIUpdate();
          
          this.showMessage(`Loaded ${deduplicatedCloudPeople.length} people from cloud!`, 'success');
        }
      } else if (localCount > 0) {
        // No cloud data but has local data - migrate it
        console.log('📱 Migrating local data to cloud');
        this.migrateLocalStorageData();
      } else {
        // No data anywhere
        console.log('🆕 No data found anywhere');
        window.uiManager.people = [];
        
        // Force immediate UI update
        this.forceUIUpdate();
        
        this.showMessage('Account ready! Start adding people.', 'success');
      }
      
    } catch (error) {
      console.log('Error loading cloud data:', error);
      this.showMessage('Using local data only', 'info');
    }
  }
  
  // Force UI update - single render to prevent conflicts
  forceUIUpdate() {
    // Skip if we're in the middle of a cloud deletion
    if (this.isDeletingFromCloud) {
      console.log('🚫 Skipping UI update during cloud deletion');
      return;
    }
    
    // Single render call to prevent conflicts
    if (window.uiManager && window.uiManager.renderAllPeople) {
      console.log('🔄 Forcing UI update...');
      window.uiManager.renderAllPeople();
    }
  }

  // Deduplicate array of people by name + role
  deduplicateArray(people) {
    const seen = new Set();
    const tmdbSeen = new Set();
    const deduplicated = [];
    
    for (const person of people) {
      let isDuplicate = false;
      
      // Primary deduplication: TMDB ID + role
      if (person.tmdbId) {
        const tmdbKey = `${person.tmdbId}|${person.role?.toLowerCase().trim()}`;
        if (tmdbSeen.has(tmdbKey)) {
          console.log(`🗑️ Removing TMDB duplicate: ${person.name} (TMDB: ${person.tmdbId}, ${person.role})`);
          isDuplicate = true;
        } else {
          tmdbSeen.add(tmdbKey);
        }
      }
      
      // Fallback deduplication: name + role
      if (!isDuplicate) {
        const nameKey = `${person.name?.toLowerCase().trim()}|${person.role?.toLowerCase().trim()}`;
        if (seen.has(nameKey)) {
          console.log(`🗑️ Removing name duplicate: ${person.name} (${person.role})`);
          isDuplicate = true;
        } else {
          seen.add(nameKey);
        }
      }
      
      if (!isDuplicate) {
        deduplicated.push(person);
      }
    }
    
    return deduplicated;
  }
  
  // One-time cleanup function for existing duplicates
  async cleanupDuplicates() {
    if (!this.user || !confirm('Clean up duplicate profiles? This will remove exact duplicates from your cloud data.')) return;
    
    try {
      console.log('🧹 Starting duplicate cleanup...');
      
      const userPeopleRef = collection(this.db, 'users', this.user.uid, 'people');
      const querySnapshot = await getDocs(userPeopleRef);
      
      const allPeople = [];
      querySnapshot.forEach((doc) => {
        allPeople.push({
          docId: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📊 Found ${allPeople.length} total people in database`);
      
      // Find duplicates using TMDB ID priority
      const seen = new Map();
      const tmdbSeen = new Map();
      const duplicatesToDelete = [];
      
      for (const person of allPeople) {
        let isDuplicate = false;
        
        // Primary duplicate detection: TMDB ID + role
        if (person.tmdbId) {
          const tmdbKey = `${person.tmdbId}|${person.role?.toLowerCase().trim()}`;
          if (tmdbSeen.has(tmdbKey)) {
            // This is a TMDB duplicate
            duplicatesToDelete.push(person);
            console.log(`🗑️ TMDB duplicate: ${person.name} (TMDB: ${person.tmdbId}, ${person.role}) - ${person.docId}`);
            isDuplicate = true;
          } else {
            // First occurrence with this TMDB ID - keep it
            tmdbSeen.set(tmdbKey, person);
          }
        }
        
        // Fallback duplicate detection: name + role (only if not already marked as duplicate)
        if (!isDuplicate) {
          const nameKey = `${person.name?.toLowerCase().trim()}|${person.role?.toLowerCase().trim()}`;
          if (seen.has(nameKey)) {
            // This is a name duplicate
            duplicatesToDelete.push(person);
            console.log(`🗑️ Name duplicate: ${person.name} (${person.role}) - ${person.docId}`);
          } else {
            // First occurrence with this name - keep it
            seen.set(nameKey, person);
          }
        }
      }
      
      if (duplicatesToDelete.length === 0) {
        this.showMessage('No duplicates found!', 'success');
        return;
      }
      
      console.log(`🗑️ Deleting ${duplicatesToDelete.length} duplicates...`);
      
      // Delete duplicates
      const batch = writeBatch(this.db);
      for (const duplicate of duplicatesToDelete) {
        const docRef = doc(this.db, 'users', this.user.uid, 'people', duplicate.docId);
        batch.delete(docRef);
      }
      
      await batch.commit();
      
      this.showMessage(`Cleaned up ${duplicatesToDelete.length} duplicate profiles!`, 'success');
      
      // Reload data
      setTimeout(() => {
        this.loadUserDataFromCloud();
      }, 1000);
      
    } catch (error) {
      console.log('Cleanup error:', error);
      this.showMessage('Cleanup failed, but your data is safe', 'error');
    }
  }
  
  // Merge local and cloud data
  async mergeLocalAndCloudData(cloudPeople, localPeople) {
    try {
      console.log('🔄 Merging local and cloud data...');
      console.log('Cloud people before merge:', cloudPeople.length);
      console.log('Local people before merge:', localPeople.length);
      
      const mergedPeople = [...cloudPeople]; // Start with cloud data
      let newCount = 0;
      
      // Add local people that aren't in cloud (TMDB ID-based duplicate detection)
      for (const localPerson of localPeople) {
        // Skip if this person was recently deleted
        if (window.db && window.db.wasRecentlyDeleted && window.db.wasRecentlyDeleted(localPerson)) {
          console.log(`⏭️ Skipping recently deleted person: ${localPerson.name} (${localPerson.role})`);
          continue;
        }
        
        const existsInCloud = cloudPeople.some(cloudPerson => {
          // Primary match: TMDB ID (most reliable)
          if (localPerson.tmdbId && cloudPerson.tmdbId) {
            const tmdbMatch = cloudPerson.tmdbId === localPerson.tmdbId;
            const roleMatch = cloudPerson.role?.toLowerCase().trim() === localPerson.role?.toLowerCase().trim();
            if (tmdbMatch && roleMatch) {
              console.log(`🎯 TMDB ID match found: ${localPerson.name} (TMDB: ${localPerson.tmdbId})`);
              return true;
            }
          }
          
          // Fallback match: name AND role (case insensitive and trimmed)
          const nameMatch = cloudPerson.name?.toLowerCase().trim() === localPerson.name?.toLowerCase().trim();
          const roleMatch = cloudPerson.role?.toLowerCase().trim() === localPerson.role?.toLowerCase().trim();
          return nameMatch && roleMatch;
        });
        
        if (!existsInCloud) {
          console.log(`➕ Adding new person from local: ${localPerson.name} (${localPerson.role})`);
          
          // Add to cloud
          const userPeopleRef = collection(this.db, 'users', this.user.uid, 'people');
          const docRef = await addDoc(userPeopleRef, {
            ...localPerson,
            mergedAt: new Date().toISOString()
          });
          
          // Add to merged data with Firestore ID
          mergedPeople.push({ 
            ...localPerson, 
            firestoreId: docRef.id 
          });
          newCount++;
        } else {
          console.log(`⏭️ Skipping duplicate: ${localPerson.name} (${localPerson.role}) - already in cloud`);
        }
      }
      
      console.log(`📊 Merge complete: ${mergedPeople.length} total people (added ${newCount} new)`);
      
      // Update UI with merged data
      window.uiManager.people = mergedPeople;
      window.uiManager.savePeopleData();
      
      // Force UI update after merge
      this.forceUIUpdate();
      
      const totalCount = mergedPeople.length;
      if (newCount > 0) {
        this.showMessage(`Merged! You now have ${totalCount} people (added ${newCount} from local data).`, 'success');
      } else {
        this.showMessage(`Loaded ${totalCount} people from cloud!`, 'success');
      }
      
    } catch (error) {
      console.log('Merge error:', error);
      this.showMessage('Merge failed, but your data is safe', 'error');
    }
  }
  
  handleUserSignedOut() {
    try {
      const isExplicit = this.isExplicitLogout;
      console.log('📤 User signed out - clearing auth state only (NOT user data)', isExplicit ? '(EXPLICIT LOGOUT)' : '(AUTH STATE CHANGE)');
      console.log('📊 Current localStorage before auth cleanup:', {
        myfilmpeople_data: !!localStorage.getItem('myfilmpeople_data'),
        firebase_auth_user: localStorage.getItem('firebase_auth_user'),
        firebase_user_name: localStorage.getItem('firebase_user_name')
      });
      
      // Clear auth state from localStorage
      localStorage.removeItem('firebase_auth_user');
      localStorage.removeItem('firebase_user_name');
      
      console.log('🔑 Cleared auth tokens only - user data preserved');
      
      // Reset cloud data flag
      this.hasCloudDataLoaded = false;
      
      if (isExplicit) {
        console.log('🗑️ Explicit logout - keeping UI empty');
        // For explicit logout, keep everything cleared
        if (window.db) {
          window.db.people = [];
        }
        
        if (window.uiManager) {
          window.uiManager.people = [];
          window.uiManager.renderPeople();
        }
        
        // Show welcome message for explicit logout
        const content = document.querySelector('.content');
        const welcomeMessage = document.querySelector('.welcome-message');
        if (content) content.style.display = 'none';
        if (welcomeMessage) welcomeMessage.style.display = 'flex';
        
        // Reset the flag
        this.isExplicitLogout = false;
      } else {
        console.log('🔄 Auth state change - preserving current data if exists');
        // For regular auth state changes, preserve current data if we have any
        if (window.db) {
          const currentDataCount = window.db.people.length;
          console.log('📊 Current data count:', currentDataCount);
          
          if (currentDataCount === 0) {
            // Only load from storage if we have no current data
            console.log('📱 No current data - loading from storage');
            window.db.needsDataReload = true; // Signal that reload is needed
            const localData = window.db.loadFromStorage();
          
          // Filter out any data that came from cloud (has firestoreId or was migrated)
          const pureLocalData = localData.filter(person => {
            const isCloudData = person.firestoreId || 
                              person.migratedAt || 
                              person.mergedAt ||
                              person.originalLocalId !== undefined;
            
            if (isCloudData) {
              console.log('� Filtering out cloud data:', person.name, '(has cloud markers)');
              return false;
            }
            return true;
          });
          
          window.db.people = pureLocalData;
          console.log('🔄 Loaded pure local data only:', pureLocalData.length, 'people');
        }
        }
        
        // Update UI with current data
        if (window.uiManager) {
          window.uiManager.people = window.db.people;
          window.uiManager.renderPeople();
          this.forceUIUpdate();
          
          // Show content if we have data, otherwise show welcome
          const content = document.querySelector('.content');
          const welcomeMessage = document.querySelector('.welcome-message');
          if (window.db.people.length > 0) {
            if (content) content.style.display = 'block';
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            this.showMessage(`Welcome back! You have ${window.db.people.length} local profiles.`, 'info');
          } else {
            if (content) content.style.display = 'none';
            if (welcomeMessage) welcomeMessage.style.display = 'flex';
            this.showMessage('Welcome! Sign in to sync your data.', 'info');
          }
        }
      }
      
      // Reset sign-in button properly with forced update
      this.updateSignInButtonToLogin();
      
      // Add migration prompt back if user has local data
      setTimeout(() => {
        const peopleCount = JSON.parse(localStorage.getItem('myfilmpeople_data') || '[]').length;
        if (peopleCount > 0 && window.addMigrationPrompt) {
          window.addMigrationPrompt(peopleCount);
        }
      }, 100);
      
      this.showMessage('Signed out successfully', 'success');
      
    } catch (error) {
      console.log('Sign-out handler error:', error);
    }
  }
  
  // Helper to reset sign-in button to login state
  updateSignInButtonToLogin() {
    const signInBtn = document.getElementById('showLoginBtn');
    if (signInBtn) {
      signInBtn.textContent = 'Sign In';
      signInBtn.disabled = false;
      
      // Remove existing event listeners by cloning
      const newBtn = signInBtn.cloneNode(true);
      signInBtn.parentNode.replaceChild(newBtn, signInBtn);
      
      // Add fresh login handler
      newBtn.addEventListener('click', () => {
        const authModal = document.getElementById('authModal');
        if (authModal) {
          authModal.classList.remove('hidden');
          authModal.style.display = 'block';
        }
      });
      
      // Force visual update
      requestAnimationFrame(() => {
        newBtn.textContent = 'Sign In';
      });
    }
  }

  // UI helpers
  updateSignInButton(user) {
    try {
      const signInBtn = document.getElementById('showLoginBtn');
      if (signInBtn) {
        // Enable button immediately
        signInBtn.disabled = false;
        
        // Clear any existing state first
        signInBtn.textContent = '...';
        
        // Double check current auth state
        const currentUser = this.auth?.currentUser;
        const isLoggedIn = localStorage.getItem('firebase_auth_user') === 'true';
        
        if (currentUser && isLoggedIn) { 
          const displayName = currentUser.displayName || currentUser.email.split('@')[0] || 'User';
          
          // Remove existing event listeners by cloning the element
          const newBtn = signInBtn.cloneNode(true);
          signInBtn.parentNode.replaceChild(newBtn, signInBtn);
          
          // Set logged in state
          newBtn.textContent = displayName;
          newBtn.onclick = () => {
            console.log('User button clicked - showing logout modal');
            this.showLogoutModal();
          };
          
          console.log('✅ Button updated for logged in user:', displayName);
        } else {
          // Remove existing event listeners by cloning the element
          const newBtn = signInBtn.cloneNode(true);
          signInBtn.parentNode.replaceChild(newBtn, signInBtn);
          
          // Set logged out state
          newBtn.textContent = 'Sign In';
          newBtn.addEventListener('click', () => {
            console.log('Sign In button clicked - showing auth modal');
            const authModal = document.getElementById('authModal');
            if (authModal) {
              authModal.classList.remove('hidden');
              authModal.style.display = 'block';
            }
          });
          
          console.log('✅ Button updated for sign in');
        }
      }
    } catch (error) {
      console.log('Button update error:', error);
    }
  }
  
  showMessage(message, type) {
    try {
      const authError = document.getElementById('authError');
      if (authError) {
        authError.textContent = message;
        authError.className = `auth-message ${type}`;
        authError.classList.remove('hidden');
        
        if (type === 'success') {
          setTimeout(() => authError.classList.add('hidden'), 3000);
        }
      }
    } catch (error) {
      console.log('Message display error:', error);
    }
  }
  
  // Error message helper
  getReadableErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/too-many-requests': 'Too many failed attempts. Try again later.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Check your connection.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }
}

// Make cleanup function available globally for manual cleanup
window.cleanupDuplicates = () => {
  if (window.firebaseAuth) {
    window.firebaseAuth.cleanupDuplicates();
  } else {
    alert('Firebase not initialized or user not logged in');
  }
};

// Export for use in other modules
export { FirebaseAuthManager };

// Initialize Firebase Auth Manager
console.log('🚀 Loading Firebase Auth Manager...');
const firebaseAuth = new FirebaseAuthManager();

// Make available globally for debugging
window.firebaseAuth = firebaseAuth;
