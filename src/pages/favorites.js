// ============================================
// BLOOMY - Favorites/Wishlist Page Script
// ============================================

import { auth, db, ref, set } from '/src/services/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ===== TOAST =====
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
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== BADGE UPDATES =====
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

// ===== RENDER WISHLIST =====
function renderWishlist() {
    const container = document.getElementById('wishlist-container');
    const emptyState = document.getElementById('wishlist-empty');
    const favorites = JSON.parse(localStorage.getItem('bloomFavorites') || '[]');

    if (favorites.length === 0) {
        emptyState.style.display = 'block';
        // Remove all cards
        container.querySelectorAll('.wishlist-card').forEach(c => c.remove());
        return;
    }

    emptyState.style.display = 'none';

    // Build cards
    let html = '';
    favorites.forEach((prod, index) => {
        const discount = prod.discount || 0;
        const originalPrice = discount > 0 
            ? Math.round(prod.price / (1 - discount / 100))
            : null;

        html += `
        <div class="wishlist-card" data-id="${prod.id}" style="animation-delay: ${index * 0.08}s;">
            <div class="card-image">
                ${discount > 0 ? `<span class="discount-tag">-${discount}%</span>` : ''}
                <img src="${prod.image || 'https://via.placeholder.com/300x300'}" alt="${prod.name}" />
                <button class="remove-fav" data-id="${prod.id}" title="Remove from wishlist">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="card-body">
                <h3>${prod.name}</h3>
                <div class="price">
                    EGP ${(prod.price || 0).toLocaleString()}
                    ${originalPrice ? `<span class="old-price">EGP ${originalPrice.toLocaleString()}</span>` : ''}
                </div>
                <div class="card-actions">
                    <button class="add-cart-btn" data-id="${prod.id}">
                        <i class="fas fa-shopping-bag"></i> Add to Cart
                    </button>
                    <button class="share-btn" data-name="${prod.name}">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    // Replace all cards, keep empty state element
    container.querySelectorAll('.wishlist-card').forEach(c => c.remove());
    container.insertAdjacentHTML('afterbegin', html);

    // Event listeners
    setupWishlistEvents(favorites);
}

// ===== EVENTS =====
function setupWishlistEvents(favorites) {
    // Remove from wishlist
    document.querySelectorAll('.remove-fav').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            let favs = JSON.parse(localStorage.getItem('bloomFavorites') || '[]');
            favs = favs.filter(f => f.id !== id);
            localStorage.setItem('bloomFavorites', JSON.stringify(favs));
            
            // Animate out
            const card = btn.closest('.wishlist-card');
            card.style.animation = 'fadeOutCard 0.3s ease forwards';
            setTimeout(() => {
                renderWishlist();
                updateBadges();
            }, 300);

            showToast('Removed from wishlist', 'info');
            syncFavoritesToFirebase(favs);
        });
    });

    // Add to cart
    document.querySelectorAll('.add-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const product = favorites.find(f => f.id === id);
            if (!product) return;

            let cart = JSON.parse(localStorage.getItem('bloomCart') || '[]');
            const existing = cart.find(item => item.id === id);

            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({
                    ...product,
                    discountedPrice: product.price,
                    quantity: 1
                });
            }

            localStorage.setItem('bloomCart', JSON.stringify(cart));
            updateBadges();

            // Button feedback
            btn.innerHTML = '<i class="fas fa-check"></i> Added!';
            btn.style.background = '#4CAF50';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-shopping-bag"></i> Add to Cart';
                btn.style.background = '';
            }, 1500);

            showToast(`${product.name} added to cart!`, 'success');
        });
    });

    // Share
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const name = btn.dataset.name;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Bloomy - ${name}`,
                        text: `Check out this beautiful bouquet: ${name}`,
                        url: window.location.origin + '/index.html#products'
                    });
                } catch (err) { /* cancelled */ }
            } else {
                navigator.clipboard.writeText(window.location.origin + '/index.html#products').then(() => {
                    showToast('Link copied!', 'info');
                });
            }
        });
    });
}

// ===== FIREBASE SYNC =====
async function syncFavoritesToFirebase(favs) {
    const user = auth.currentUser;
    if (user) {
        try {
            await set(ref(db, `favorites/${user.uid}`), favs);
        } catch (e) {
            console.log('Favorites sync skipped:', e.message);
        }
    }
}

// ===== MOBILE MENU SETUP =====
function setupMobileMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const navbar = document.getElementById('navbar');
    const overlay = document.getElementById('nav-overlay');

    if (menuBtn && navbar) {
        menuBtn.addEventListener('click', () => {
            navbar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
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
                menuBtn.querySelector('i').classList.replace('fa-times', 'fa-bars');
            });
        }
    }

    // Scroll effect
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    updateBadges();
    renderWishlist();

    // Update user button
    onAuthStateChanged(auth, (user) => {
        const userBtn = document.querySelector('.icons [title="My Account"]');
        if (userBtn && user) {
            userBtn.href = '/src/pages/profile.html';
        }
    });
});

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOutCard {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
`;
document.head.appendChild(style);
