// Improved Firebase Authentication Manager
// Clean, reliable Firebase authentication with proper database sync

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
  deleteDoc,
  query,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class ImprovedFirebaseAuthManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.user = null;
    this.googleProvider = new GoogleAuthProvider();
    this.isInitialized = false;
    this.isSigningIn = false;
    this.isSigningOut = false;
    this.syncInProgress = false;
    
    this.init();
  }
  
  async init() {
    try {
      console.log('🔄 Initializing improved Firebase...');
      
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
        console.log('📱 Firebase config not available - running in offline mode');
        return;
      }
      
      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      
      // Set up auth state listener
      onAuthStateChanged(this.auth, (user) => {
        this.handleAuthStateChange(user);
      });
      
      console.log('✅ Improved Firebase initialized successfully');
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
    }
  }
  
  // === AUTH STATE MANAGEMENT ===
  
  async handleAuthStateChange(user) {
    if (this.isSigningIn || this.isSigningOut) {
      console.log('🔄 Ignoring auth state change during sign in/out process');
      return;
    }
    
    const wasSignedIn = !!this.user;
    this.user = user;
    
    if (user && !wasSignedIn) {
      console.log('✅ User signed in:', user.email);
      await this.handleUserSignedIn(user);
    } else if (!user && wasSignedIn) {
      console.log('📤 User signed out');
      await this.handleUserSignedOut();
    }
  }
  
  async handleUserSignedIn(user) {
    try {
      // Update UI immediately
      this.updateSignInButton(user);
      this.closeAuthModal();
      
      // Store auth state
      localStorage.setItem('firebase_auth_user', 'true');
      localStorage.setItem('firebase_user_name', user.displayName || user.email.split('@')[0]);
      
      // Enable cloud sync in database
      if (window.enhancedDb) {
        window.enhancedDb.enableCloudSync(user);
      }
      
      // Create/update user document
      await this.createUserDocument(user);
      
      // Load and merge data
      await this.loadAndMergeUserData();
      
      this.showMessage('Welcome! Your data is now synced to the cloud.', 'success');
      
    } catch (error) {
      console.error('❌ Error handling user sign in:', error);
      this.showMessage('Signed in, but some features may not work properly.', 'warning');
    }
  }
  
  async handleUserSignedOut() {
    try {
      // Clear auth state
      localStorage.removeItem('firebase_auth_user');
      localStorage.removeItem('firebase_user_name');
      
      // Disable cloud sync in database
      if (window.enhancedDb) {
        window.enhancedDb.disableCloudSync();
      }
      
      // Update UI
      this.updateSignInButton(null);
      
      // Only clear data if this was an explicit logout
      if (this.isSigningOut) {
        console.log('🗑️ Explicit logout - clearing all data');
        this.clearAllUserData();
      }
      
      this.showMessage('Signed out. Your data remains saved locally.', 'info');
      
    } catch (error) {
      console.error('❌ Error handling user sign out:', error);
    }
  }
  
  // === AUTHENTICATION METHODS ===
  
  async signUpWithEmail(email, password, displayName = '') {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      this.isSigningIn = true;
      
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return userCredential.user;
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error.code));
    } finally {
      this.isSigningIn = false;
    }
  }
  
  async signInWithEmail(email, password) {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      this.isSigningIn = true;
      
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error.code));
    } finally {
      this.isSigningIn = false;
    }
  }
  
  async signInWithGoogle() {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      this.isSigningIn = true;
      
      const userCredential = await signInWithPopup(this.auth, this.googleProvider);
      return userCredential.user;
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error.code));
    } finally {
      this.isSigningIn = false;
    }
  }
  
  async signOutUser() {
    if (!this.isInitialized || !this.user) {
      return;
    }
    
    try {
      this.isSigningOut = true;
      await signOut(this.auth);
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      this.isSigningOut = false;
    }
  }
  
  // === USER DOCUMENT MANAGEMENT ===
  
  async createUserDocument(user) {
    if (!this.isInitialized) return;
    
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
        await updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString()
        });
        console.log('✅ User document updated');
      }
    } catch (error) {
      console.error('❌ User document error:', error);
    }
  }
  
  // === DATA SYNC METHODS ===
  
  async loadAndMergeUserData() {
    if (!this.user || this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      console.log('🔄 Loading and merging user data...');
      
      // Load cloud data
      const cloudPeople = await this.getAllCloudPeople();
      
      if (cloudPeople.length === 0) {
        // No cloud data - migrate local data
        await this.migrateLocalDataToCloud();
      } else {
        // Merge cloud data with local
        if (window.enhancedDb) {
          await window.enhancedDb.mergeCloudData(cloudPeople);
          
          // Update UI
          if (window.uiManager) {
            window.uiManager.people = window.enhancedDb.getAllPeople();
            window.uiManager.renderPeople();
          }
        }
      }
      
      console.log('✅ Data sync completed');
      
    } catch (error) {
      console.error('❌ Data sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  async getAllCloudPeople() {
    if (!this.user) return [];
    
    try {
      const peopleRef = collection(this.db, 'users', this.user.uid, 'people');
      const snapshot = await getDocs(peopleRef);
      
      const people = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        people.push({
          ...data,
          firestoreId: doc.id,
          id: data.localId || data.id || doc.id
        });
      });
      
      console.log('☁️ Loaded', people.length, 'people from cloud');
      return people;
      
    } catch (error) {
      console.error('❌ Error loading cloud data:', error);
      return [];
    }
  }
  
  async migrateLocalDataToCloud() {
    if (!this.user || !window.enhancedDb) return;
    
    try {
      const localPeople = window.enhancedDb.getAllPeople();
      
      if (localPeople.length === 0) {
        console.log('📱 No local data to migrate');
        return;
      }
      
      console.log('🔄 Migrating', localPeople.length, 'people to cloud...');
      
      const batch = writeBatch(this.db);
      const peopleRef = collection(this.db, 'users', this.user.uid, 'people');
      
      for (const person of localPeople) {
        const docRef = doc(peopleRef);
        batch.set(docRef, {
          ...person,
          localId: person.id,
          migratedAt: new Date().toISOString()
        });
      }
      
      await batch.commit();
      
      console.log('✅ Migration completed successfully');
      this.showMessage(`Migrated ${localPeople.length} people to cloud!`, 'success');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.showMessage('Migration failed, but your local data is safe', 'error');
    }
  }
  
  // === CLOUD OPERATIONS ===
  
  async savePersonToCloud(person) {
    if (!this.user) return;
    
    try {
      const peopleRef = collection(this.db, 'users', this.user.uid, 'people');
      
      if (person.firestoreId) {
        // Update existing
        const docRef = doc(this.db, 'users', this.user.uid, 'people', person.firestoreId);
        await updateDoc(docRef, {
          ...person,
          lastModified: Date.now(),
          updatedAt: new Date().toISOString()
        });
        console.log('☁️ Updated person in cloud:', person.name);
      } else {
        // Create new
        const docRef = await addDoc(peopleRef, {
          ...person,
          localId: person.id,
          lastModified: Date.now(),
          createdAt: new Date().toISOString()
        });
        
        // Update local reference
        person.firestoreId = docRef.id;
        console.log('☁️ Added person to cloud:', person.name);
      }
      
    } catch (error) {
      console.error('❌ Error saving to cloud:', error);
      throw error;
    }
  }
  
  async deletePersonFromCloudByTmdbId(person) {
    if (!this.user) return;
    
    try {
      console.log('🗑️ Deleting from cloud:', person.name);
      
      const peopleRef = collection(this.db, 'users', this.user.uid, 'people');
      let deletedCount = 0;
      
      // Delete by Firestore ID if available
      if (person.firestoreId) {
        const docRef = doc(this.db, 'users', this.user.uid, 'people', person.firestoreId);
        await deleteDoc(docRef);
        deletedCount++;
      }
      
      // Also search and delete by TMDB ID
      if (person.tmdbId) {
        const q = query(peopleRef, where('tmdbId', '==', person.tmdbId));
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }
      }
      
      // Fallback: search by name and role
      if (deletedCount === 0) {
        const q = query(
          peopleRef,
          where('name', '==', person.name),
          where('role', '==', person.role)
        );
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }
      }
      
      console.log('☁️ Deleted', deletedCount, 'documents from cloud for:', person.name);
      
    } catch (error) {
      console.error('❌ Error deleting from cloud:', error);
      throw error;
    }
  }
  
  // === UI INTEGRATION ===
  
  connectAuthUI() {
    try {
      console.log('🔗 Connecting improved auth UI...');
      
      // Login form
      const loginForm = document.getElementById('loginForm');
      if (loginForm && !loginForm.hasAttribute('firebase-connected')) {
        loginForm.setAttribute('firebase-connected', 'true');
        loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
      }
      
      // Register form
      const registerForm = document.getElementById('registerForm');
      if (registerForm && !registerForm.hasAttribute('firebase-connected')) {
        registerForm.setAttribute('firebase-connected', 'true');
        registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
      }
      
      // Google buttons
      document.querySelectorAll('#googleSignInBtn, #googleSignInRegisterBtn').forEach(btn => {
        if (!btn.hasAttribute('firebase-connected')) {
          btn.setAttribute('firebase-connected', 'true');
          btn.addEventListener('click', () => this.handleGoogleSignIn());
        }
      });
      
      // Logout handling
      this.setupLogoutHandling();
      
      console.log('✅ Improved auth UI connected');
    } catch (error) {
      console.error('❌ UI connection error:', error);
    }
  }
  
  setupLogoutHandling() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.showLogoutModal());
    }
    
    const logoutConfirm = document.getElementById('logoutConfirm');
    if (logoutConfirm) {
      logoutConfirm.addEventListener('click', () => {
        this.closeLogoutModal();
        this.signOutUser();
      });
    }
    
    const logoutCancel = document.getElementById('logoutCancel');
    if (logoutCancel) {
      logoutCancel.addEventListener('click', () => this.closeLogoutModal());
    }
  }
  
  async handleLoginSubmit(e) {
    e.preventDefault();
    
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      this.showMessage('Signing in...', 'info');
      await this.signInWithEmail(email, password);
      
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }
  
  async handleRegisterSubmit(e) {
    e.preventDefault();
    
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
  
  // === UTILITY METHODS ===
  
  updateSignInButton(user) {
    const signInBtn = document.getElementById('signInBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameSpan = document.getElementById('userName');
    
    if (user) {
      if (signInBtn) signInBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (userNameSpan) userNameSpan.textContent = user.displayName || user.email.split('@')[0];
    } else {
      if (signInBtn) signInBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userNameSpan) userNameSpan.textContent = '';
    }
  }
  
  closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.add('hidden');
      authModal.style.display = 'none';
    }
  }
  
  showLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
      logoutModal.classList.remove('hidden');
      logoutModal.style.display = 'block';
    }
  }
  
  closeLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
      logoutModal.classList.add('hidden');
      logoutModal.style.display = 'none';
    }
  }
  
  clearAllUserData() {
    // Clear localStorage
    localStorage.removeItem('myfilmpeople_data');
    localStorage.removeItem('myfilmpeople_metadata');
    localStorage.removeItem('myfilmpeople_deleted');
    
    // Clear database
    if (window.enhancedDb) {
      window.enhancedDb.people = [];
      window.enhancedDb.nextId = 1;
      window.enhancedDb.saveToLocalStorage();
    }
    
    // Clear UI
    if (window.uiManager) {
      window.uiManager.people = [];
      window.uiManager.renderPeople();
    }
  }
  
  showMessage(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Show message in UI if available
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${type}`;
      messageEl.style.display = 'block';
      
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 5000);
    }
  }
  
  getReadableErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }
  
  getCurrentUser() {
    return this.user;
  }
  
  isSignedIn() {
    return !!this.user;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImprovedFirebaseAuthManager };
} else {
  window.ImprovedFirebaseAuthManager = ImprovedFirebaseAuthManager;
}
