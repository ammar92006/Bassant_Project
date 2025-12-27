// Import Firebase authentication functions
import { app, db, ref, set, auth } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, redirect to profile
        window.location.href = '/html/profile.html';
    }
});

// Get form elements
const form = document.querySelector('form');
const firstNameInput = document.querySelector('input[placeholder="First name"]');
const secondNameInput = document.querySelector('input[placeholder="Second name"]');
const emailInput = document.querySelector('input[placeholder="E-mail address"]');
const passwordInput = document.querySelector('input[placeholder="Password"]');
const confirmPasswordInput = document.querySelector('input[placeholder="Confirm password"]');
const phoneInput = document.querySelector('input[placeholder="Phone number"]');
const dobInput = document.querySelector('input[placeholder="Date of Birth"]');
const agreeCheckbox = document.querySelector('input[type="checkbox"]');

// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 10 characters, max 14, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,14}$/;
    return passwordRegex.test(password);
}

function validatePhone(phone) {
    // Egyption phone number format: 01XXXXXXXXX
    const phoneRegex = /^01[0-9]{9}$/;
    return phoneRegex.test(phone);
}

function validateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1;
    }
    return age;
}

function showErrorMessage(input, message) {
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
    input.style.borderColor = '#da7884f5';
}

function clearErrorMessage(input) {
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    input.style.borderColor = '';
}

function validateForm() {
    let isValid = true;

    // Validate first name
    if (firstNameInput.value.trim() === '') {
        showErrorMessage(firstNameInput, 'Please enter your first name');
        isValid = false;
    } else {
        clearErrorMessage(firstNameInput);
    }

    // Validate second name
    if (secondNameInput.value.trim() === '') {
        showErrorMessage(secondNameInput, 'Please enter your second name');
        isValid = false;
    } else {
        clearErrorMessage(secondNameInput);
    }

    // Validate email
    if (!validateEmail(emailInput.value)) {
        showErrorMessage(emailInput, 'Please enter a valid email address');
        isValid = false;
    } else {
        clearErrorMessage(emailInput);
    }

    // Validate password
    if (!validatePassword(passwordInput.value)) {
        showErrorMessage(passwordInput, 'Password must be 10-14 characters with at least one letter and one number');
        isValid = false;
    } else {
        clearErrorMessage(passwordInput);
    }

    // Validate confirm password
    if (passwordInput.value !== confirmPasswordInput.value) {
        showErrorMessage(confirmPasswordInput, 'Passwords do not match');
        isValid = false;
    } else {
        clearErrorMessage(confirmPasswordInput);
    }

    // Validate phone
    if (!validatePhone(phoneInput.value)) {
        showErrorMessage(phoneInput, 'Please enter a valid Egyptian phone number (01XXXXXXXXX)');
        isValid = false;
    } else {
        clearErrorMessage(phoneInput);
    }

    // Validate date of birth
    if (!dobInput.value) {
        showErrorMessage(dobInput, 'Please enter your date of birth');
        isValid = false;
    } else {
        const age = validateAge(dobInput.value);
        if (age < 13) {
            showErrorMessage(dobInput, 'You must be at least 13 years old to create an account');
            isValid = false;
        } else {
            clearErrorMessage(dobInput);
        }
    }

    // Validate terms agreement
    if (!agreeCheckbox.checked) {
        alert('Please agree to the Terms and Conditions and Privacy Policy');
        isValid = false;
    }

    return isValid;
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }

    const firstName = firstNameInput.value.trim();
    const secondName = secondNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const phone = phoneInput.value;
    const dateOfBirth = dobInput.value;

    try {
        // Show loading state
        const submitBtn = document.querySelector('.btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile with additional information
        await updateProfile(user, {
            displayName: `${firstName} ${secondName}`
        });

        // Store additional user data in Realtime Database
        const userData = {
            uid: user.uid,
            firstName: firstName,
            lastName: secondName,
            email: email,
            phone: phone,
            dob: dateOfBirth,
            createdAt: new Date().toISOString()
        };

        // Save to Firebase Realtime Database
        await set(ref(db, 'users/' + user.uid), userData);

        // Success message
        alert('Account created successfully! Welcome to Bloomy!');
        
        // Redirect to profile page
        window.location.href = '/html/profile.html';

    } catch (error) {
        console.error('Error creating account:', error);
        
        // Handle specific Firebase errors
        let errorMessage = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please use a different email or try logging in.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'The email address is not valid.';
                break;
            case 'auth/weak-password':
                errorMessage = 'The password is too weak. Please use a stronger password.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            default:
                errorMessage = error.message || 'An error occurred. Please try again.';
        }
        
        alert(errorMessage);
    } finally {
        // Reset button state
        const submitBtn = document.querySelector('.btn');
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
    }
});

// Real-time validation for better user experience
firstNameInput.addEventListener('blur', () => {
    if (firstNameInput.value.trim() !== '') {
        clearErrorMessage(firstNameInput);
    }
});

secondNameInput.addEventListener('blur', () => {
    if (secondNameInput.value.trim() !== '') {
        clearErrorMessage(secondNameInput);
    }
});

emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim() !== '' && validateEmail(emailInput.value)) {
        clearErrorMessage(emailInput);
    }
});

passwordInput.addEventListener('blur', () => {
    if (passwordInput.value !== '' && validatePassword(passwordInput.value)) {
        clearErrorMessage(passwordInput);
        // Also validate confirm password if it has a value
        if (confirmPasswordInput.value !== '' && passwordInput.value === confirmPasswordInput.value) {
            clearErrorMessage(confirmPasswordInput);
        }
    }
});

confirmPasswordInput.addEventListener('blur', () => {
    if (confirmPasswordInput.value !== '' && passwordInput.value === confirmPasswordInput.value) {
        clearErrorMessage(confirmPasswordInput);
    }
});

phoneInput.addEventListener('blur', () => {
    if (phoneInput.value !== '' && validatePhone(phoneInput.value)) {
        clearErrorMessage(phoneInput);
    }
});

dobInput.addEventListener('blur', () => {
    if (dobInput.value) {
        const age = validateAge(dobInput.value);
        if (age >= 13) {
            clearErrorMessage(dobInput);
        }
    }
});
