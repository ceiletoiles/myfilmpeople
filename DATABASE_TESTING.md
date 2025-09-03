# 🧪 Database Sync Testing Guide

## Test Scenario 1: Local Data → Login → Cloud Migration

1. **Clear existing data**: Open browser DevTools → Application → Local Storage → Clear `myfilmpeople_data`
2. **Add people WITHOUT logging in**:
   - Add 2-3 people (e.g., "Ryan Gosling - Actor", "Denis Villeneuve - Director")
   - Verify they appear in the list
3. **Sign in to your account**:
   - Click "Sign In" → Use your existing email/password
   - Watch console for migration messages
4. **Expected result**: 
   - ✅ Message: "Synced X people to cloud!"
   - ✅ All your local people should still be visible
   - ✅ Check console: Should show migration process

## Test Scenario 2: Cross-Device Data Sync

1. **Open incognito/private window** (simulates different device)
2. **Sign in with same account**
3. **Expected result**:
   - ✅ Message: "Loaded X people from cloud!"
   - ✅ All people from previous session should appear
   - ✅ Check console: Should show cloud data loading

## Test Scenario 3: Real-Time Sync

1. **Add a new person while logged in**
2. **Check console**: Should see "✅ Person added to cloud: [name]"
3. **Open another incognito window → Sign in**
4. **Expected result**: New person appears immediately

## Test Scenario 4: Merge Local + Cloud Data

1. **Add people locally** (without login)
2. **Sign in** → Data migrates to cloud
3. **Sign out** 
4. **Add MORE people locally** (different names)
5. **Sign in again**
6. **Expected result**: 
   - ✅ Message: "Merged! You now have X people (added Y from local data)"
   - ✅ Both old cloud data AND new local data should appear

## 🐛 Debugging

Open browser console (F12) to see:
- 🔄 Loading/migration messages
- 📊 Data counts (cloud vs local)
- ✅ Success confirmations
- ❌ Any errors

## Current Status

- ✅ **Fixed**: Data structure mismatch (array vs object)
- ✅ **Fixed**: Migration logic for localStorage → Firebase
- ✅ **Fixed**: Cross-device data loading
- ✅ **Fixed**: Real-time sync for add/edit/delete
- 🔧 **Ready to test**: Complete workflow

## Quick Test

**Right now**: http://localhost:8080 is running
1. Open the site
2. Add a person (without login)
3. Sign in → should migrate
4. Open incognito → sign in → should load from cloud
