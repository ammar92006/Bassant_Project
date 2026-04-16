// ============================================
// BLOOMY - Admin Login Script
// Handles admin-only authentication
// ============================================

import { auth, db, ref, get } from '/src/services/firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// DOM Elements
const form = document.getElementById('adminLoginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const togglePass = document.getElementById('togglePass');
const toastContainer = document.getElementById('toastContainer');

// ===== TOGGLE PASSWORD VISIBILITY =====
togglePass.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    const icon = togglePass.querySelector('i');
    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

// ===== CHECK IF ALREADY LOGGED IN =====
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const role = snapshot.val().role;
                if (role === 'admin' || role === 'user') {
                    window.location.replace('/src/pages/admin.html');
                }
            }
        } catch (e) {
            console.log('Auth check error:', e.message);
        }
    }
});

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'info', icon = null) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icon || icons[type]}"></i> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== LOADING STATE =====
function setLoading(loading) {
    loginBtn.disabled = loading;
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
    }
}

// ===== FORM SUBMISSION =====
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    setLoading(true);

    try {
        // Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check user data in database
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();

            // Check if account is disabled
            if (userData.status === 'disabled') {
                await auth.signOut();
                showToast('Your account has been disabled. Contact the system administrator.', 'error');
                return;
            }

            // Check if user is admin or staff
            if (userData.role === 'admin' || userData.role === 'user') {
                showToast('Welcome back, ' + (userData.firstName || 'Staff') + '! Redirecting...', 'success', 'fa-check-circle');
                setTimeout(() => {
                    window.location.href = '/src/pages/admin.html';
                }, 1200);
            } else {
                // Not an admin or staff (likely a customer)
                await auth.signOut();
                showToast('Access denied. This portal is for staff only.', 'error');
            }
        } else {
            await auth.signOut();
            showToast('User account not found. Contact the administrator.', 'error');
        }

    } catch (error) {
        console.error('Admin login error:', error);

        const errorMessages = {
            'auth/invalid-email': 'Invalid email address format.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Invalid email or password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Check your internet connection.',
            'auth/user-disabled': 'This account has been disabled.'
        };

        showToast(errorMessages[error.code] || 'Login failed. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
});
