import {app, db, onValue, ref, set, push, get, auth} from "/src/services/firebase.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// BLOOMY - Main Application Script
// Cart, Favorites, Search, Header, Products
// ============================================

// ===== TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

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
    }, 3000);
}

// ===== HEADER BADGE UPDATES =====
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('bloomCart') || '[]');
    const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    
    document.querySelectorAll('#cart-badge').forEach(badge => {
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);
    });
}

function updateFavoritesBadge() {
    const favorites = JSON.parse(localStorage.getItem('bloomFavorites') || '[]');
    const count = favorites.length;
    
    document.querySelectorAll('#favorites-badge').forEach(badge => {
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);
    });
}

// ===== CART FUNCTIONALITY =====
class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
    }

    loadCart() {
        const savedCart = localStorage.getItem('bloomCart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    saveCart() {
        localStorage.setItem('bloomCart', JSON.stringify(this.cart));
        updateCartBadge();
    }

    addItem(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
            showToast(`${product.name} quantity updated!`, 'info');
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
            showToast(`${product.name} added to cart!`, 'success');
        }
        
        this.saveCart();
        this.syncToFirebase();
        return true;
    }

    getItemCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    async syncToFirebase() {
        const user = auth.currentUser;
        if (user) {
            try {
                const cartRef = ref(db, `carts/${user.uid}`);
                await set(cartRef, this.cart);
            } catch (error) {
                console.log('Cart sync skipped:', error.message);
            }
        }
    }
}

// ===== FAVORITES / WISHLIST FUNCTIONALITY =====
class WishlistManager {
    constructor() {
        this.favorites = this.loadFavorites();
    }

    loadFavorites() {
        const saved = localStorage.getItem('bloomFavorites');
        return saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('bloomFavorites', JSON.stringify(this.favorites));
        updateFavoritesBadge();
    }

    toggle(product) {
        const index = this.favorites.findIndex(item => item.id === product.id);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            showToast(`Removed from wishlist`, 'info');
        } else {
            this.favorites.push(product);
            showToast(`Added to wishlist! ❤️`, 'success');
        }
        
        this.saveFavorites();
        this.syncToFirebase();
        this.updateHeartIcons();
    }

    isFavorited(productId) {
        return this.favorites.some(item => item.id === productId);
    }

    updateHeartIcons() {
        document.querySelectorAll('.fa-heart[data-id]').forEach(heart => {
            const id = heart.getAttribute('data-id');
            if (this.isFavorited(id)) {
                heart.classList.add('favorited');
            } else {
                heart.classList.remove('favorited');
            }
        });
    }

    async syncToFirebase() {
        const user = auth.currentUser;
        if (user) {
            try {
                const favRef = ref(db, `favorites/${user.uid}`);
                await set(favRef, this.favorites);
            } catch (error) {
                console.log('Favorites sync skipped:', error.message);
            }
        }
    }
}

// Initialize
const cart = new ShoppingCart();
const wishlist = new WishlistManager();

