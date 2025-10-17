## Satfera Backend API — Frontend Reference

Base URL (local):

```
http://localhost:3000/api/v1
```

API prefix used by the server:

- Auth: `/auth`
- User personal: `/user-personal`

## Authentication

```
Authorization: Bearer <token>
```

---

## /auth

Authentication and OTP related endpoints.

### POST /auth/login

- Purpose: Login with email or phone + password
- Auth: no

- Body (JSON):

Either provide `email` or `phoneNumber`, and `password` (required):

```json
{
  "email": "alice@example.com",
  "password": "Secret123!"
}
```

or

```json
{
  "phoneNumber": "+919812345678",
  "password": "Secret123!"
}
```

- Validation: `email` must be a valid email if present; `phoneNumber` must be a mobile phone format if present; at least one of `email` or `phoneNumber` must be present; `password` min length 6.
- Success response (200):

```json
{
  "user": {
    "firstName": "fuser1",
    "lastName": "last1",
    "gender": "female",
    "phoneNumber": "+917000000025",
    "isActive": true,
    "email": "fuser.1@example.com",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "incomingMatchesCount": 0,
    "createdAt": "2025-10-16T12:44:43.600Z",
    "updatedAt": "2025-10-16T12:44:43.600Z"
  },
  "token": ""
}
```

- Errors:
  - 400: missing email/phone or password:
    `{
"success": false,
"errors": [
    {
        "field": "body",
        "message": "Either email or phoneNumber must be provided",
        "value": {
            "password": "Password1123!"
        }
    }
]}`
  - 500: invalid credentials : `{
"success": false, "message": "Invalid credentials"}`
  - 500 : User not found `{
"success": false, "message": "User not found"}`

### POST /auth/signup

- Purpose: Create a new user account
- Body (JSON) required fields:

```json
{
  "for_Profile": "myself",
  "firstName": "Alice",
  "lastName": "Smith",
  "phoneNumber": "+919812345678",
  "gender": "male",
  "email": "alice@example.com",
  "password": "Str0ngP@ss!",
  "isEmailLoginEnabled": true
}
```

- Validation highlights:

  - `for_Profile` must be one of: `myself`, `son`, `daughter`, `brother`, `sister`, `friend`.
  - `firstName`, `lastName`, `phoneNumber`, `email`, `password`, `gender` are required.
  - `phoneNumber` accepts E.164 (+...) or other mobile formats; `email` must be valid.
  - `password` rules: min 6 chars; must contain uppercase, lowercase, number and special character.

- Success response (201):

```json
{
  "message": "Signup successful.",
  "user": { "email": "alice@example.com", "id": "<id>" }
}
```

- Errors:

### Email already exsting:

`{
  "success": false,
  "message": "Email already in use"
}`

### Phone Number Exsting

`{
  "success": false,
  "message": "Phone number already in use"
}`

### Others errror:

`{
    "success": false,
    "errors": [
        {
            "field": "body",
            "message": "for_Profile must be one of: myself, son, daughter, brother, sister, friend"
        }
    ]
}`

### Password validation

`{
    "success": false,
    "errors": [
        {
            "field": "body",
            "message": "Password must contain at least one number",
            "value": "Passwor"
        },
        {
            "field": "body",
            "message": "Password must contain at least one special character",
            "value": "Passwor"
        }
    ]
}`

### POST /auth/send-otp

- Purpose: Send email OTP used during signup or forgot-password flows
- Body (JSON):

```json
{ "email": "alice@example.com", "type": "signup" }
```

- `type` must be either `signup` or `forgot-password`.
- Rate limiting: The server tracks resend counts and will return 429 if the resend limit for the day is reached.
- Success response (201): `{ message: "OTP sent successfully." }`
- Success response (201): `{ "success": true, "message": "OTP sent successfully." }`

### POST /auth/verify-otp

- Purpose: Verify email OTP for signup or forgot-password.
- Body (JSON):

```json
{ "email": "alice@example.com", "otp": "123456", "type": "signup" }
```

- Success response (200): `{ message: "..." }` (message set by service depending on flow)
- Errors (400): invalid otp or other verification failures.
- Success response (200): `{ "success": true, "message": "..." }` (message set by service depending on flow)
- Errors (400): invalid otp or other verification failures. Errors are returned as `{ "success": false, "message": "..." }`.

### POST /auth/forgot-password

- Purpose: Request OTP for resetting password
- Auth: no
- Body (JSON): `{ "email": "alice@example.com" }`
- Success: 200 `{ message: "OTP sent to email for password reset" }`
- Errors: 404 if user not found, 429 if resend limit reached.
- Success: 200 `{ "success": true, "message": "OTP sent to email for password reset" }`
- Errors: 404 if user not found, 429 if resend limit reached. Errors use `{ "success": false, "message": "..." }`.

### POST /auth/reset-password

- Purpose: Reset password using a token
- Body: `{ "newPassword": "NewPass123!" }`
- NOTE: current server implementation reads `token` from `req.params.token`. However the route is mounted as `POST /auth/reset-password` without a URL param. This is a discrepancy: the frontend should either provide the token in the URL (e.g. `POST /auth/reset-password/:token`) or the backend should be changed to accept token in body. Confirm with backend team or update routes.

Expected behavior if token available in params:

- Verifies JWT token, locates user by id, updates password (hashed), deletes reset token in redis and returns 200 `{ message: 'Password reset successful' }`.
- Verifies JWT token, locates user by id, updates password (hashed), deletes reset token in redis and returns 200 `{ "success": true, "message": "Password reset successful" }`.

