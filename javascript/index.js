import {app, db, onValue, ref, set, push, get, auth} from "./firebase.js"

// ===== PRODUCTS DATA =====
// Sample products data structure
const productsData = [
    {
        id: 1,
        name: "light pink Bliss Bouquet | 150 Roses",
        price: 1500,
        discountedPrice: 1350,
        discount: 10,
        image: "/image/products-image1.jfif"
    },
    {
        id: 2,
        name: "Stunning Red Bouquet | 50 Roses",
        price: 1800,
        discountedPrice: 1750,
        discount: 15,
        image: "/image/products-image2.jfif"
    },
    {
        id: 3,
        name: "Luxury Bouquet | 20 Roses",
        price: 1300,
        discountedPrice: 1350,
        discount: 5,
        image: "/image/products-image3.jfif"
    },
    {
        id: 4,
        name: "DarkRed Roses Bouquet | 250 Flowers",
        price: 2900,
        discountedPrice: 3000,
        discount: 10,
        image: "/image/products-image7.jfif"
    },
    {
        id: 5,
        name: "light pink Bouquet | 90 Roses",
        price: 3000,
        discountedPrice: 3600,
        discount: 3,
        image: "/image/products-image5.jfif"
    },
    {
        id: 6,
        name: "Eternal Love Bouquet | 150 Roses",
        price: 35000,
        discountedPrice: 39000,
        discount: 30,
        image: "/image/products-image6.jfif"
    }
];

// ===== CART FUNCTIONALITY =====
class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
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

    // Add item to cart
    addItem(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.syncToFirebase();
        this.showNotification('Product added to cart!');
        return true;
    }

    // Get cart items count
    getItemCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Sync cart to Firebase (if user is logged in)
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

    // Show notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize cart
const cart = new ShoppingCart();

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
    const searchInput = document.querySelector('.icons input[type="text"]');
    if (!searchInput) return;

    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const productBoxes = document.querySelectorAll('.products .box');
        
        productBoxes.forEach(box => {
            const productName = box.querySelector('.content h3').textContent.toLowerCase();
            if (productName.includes(searchTerm)) {
                box.style.display = 'block';
            } else {
                box.style.display = 'none';
            }
        });
    });
}

// ===== ADD TO CART BUTTONS =====
function setupCartButtons() {
    const cartButtons = document.querySelectorAll('.cart-btn');
    
    cartButtons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get product details from the box
            const box = button.closest('.box');
            const productName = box.querySelector('.content h3').textContent;
            const pricesDiv = box.querySelector('.prices');
            const priceText = pricesDiv.childNodes[0].textContent.trim();
            const price = parseInt(priceText.replace('EGP', '').trim());
            const discountSpan = pricesDiv.querySelector('span');
            const discountedPrice = discountSpan ? parseInt(discountSpan.textContent.replace('EGP', '').replace('EG', '').trim()) : price;
            const image = box.querySelector('.image img').src;
            const discount = parseInt(box.querySelector('.discount').textContent.replace('-', '').replace('%', ''));
            
            const product = {
                id: index + 1,
                name: productName,
                price: price,
                discountedPrice: discountedPrice,
                discount: discount,
                image: image
            };
            
            cart.addItem(product);
        });
    });
}

// ===== SMOOTH SCROLLING =====
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// ===== FIREBASE: SAVE PRODUCTS TO DATABASE (Run once to populate) =====
async function saveProductsToFirebase() {
    try {
        const productsRef = ref(db, 'products');
        await set(productsRef, productsData);
        console.log('Products saved to Firebase!');
    } catch (error) {
        console.error('Error saving products:', error);
    }
}

// ===== FIREBASE: LOAD PRODUCTS FROM DATABASE =====
async function loadProductsFromFirebase() {
    try {
        const productsRef = ref(db, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const products = snapshot.val();
            console.log('Products loaded from Firebase:', products);
            // You can use this data to dynamically render products
            return products;
        } else {
            console.log('No products found. Saving default products...');
            await saveProductsToFirebase();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bloom&Blossom initialized!');
    
    // Setup all functionality
    setupCartButtons();
    setupSearch();
    setupSmoothScroll();
    
    // Load products from Firebase (optional - for future dynamic rendering)
    loadProductsFromFirebase();
    
    // Uncomment below to save products to Firebase (run once)
    // saveProductsToFirebase();
});

// Add CSS for notifications
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

