// Firebase Configuration and Authentication
// This file handles Firebase initialization and authentication state

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { 
  getFirestore, 
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

// Firebase configuration object
// These values will be loaded from environment variables
const firebaseConfig = {
  apiKey: CONFIG?.FIREBASE?.API_KEY || "your-api-key-here",
  authDomain: CONFIG?.FIREBASE?.AUTH_DOMAIN || "myfilmpeople-default.firebaseapp.com",
  projectId: CONFIG?.FIREBASE?.PROJECT_ID || "myfilmpeople-default",
  storageBucket: CONFIG?.FIREBASE?.STORAGE_BUCKET || "myfilmpeople-default.appspot.com",
  messagingSenderId: CONFIG?.FIREBASE?.MESSAGING_SENDER_ID || "123456789",
  appId: CONFIG?.FIREBASE?.APP_ID || "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Authentication state management
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStateChangeListeners = [];
    this.setupAuthStateListener();
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.notifyAuthStateChange(user);
      
      if (user) {
        console.log('✅ User signed in:', user.email);
        this.updateUIForSignedInUser(user);
      } else {
        console.log('❌ User signed out');
        this.updateUIForSignedOutUser();
      }
    });
  }

  notifyAuthStateChange(user) {
    this.authStateChangeListeners.forEach(callback => callback(user));
  }

  onAuthStateChange(callback) {
    this.authStateChangeListeners.push(callback);
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getReadableError(error) };
    }
  }

  async signUpWithEmail(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Create user document in Firestore
      await this.createUserDocument(userCredential.user, displayName);
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getReadableError(error) };
    }
  }

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Create user document if it doesn't exist
      await this.createUserDocument(result.user);
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: this.getReadableError(error) };
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getReadableError(error) };
    }
  }

  async createUserDocument(user, displayName = null) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          sortOrder: 'alphabetical'
        }
      };
      
      await setDoc(userDocRef, userData);
      console.log('✅ User document created');
    } else {
      // Update last login time
      await updateDoc(userDocRef, {
        lastLoginAt: new Date().toISOString()
      });
    }
  }

  getReadableError(error) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account already exists with this email address.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled.'
    };
    
    return errorMessages[error.code] || error.message;
  }

  updateUIForSignedInUser(user) {
    // Hide login forms, show user profile
    const loginSection = document.getElementById('loginSection');
    const userProfile = document.getElementById('userProfile');
    const addPersonBtn = document.getElementById('addPersonBtn');
    
    if (loginSection) loginSection.style.display = 'none';
    if (userProfile) {
      userProfile.style.display = 'block';
      const userEmail = userProfile.querySelector('.user-email');
      const userName = userProfile.querySelector('.user-name');
      if (userEmail) userEmail.textContent = user.email;
      if (userName) userName.textContent = user.displayName || 'Anonymous User';
    }
    if (addPersonBtn) addPersonBtn.style.display = 'block';
    
    // Enable main app functionality
    this.enableAppFeatures();
  }

  updateUIForSignedOutUser() {
    // Show login forms, hide user profile
    const loginSection = document.getElementById('loginSection');
    const userProfile = document.getElementById('userProfile');
    const addPersonBtn = document.getElementById('addPersonBtn');
    
    if (loginSection) loginSection.style.display = 'block';
    if (userProfile) userProfile.style.display = 'none';
    if (addPersonBtn) addPersonBtn.style.display = 'none';
    
    // Disable main app functionality
    this.disableAppFeatures();
  }

  enableAppFeatures() {
    // Re-enable the main app features
    document.body.classList.remove('auth-required');
    
    // Refresh the people data from Firestore
    if (window.firebaseDB) {
      window.firebaseDB.loadPeopleFromFirestore();
    }
  }

  disableAppFeatures() {
    // Show auth required state
    document.body.classList.add('auth-required');
    
    // Clear any local data
    if (window.firebaseDB) {
      window.firebaseDB.clearLocalData();
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isSignedIn() {
    return !!this.currentUser;
  }
}

// Export instances for use in other files
window.auth = auth;
window.db = db;
window.authManager = new AuthManager();

export { auth, db, AuthManager };