// ===== HEADER SETUP =====
function setupHeader() {
    // Mobile menu
    const menuBtn = document.getElementById('menu-btn');
    const navbar = document.getElementById('navbar');
    const overlay = document.getElementById('nav-overlay');

    if (menuBtn && navbar) {
        menuBtn.addEventListener('click', () => {
            navbar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            
            // Toggle icon
            const icon = menuBtn.querySelector('i');
            if (navbar.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });

        if (overlay) {
            overlay.addEventListener('click', () => {
                navbar.classList.remove('active');
                overlay.classList.remove('active');
                const icon = menuBtn.querySelector('i');
                icon.classList.replace('fa-times', 'fa-bars');
            });
        }
    }

    // Scroll effect for header
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Search toggle
    const searchToggle = document.getElementById('search-toggle-btn');
    const searchContainer = document.getElementById('header-search');
    const searchInput = document.getElementById('search-input');

    if (searchToggle && searchContainer) {
        searchToggle.addEventListener('click', (e) => {
            e.preventDefault();
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active') && searchInput) {
                searchInput.focus();
            }
        });
    }

    // Update user button based on auth state
    onAuthStateChanged(auth, async (user) => {
        const userBtn = document.getElementById('user-btn');
        const userAvatarBtn = document.getElementById('user-avatar-btn');
        
        if (user) {
            // Hide simple user icon, show avatar button
            if (userBtn) userBtn.style.display = 'none';
            if (userAvatarBtn) userAvatarBtn.style.display = 'flex';

            // Load user data from Firebase
            try {
                const { ref: fbRef, get: fbGet } = await import('/src/services/firebase.js');
                const userRef = fbRef(db, `users/${user.uid}`);
                const snapshot = await fbGet(userRef);
                
                let firstName = user.email.split('@')[0];
                let lastName = '';
                let email = user.email;

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    firstName = data.firstName || firstName;
                    lastName = data.lastName || '';
                    email = data.email || email;
                }

                const fullName = `${firstName} ${lastName}`.trim();
                const initial = firstName.charAt(0).toUpperCase();

                // Update avatar elements
                const headerAvatar = document.getElementById('header-avatar');
                const userNavName = document.getElementById('user-nav-name');
                const userDpAvatar = document.getElementById('user-dp-avatar');
                const userDpName = document.getElementById('user-dp-name');
                const userDpEmail = document.getElementById('user-dp-email');

                if (headerAvatar) headerAvatar.textContent = initial;
                if (userNavName) userNavName.textContent = firstName;
                if (userDpAvatar) userDpAvatar.textContent = initial;
                if (userDpName) userDpName.textContent = fullName;
                if (userDpEmail) userDpEmail.textContent = email;

                // Load user notifications count
                try {
                    const notifRef = fbRef(db, `users/${user.uid}/notifications`);
                    const notifSnap = await fbGet(notifRef);
                    if (notifSnap.exists()) {
                        const notifications = notifSnap.val();
                        const unreadCount = Object.values(notifications).filter(n => !n.read).length;
                        const notifCountEl = document.getElementById('notif-count');
                        if (notifCountEl && unreadCount > 0) {
                            notifCountEl.style.display = 'flex';
                            notifCountEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
                        }
                    }
                } catch (notifErr) {
                    console.log('Notifications check skipped');
                }

            } catch (error) {
                console.log('User data load error:', error.message);
                const initial = user.email.charAt(0).toUpperCase();
                const headerAvatar = document.getElementById('header-avatar');
                if (headerAvatar) headerAvatar.textContent = initial;
            }

            // Setup dropdown toggle
            setupUserDropdown(user);

        } else {
            // Not logged in
            if (userBtn) userBtn.style.display = 'flex';
            if (userAvatarBtn) userAvatarBtn.style.display = 'none';
        }
    });
}

// ===== USER DROPDOWN LOGIC =====
function setupUserDropdown(user) {
    const avatarBtn = document.getElementById('user-avatar-btn');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('dp-logout');

    if (!avatarBtn || !dropdown) return;

    // Toggle dropdown on avatar click
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('show');
        dropdown.classList.toggle('show', !isOpen);
        avatarBtn.classList.toggle('active', !isOpen);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!avatarBtn.contains(e.target)) {
            dropdown.classList.remove('show');
            avatarBtn.classList.remove('active');
        }
    });

    // Prevent dropdown close when clicking inside
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { signOut: fbSignOut } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
                await fbSignOut(auth);
                showToast('Signed out successfully', 'info');
                setTimeout(() => window.location.href = '/index.html', 1000);
            } catch (err) {
                showToast('Error signing out', 'error');
            }
        });
    }


}

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const productBoxes = document.querySelectorAll('.products .box');
        
        productBoxes.forEach(box => {
            const productName = box.querySelector('.content h3')?.textContent.toLowerCase() || '';
            if (productName.includes(searchTerm)) {
                box.style.display = 'block';
            } else {
                box.style.display = 'none';
            }
        });
    });
}

// ===== SMOOTH SCROLL =====
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                
                // Close mobile menu if open
                const navbar = document.getElementById('navbar');
                const overlay = document.getElementById('nav-overlay');
                const menuBtn = document.getElementById('menu-btn');
                if (navbar) navbar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (menuBtn) {
                    const icon = menuBtn.querySelector('i');
                    if (icon) icon.classList.replace('fa-times', 'fa-bars');
                }
            }
        });
    });
}

