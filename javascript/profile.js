import {db, ref, onValue, get, auth} from "./firebase.js";
import {onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ===== PROFILE MANAGER CLASS =====
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.orders = [];
        this.init();
    }

    async init() {
        // Check authentication state
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData();
                await this.loadOrders();
                this.displayUserInfo();
            } else {
                // Redirect to login if not authenticated
                window.location.href = '/html/user.html';
            }
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadUserData() {
        try {
            const userRef = ref(db, `users/${this.currentUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                this.userData = snapshot.val();
            } else {
                // If no user data in database, use auth data
                this.userData = {
                    email: this.currentUser.email,
                    firstName: this.currentUser.displayName?.split(' ')[0] || 'User',
                    lastName: this.currentUser.displayName?.split(' ')[1] || '',
                    createdAt: this.currentUser.metadata.creationTime
                };
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Error loading profile data', 'error');
        }
    }

    displayUserInfo() {
        if (!this.userData) return;

        // Update profile header
        document.getElementById('user-name').textContent = 
            `${this.userData.firstName || 'User'} ${this.userData.lastName || ''}`;
        document.getElementById('user-email').textContent = 
            this.userData.email || this.currentUser.email;
        
        // Format member date
        const memberDate = this.userData.createdAt 
            ? new Date(this.userData.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'Recently';
        document.getElementById('member-date').textContent = memberDate;

        // Update account details tab
        document.getElementById('first-name').textContent = this.userData.firstName || '-';
        document.getElementById('last-name').textContent = this.userData.lastName || '-';
        document.getElementById('profile-email').textContent = this.userData.email || '-';
        document.getElementById('phone').textContent = this.userData.phone || '-';
        document.getElementById('dob').textContent = this.userData.dob || '-';
        document.getElementById('user-id').textContent = this.currentUser.uid;
    }

    async loadOrders() {
        const ordersListDiv = document.getElementById('orders-list');
        
        try {
            const ordersRef = ref(db, 'orders');
            const snapshot = await get(ordersRef);
            
            if (snapshot.exists()) {
                const allOrders = snapshot.val();
                // Filter orders (in a real app, you'd query by user ID)
                this.orders = Object.entries(allOrders).map(([id, order]) => ({
                    id,
                    ...order
                }));
                
                this.displayOrders();
            } else {
                ordersListDiv.innerHTML = `
                    <div class="no-orders">
                        <i class="fas fa-shopping-bag"></i>
                        <p>You haven't placed any orders yet.</p>
                        <a href="/html/home.html#products" class="logout-btn" style="text-decoration: none;">
                            Start Shopping
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            ordersListDiv.innerHTML = `
                <p class="loading" style="color: #f44336;">Error loading orders</p>
            `;
        }
    }

    displayOrders() {
        const ordersListDiv = document.getElementById('orders-list');
        
        if (this.orders.length === 0) {
            ordersListDiv.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/html/home.html#products" class="logout-btn" style="text-decoration: none;">
                        Start Shopping
                    </a>
                </div>
            `;
            return;
        }

        let ordersHTML = '';
        this.orders.forEach(order => {
            const orderDate = new Date(order.orderDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            let itemsHTML = '';
            order.items.forEach(item => {
                itemsHTML += `
                    <div class="order-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="order-item-info">
                            <h4>${item.name}</h4>
                            <p>Quantity: ${item.quantity} × EGP ${item.discountedPrice.toLocaleString()}</p>
                        </div>
                    </div>
                `;
            });

            ordersHTML += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${order.id.substring(0, 8).toUpperCase()}</div>
                            <div class="order-date">${orderDate}</div>
                        </div>
                        <span class="order-status ${order.status}">${order.status}</span>
                    </div>
                    <div class="order-items">
                        ${itemsHTML}
                    </div>
                    <div class="order-total">
                        Total: EGP ${order.total.toLocaleString()}
                    </div>
                </div>
            `;
        });

        ordersListDiv.innerHTML = ordersHTML;
    }

    setupEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Remove active class from all
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active to clicked
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Delete account button
        document.getElementById('delete-account-btn').addEventListener('click', () => {
            this.handleDeleteAccount();
        });
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.showNotification('Logged out successfully');
            setTimeout(() => {
                window.location.href = '/html/user.html';
            }, 1000);
        } catch (error) {
            console.error('Error signing out:', error);
            this.showNotification('Error logging out', 'error');
        }
    }

    handleDeleteAccount() {
        const confirmed = confirm(
            '⚠️ WARNING: This will permanently delete your account and all associated data.\n\n' +
            'Are you absolutely sure you want to proceed?'
        );

        if (confirmed) {
            const doubleConfirm = confirm(
                'This action cannot be undone!\n\n' +
                'Click OK to permanently delete your account.'
            );

            if (doubleConfirm) {
                this.deleteAccount();
            }
        }
    }

    async deleteAccount() {
        try {
            // In a real app, you'd delete user data from database first
            await this.currentUser.delete();
            this.showNotification('Account deleted successfully');
            setTimeout(() => {
                window.location.href = '/html/home.html';
            }, 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            if (error.code === 'auth/requires-recent-login') {
                this.showNotification('Please log in again to delete your account', 'error');
                setTimeout(() => {
                    window.location.href = '/html/user.html';
                }, 2000);
            } else {
                this.showNotification('Error deleting account', 'error');
            }
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-size: 1.5rem;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize profile when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});
