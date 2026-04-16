import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'src/pages/admin.html'),
        adminLogin: resolve(__dirname, 'src/pages/admin-login.html'),
        cart: resolve(__dirname, 'src/pages/cart.html'),
        createAccount: resolve(__dirname, 'src/pages/CreateAccount.html'),
        favorites: resolve(__dirname, 'src/pages/favorites.html'),
        learnMore: resolve(__dirname, 'src/pages/learn-more.html'),
        privacyPolicy: resolve(__dirname, 'src/pages/privacypolicy.html'),
        profile: resolve(__dirname, 'src/pages/profile.html'),
        staffProfile: resolve(__dirname, 'src/pages/staff-profile.html'),
        terms: resolve(__dirname, 'src/pages/Terms.html'),
        user: resolve(__dirname, 'src/pages/user.html')
      }
    }
  }
});