// ===== FIREBASE: LOAD AND RENDER PRODUCTS FROM DATABASE =====
async function loadProductsFromFirebase() {
    try {
        const productsRef = ref(db, 'products');
        const snapshot = await get(productsRef);
        const container = document.querySelector('.products .box-container');
        
        if (!container) return; // Not on the home page

        if (snapshot.exists()) {
            const data = snapshot.val();
            const products = Object.entries(data).map(([id, p]) => ({ id, ...p }));
            
            container.innerHTML = products.map(prod => {
                const isAvailable = prod.status !== 'unavailable';
                const discount = prod.discount || 0;
                const originalPrice = discount > 0 
                    ? Math.round(prod.price / (1 - discount / 100))
                    : Math.round((prod.price || 0) * 1.25);
                const isFav = wishlist.isFavorited(prod.id);
                
                return `
                <div class="box" data-id="${prod.id}">
                    ${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}
                    <div class="image">
                        <img src="${prod.image || 'https://via.placeholder.com/300x300'}" alt="${prod.name}" />
                        <div class="icons">
                            ${isAvailable 
                                ? `<a href="#" class="cart-btn" data-id="${prod.id}">Add to Cart</a>` 
                                : '<a href="#" class="cart-btn disabled" style="background:#555; pointer-events:none;">Out of Stock</a>'}
                            <a href="#" class="fas fa-heart ${isFav ? 'favorited' : ''}" data-id="${prod.id}"></a>
                            <a href="#" class="fas fa-share" data-id="${prod.id}"></a>
                        </div>
                    </div>
                    <div class="content">
                        <h3>${prod.name}</h3>
                        <div class="prices">EGP ${prod.price || 0} <span>EGP${originalPrice}</span></div>
                    </div>
                </div>
                `;
            }).join('');

            // Hook up cart and favorites buttons
            setupCartButtonsWithData(products);
            setupFavoritesButtons(products);

        } else {
            container.innerHTML = '<p style="font-size:2rem; color:var(--text-gray); text-align:center; width:100%;">No products currently available.</p>';
        }
    } catch (error) {
        console.error('Error loading products from Firebase:', error);
        const container = document.querySelector('.products .box-container');
        if (container) {
            container.innerHTML = '<p style="font-size:1.6rem; color:var(--text-gray); text-align:center; width:100%;">Error loading products. Please refresh the page.</p>';
        }
    }
}

// ===== DYNAMIC ADD TO CART BUTTONS =====
function setupCartButtonsWithData(products) {
    const cartButtons = document.querySelectorAll('.cart-btn:not(.disabled)');
    
    cartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const id = button.getAttribute('data-id');
            const product = products.find(p => p.id === id);
            
            if(product) {
                cart.addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discountedPrice: product.price,
                    discount: product.discount || 0,
                    image: product.image || 'https://via.placeholder.com/300x300'
                });

                // Animation on the button
                button.textContent = '✓ Added!';
                button.style.background = '#4CAF50';
                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                    button.style.background = '';
                }, 1500);
            }
        });
    });
}

// ===== FAVORITES BUTTONS =====
function setupFavoritesButtons(products) {
    const heartButtons = document.querySelectorAll('.fa-heart[data-id]');
    
    heartButtons.forEach(heart => {
        heart.addEventListener('click', (e) => {
            e.preventDefault();
            const id = heart.getAttribute('data-id');
            const product = products.find(p => p.id === id);
            
            if (product) {
                wishlist.toggle({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discount: product.discount || 0,
                    image: product.image || 'https://via.placeholder.com/300x300'
                });

                // Toggle visual state
                heart.classList.toggle('favorited');
            }
        });
    });
}

// ===== SHARE BUTTON =====
function setupShareButtons() {
    document.querySelectorAll('.fa-share').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const box = btn.closest('.box');
            const productName = box?.querySelector('.content h3')?.textContent || 'Bloomy Product';
            
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Bloomy - ${productName}`,
                        text: `Check out this beautiful bouquet: ${productName}`,
                        url: window.location.href
                    });
                } catch (err) {
                    // User cancelled
                }
            } else {
                // Fallback: copy link
                navigator.clipboard.writeText(window.location.href).then(() => {
                    showToast('Link copied to clipboard!', 'info');
                });
            }
        });
    });
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bloomy initialized & syncing with Firebase!');
    
    // Setup header (mobile menu, scroll, search)
    setupHeader();
    
    // Setup general UI functionality
    setupSearch();
    setupSmoothScroll();
    
    // Update badges
    updateCartBadge();
    updateFavoritesBadge();
    
    // Dynamically load products from Firebase
    loadProductsFromFirebase().then(() => {
        setupShareButtons();
    });
});

// Export for other modules to use
export { showToast, updateCartBadge, updateFavoritesBadge };