---

## /user-personal

All routes in this router require authentication via the `authenticate` middleware.

### POST /user-personal/

- Purpose: Create user personal profile (one per user)
- Auth: Bearer token required
- Body: many fields; the required fields in server validation are `userId` and `dateOfBirth` and `religion` and `marriedStatus` (plus others optional). Example payload:

```json
{
  "userId": "<userId>",
  "dateOfBirth": "31-12-1995", // DD-MM-YYYY
  "timeOfBirth": "07:30",
  "height": 170.5,
  "weight": 65.2,
  "religion": "Hindu",
  "marriedStatus": "Never Married",
  "full_address": { "street1": "...", "city": "...", "state": "..." }
}
```

- Validation highlights:

  - `dateOfBirth` must be DD-MM-YYYY and represent a valid calendar date.
  - Age checks: if gender is `male` then age must be >= 21, if `female` then age must be >= 20. The code reads gender from `req.user?.gender || req.body.gender`.
  - `height` and `weight` are numeric when present.

- Responses:
  - 201: `{ success: true, data: { ...created doc... } }`
  - 400: validation errors in `success: false` form
  - 409: if a personal profile already exists

### GET /user-personal/

- Purpose: Get authenticated user's personal profile
- Auth: Bearer token
- Success: 200 `{ success: true, data: { /* personal profile fields */ } }`
- 401 if not authenticated; 404 if not found

### PUT /user-personal/

- Purpose: Update authenticated user's personal profile
- Auth: Bearer token
- Body: same fields as create (partial updates allowed). Validation is run and will return structured errors if invalid.

### Family endpoints

- GET /user-personal/family — Get authenticated user's family details
- POST /user-personal/family — Add family details (creates record for auth user)
- PUT /user-personal/family — Update family details (note: server's route does not include `:userId` here; update controller implements param-based update. The controller's `updateUserFamilyDetails` expects `req.params.userId`. There is a mismatch — confirm with backend or use the other update route pattern.)

- Family validation: fields like `fatherName`, `motherName` optional strings; `haveSibling` boolean; `siblingDetails` array with objects of `{ name, isElder }`.

### Education endpoints

- GET /user-personal/education — Get education details
- POST /user-personal/education — Add education details
- PUT /user-personal/education — Update education details

Validation: fields are optional strings such as `SchoolName`, `HighestEducation`, `FieldOfStudy`, `University`, `CountryOfEducation`.

### Health endpoints

- GET /user-personal/health — Get health record for authenticated user
- POST /user-personal/health — Add health record
- PUT /user-personal/health — Update health record

Validation highlights: booleans for `iSAlcoholic`, `isTobaccoUser`, `isHaveTattoos`, `isHaveHIV`, `isPostiviInTB`, `isHaveMedicalHistory`. `medicalHistoryDetails` is optional string.

### Expectations endpoints

- GET /user-personal/expectations — Get current user's expectations
- POST /user-personal/expectations — Create expectations
- PUT /user-personal/expectations/ — Update expectations

Validation for expectations (`validateUserExpectations`):

- `userId` required
- `age.from` and `age.to` required integers between 18 and 100
- `maritalStatus` must be one of: `Never Married`, `Divorced`, `Widowed`, `Separated`, `Awaiting Divorce`, `No Preference`
- `isConsumeAlcoholic` must be one of: `yes`, `no`, `occasionally`
- `educationLevel` one of: `High School`, `Bachelor's Degree`, `Graduate`, `Post Graduate`, `Doctorate`, `Professional`, `Other`
- `community` must be a non-empty array of strings
- `livingInCountry` and `livingInState` required

On create/update the server enqueues a background job to recompute matches for the user (failure to enqueue does not fail the request).

---

## /recommendations

### GET /recommendations

- Purpose: Fetch recommended matches for a given user
- Auth: none enforced at route level (query param `userId` required)
- Query params:

  - `userId` (required) — id of user for whom to fetch recommendations
  - `minScore` (optional) — default 90
  - `page` (optional) — default 1
  - `pageSize` (optional) — default 20, max 100

- Success: returns whatever `fetchMatchesForUser` returns (likely a paginated list). Example response shape:

```json
{
  "data": [
    /* array of match objects */
  ],
  "page": 1,
  "pageSize": 20,
  "total": 123
}
```

### GET /recommendations/matches

- Same as above but default `minScore` is 70.

Errors: 400 if `userId` missing, 400 on other invalid inputs, 500 for server errors.

---

## OTP / SMS (Twilio)

- There are endpoints under `/auth` for email OTP (`send-otp`, `verify-otp`).
- SMS OTP uses Twilio and the routes are `/auth/send-sms` and `/auth/verify-sms`.

Twilio endpoints request bodies:

Send OTP (SMS):

```json
{ "countryCode": "+91", "phoneNumber": "9812345678" }
```

Verify OTP (SMS):

```json
{ "countryCode": "+91", "phoneNumber": "9812345678", "code": "123456" }
```

Successful responses include data from Twilio verification objects. Errors thrown by Twilio propagate as server errors currently.

---

## Validation notes

- Password (signup): min 6, must include at least 1 uppercase, 1 lowercase, 1 number and 1 special character.
- Dates: `dateOfBirth` must be `DD-MM-YYYY` and a valid date. Age checks apply: male >=21, female >=20.
- Phone numbers: Accepts E.164 (`+123456...`) or mobile formats validated by `validator.isMobilePhone`.
- Many endpoints require `userId` and will validate it as a string.
