// Firestore Database Schema and Security Rules
// This document defines the database structure and security rules for MyFilmPeople

/*
=== FIRESTORE COLLECTION STRUCTURE ===

/users/{userId}
  - uid: string
  - email: string
  - displayName: string
  - photoURL: string
  - createdAt: timestamp
  - lastLoginAt: timestamp
  - preferences: object
    - theme: 'dark' | 'light'
    - sortOrder: 'alphabetical' | 'reverse' | 'random'
    - defaultView: 'directors' | 'actors' | 'others' | 'companies'

/users/{userId}/people/{personId}
  - id: number (for compatibility with existing localStorage)
  - name: string
  - role: 'director' | 'actor' | 'writer' | 'cinematographer' | 'composer' | 'producer' | 'editor' | 'studio' | 'other'
  - letterboxdUrl: string (optional)
  - profilePicture: string (optional URL)
  - notes: string (optional)
  - tmdbId: number (optional)
  - dateAdded: timestamp
  - updatedAt: timestamp

/users/{userId}/backups/{backupId} (for migration conflicts)
  - source: 'localStorage_migration' | 'cloud_backup'
  - data: array of people objects
  - createdAt: timestamp
  - reason: string

=== SECURITY RULES ===

Users can only read/write their own data:
- Users/{userId}/* where userId matches auth.uid
- Authenticated users only
- No cross-user data access

=== INDEXES ===

Composite indexes for efficient queries:
- people: role + name (for sorting by role and name)
- people: dateAdded (for chronological sorting)
- people: updatedAt (for sync operations)
*/

// Firestore Security Rules (to be copied to Firebase Console)
const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's people collection
      match /people/{personId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Validate person data structure
        allow create, update: if request.auth != null 
          && request.auth.uid == userId
          && validatePersonData(request.resource.data);
      }
      
      // User's backup collection (for migration data)
      match /backups/{backupId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Helper function to validate person data
    function validatePersonData(data) {
      return data.keys().hasAll(['name', 'role', 'dateAdded']) &&
             data.name is string &&
             data.role in ['director', 'actor', 'writer', 'cinematographer', 'composer', 'producer', 'editor', 'studio', 'other'] &&
             data.dateAdded is string;
    }
  }
}
`;

// Database initialization and helper functions
class FirestoreSchema {
  static async initializeUserDocument(user) {
    const userDoc = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        sortOrder: 'alphabetical',
        defaultView: 'directors'
      }
    };
    
    return userDoc;
  }
  
  static validatePersonData(personData) {
    const requiredFields = ['name', 'role'];
    const validRoles = ['director', 'actor', 'writer', 'cinematographer', 'composer', 'producer', 'editor', 'studio', 'other'];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!personData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate role
    if (!validRoles.includes(personData.role)) {
      throw new Error(`Invalid role: ${personData.role}`);
    }
    
    // Validate data types
    if (typeof personData.name !== 'string') {
      throw new Error('Name must be a string');
    }
    
    if (personData.tmdbId && !Number.isInteger(personData.tmdbId)) {
      throw new Error('TMDb ID must be an integer');
    }
    
    return true;
  }
  
  static preparePersonForFirestore(personData) {
    // Ensure all required fields are present and valid
    this.validatePersonData(personData);
    
    return {
      id: personData.id,
      name: personData.name.trim(),
      role: personData.role,
      letterboxdUrl: personData.letterboxdUrl?.trim() || '',
      profilePicture: personData.profilePicture?.trim() || '',
      notes: personData.notes?.trim() || '',
      tmdbId: personData.tmdbId || null,
      dateAdded: personData.dateAdded || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  static createBackupDocument(sourceData, reason) {
    return {
      source: 'localStorage_migration',
      data: sourceData,
      createdAt: new Date().toISOString(),
      reason: reason
    };
  }
}

// Collection and document references helper
class FirestoreRefs {
  static getUserDoc(userId) {
    return doc(db, 'users', userId);
  }
  
  static getPeopleCollection(userId) {
    return collection(db, 'users', userId, 'people');
  }
  
  static getPersonDoc(userId, personId) {
    return doc(db, 'users', userId, 'people', personId.toString());
  }
  
  static getBackupsCollection(userId) {
    return collection(db, 'users', userId, 'backups');
  }
  
  static getBackupDoc(userId, backupId) {
    return doc(db, 'users', userId, 'backups', backupId);
  }
}

// Export for use in other files
export { 
  FIRESTORE_SECURITY_RULES, 
  FirestoreSchema, 
  FirestoreRefs 
};
