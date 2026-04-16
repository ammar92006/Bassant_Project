import { auth, db, ref, get, update, storage, storageRef, uploadBytes, getDownloadURL, signOut, onAuthStateChanged } from '/src/services/firebase-admin.js';
import { updatePassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// DOM Elements
const toastContainer = document.getElementById('toastContainer');
const displayFullName = document.getElementById('displayFullName');
const displayEmail = document.getElementById('displayEmail');
const displayRole = document.getElementById('displayRole');
const profileImage = document.getElementById('profileImage');
const profileFallback = document.getElementById('profileFallback');

// Form Elements
const profileForm = document.getElementById('profileForm');
const firstNameInp = document.getElementById('firstName');
const lastNameInp = document.getElementById('lastName');
const phoneInp = document.getElementById('phone');
const dobInp = document.getElementById('dob');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const passwordForm = document.getElementById('passwordForm');
const newPasswordInp = document.getElementById('newPassword');
const confirmPasswordInp = document.getElementById('confirmPassword');
const savePasswordBtn = document.getElementById('savePasswordBtn');

const imageUpload = document.getElementById('imageUpload');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

// Initialization
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        displayEmail.textContent = user.email;
        await loadUserData(user.uid);
    } else {
        window.location.href = '/src/pages/staff-login.html';
    }
});

// Load User Data
async function loadUserData(uid) {
    try {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Update Headers
            const fName = data.firstName || '';
            const lName = data.lastName || '';
            displayFullName.textContent = `${fName} ${lName}`.trim() || 'User';
            displayRole.textContent = data.role ? data.role.toUpperCase() : 'USER';
            
            // Populate Form
            firstNameInp.value = fName;
            lastNameInp.value = lName;
            phoneInp.value = data.phone || '';
            dobInp.value = data.dob || '';
            
            // Handle Profile Image
            if (data.profileImage) {
                profileImage.src = data.profileImage;
                profileImage.style.display = 'block';
                profileFallback.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        showToast("Error loading profile data", "error");
    }
}

// Save Profile Info
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const userRef = ref(db, `users/${currentUser.uid}`);
        await update(userRef, {
            firstName: firstNameInp.value.trim(),
            lastName: lastNameInp.value.trim(),
            phone: phoneInp.value.trim(),
            dob: dobInp.value
        });
        
        displayFullName.textContent = `${firstNameInp.value.trim()} ${lastNameInp.value.trim()}`;
        showToast("Profile updated successfully!");
    } catch (error) {
        console.error("Profile update error:", error);
        showToast("Failed to update profile", "error");
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
});

// Change Password
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const newPass = newPasswordInp.value;
    const confPass = confirmPasswordInp.value;
    
    if (!newPass) return;
    
    if (newPass.length < 10) {
        showToast("Password must be at least 10 characters", "error");
        return;
    }
    
    if (newPass !== confPass) {
        showToast("Passwords do not match", "error");
        return;
    }
    
    savePasswordBtn.disabled = true;
    savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        await updatePassword(currentUser, newPass);
        showToast("Password updated successfully!");
        passwordForm.reset();
    } catch (error) {
        console.error("Password update error:", error);
        if (error.code === 'auth/requires-recent-login') {
            showToast("Security requires you to re-login to change password.", "error");
        } else {
            showToast("Failed to update password", "error");
        }
    } finally {
        savePasswordBtn.disabled = false;
        savePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Update Password';
    }
});

// Upload Profile Image
imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    // Quick validate
    if (!file.type.startsWith('image/')) {
        showToast("Please select a valid image file", "error");
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB
        showToast("Image must be smaller than 2MB", "error");
        return;
    }
    
    showToast("Uploading image...", "info");
    
    try {
        const imgRef = storageRef(storage, `profile_images/${currentUser.uid}_${Date.now()}`);
        await uploadBytes(imgRef, file);
        const downloadURL = await getDownloadURL(imgRef);
        
        // Update Database
        const userRef = ref(db, `users/${currentUser.uid}`);
        await update(userRef, { profileImage: downloadURL });
        
        // Update UI
        profileImage.src = downloadURL;
        profileImage.style.display = 'block';
        profileFallback.style.display = 'none';
        
        showToast("Profile image updated!");
    } catch (error) {
        console.error("Upload error:", error);
        showToast("Failed to upload image", "error");
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/src/pages/staff-login.html';
    } catch (error) {
        console.error("Logout error:", error);
        showToast("Failed to logout", "error");
    }
});

// Toast Utility
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `ds-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
