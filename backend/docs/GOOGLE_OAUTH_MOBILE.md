# Google OAuth for Expo Mobile App

## Overview

The backend now supports **both web and mobile** Google OAuth flows using the same endpoint: `/api/v1/auth/google/callback`

### Changes Made

1. **Updated `googleCallback` endpoint** to detect and handle mobile requests
2. **Added Android/iOS client ID support** in environment configuration
3. **Reused existing session management** (same logic as email/phone login)
4. **Mobile returns JSON**, web returns redirect (existing behavior preserved)

---

## Backend Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Existing (required)
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# New (optional, for mobile)
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

### 2. Google Cloud Console Setup

#### For Android:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. Application Type: **Android**
5. Package name: Your Expo app package (e.g., `com.yourcompany.satfera`)
6. SHA-1 certificate fingerprint:
   ```bash
   # Get debug SHA-1
   cd android/app
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For production, use your release keystore
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   ```
7. Copy the **Client ID** → add to `GOOGLE_ANDROID_CLIENT_ID`

#### For iOS:

1. Same console → **Create Credentials** → **OAuth 2.0 Client ID**
2. Application Type: **iOS**
3. Bundle ID: Your Expo app bundle ID (e.g., `com.yourcompany.satfera`)
4. Copy the **Client ID** → add to `GOOGLE_IOS_CLIENT_ID`

---

## API Endpoint

### POST `/api/v1/auth/google/callback`

#### Request (Mobile):

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkay...",
  "platform": "mobile"
}
```

#### Response (Success - 200):

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": true,
    "isOnboardingCompleted": true
  },
  "isNewSession": true,
  "redirectTo": "/dashboard"
}
```

#### Response (User Not Found - 404):

