// ============================================
// BLOOMY - Customer Login Script
// Handles customer authentication only
// ============================================

import { auth, db, ref, get } from '/src/services/firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Get form elements
const loginForm = document.querySelector('form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const rememberCheckbox = document.getElementById('remember-me');
const loginBtn = document.getElementById('login-btn');

// Check if user is already logged in and redirect to profile
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = '/src/pages/profile.html';
    }
});

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

    // Basic validation
    if (!email || !password) {
        showError(emailInput, 'Please enter your email and password');
        return;
    }

    try {
        // Show loading state
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if user account is disabled in our database
        try {
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.status === 'disabled') {
                    await auth.signOut();
                    showError(emailInput, 'Your account has been disabled. Please contact support.');
                    loginBtn.textContent = 'Login';
                    loginBtn.disabled = false;
                    return;
                }
                if (userData.role === 'admin' || userData.role === 'user') {
                    await auth.signOut();
                    showError(emailInput, 'Admin/Staff accounts cannot login here. Please use the Dashboard Portal.');
                    loginBtn.textContent = 'Login';
                    loginBtn.disabled = false;
                    return;
                }
            }
        } catch (dbError) {
            console.log('DB check skipped:', dbError.message);
        }

        // Handle "Remember Me" functionality
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }

        // Success - redirect to profile page
        window.location.href = '/src/pages/profile.html';

    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific Firebase errors
        switch (error.code) {
            case 'auth/invalid-email':
                showError(emailInput, 'The email address is not valid.');
                break;
            case 'auth/user-not-found':
                showError(emailInput, 'No account found with this email. Please create an account.');
                break;
            case 'auth/wrong-password':
                showError(passwordInput, 'Incorrect password. Please try again.');
                break;
            case 'auth/invalid-credential':
                showError(passwordInput, 'Invalid email or password. Please try again.');
                break;
            case 'auth/user-disabled':
                showError(emailInput, 'This account has been disabled. Please contact support.');
                break;
            case 'auth/too-many-requests':
                showError(emailInput, 'Too many login attempts. Please try again later.');
                break;
            case 'auth/network-request-failed':
                showError(emailInput, 'Network error. Please check your internet connection.');
                break;
            default:
                showError(emailInput, error.message || 'An error occurred. Please try again.');
        }
        
    } finally {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    }
});

// Error display functions
function showError(input, message) {
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color:#ff6b7a; font-size:1.2rem; margin-top:0.5rem; animation: fadeIn 0.3s ease;';
    input.parentElement.appendChild(errorDiv);
    input.style.borderColor = '#ff6b7a';
    input.style.boxShadow = '0 0 5px rgba(255, 107, 122, 0.3)';
}

function clearError(input) {
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) existingError.remove();
    input.style.borderColor = '';
    input.style.boxShadow = '';
}

// Real-time validation
if (emailInput) {
    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim() !== '') clearError(emailInput);
    });
}

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        if (passwordInput.value !== '') clearError(passwordInput);
    });
}

// Handle "Forgot Password" link
const forgotLink = document.querySelector('.remember-forget a');
if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email) {
            showError(emailInput, 'Please enter your email address first.');
            emailInput.focus();
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError(emailInput, 'Please enter a valid email address');
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent! Please check your inbox.');
        } catch (error) {
            switch (error.code) {
                case 'auth/invalid-email':
                    showError(emailInput, 'The email address is not valid.');
                    break;
                case 'auth/user-not-found':
                    showError(emailInput, 'No account found with this email address.');
                    break;
                default:
                    alert(error.message || 'Failed to send password reset email.');
            }
        }
    });
}

// Auto-fill email if "Remember Me" was checked
if (localStorage.getItem('rememberMe') === 'true') {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

// Update header badges on this page
function updateBadges() {
    const cart = JSON.parse(localStorage.getItem('bloomCart') || '[]');
    const cartCount = cart.reduce((t, i) => t + (i.quantity || 1), 0);
    document.querySelectorAll('#cart-badge').forEach(b => {
        b.textContent = cartCount;
        b.classList.toggle('show', cartCount > 0);
    });

    const favs = JSON.parse(localStorage.getItem('bloomFavorites') || '[]');
    document.querySelectorAll('#favorites-badge').forEach(b => {
        b.textContent = favs.length;
        b.classList.toggle('show', favs.length > 0);
    });
}

document.addEventListener('DOMContentLoaded', updateBadges);
