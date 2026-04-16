# Bloomy E-commerce Platform

A comprehensive, responsive, and robust online e-commerce application tailored for purchasing luxury flowers in Egypt. The platform supports storefront functionality for customers and an advanced dashboard portal for administrative and staff management.

## Features

- **Storefront**: Browse products, maintain a wishlist/favorites list, shopping cart logic, responsive user profiles, and order history.
- **Admin Dashboard**: Full administrative capability. 
  - Manage orders (approve/complete/cancel)
  - Manage products (add/edit/delete/restock)
  - Manage roles (Admin/User/Customer definitions)
  - Detailed analytics via dynamic charts.
- **Role-Based Access Control**:
  - `Admin`: Full access to dashboard.
  - `Staff (User)`: Dashboard access limited to products and orders (cannot view/edit user roles).
  - `Customer`: Storefront-only access.
- **Firebase Backend**: Real-time database synchronisation and strict authentication.

## Technologies Used

- Vanilla HTML / CSS / JS structure.
- **Vite** for build pooling and bundling.
- **Firebase V12**: Realtime Database, Authentication, and Storage.
- **Chart.js**: Analytics and data visualisations.

## Getting Started

### Prerequisites

You need `Node.js` installed on your machine.

### Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Run the Vite development server to test locally:
```bash
npm run dev
```

### Production Build

To generate an optimized, production-ready build of the platform:
```bash
npm run build
```
The output will be placed in the `dist` directory, ready to be hosted statically on any service like Vercel, Netlify, or Firebase Hosting.
