# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev`
  - Runs Vite development server for local testing
  - Automatically reloads on file changes

- **Build for production**: `npm run build`
  - Creates optimized production build in `dist` directory
  - Ready for static hosting (Vercel, Netlify, Firebase Hosting)

- **Preview production build**: `npm run preview`
  - Serves the built application locally for testing

- **Install dependencies**: `npm install`
  - Installs Node.js packages from package.json

## Code Architecture Overview

### Technology Stack
- **Frontend**: Vanilla HTML/CSS/JS with Vite bundler
- **Backend**: Firebase V12 (Realtime Database, Authentication, Storage)
- **Charts**: Chart.js for data visualization
- **State Management**: Manual state objects with real-time listeners

### Core Structure
```
/src
  /pages          - HTML pages for different views (admin, user, profile, etc.)
  /styles         - CSS files for each page + global design system
  /services       - Firebase configuration and admin utilities
  index.html      - Main entry point (storefront)
```

### Key Features Implementation

1. **Authentication & Authorization**:
   - Firebase Auth handles user authentication
   - Role-based access control: Admin (full access), User/Staff (limited dashboard), Customer (storefront only)
   - Protected routes via `checkAdminAccess()` in firebase-admin.js

2. **Real-time Data Sync**:
   - Firebase Realtime Database listeners in `initRealtimeListeners()`
   - Automatic UI updates when data changes
   - Collections: users, orders, products, notifications

3. **Admin Dashboard** (`src/pages/admin.js`):
   - Single-page application managing users, orders, products
   - RBAC enforcement: Staff users cannot access Users/Settings pages
   - Real-time charts using Chart.js
   - CRUD operations for all entities
   - Notification system, CSV export, modal dialogs

4. **Firebase Services** (`src/services/`):
   - `firebase.js`: Core Firebase initialization and exports
   - `firebase-admin.js`: Admin-specific helpers and access control

### Common Patterns
- **State Management**: Global `state` object in admin.js holds all data
- **Realtime Listeners**: `onValue` listeners sync UI with Firebase
- **Modals**: Functions like `openProductModal()`, `showOrderDetail()` manage UI dialogs
- **Toast Notifications**: `showToast()` function for user feedback
- **Debouncing**: Custom `debounce()` function for search inputs
- **HTML Escaping**: `escapeHTML()` prevents XSS vulnerabilities

### File Naming Conventions
- HTML files: lowercase with hyphens (e.g., `create-account.html`)
- CSS files: Match HTML filename in `/src/styles/`
- JavaScript: CamelCase for functions and variables
- Firebase paths: snake_case for database references

### Important Files to Understand First
1. `src/pages/admin.js` - Main dashboard logic (largest file)
2. `src/services/firebase-admin.js` - Auth guards and admin helpers
3. `src/services/firebase.js` - Firebase initialization
4. `package.json` - Dependencies and scripts
5. `index.html` - Storefront entry point

### Development Workflow
1. Make changes to HTML/CSS/JS files
2. Test locally with `npm run dev`
3. For production changes, test build with `npm run build` then `npm run preview`
4. Firebase rules and configuration should be managed through Firebase console