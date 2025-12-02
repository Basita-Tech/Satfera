# Session Timeout Fix - Automatic Logout Issue

## Problem
Users were being automatically logged out after a short period of time (30 minutes), even though they were actively using the dashboard.

## Root Cause
There was a **mismatch between frontend and backend session timeouts**:

- **Backend Cookie Expiration**: 24 hours (`COOKIE_MAX_AGE = 24 * 60 * 60 * 1000`)
- **Frontend Session Timeout**: 30 minutes (`SESSION_TIMEOUT = 30 * 60 * 1000`)

### What Was Happening:
1. User logs in successfully
2. Backend sets an httpOnly cookie that expires in **24 hours**
3. Frontend tracks session activity and sets expiry to **30 minutes** of inactivity
4. Frontend checks every minute if session is expired
5. After 30 minutes of inactivity, frontend expires the session and logs user out
6. **Even though the backend cookie was still valid**, the frontend forced a logout

## Solution

### 1. Aligned Frontend Session Timeout with Backend (24 hours)
**File**: `frontend/src/utils/secureStorage.js`

```javascript
// Before:
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// After:
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours (matches backend)
```

### 2. Reduced Session Check Frequency
Since the timeout is now 24 hours instead of 30 minutes, we reduced the check frequency to save resources:

```javascript
// Before: Check every 1 minute
const interval = setInterval(() => { ... }, 60000);

// After: Check every 5 minutes
const interval = setInterval(() => { ... }, 5 * 60 * 1000);
```

### 3. Added Better Logging
Added logging to help debug session issues:
- Log when frontend session expires
- Periodic activity update logging (1% of requests to avoid spam)
- Session expiry time remaining in hours

## How It Works Now

1. **User logs in**: Backend sets cookie valid for 24 hours
2. **User activity tracking**: Frontend tracks mouse, keyboard, scroll, touch, and click events
3. **Session extension**: Each user activity extends the session by 24 hours
4. **Auto-logout**: Only happens if user is inactive for **24 hours** (not 30 minutes)
5. **Session check**: Every 5 minutes, frontend verifies session is still active

## Benefits

✅ Users won't be logged out prematurely  
✅ Frontend and backend session lifetimes are synchronized  
✅ Active users can stay logged in indefinitely (session extends on each activity)  
✅ Inactive users are logged out after 24 hours (security)  
✅ Better performance (checks every 5 minutes instead of every 1 minute)  

## Testing

To verify the fix works:

1. Log in to the dashboard
2. Use the application normally (click, scroll, navigate)
3. Leave the browser tab open but inactive for 30+ minutes
4. Come back and interact with the page
5. **Expected**: You should still be logged in (not redirected to login page)

To test the 24-hour timeout:
1. Log in
2. Don't interact with the application for 24+ hours
3. Try to navigate or make an API call
4. **Expected**: You should be logged out with "Your session has expired" message

## Files Changed

1. `frontend/src/utils/secureStorage.js` - Updated session timeout and check interval
2. `frontend/src/components/context/AuthContext.jsx` - Added logging to session expiration handler

## Notes

- The backend cookie is still httpOnly and secure (sent automatically with requests)
- Frontend doesn't store the actual token (it's in the httpOnly cookie)
- Frontend only tracks session metadata (last activity time, expiry time)
- This is a client-side activity tracker that works alongside backend session management