```json
{
  "success": false,
  "message": "User not found. Please sign up first.",
  "data": {
    "email": "newuser@example.com",
    "name": "John",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

#### Response (Onboarding Incomplete - 200):

```json
{
  "success": false,
  "message": "Onboarding is not completed",
  "redirectTo": "/onboarding/user",
  "user": { ... }
}
```

#### Response (Profile Not Verified - 200):

```json
{
  "success": false,
  "message": "Profile is not verified",
  "redirectTo": "/onboarding/review",
  "user": { ... }
}
```

---

## Expo App Implementation

### 1. Install Dependencies

```bash
npx expo install expo-auth-session expo-web-browser expo-secure-store @react-native-google-signin/google-signin
```

### 2. Configure `app.json`

```json
{
  "expo": {
    "scheme": "satfera",
    "ios": {
      "bundleIdentifier": "com.yourcompany.satfera",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.yourcompany.satfera",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### 3. Google Sign-In Hook

Create `hooks/useGoogleAuth.js`:

```javascript
import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = 'https://your-backend-url.com/api/v1';

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID', // From backend GOOGLE_CLIENT_ID
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.authentication.idToken);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post(
        `${API_BASE_URL}/auth/google/callback`,
        {
          idToken,
          platform: 'mobile',
        }
      );

      if (data.success) {
        // Store JWT token securely
        await SecureStore.setItemAsync('authToken', data.token);
        
        // Store user data
        await SecureStore.setItemAsync('userData', JSON.stringify(data.user));

        return {
          success: true,
          user: data.user,
          redirectTo: data.redirectTo,
        };
      } else {
        // Handle onboarding/verification incomplete
        return {
          success: false,
          message: data.message,
          redirectTo: data.redirectTo,
          user: data.user,
        };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Google sign-in failed';
      setError(errorMessage);
      
      if (err.response?.status === 404) {
        // User not found, show signup option
        return {
          success: false,
          needsSignup: true,
          data: err.response.data.data,
        };
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    promptAsync,
    loading,
    error,
    disabled: !request,
  };
};
```

### 4. Sign-In Screen Component

```javascript
import React from 'react';
import { View, Button, ActivityIndicator, Alert } from 'react-native';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useNavigation } from '@react-navigation/native';

export default function SignInScreen() {
  const navigation = useNavigation();
  const { promptAsync, loading, error, disabled } = useGoogleAuth();

  const handleGoogleSignIn = async () => {
    try {
      const result = await promptAsync();
      
      if (result) {
        if (result.needsSignup) {
          // Navigate to signup with pre-filled data
          navigation.navigate('Signup', {
            email: result.data.email,
            name: result.data.name,
            picture: result.data.picture,
          });
        } else if (result.success) {
          // Navigate based on redirectTo
          if (result.redirectTo === '/dashboard') {
            navigation.navigate('Dashboard');
          } else if (result.redirectTo === '/onboarding/user') {
            navigation.navigate('Onboarding');
          } else if (result.redirectTo === '/onboarding/review') {
            navigation.navigate('ProfileReview');
          }
        } else {
          Alert.alert('Notice', result.message);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button
        title={loading ? 'Signing in...' : 'Sign in with Google'}
        onPress={handleGoogleSignIn}
        disabled={disabled || loading}
      />
      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
}
```

### 5. Axios Interceptor (Add Bearer Token)

Create `api/axiosInstance.js`:

```javascript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const axiosInstance = axios.create({
  baseURL: 'https://your-backend-url.com/api/v1',
  timeout: 10000,
});

// Request interceptor - add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### 6. Usage in Components

```javascript
import axiosInstance from '../api/axiosInstance';

// All requests automatically include Authorization header
const fetchUserProfile = async () => {
  const { data } = await axiosInstance.get('/user/profile');
  return data;
};

const updateProfile = async (profileData) => {
  const { data } = await axiosInstance.put('/user/profile', profileData);
  return data;
};
```

---

## Testing

### Test Mobile Flow:

1. **Start backend**: `cd backend && npm run dev`
2. **Update environment variables** with Android/iOS client IDs
3. **Run Expo app**: `npx expo start`
4. **Test scenarios**:
   - ✅ Existing user → should login and get token
   - ✅ New user → should return 404 with user data
   - ✅ Incomplete onboarding → should return redirectTo
   - ✅ Unverified profile → should return redirectTo

### Test Web Flow (ensure not broken):

1. Visit `http://localhost:3000/api/v1/auth/google/start`
2. Should redirect to Google OAuth
3. After consent, should redirect back with token
4. Should set cookies and redirect to frontend

---

## Security Notes

1. **No CSRF tokens needed** for mobile (uses Bearer tokens, not cookies)
2. **JWT stored in SecureStore** (encrypted on device)
3. **Session management** includes device fingerprinting and IP tracking
4. **Token expiry**: 7 days (same as web)
5. **Session reuse**: Same device/IP reuses existing session
6. **Strict mode disabled in production** for mobile (IP changes are common)

---

## Troubleshooting

### "Invalid Google token" error:
- Verify Android/iOS client IDs in `.env`
- Check SHA-1 fingerprint matches Google Console
- Ensure bundle ID matches Google Console

### "User not found" always returned:
- Check if user exists in database with that email
- Verify email is lowercase in database

### Token not persisted across app restarts:
- Use `expo-secure-store` instead of `AsyncStorage`
- Check SecureStore permissions in `app.json`

### 401 errors on API calls:
- Verify axios interceptor is adding `Authorization: Bearer <token>`
- Check token is being stored correctly
- Verify token hasn't expired (7 days)

---

## Next Steps

1. ✅ Backend updated (done)
2. 🔲 Get Android/iOS OAuth credentials from Google Console
3. 🔲 Create Expo app (if not exists)
4. 🔲 Implement Google Sign-In hook
5. 🔲 Create Sign-In screen
6. 🔲 Set up axios with Bearer token interceptor
7. 🔲 Test with real Google account
8. 🔲 Handle edge cases (onboarding, verification)

---

## Support

For issues or questions, refer to:
- [Google Sign-In for Expo](https://docs.expo.dev/guides/authentication/#google)
- [expo-auth-session docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- Backend logs: Check `backend/logs/` for detailed error messages
