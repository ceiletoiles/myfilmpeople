# Firebase Setup Guide for MyFilmPeople

This guide will help you set up Firebase authentication and database for your MyFilmPeople installation.

## 🚀 Quick Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `myfilmpeople` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider (optional but recommended)
   - Add your domain to authorized domains if hosting publicly

### 3. Set up Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Choose **Start in test mode** (we'll add security rules later)
3. Select a location closest to your users
4. Click "Done"

### 4. Configure Security Rules

1. Go to **Firestore Database** > **Rules**
2. Copy the rules from `firestore.rules` in this project
3. Paste and click **Publish**

### 5. Get Configuration

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll to "Your apps" section
3. Click **Web app** icon (`</>`)
4. Register app with nickname (e.g., "MyFilmPeople Web")
5. Copy the `firebaseConfig` object

### 6. Add Configuration to Your App

#### For Local Development:
1. Copy `assets/js/config.local.example.js` to `assets/js/config.local.js`
2. Replace the Firebase config values with your actual config from step 5
3. Also add your TMDb API key if you have one

#### For Production (Netlify):
Add these environment variables in Netlify:
```
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com  
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456789
```

## 🎯 Testing Your Setup

1. Open your app locally or on your deployed site
2. Add some people to your collection (works without login)
3. Click "Sign Up Free" in the header
4. Create an account with email/password or Google
5. Your local data should automatically sync to the cloud!
6. Try signing out and signing back in - your data should persist

## 🔧 Features Enabled

With Firebase integration, users get:

- **Seamless Migration**: Local data automatically syncs when they first sign up
- **Cross-Device Sync**: Access their collection from any device
- **Real-time Updates**: Changes sync instantly across devices
- **Data Backup**: Cloud storage ensures data is never lost
- **Optional Authentication**: App works without login, signup is optional

## 🛡️ Security Features

- Users can only access their own data
- Data validation ensures proper structure
- Automatic backups during migration
- Secure authentication with Firebase Auth

## 🚨 Troubleshooting

### "Firebase not configured" errors:
- Check that `config.local.js` exists with valid Firebase config
- For production, ensure environment variables are set correctly

### Authentication not working:
- Verify your domain is added to Firebase Auth authorized domains
- Check browser console for specific error messages

### Data not syncing:
- Check Firestore rules are published correctly
- Verify user is successfully authenticated (check browser console)

### Local data not migrating:
- Open browser console and look for migration progress messages
- Ensure user has data in localStorage before signing up

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Ensure Firestore rules are correctly applied
4. Check that authentication providers are enabled

The app will work fine without Firebase - it will simply use localStorage only mode.
