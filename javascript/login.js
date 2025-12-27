// Import Firebase authentication functions
import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Get form elements
const loginForm = document.querySelector('form');
const emailInput = document.querySelector('input[placeholder="Username"]');
const passwordInput = document.querySelector('input[placeholder="Password"]');
const rememberCheckbox = document.querySelector('input[type="checkbox"]');
const loginBtn = document.querySelector('.btn');

// Check if user is already logged in and redirect to profile
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, redirect to profile page
        window.location.href = '/html/profile.html';
    }
});

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

    // Basic validation
    if (!email || !password) {
        showError(emailInput, 'Please enter your email and password');
        return;
    }

    try {
        // Show loading state
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Handle "Remember Me" functionality
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }

        // Success message
        alert(`Welcome back!`);
        
        // Redirect to profile page
        window.location.href = '/html/profile.html';

    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific Firebase errors
        let errorMessage = 'Login failed. Please check your credentials and try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'The email address is not valid.';
                showError(emailInput, errorMessage);
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address. Please create an account.';
                showError(emailInput, errorMessage);
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                showError(passwordInput, errorMessage);
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                showError(emailInput, errorMessage);
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many login attempts. Please try again later.';
                showError(emailInput, errorMessage);
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                showError(emailInput, errorMessage);
                break;
            default:
                errorMessage = error.message || 'An unexpected error occurred. Please try again.';
                showError(emailInput, errorMessage);
        }
        
        // Show alert for critical errors
        if (error.code === 'auth/user-disabled' || error.code === 'auth/too-many-requests') {
            alert(errorMessage);
        }
        
    } finally {
        // Reset button state
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    }
});

// Password visibility toggle (optional enhancement)
function showError(input, message) {
    // Remove existing error message
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
    input.style.borderColor = '#ff6b7a';
    input.style.boxShadow = '0 0 5px rgba(255, 107, 122, 0.3)';
}

function clearError(input) {
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    input.style.borderColor = '';
    input.style.boxShadow = '';
}

// Real-time validation for better user experience
emailInput.addEventListener('input', () => {
    if (emailInput.value.trim() !== '') {
        clearError(emailInput);
    }
});

passwordInput.addEventListener('input', () => {
    if (passwordInput.value !== '') {
        clearError(passwordInput);
    }
});

// Handle "Forgot Password" link
document.querySelector('.remember-forget a').addEventListener('click', (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('Please enter your email address first.');
        emailInput.focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showError(emailInput, 'Please enter a valid email address');
        return;
    }
    
    // Firebase password reset
    resetPassword(email);
});

async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        
        let errorMessage = 'Failed to send password reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'The email address is not valid.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            default:
                errorMessage = error.message || 'An unexpected error occurred.';
        }
        
        alert(errorMessage);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Optional: Auto-fill email if "Remember Me" was checked (for demo purposes)
// In a real app, you'd want to use Firebase's persistence instead
if (localStorage.getItem('rememberMe') === 'true') {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }
}
