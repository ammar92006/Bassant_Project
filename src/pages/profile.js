// ============================================
// BLOOMY - Customer Profile Script
// Full profile management with edit capability
// ============================================

import { db, ref, get, update, auth, query, orderByChild, equalTo } from "/src/services/firebase.js";
import { onAuthStateChanged, signOut, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== PROFILE MANAGER =====
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.orders = [];
        this.isEditing = false;
        this.init();
    }

    async init() {
        // Check for tab parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData();
                await this.loadOrders();
                this.displayUserInfo();
                this.setupEventListeners();
                this.updateNavAvatar();

                // Set tab from URL param
                if (tabParam) {
                    this.switchTab(tabParam);
                }
            } else {
                window.location.href = '/src/pages/user.html';
            }
        });
    }

    async loadUserData() {
        try {
            const userRef = ref(db, `users/${this.currentUser.uid}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                this.userData = snapshot.val();
            } else {
                this.userData = {
                    email: this.currentUser.email,
                    firstName: this.currentUser.email.split('@')[0],
                    lastName: '',
                    createdAt: this.currentUser.metadata.creationTime
                };
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error loading profile data: ' + error.message, 'error');
        }
    }

    displayUserInfo() {
        if (!this.userData) return;

        const firstName = this.userData.firstName || 'User';
        const lastName = this.userData.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const email = this.userData.email || this.currentUser.email;
        const initial = firstName.charAt(0).toUpperCase();

        // Profile header
        const profileInitial = document.getElementById('profile-initial');
        if (profileInitial) profileInitial.textContent = initial;

        document.getElementById('user-name').textContent = fullName;
        document.getElementById('user-email').textContent = email;

        const createdAt = this.userData.createdAt || this.currentUser.metadata.creationTime;
        const memberDate = createdAt
            ? new Date(createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            })
            : 'Recently';
        document.getElementById('member-date').textContent = memberDate;

        // Account info fields
        document.getElementById('first-name').textContent = firstName;
        document.getElementById('last-name').textContent = lastName || '—';
        document.getElementById('profile-email').textContent = email;
        document.getElementById('phone').textContent = this.userData.phone || '—';
        document.getElementById('dob').textContent = this.userData.dob || '—';
        document.getElementById('address-display').textContent = this.userData.address || '—';
        document.getElementById('user-id').textContent = this.currentUser.uid;

        // Last login
        const lastLoginEl = document.getElementById('last-login');
        if (lastLoginEl) {
            lastLoginEl.textContent = new Date(this.currentUser.metadata.lastSignInTime).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        // Pre-fill edit form
        document.getElementById('edit-firstName').value = firstName;
        document.getElementById('edit-lastName').value = lastName;
        document.getElementById('edit-email').value = email;
        document.getElementById('edit-phone').value = this.userData.phone || '';
        document.getElementById('edit-dob').value = this.userData.dob || '';
        document.getElementById('edit-address').value = this.userData.address || '';
    }

    // ===== UPDATE NAVBAR AVATAR =====
    updateNavAvatar() {
        const firstName = this.userData?.firstName || this.currentUser.email.split('@')[0];
        const email = this.userData?.email || this.currentUser.email;
        const initial = firstName.charAt(0).toUpperCase();

        const userBtn = document.getElementById('user-btn');
        const userAvatarBtn = document.getElementById('user-avatar-btn');

        if (userBtn) userBtn.style.display = 'none';
        if (userAvatarBtn) userAvatarBtn.style.display = 'flex';

        const headerAvatar = document.getElementById('header-avatar');
        const userNavName = document.getElementById('user-nav-name');
        const userDpAvatar = document.getElementById('user-dp-avatar');
        const userDpName = document.getElementById('user-dp-name');
        const userDpEmail = document.getElementById('user-dp-email');

        if (headerAvatar) headerAvatar.textContent = initial;
        if (userNavName) userNavName.textContent = firstName;
        if (userDpAvatar) userDpAvatar.textContent = initial;
        if (userDpName) userDpName.textContent = `${this.userData?.firstName || ''} ${this.userData?.lastName || ''}`.trim();
        if (userDpEmail) userDpEmail.textContent = email;

        // Setup dropdown
        const avatarBtn = document.getElementById('user-avatar-btn');
        const dropdown = document.getElementById('user-dropdown');
        if (avatarBtn && dropdown) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                avatarBtn.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (!avatarBtn.contains(e.target)) {
                    dropdown.classList.remove('show');
                    avatarBtn.classList.remove('active');
                }
            });
            dropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        // Logout from dropdown
        const dpLogout = document.getElementById('dp-logout');
        if (dpLogout) {
            dpLogout.addEventListener('click', () => this.handleLogout());
        }
    }

    async loadOrders() {
        const ordersListDiv = document.getElementById('orders-list');
        if (!ordersListDiv) return;

        try {
            const ordersRef = ref(db, 'orders');
            
            // Query only orders belonging to THIS user
            const q = query(ordersRef, orderByChild('userId'), equalTo(this.currentUser.uid));
            const snapshot = await get(q);

            if (snapshot.exists()) {
                const userOrders = snapshot.val();
                this.orders = Object.entries(userOrders)
                    .map(([id, order]) => ({ id, ...order }))
                    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            } else {
                this.orders = [];
            }

            this.displayOrders();

        } catch (error) {
            console.error('Error loading orders:', error);
            ordersListDiv.innerHTML = `<p style="color:#f44336; font-size:1.4rem;">Error loading orders. Please refresh.</p>`;
        }
    }

    displayOrders() {
        const ordersListDiv = document.getElementById('orders-list');
        const ordersCount = document.getElementById('orders-count');

        if (ordersCount) {
            ordersCount.textContent = `${this.orders.length} order${this.orders.length !== 1 ? 's' : ''}`;
        }

        if (this.orders.length === 0) {
            ordersListDiv.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>No orders yet</h3>
                    <p>Start shopping and your orders will appear here!</p>
                    <a href="/index.html#products" class="logout-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.5rem; margin-top:1rem;">
                        <i class="fas fa-store"></i> Browse Products
                    </a>
                </div>
            `;
            return;
        }

        ordersListDiv.innerHTML = this.orders.map(order => {
            const orderDate = order.orderDate
                ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';

            const statusColors = {
                pending: '#ffc107',
                completed: '#4caf50',
                cancelled: '#f44336'
            };
            const statusColor = statusColors[order.status] || '#999';

            const items = order.items || [];
            const itemsHTML = items.map(item => `
                <div class="order-item">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name || 'Product'}" />
                    <div class="order-item-info">
                        <h4>${item.name || 'Product'}</h4>
                        <p>Qty: ${item.quantity || 1} × EGP ${(item.discountedPrice || item.price || 0).toLocaleString()}</p>
                    </div>
                    <span style="color:var(--primary-color);font-weight:600;">EGP ${((item.discountedPrice || item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                </div>
            `).join('');

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${order.id.substring(0, 8).toUpperCase()}</div>
                            <div class="order-date"><i class="fas fa-calendar-alt"></i> ${orderDate}</div>
                        </div>
                        <span class="order-status" style="background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}44; padding:0.4rem 1.2rem; border-radius:5rem; font-size:1.2rem; font-weight:600;">
                            ${order.status || 'pending'}
                        </span>
                    </div>
                    <div class="order-items">
                        ${itemsHTML || '<p style="color:var(--text-gray);font-size:1.3rem;">No item details available</p>'}
                    </div>
                    <div class="order-total">
                        <i class="fas fa-coins"></i> Total: <strong>EGP ${(order.total || 0).toLocaleString()}</strong>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Edit toggle
        const editToggleBtn = document.getElementById('edit-toggle-btn');
        if (editToggleBtn) {
            editToggleBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Cancel edit
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.toggleEditMode(false));
        }

        // Save profile form
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Delete account
        const deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeleteAccount());
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(`${tabName}-tab`);

        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.replaceState({}, '', url);
    }

    toggleEditMode(forceEdit = null) {
        const viewMode = document.getElementById('view-mode');
        const editMode = document.getElementById('edit-mode');
        const editBtn = document.getElementById('edit-toggle-btn');

        this.isEditing = forceEdit !== null ? forceEdit : !this.isEditing;

        if (this.isEditing) {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            editBtn.style.background = 'rgba(244,67,54,0.1)';
            editBtn.style.color = '#f44336';
            editBtn.style.border = '1px solid rgba(244,67,54,0.3)';
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
            editBtn.style.background = '';
            editBtn.style.color = '';
            editBtn.style.border = '';
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();

        const btn = document.getElementById('save-profile-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const updatedData = {
            firstName: document.getElementById('edit-firstName').value.trim(),
            lastName: document.getElementById('edit-lastName').value.trim(),
            phone: document.getElementById('edit-phone').value.trim(),
            dob: document.getElementById('edit-dob').value,
            address: document.getElementById('edit-address').value.trim(),
            updatedAt: new Date().toISOString()
        };

        const newEmail = document.getElementById('edit-email').value.trim();

        // Validate
        if (!updatedData.firstName) {
            showToast('First name is required', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            return;
        }

        if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            showToast('Please enter a valid email address', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            return;
        }

        try {
            // Update email in Firebase Auth if changed
            let emailVerificationSent = false;
            if (newEmail && newEmail !== this.currentUser.email) {
                await verifyBeforeUpdateEmail(this.currentUser, newEmail);
                emailVerificationSent = true;
                // Delete email from updatedData so we don't update RTDB before they verify
                delete updatedData.email;
            }

            const userRef = ref(db, `users/${this.currentUser.uid}`);
            await update(userRef, updatedData);

            // Update local data
            this.userData = { ...this.userData, ...updatedData };
            this.displayUserInfo();
            this.updateNavAvatar();
            this.toggleEditMode(false);

            if (emailVerificationSent) {
                showToast('Profile saved! A verification link was sent to your new email to confirm the change.', 'info');
            } else {
                showToast('Profile updated successfully! ✓', 'success');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.code === 'auth/requires-recent-login') {
                showToast('Security requirement: Please log out and back in to change your email.', 'error');
            } else {
                showToast('Failed to update profile: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            showToast('Signed out successfully', 'info');
            setTimeout(() => window.location.href = '/src/pages/user.html', 1000);
        } catch (error) {
            console.error('Error signing out:', error);
            showToast('Error signing out', 'error');
        }
    }

    handleDeleteAccount() {
        const confirmed = confirm(
            '⚠️ WARNING: This will permanently delete your account and all associated data.\n\n' +
            'Are you absolutely sure you want to proceed?'
        );

        if (confirmed) {
            const doubleConfirm = confirm(
                'This action CANNOT be undone!\n\n' +
                'Click OK to permanently delete your account.'
            );
            if (doubleConfirm) this.deleteAccount();
        }
    }

    async deleteAccount() {
        try {
            await this.currentUser.delete();
            showToast('Account deleted successfully', 'success');
            setTimeout(() => window.location.href = '/index.html', 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            if (error.code === 'auth/requires-recent-login') {
                showToast('Please log in again to delete your account', 'error');
                setTimeout(() => window.location.href = '/src/pages/user.html', 2000);
            } else {
                showToast('Error deleting account: ' + error.message, 'error');
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});
