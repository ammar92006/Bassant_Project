// ============================================
// BLOOMY - Cart/Checkout Page Script
// ============================================

import {db, ref, set, push, auth} from "/src/services/firebase.js";
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

// ===== CART MANAGER CLASS =====
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.currentStep = 1;
        this.orderData = {};
    }

    loadCart() {
        const savedCart = localStorage.getItem('bloomCart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    saveCart() {
        localStorage.setItem('bloomCart', JSON.stringify(this.cart));
        updateBadges();
    }

    updateQuantity(productId, newQuantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = newQuantity;
                this.saveCart();
                this.renderCart();
            }
        }
    }

    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.renderCart();
        showToast('Item removed from cart', 'info');
    }

    calculateSubtotal() {
        return this.cart.reduce((total, item) => {
            return total + ((item.discountedPrice || item.price) * item.quantity);
        }, 0);
    }

    calculateTotal() {
        return this.calculateSubtotal();
    }

    renderCart() {
        const summaryContainer = document.querySelector('.order-summary-container');
        
        if (this.cart.length === 0) {
            summaryContainer.innerHTML = `
                <h2 class="section-title">Order Summary</h2>
                <div style="text-align: center; padding: 3rem 0; color: #999;">
                    <i class="fas fa-shopping-bag" style="font-size:4rem; margin-bottom:1.5rem; opacity:0.4;"></i>
                    <p style="font-size: 1.6rem; margin-bottom: 2rem;">Your cart is empty</p>
                    <a href="/index.html#products" class="btn" style="text-decoration:none;">Continue Shopping</a>
                </div>
            `;
            return;
        }

        let itemsHTML = '';
        this.cart.forEach(item => {
            itemsHTML += `
                <div class="item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="item-details">
                        <p><strong>${item.name}</strong></p>
                        <p style="font-size: 1.2rem; color: #ddd">
                            ${item.discount ? item.discount + '% off' : ''}
                        </p>
                        <div class="quantity-controls" style="display: flex; align-items: center; gap: 1rem; margin: 1rem 0;">
                            <button class="qty-btn minus" data-id="${item.id}">-</button>
                            <span style="font-size: 1.4rem;">${item.quantity}</span>
                            <button class="qty-btn plus" data-id="${item.id}">+</button>
                            <button class="remove-btn" data-id="${item.id}" style="margin-left: auto; color: #ff4757; cursor: pointer; background: none; border: none; font-size: 1.4rem;">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                        <p class="item-price">EGP ${((item.discountedPrice || item.price) * item.quantity).toLocaleString()}</p>
                    </div>
                </div>
            `;
        });

        const total = this.calculateTotal();

        summaryContainer.innerHTML = `
            <h2 class="section-title">Order Summary</h2>
            ${itemsHTML}
            <div class="total-section">
                <p>Subtotal</p>
                <p class="total-price">EGP ${total.toLocaleString()}</p>
            </div>
            <div class="total-section" style="border-top: 1px solid #444; padding-top: 1.5rem;">
                <p><strong>Total</strong></p>
                <p class="total-price" style="font-size: 2rem;"><strong>EGP ${total.toLocaleString()}</strong></p>
            </div>
        `;

        this.attachQuantityListeners();
    }

    attachQuantityListeners() {
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = this.cart.find(item => item.id == id || item.id === id);
                if (item) this.updateQuantity(item.id, item.quantity - 1);
            });
        });

        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = this.cart.find(item => item.id == id || item.id === id);
                if (item) this.updateQuantity(item.id, item.quantity + 1);
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = this.cart.find(item => item.id == id || item.id === id);
                if (item) this.removeItem(item.id);
            });
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.cart.length === 0) {
            showToast('Your cart is empty!', 'error');
            return;
        }

        const formData = {
            firstName: document.getElementById('first-name').value,
            lastName: document.getElementById('last-name').value,
            street: document.getElementById('street').value,
            city: document.getElementById('city').value,
            postcode: document.getElementById('postcode').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('additional-info').value,
            differentAddress: document.getElementById('different-address').checked
        };

        if (!formData.firstName || !formData.lastName || !formData.street || 
            !formData.city || !formData.postcode || !formData.phone) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const order = {
            orderDate: new Date().toISOString(),
            customer: formData,
            items: this.cart,
            subtotal: this.calculateSubtotal(),
            total: this.calculateTotal(),
            status: 'pending'
        };

        try {
            const ordersRef = ref(db, 'orders');
            const newOrderRef = push(ordersRef);
            await set(newOrderRef, order);
            
            showToast('🎉 Order placed successfully!', 'success');
            
            setTimeout(() => {
                this.cart = [];
                this.saveCart();
                window.location.href = '/index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error saving order:', error);
            showToast('Error placing order. Please try again.', 'error');
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

    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
}

// ===== INITIALIZE CART PAGE =====
let cartManager;

document.addEventListener('DOMContentLoaded', () => {
    cartManager = new CartManager();
    cartManager.renderCart();
    
    const billingForm = document.querySelector('.billing-form');
    if (billingForm) {
        billingForm.addEventListener('submit', (e) => cartManager.handleFormSubmit(e));
    }
    
    const differentAddressCheckbox = document.getElementById('different-address');
    if (differentAddressCheckbox) {
        differentAddressCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                showToast('Shipping address form coming soon!', 'info');
            }
        });
    }

    setupMobileMenu();
    updateBadges();

    // Update user button
    onAuthStateChanged(auth, (user) => {
        const userBtn = document.querySelector('.icons [title="My Account"]');
        if (userBtn && user) {
            userBtn.href = '/src/pages/profile.html';
        }
    });
});

// Add CSS for quantity controls
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
    }

    .qty-btn {
        width: 3rem;
        height: 3rem;
        border: 1px solid #ddd;
        background: #2c2c2c;
        color: white;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }

    .qty-btn:hover {
        background: #e84393;
        border-color: #e84393;
    }

    .qty-btn:active {
        transform: scale(0.95);
    }

    .remove-btn:hover {
        color: #ff6b81 !important;
    }

    .btn {
        background: linear-gradient(90deg, #e84393, #d63384);
        color: white;
        padding: 1rem 3rem;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1.6rem;
        text-decoration: none;
        display: inline-block;
        transition: all 0.3s ease;
    }

    .btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(232, 67, 147, 0.4);
    }
`;
document.head.appendChild(style);
