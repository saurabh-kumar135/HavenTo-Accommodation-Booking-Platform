# HavenToApp 📱

React Native mobile app for the HavenTo accommodation booking platform.

## Structure
```
HavenToApp/
├── App.js                        # Root component
├── app.json                      # Expo config
├── package.json
└── src/
    ├── config/api.js             # Backend URL config
    ├── context/AuthContext.js    # JWT auth (replaces cookie session)
    ├── services/api.js           # Axios + SecureStore token layer
    ├── navigation/AppNavigator.js # Stack + Tab navigation
    ├── components/HomeCard.js
    └── screens/
        ├── auth/  LoginScreen, SignupScreen, ForgotPasswordScreen
        ├── store/ HomeListScreen, HomeDetailScreen, FavouriteScreen, BookingsScreen
        ├── host/  HostHomeListScreen, AddEditHomeScreen
        └── ProfileScreen.js
```

## Setup
1. Install Expo CLI: `npm install -g expo-cli`
2. `cd HavenToApp && npm install`
3. Configure `src/config/api.js` with your backend URL
4. `npx expo start`
5. Scan QR code with **Expo Go** app on your phone

## Backend (HavenTo — UNTOUCHED)
Add these 3 JWT endpoints to HavenTo's authRouter.js:
- `POST /api/auth/mobile/login`   → returns `{ success, token, user }`
- `POST /api/auth/mobile/signup`  → returns `{ success, token, user }`
- `GET  /api/auth/mobile/me`      → verifies token, returns `{ success, user }`
