import {db, ref, set, push, auth} from "./firebase.js";

// ===== CART MANAGER CLASS =====
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.currentStep = 1;
        this.orderData = {};
    }

    // Load cart from localStorage
    loadCart() {
        const savedCart = localStorage.getItem('bloomCart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('bloomCart', JSON.stringify(this.cart));
    }

    // Update item quantity
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

    // Remove item from cart
    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.renderCart();
        this.showNotification('Item removed from cart');
    }

    // Calculate subtotal
    calculateSubtotal() {
        return this.cart.reduce((total, item) => {
            return total + (item.discountedPrice * item.quantity);
        }, 0);
    }

    // Calculate total (can add shipping, tax later)
    calculateTotal() {
        return this.calculateSubtotal();
    }

    // Show notification
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
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Render cart items
    renderCart() {
        const summaryContainer = document.querySelector('.order-summary-container');
        
        if (this.cart.length === 0) {
            summaryContainer.innerHTML = `
                <h2 class="section-title">Order Summary</h2>
                <div style="text-align: center; padding: 3rem 0; color: #999;">
                    <p style="font-size: 1.6rem; margin-bottom: 2rem;">Your cart is empty</p>
                    <a href="/html/home.html#products" class="btn">Continue Shopping</a>
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
                            ${item.discount}% off
                        </p>
                        <div class="quantity-controls" style="display: flex; align-items: center; gap: 1rem; margin: 1rem 0;">
                            <button class="qty-btn minus" data-id="${item.id}">-</button>
                            <span style="font-size: 1.4rem;">${item.quantity}</span>
                            <button class="qty-btn plus" data-id="${item.id}">+</button>
                            <button class="remove-btn" data-id="${item.id}" style="margin-left: auto; color: #ff4757; cursor: pointer; background: none; border: none; font-size: 1.4rem;">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                        <p class="item-price">EGP ${(item.discountedPrice * item.quantity).toLocaleString()}</p>
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

        // Add event listeners for quantity controls
        this.attachQuantityListeners();
    }

    // Attach event listeners to quantity buttons
    attachQuantityListeners() {
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = this.cart.find(item => item.id === id);
                if (item) {
                    this.updateQuantity(id, item.quantity - 1);
                }
            });
        });

        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = this.cart.find(item => item.id === id);
                if (item) {
                    this.updateQuantity(id, item.quantity + 1);
                }
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.removeItem(id);
            });
        });
    }

    // Handle form submission
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'error');
            return;
        }

        // Get form data
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

        // Validate
        if (!formData.firstName || !formData.lastName || !formData.street || 
            !formData.city || !formData.postcode || !formData.phone) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Create order object
        const order = {
            orderDate: new Date().toISOString(),
            customer: formData,
            items: this.cart,
            subtotal: this.calculateSubtotal(),
            total: this.calculateTotal(),
            status: 'pending'
        };

        // Save to Firebase
        try {
            const ordersRef = ref(db, 'orders');
            const newOrderRef = push(ordersRef);
            await set(newOrderRef, order);
            
            this.showNotification('Order placed successfully!');
            
            // Clear cart
            setTimeout(() => {
                this.cart = [];
                this.saveCart();
                window.location.href = '/html/home.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error saving order:', error);
            this.showNotification('Error placing order. Please try again.', 'error');
        }
    }

    // Navigate steps (for future multi-step checkout)
    goToStep(stepNumber) {
        this.currentStep = stepNumber;
        // Update step UI
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
}

// ===== INITIALIZE CART PAGE =====
let cartManager;

document.addEventListener('DOMContentLoaded', () => {
    cartManager = new CartManager();
    
    // Render cart items
    cartManager.renderCart();
    
    // Handle form submission
    const billingForm = document.querySelector('.billing-form');
    if (billingForm) {
        billingForm.addEventListener('submit', (e) => cartManager.handleFormSubmit(e));
    }
    
    // Handle different address checkbox
    const differentAddressCheckbox = document.getElementById('different-address');
    if (differentAddressCheckbox) {
        differentAddressCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                alert('Shipping address form would appear here in a full implementation');
            }
        });
    }

    // Update cart count in header (if needed)
    updateCartCount();
});

// Update cart count badge
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('bloomCart') || '[]');
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    
    // You can add a badge to the cart icon in header if needed
    console.log(`Cart has ${count} items`);
}

// Add CSS for animations and quantity controls
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
