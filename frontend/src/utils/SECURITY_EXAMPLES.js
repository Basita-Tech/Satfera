/**
 * QUICK SECURITY REFERENCE GUIDE
 * Copy-paste examples for common security tasks
 * 
 * Note: Some examples use placeholder variables (formData, userInput, etc.)
 * to illustrate patterns. Import statements are provided for actual usage.
 */

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/api/auth';

// ============================================
// 1. SANITIZING FORM INPUTS
// ============================================

import { 
  sanitizeText, 
  sanitizeEmail, 
  sanitizeName,
  sanitizePhone,
  sanitizePassword,
  containsXSSPatterns 
} from '@/utils/sanitization';

// Text input (name, address, etc.)
const cleanName = sanitizeName(formData.firstName);
const cleanText = sanitizeText(formData.description);

// Email
const cleanEmail = sanitizeEmail(formData.email);
if (!cleanEmail) {
  toast.error("Invalid email format");
  return;
}

// Phone
const cleanPhone = sanitizePhone(formData.mobile);

// Password (keeps special chars, removes HTML)
const cleanPassword = sanitizePassword(formData.password);

// Check for XSS before processing
if (containsXSSPatterns(userInput)) {
  toast.error("Invalid input detected");
  return;
}

// ============================================
// 2. SECURE TOKEN STORAGE
// ============================================

import { 
  setAuthToken, 
  getAuthToken, 
  clearAuthToken,
  isSessionActive 
} from '@/utils/secureStorage';

// Store token (login)
const handleLogin = (response) => {
  const token = response.data.token;
  const rememberMe = checkboxValue; // true/false
  setAuthToken(token, rememberMe);
};

// Retrieve token (any component)
const token = getAuthToken(); // Returns null if expired
if (!token) {
  // Redirect to login
}

// Check if session is active
if (isSessionActive()) {
  // User is logged in
}

// Logout
const handleLogout = () => {
  clearAuthToken(); // Cleans all storage
  navigate('/login');
};

// ============================================
// 3. FILE UPLOAD VALIDATION
// ============================================

import { 
  validateProfilePhoto, 
  validateGovernmentID,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES
} from '@/utils/fileValidation';

// Profile photo validation
const handlePhotoUpload = async (e) => {
  const file = e.target.files[0];
  
  const validation = await validateProfilePhoto(file);
  
  if (!validation.valid) {
    toast.error(validation.errors[0]);
    e.target.value = ""; // Clear input
    return;
  }
  
  // Safe to proceed with upload
  await uploadFile(file);
};

// Government ID validation
const handleIDUpload = async (e) => {
  const file = e.target.files[0];
  
  const validation = await validateGovernmentID(file);
  
  if (!validation.valid) {
    toast.error(validation.errors.join(', '));
    return;
  }
  
  await uploadFile(file);
};

// Custom file validation
const handleCustomUpload = async (file) => {
  const validation = await validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.PROFILE_PHOTO,
    maxSize: MAX_FILE_SIZES.IMAGE,
    checkSignature: true,
    checkDimensions: true,
    dimensionConstraints: {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 4000,
      maxHeight: 4000
    }
  });
  
  return validation.valid;
};

// ============================================
// 4. CSRF TOKEN (AUTOMATIC)
// ============================================

// CSRF tokens are automatically added to all POST/PUT/PATCH/DELETE requests
// via axios interceptors in api/auth.jsx
// Example interceptor implementation in api/auth.jsx:
//
// api.interceptors.request.use((config) => {
//   if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
//     config.headers['X-CSRF-Token'] = getCSRFToken();
//   }
//   return config;
// });

// No manual action needed in most cases

// To get CSRF token manually:
import { getCSRFToken } from '@/utils/csrfProtection';

const csrfToken = getCSRFToken();

// ============================================
// 5. COMPLETE FORM EXAMPLE
// ============================================

import React, { useState } from 'react';
import { sanitizeEmail, sanitizeName, sanitizePhone } from '@/utils/sanitization';
import toast from 'react-hot-toast';
// Note: Import your actual API client, e.g., import api from '@/api/auth';

const SecureForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Sanitize and validate
    const cleanFirstName = sanitizeName(formData.firstName);
    const cleanLastName = sanitizeName(formData.lastName);
    const cleanEmail = sanitizeEmail(formData.email);
    const cleanPhone = sanitizePhone(formData.phone);
    
    if (!cleanFirstName) newErrors.firstName = 'First name is required';
    if (!cleanLastName) newErrors.lastName = 'Last name is required';
    if (!cleanEmail) newErrors.email = 'Valid email is required';
    if (!cleanPhone) newErrors.phone = 'Valid phone is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix form errors');
      return;
    }
    
    // Sanitize all fields before submission
    const sanitizedData = {
      firstName: sanitizeName(formData.firstName),
      lastName: sanitizeName(formData.lastName),
      email: sanitizeEmail(formData.email),
      phone: sanitizePhone(formData.phone)
    };
    
    try {
      // API call with sanitized data
      // CSRF token automatically included
      await api.post('/endpoint', sanitizedData);
      toast.success('Form submitted successfully');
    } catch (error) {
      toast.error('Submission failed');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="firstName"
        value={formData.firstName}
        onChange={handleInputChange}
        placeholder="First Name"
      />
      {errors.firstName && <span>{errors.firstName}</span>}
      
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email}</span>}
      
      <button type="submit">Submit</button>
    </form>
  );
};

// ============================================
// 6. SESSION EXPIRY HANDLER (IN APP.JSX)
// ============================================

import { useEffect } from 'react';
import { initSessionTracking } from '@/utils/secureStorage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function App() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Initialize session tracking
    const cleanup = initSessionTracking(() => {
      // Session expired callback
      toast.error('Session expired. Please log in again.');
      navigate('/login');
    });
    
    return cleanup; // Cleanup on unmount
  }, [navigate]);
  
  return (
    <div>
      {/* Your app routes and components */}
    </div>
  );
}

// ============================================
// 7. SECURE API CALLS
// ============================================

// All API calls in api/auth.jsx now automatically include:
// - Authorization header with secure token
// - CSRF token for state-changing requests
// - Session timeout checks
// - Auto-redirect on 401

// No changes needed in component API calls!
import { loginUser, getUserProfile } from '@/api/auth';

// These work as before, but now secure:
const response = await loginUser(credentials);
const profile = await getUserProfile();

// ============================================
// 8. DISPLAYING USER CONTENT SAFELY
// ============================================

import { sanitizeText } from '@/utils/sanitization';

// When displaying user-generated content
const DisplayProfile = ({ profile }) => {
  const safeName = sanitizeText(profile.name);
  const safeDescription = sanitizeText(profile.description);
  
  return (
    <div>
      <h2>{safeName}</h2>
      <p>{safeDescription}</p>
    </div>
  );
};

// React already escapes by default, but sanitize for extra safety

// ============================================
// 9. COMMON MISTAKES TO AVOID
// ============================================

// ❌ DON'T: Use localStorage directly
// Token is stored in httpOnly cookies by backend

// ✅ DO: Use secure storage
import { setAuthToken } from '@/utils/secureStorage';
setAuthToken(token, rememberMe);

// ❌ DON'T: Trust file.type alone
if (file.type === 'image/jpeg') { /* upload */ }

// ✅ DO: Validate file signature
const validation = await validateProfilePhoto(file);
if (validation.valid) { /* upload */ }

// ❌ DON'T: Send raw user input to backend
await api.post('/endpoint', { name: formData.name });

// ✅ DO: Sanitize first
import { sanitizeName } from '@/utils/sanitization';
await api.post('/endpoint', { name: sanitizeName(formData.name) });

// ❌ DON'T: Show specific error messages
// Example: catch (error) {
//   toast.error(error.response.data.message); // Might reveal system info
// }

// ✅ DO: Use generic messages
// Example: catch (error) {
//   console.error(error); // Log for debugging
//   toast.error('An error occurred. Please try again.');
// }

// ❌ DON'T: Allow rapid repeated submissions
<button onClick={handleSubmit}>Submit</button>

// ✅ DO: Debounce or disable during processing
const [isSubmitting, setIsSubmitting] = useState(false);
<button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>

// ============================================
// 10. SECURITY CHECKLIST FOR NEW COMPONENTS
// ============================================

/*
Before submitting any new component, verify:

□ All user inputs are sanitized
□ File uploads are validated (if applicable)
□ Using getAuthToken() instead of localStorage
□ Generic error messages (no system details exposed)
□ No sensitive data in localStorage
□ Forms have proper validation
□ XSS patterns are checked for suspicious inputs
□ CSRF tokens included (automatic via axios)
□ Submit buttons disabled during processing (prevent double-submit)
□ Rate limiting respected (debounce API calls if needed)

Production Notes:
- Security headers (CSP, X-Frame-Options, etc.) are served by backend
- Never rely on meta tags for security headers in production
- Backend CSP allows 'ws:' and 'blob:' in development for Vite HMR
*/

export default {
  // Use these functions throughout your app
};
