# Firebase Authentication Setup

## Google Login Fix

To fix the Google login error, add these authorized domains to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`myfilmpeople-18713`)
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add these domains:
   - `localhost`
   - `127.0.0.1`
   - Your Netlify domain (e.g., `myfilmpeople.netlify.app`)

## Current Firebase Configuration

Project ID: `myfilmpeople-18713`
Authentication methods enabled:
- ✅ Email/Password
- ✅ Google Sign-In (requires domain fix above)

## Data Sync Features

✅ **localStorage-first**: App works without login
✅ **Automatic migration**: Local data syncs to cloud on first login
✅ **Real-time sync**: New/edited people sync to cloud immediately
✅ **Cross-device**: Load your data from any device after login
✅ **Merge support**: Combines local and cloud data intelligently

## Testing Instructions

1. **Test without login**: Add/edit people → works locally
2. **Test email signup**: Create account → data migrates to cloud
3. **Test different device**: Sign in → data loads from cloud
4. **Test Google login**: (after domain fix) → should work seamlessly

## Firestore Database Structure

```
users/
  {userId}/
    people/
      {personId}: {
        name: string,
        role: string,
        letterboxdUrl: string,
        profilePicture: string,
        notes: string,
        tmdbId: string|null,
        dateAdded: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      }
```
