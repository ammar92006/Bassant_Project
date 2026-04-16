// ============================================
// BLOOMY ADMIN DASHBOARD - Main JavaScript
// Complete dashboard logic with Firebase Realtime
// ============================================

import {
    db, auth, ref, onValue, set, push, get, update, remove,
    storage, storageRef, uploadBytes, getDownloadURL,
    onAuthStateChanged, signOut,
    checkAdminAccess,
    updateUserRole,
    toggleUserStatus,
    updateOrderStatus,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead
} from '/src/services/firebase-admin.js';

// ===== GLOBAL STATE =====
const state = {
    currentUser: null,
    userData: null,
    users: [],
    customers: [],
    orders: [],
    products: [],
    notifications: {},
    usersPage: 1,
    ordersPage: 1,
    productsPage: 1,
    customersPage: 1,
    itemsPerPage: 10,
    usersSearch: '',
    ordersSearch: '',
    productsSearch: '',
    customersSearch: '',
    usersRoleFilter: 'all',
    usersStatusFilter: 'all',
    ordersStatusFilter: 'all',
    productsStatusFilter: 'all',
    customersStatusFilter: 'all',
    charts: {}
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { user, userData } = await checkAdminAccess();
        state.currentUser = user;
        state.userData = userData;

        // Hide loading screen
        document.getElementById('loading-screen').style.display = 'none';

        // Setup UI
        setupAdminProfile();
        setupSidebar();
        setupTopbar();
        setupEventListeners();

        // Enforce RBAC on UI elements
        if (state.userData.role === 'user') {
            document.querySelectorAll('.nav-item[data-page="users"]').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.nav-item[data-page="settings"]').forEach(el => el.style.display = 'none');
            document.getElementById('page-subtitle').textContent = `Welcome back, ${state.userData.firstName || 'Staff'}`;
        }

        // Start realtime listeners
        initRealtimeListeners();

        showToast('Welcome back, ' + (userData.firstName || 'Staff') + '!', 'success');
    } catch (error) {
        console.error('Dashboard init error:', error);
        
        // Let the user know why it failed instead of staying on infinite loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align:center; padding: 2rem; background: rgba(0,0,0,0.8); border-radius: 1rem; border: 1px solid #444;">
                    <i class="fas fa-exclamation-triangle" style="font-size:4rem; color:#f44336; margin-bottom:1.5rem;"></i>
                    <h2 style="color:#fff; font-family:Poppins, sans-serif; margin-bottom:1rem;">Dashboard Failed to Load</h2>
                    <p style="color:#999; font-size:1.2rem; margin-bottom:2rem; max-width:400px; line-height:1.6;">
                        ${error.message || error || 'Unable to verify administrative access. Please check your connection.'}
                    </p>
                    <button onclick="window.location.reload()" style="background:#e84393; color:white; padding: 1rem 2.5rem; border:none; border-radius:0.5rem; font-size:1.2rem; cursor:pointer; font-weight:600; margin-bottom:1rem;">Try Again</button>
                    <br>
                    <a href="admin-login.html" style="color:#e84393; text-decoration:underline; font-size:1.1rem;">Go to Login</a>
                </div>
            `;
        }
    }
});

// ===== ADMIN PROFILE SETUP =====
function setupAdminProfile() {
    const name = `${state.userData.firstName || ''} ${state.userData.lastName || ''}`.trim() || 'Admin';
    const initial = name.charAt(0).toUpperCase();

    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('topbar-name').textContent = name;
    document.getElementById('topbar-avatar').textContent = initial;
    document.getElementById('page-subtitle').textContent = `Welcome back, ${state.userData.firstName || 'Admin'}`;
}

// ===== SIDEBAR =====
function setupSidebar() {
    const layout = document.getElementById('admin-layout');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    // Toggle sidebar collapse (desktop)
    toggle.addEventListener('click', () => {
        if (window.innerWidth > 991) {
            layout.classList.toggle('sidebar-collapsed');
        } else {
            layout.classList.remove('sidebar-open');
        }
    });

    // Mobile menu
    mobileBtn.addEventListener('click', () => {
        layout.classList.toggle('sidebar-open');
    });

    // Close sidebar on overlay click
    overlay.addEventListener('click', () => {
        layout.classList.remove('sidebar-open');
    });

    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
            if (window.innerWidth <= 991) {
                layout.classList.remove('sidebar-open');
            }
        });
    });
}

// ===== NAVIGATION =====
window.navigateTo = function(page) {
    // RBAC: Staff (user) cannot access users or settings
    if (state.userData.role === 'user' && (page === 'users' || page === 'settings')) {
        showToast('Access Denied. You do not have permission to view this page.', 'error');
        return;
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Show/hide pages
    document.querySelectorAll('.admin-page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Update topbar title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        customers: 'Customers Management',
        orders: 'Orders Management',
        products: 'Products Management',
        analytics: 'Analytics',
        settings: 'Settings'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
};

// ===== TOPBAR =====
function setupTopbar() {
    // Profile dropdown
    const profileBtn = document.getElementById('topbar-profile');
    const profileDropdown = document.getElementById('profile-dropdown');

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
        document.getElementById('notifications-dropdown').classList.remove('show');
    });

    // Notifications dropdown
    const notifBtn = document.getElementById('notifications-btn');
    const notifDropdown = document.getElementById('notifications-dropdown');

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('show');
        profileDropdown.classList.remove('show');
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        notifDropdown.classList.remove('show');
    });

    // Prevent dropdown close when clicking inside
    notifDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Logout
    document.getElementById('admin-logout').addEventListener('click', async () => {
        try {
            await signOut(auth);
            showToast('Logged out successfully', 'info');
            setTimeout(() => {
                window.location.href = 'user.html';
            }, 1000);
        } catch (error) {
            showToast('Error logging out', 'error');
        }
    });

    // Go to store
    document.getElementById('go-home').addEventListener('click', () => {
        window.location.href = 'home.html';
    });

    // Go to profile
    document.getElementById('go-profile').addEventListener('click', () => {
        window.location.href = 'profile.html';
    });

    // Mark all read
    document.getElementById('mark-all-read').addEventListener('click', async () => {
        if (Object.keys(state.notifications).length > 0) {
            await markAllNotificationsRead(state.notifications);
            showToast('All notifications marked as read', 'success');
        }
    });

    // Global search
    document.getElementById('global-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length >= 2) {
            // Auto-navigate to likely page
            const hasUserMatch = state.users.some(u =>
                (u.firstName || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query)
            );
            if (hasUserMatch) {
                navigateTo('users');
                document.getElementById('users-search').value = query;
                state.usersSearch = query;
                state.usersPage = 1;
                renderUsersTable();
            }
        }
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Users search
    document.getElementById('users-search').addEventListener('input', debounce((e) => {
        state.usersSearch = e.target.value.toLowerCase();
        state.usersPage = 1;
        renderUsersTable();
    }, 300));

    // Users role filter
    document.getElementById('users-role-filter').addEventListener('change', (e) => {
        state.usersRoleFilter = e.target.value;
        state.usersPage = 1;
        renderUsersTable();
    });

    // Users status filter
    document.getElementById('users-status-filter').addEventListener('change', (e) => {
        state.usersStatusFilter = e.target.value;
        state.usersPage = 1;
        renderUsersTable();
    });

    // Customers search
    document.getElementById('customers-search').addEventListener('input', debounce((e) => {
        state.customersSearch = e.target.value.toLowerCase();
        state.customersPage = 1;
        renderCustomersTable();
    }, 300));

    // Customers status filter
    document.getElementById('customers-status-filter').addEventListener('change', (e) => {
        state.customersStatusFilter = e.target.value;
        state.customersPage = 1;
        renderCustomersTable();
    });

    // Customer form submit
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);

    // Customer modal outside-click close
    document.getElementById('customer-modal').addEventListener('click', (e) => {
        if (e.target.id === 'customer-modal') closeModal('customer-modal');
    });

    // Orders search
    document.getElementById('orders-search').addEventListener('input', debounce((e) => {
        state.ordersSearch = e.target.value.toLowerCase();
        state.ordersPage = 1;
        renderOrdersTable();
    }, 300));

    // Orders status filter
    document.getElementById('orders-status-filter').addEventListener('change', (e) => {
        state.ordersStatusFilter = e.target.value;
        state.ordersPage = 1;
        renderOrdersTable();
    });

    // Products search
    document.getElementById('products-search').addEventListener('input', debounce((e) => {
        state.productsSearch = e.target.value.toLowerCase();
        state.productsPage = 1;
        renderProductsTable();
    }, 300));

    // Products status filter
    document.getElementById('products-status-filter').addEventListener('change', (e) => {
        state.productsStatusFilter = e.target.value;
        state.productsPage = 1;
        renderProductsTable();
    });

    // Products Form Submit
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Modal close buttons (handled inline in HTML mostly, but for order: )
    document.getElementById('modal-close').addEventListener('click', () => closeModal('order-modal'));
    document.getElementById('modal-cancel-btn').addEventListener('click', () => closeModal('order-modal'));
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-modal') closeModal('order-modal');
    });
    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal('product-modal');
    });
}

// ===== REALTIME LISTENERS =====
function initRealtimeListeners() {
    // Users listener
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        state.users = [];
        state.customers = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.entries(data).forEach(([uid, user]) => {
                const userObj = { uid, ...user };
                
                // RBAC filter
                if (user.role === 'admin' || user.role === 'user') {
                    state.users.push(userObj);
                }
                if (user.role === 'customer') {
                    state.customers.push(userObj);
                }
            });
        }
        renderUsersTable();
        renderCustomersTable();
        updateOverviewCards();
        updateCharts();
    }, (error) => {
        console.error('Users listener error:', error);
        showToast(`Failed to load users: ${error?.code || ''} ${error?.message || error}`.trim(), 'error');
        state.users = [];
        state.customers = [];
        renderUsersTable();
        renderCustomersTable();
        updateOverviewCards();
        updateCharts();
    });

    // Orders listener
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        state.orders = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.entries(data).forEach(([id, order]) => {
                state.orders.push({ id, ...order });
            });
            // Sort by date descending
            state.orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        }
        renderOrdersTable();
        renderRecentOrders();
        updateOverviewCards();
        updateCharts();
    }, (error) => {
        console.error('Orders listener error:', error);
        showToast(`Failed to load orders: ${error?.code || ''} ${error?.message || error}`.trim(), 'error');
        state.orders = [];
        renderOrdersTable();
        renderRecentOrders();
        updateOverviewCards();
        updateCharts();
    });

    // Products listener
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        state.products = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.entries(data).forEach(([id, prod]) => {
                state.products.push({ id, ...prod });
            });
        }
        renderProductsTable();
    }, (error) => {
        console.error('Products listener error:', error);
        showToast(`Failed to load products: ${error?.code || ''} ${error?.message || error}`.trim(), 'error');
        state.products = [];
        renderProductsTable();
    });

    // Notifications listener
    const notifRef = ref(db, 'notifications');
    onValue(notifRef, (snapshot) => {
        state.notifications = snapshot.exists() ? snapshot.val() : {};
        renderNotifications();
    }, (error) => {
        console.error('Notifications listener error:', error);
        showToast(`Failed to load notifications: ${error?.code || ''} ${error?.message || error}`.trim(), 'error');
        state.notifications = {};
        renderNotifications();
    });

    // Active sessions (track this admin)
    trackActiveSession();
}

// ===== OVERVIEW CARDS =====
function updateOverviewCards() {
    const totalUsers = state.users.length;
    const totalOrders = state.orders.length;
    const totalRevenue = state.orders.reduce((sum, order) => sum + (order.total || 0), 0);

    const cardsHTML = `
        <div class="overview-card users">
            <div class="card-icon"><i class="fas fa-users"></i></div>
            <div class="card-info">
                <h3>${totalUsers.toLocaleString()}</h3>
                <p>Total Users</p>
                <div class="card-trend up"><i class="fas fa-arrow-up"></i> ${getNewCount(state.users, 7)} new this week</div>
            </div>
        </div>
        <div class="overview-card orders">
            <div class="card-icon"><i class="fas fa-shopping-bag"></i></div>
            <div class="card-info">
                <h3>${totalOrders.toLocaleString()}</h3>
                <p>Total Orders</p>
                <div class="card-trend up"><i class="fas fa-arrow-up"></i> ${getNewOrderCount(7)} this week</div>
            </div>
        </div>
        <div class="overview-card revenue">
            <div class="card-icon"><i class="fas fa-coins"></i></div>
            <div class="card-info">
                <h3>EGP ${totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
                <div class="card-trend up"><i class="fas fa-arrow-up"></i> EGP ${getWeekRevenue().toLocaleString()} this week</div>
            </div>
        </div>
        <div class="overview-card sessions">
            <div class="card-icon"><i class="fas fa-signal"></i></div>
            <div class="card-info">
                <h3>1</h3>
                <p>Active Sessions</p>
                <div class="card-trend up"><i class="fas fa-circle" style="font-size:0.8rem;"></i> You are online</div>
            </div>
        </div>
    `;

    document.getElementById('overview-cards').innerHTML = cardsHTML;
}

function getNewCount(items, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return items.filter(item => {
        const date = new Date(item.createdAt);
        return date >= cutoff;
    }).length;
}

function getNewOrderCount(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return state.orders.filter(order => {
        const date = new Date(order.orderDate);
        return date >= cutoff;
    }).length;
}

function getWeekRevenue() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return state.orders
        .filter(order => new Date(order.orderDate) >= cutoff)
        .reduce((sum, order) => sum + (order.total || 0), 0);
}

// ===== CHARTS =====
function updateCharts() {
    updateSalesChart();
    updateOrdersChart();
    updateUsersGrowthChart();
    updateOrderStatusChart();
    updateRevenueTrendChart();
}

function updateSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const last7Days = getLast7Days();
    const salesData = last7Days.map(day => {
        return state.orders
            .filter(o => formatDate(o.orderDate) === day.key)
            .reduce((sum, o) => sum + (o.total || 0), 0);
    });

    if (state.charts.sales) state.charts.sales.destroy();

    state.charts.sales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.label),
            datasets: [{
                label: 'Revenue (EGP)',
                data: salesData,
                borderColor: '#e84393',
                backgroundColor: 'rgba(232, 67, 147, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#e84393',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: getChartOptions('EGP')
    });
}

function updateOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;

    const last7Days = getLast7Days();
    const ordersData = last7Days.map(day => {
        return state.orders.filter(o => formatDate(o.orderDate) === day.key).length;
    });

    if (state.charts.orders) state.charts.orders.destroy();

    state.charts.orders = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.label),
            datasets: [{
                label: 'Orders',
                data: ordersData,
                backgroundColor: 'rgba(232, 67, 147, 0.6)',
                borderColor: '#e84393',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: getChartOptions()
    });
}

function updateUsersGrowthChart() {
    const ctx = document.getElementById('usersGrowthChart');
    if (!ctx) return;

    const months = getLast6Months();
    const growthData = months.map(month => {
        return state.users.filter(u => {
            const d = new Date(u.createdAt);
            return d.getFullYear() === month.year && d.getMonth() === month.month;
        }).length;
    });

    // Cumulative
    let cumulative = 0;
    const cumulativeData = growthData.map(count => {
        cumulative += count;
        return cumulative;
    });

    if (state.charts.usersGrowth) state.charts.usersGrowth.destroy();

    state.charts.usersGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [{
                label: 'Total Users',
                data: cumulativeData,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#2196f3',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }, {
                label: 'New Users',
                data: growthData,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#4caf50',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: getChartOptions()
    });
}

function updateOrderStatusChart() {
    const ctx = document.getElementById('orderStatusChart');
    if (!ctx) return;

    const pending = state.orders.filter(o => o.status === 'pending').length;
    const completed = state.orders.filter(o => o.status === 'completed').length;
    const cancelled = state.orders.filter(o => o.status === 'cancelled').length;

    if (state.charts.orderStatus) state.charts.orderStatus.destroy();

    state.charts.orderStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Completed', 'Cancelled'],
            datasets: [{
                data: [pending, completed, cancelled],
                backgroundColor: ['#ffc107', '#4caf50', '#f44336'],
                borderColor: '#2c2c2c',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#999', font: { size: 13 }, padding: 20 }
                }
            }
        }
    });
}

function updateRevenueTrendChart() {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;

    const months = getLast6Months();
    const revenueData = months.map(month => {
        return state.orders
            .filter(o => {
                const d = new Date(o.orderDate);
                return d.getFullYear() === month.year && d.getMonth() === month.month;
            })
            .reduce((sum, o) => sum + (o.total || 0), 0);
    });

    if (state.charts.revenueTrend) state.charts.revenueTrend.destroy();

    state.charts.revenueTrend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [{
                label: 'Revenue (EGP)',
                data: revenueData,
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: '#4caf50',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: getChartOptions('EGP')
    });
}

function getChartOptions(prefix = '') {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { labels: { color: '#999', font: { size: 12 } } },
            tooltip: {
                backgroundColor: '#2c2c2c',
                titleColor: '#fff',
                bodyColor: '#999',
                borderColor: '#444',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: prefix ? {
                    label: (ctx) => `${ctx.dataset.label}: ${prefix} ${ctx.parsed.y.toLocaleString()}`
                } : {}
            }
        },
        scales: {
            x: {
                ticks: { color: '#999', font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.03)' }
            },
            y: {
                ticks: {
                    color: '#999',
                    font: { size: 11 },
                    callback: (v) => prefix ? `${prefix} ${v.toLocaleString()}` : v
                },
                grid: { color: 'rgba(255,255,255,0.03)' },
                beginAtZero: true
            }
        }
    };
}

// ===== USERS TABLE =====
function renderUsersTable() {
    let filtered = [...state.users];

    // Search
    if (state.usersSearch) {
        filtered = filtered.filter(u =>
            (u.firstName || '').toLowerCase().includes(state.usersSearch) ||
            (u.lastName || '').toLowerCase().includes(state.usersSearch) ||
            (u.email || '').toLowerCase().includes(state.usersSearch)
        );
    }

    // Role filter
    if (state.usersRoleFilter !== 'all') {
        filtered = filtered.filter(u => (u.role || 'user') === state.usersRoleFilter);
    }

    // Status filter
    if (state.usersStatusFilter !== 'all') {
        filtered = filtered.filter(u => (u.status || 'active') === state.usersStatusFilter);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / state.itemsPerPage);
    const start = (state.usersPage - 1) * state.itemsPerPage;
    const paged = filtered.slice(start, start + state.itemsPerPage);

    const tbody = document.getElementById('users-table-body');

    if (paged.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <h4>No users found</h4>
                        <p>Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paged.map(user => {
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
            const initial = name.charAt(0).toUpperCase();
            const role = user.role || 'user';
            const status = user.status || 'active';
            const createdAt = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';

            return `
                <tr>
                    <td style="cursor:pointer;" onclick="window.showUserDetail('${user.uid}')">
                        <div class="table-user">
                            <div class="table-user-avatar">${initial}</div>
                            <div class="table-user-info">
                                <h4>${escapeHTML(name)}</h4>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHTML(user.email || 'N/A')}</td>
                    <td>
                        <select class="inline-select" onchange="handleRoleChange('${user.uid}', this.value)" ${user.uid === state.currentUser.uid ? 'disabled' : ''}>
                            <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td><span class="status-badge ${status}">${status}</span></td>
                    <td>${createdAt}</td>
                    <td>
                        ${user.uid !== state.currentUser.uid ? `
                            <button class="table-action-btn ${status === 'active' ? 'danger' : 'success'}"
                                onclick="handleToggleUser('${user.uid}', '${status}')"
                                title="${status === 'active' ? 'Disable User' : 'Enable User'}">
                                <i class="fas fa-${status === 'active' ? 'ban' : 'check-circle'}"></i>
                            </button>
                        ` : '<span style="color:var(--text-gray);font-size:1.2rem;">You</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Update footer
    document.getElementById('users-showing').textContent =
        `Showing ${paged.length} of ${total} users`;

    // Pagination
    renderPagination('users-pagination', state.usersPage, totalPages, (page) => {
        state.usersPage = page;
        renderUsersTable();
    });
}

// ===== ORDERS TABLE =====
function renderOrdersTable() {
    let filtered = [...state.orders];

    // Search
    if (state.ordersSearch) {
        filtered = filtered.filter(o =>
            o.id.toLowerCase().includes(state.ordersSearch) ||
            (o.customer?.firstName || '').toLowerCase().includes(state.ordersSearch) ||
            (o.customer?.lastName || '').toLowerCase().includes(state.ordersSearch)
        );
    }

    // Status filter
    if (state.ordersStatusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === state.ordersStatusFilter);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / state.itemsPerPage);
    const start = (state.ordersPage - 1) * state.itemsPerPage;
    const paged = filtered.slice(start, start + state.itemsPerPage);

    const tbody = document.getElementById('orders-table-body');

    if (paged.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h4>No orders found</h4>
                        <p>Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paged.map(order => {
            const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
            const orderDate = order.orderDate
                ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';

            return `
                <tr>
                    <td style="color:var(--primary-color);font-weight:600;">#${order.id.substring(0, 8).toUpperCase()}</td>
                    <td>${escapeHTML(customerName)}</td>
                    <td>EGP ${(order.total || 0).toLocaleString()}</td>
                    <td>
                        <select class="inline-select" onchange="handleStatusChange('${order.id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>${orderDate}</td>
                    <td>
                        <button class="table-action-btn" onclick="showOrderDetail('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Footer
    document.getElementById('orders-showing').textContent =
        `Showing ${paged.length} of ${total} orders`;

    // Pagination
    renderPagination('orders-pagination', state.ordersPage, totalPages, (page) => {
        state.ordersPage = page;
        renderOrdersTable();
    });
}

// ===== PRODUCTS TABLE =====
function renderProductsTable() {
    let filtered = [...state.products];

    if (state.productsSearch) {
        filtered = filtered.filter(p => 
            (p.name || '').toLowerCase().includes(state.productsSearch) ||
            (p.category || '').toLowerCase().includes(state.productsSearch)
        );
    }

    if (state.productsStatusFilter !== 'all') {
        filtered = filtered.filter(p => (p.status || 'available') === state.productsStatusFilter);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / state.itemsPerPage);
    const start = (state.productsPage - 1) * state.itemsPerPage;
    const paged = filtered.slice(start, start + state.itemsPerPage);

    const tbody = document.getElementById('products-table-body');

    if (paged.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <h4>No products found</h4>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paged.map(prod => {
            const imgSrc = prod.image || 'https://via.placeholder.com/50';
            const status = prod.status || 'available';
            const statusLbl = status === 'available' ? 'متاح' : 'غير متاح';

            return `
                <tr>
                    <td><img src="${imgSrc}" style="width:50px; height:50px; object-fit:cover; border-radius:0.5rem;" alt="${escapeHTML(prod.name)}"></td>
                    <td>${escapeHTML(prod.name)}</td>
                    <td>${escapeHTML(prod.category)}</td>
                    <td>EGP ${(prod.price || 0).toLocaleString()}</td>
                    <td><span class="status-badge ${status === 'available' ? 'active' : 'disabled'}">${statusLbl}</span></td>
                    <td>
                        <button class="table-action-btn" onclick="window.openProductModal('${prod.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="table-action-btn danger" onclick="window.deleteProduct('${prod.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('products-showing').textContent = `Showing ${paged.length} of ${total} products`;

    renderPagination('products-pagination', state.productsPage, totalPages, (page) => {
        state.productsPage = page;
        renderProductsTable();
    });
}

// ===== RECENT ORDERS (Dashboard) =====
function renderRecentOrders() {
    const tbody = document.getElementById('recent-orders-body');
    const recent = state.orders.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h4>No orders yet</h4>
                        <p>Orders will appear here when customers place them</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recent.map(order => {
        const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
        const orderDate = order.orderDate
            ? new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'N/A';

        return `
            <tr style="cursor:pointer;" onclick="showOrderDetail('${order.id}')">
                <td style="color:var(--primary-color);font-weight:600;">#${order.id.substring(0, 8).toUpperCase()}</td>
                <td>${escapeHTML(customerName)}</td>
                <td>EGP ${(order.total || 0).toLocaleString()}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${orderDate}</td>
            </tr>
        `;
    }).join('');
}

// ===== PAGINATION =====
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="void(0)" data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    html += `
        <button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('button:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) {
                onPageChange(page);
            }
        });
    });
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
    const list = document.getElementById('notifications-list');
    const badge = document.getElementById('notif-badge');
    const entries = Object.entries(state.notifications);

    if (entries.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        badge.style.display = 'none';
        return;
    }

    // Sort by timestamp desc
    entries.sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

    const unreadCount = entries.filter(([, n]) => !n.read).length;

    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    list.innerHTML = entries.slice(0, 20).map(([id, notif]) => {
        const time = timeAgo(notif.timestamp);
        const iconClass = notif.type === 'new_order' ? 'order' :
            notif.type === 'new_user' ? 'user' : 'alert';
        const icon = notif.type === 'new_order' ? 'fa-shopping-bag' :
            notif.type === 'new_user' ? 'fa-user-plus' : 'fa-info-circle';

        return `
            <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotifClick('${id}')">
                <div class="notification-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-text">
                    <h5>${escapeHTML(notif.message || 'Notification')}</h5>
                    <p>${time}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ACTION HANDLERS =====
window.handleRoleChange = async function(uid, newRole) {
    try {
        await updateUserRole(uid, newRole);
        showToast(`User role updated to ${newRole}`, 'success');
    } catch (error) {
        showToast('Failed to update role', 'error');
        console.error(error);
    }
};

window.handleToggleUser = async function(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
        await toggleUserStatus(uid, newStatus);
        showToast(`User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
        showToast('Failed to update user status', 'error');
        console.error(error);
    }
};

window.handleStatusChange = async function(orderId, newStatus) {
    try {
        await updateOrderStatus(orderId, newStatus);
        showToast(`Order status updated to ${newStatus}`, 'success');
    } catch (error) {
        showToast('Failed to update order status', 'error');
        console.error(error);
    }
};

window.handleNotifClick = async function(notifId) {
    try {
        await markNotificationRead(notifId);
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
};

// ===== ORDER DETAIL MODAL =====
window.showOrderDetail = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modal-order-title').textContent = `Order #${orderId.substring(0, 8).toUpperCase()}`;

    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
    const orderDate = order.orderDate
        ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'N/A';

    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
        itemsHTML = order.items.map(item => `
            <div class="item-row">
                <span>${escapeHTML(item.name || 'Product')} × ${item.quantity || 1}</span>
                <span>EGP ${((item.discountedPrice || item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
            </div>
        `).join('');
    } else {
        itemsHTML = '<p style="color:var(--text-gray);font-size:1.3rem;">No items data available</p>';
    }

    document.getElementById('modal-order-body').innerHTML = `
        <div class="order-detail-grid">
            <div class="order-detail-item">
                <label>Customer</label>
                <span>${escapeHTML(customerName)}</span>
            </div>
            <div class="order-detail-item">
                <label>Date</label>
                <span>${orderDate}</span>
            </div>
            <div class="order-detail-item">
                <label>Status</label>
                <span><span class="status-badge ${order.status}">${order.status}</span></span>
            </div>
            <div class="order-detail-item">
                <label>Phone</label>
                <span>${escapeHTML(order.customer?.phone || 'N/A')}</span>
            </div>
            <div class="order-detail-item">
                <label>Address</label>
                <span>${escapeHTML(order.customer?.street || '')} ${escapeHTML(order.customer?.city || 'N/A')}</span>
            </div>
            <div class="order-detail-item">
                <label>Notes</label>
                <span>${escapeHTML(order.customer?.notes || 'None')}</span>
            </div>
        </div>
        <div class="order-items-list">
            <h4><i class="fas fa-box" style="color:var(--primary-color);margin-right:0.5rem;"></i> Order Items</h4>
            ${itemsHTML}
            <div class="order-total-row">
                <span>Total</span>
                <span>EGP ${(order.total || 0).toLocaleString()}</span>
            </div>
        </div>
    `;

    document.getElementById('order-modal').classList.add('show');
};

window.openProductModal = function(id = null) {
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodDiscount').value = '0';
    document.getElementById('prodDescription').value = '';

    if (id) {
        const prod = state.products.find(p => p.id === id);
        if (prod) {
            document.getElementById('modal-product-title').textContent = 'Edit Product';
            document.getElementById('prodId').value = prod.id;
            document.getElementById('prodName').value = prod.name || '';
            document.getElementById('prodPrice').value = prod.price || 0;
            document.getElementById('prodCategory').value = prod.category || '';
            document.getElementById('prodStatus').value = prod.status || 'available';
            document.getElementById('prodDiscount').value = prod.discount || 0;
            document.getElementById('prodDescription').value = prod.description || '';
            if (prod.image) {
                document.getElementById('prodImagePreview').src = prod.image;
                document.getElementById('prodImagePreview').style.display = 'block';
            } else {
                document.getElementById('prodImagePreview').style.display = 'none';
            }
        }
    } else {
        document.getElementById('modal-product-title').textContent = 'Add New Product';
        document.getElementById('prodImagePreview').style.display = 'none';
    }

    document.getElementById('product-modal').classList.add('show');
};

// Add change listener for real-time preview
document.getElementById('prodImageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('prodImagePreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            preview.src = evt.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        if (!document.getElementById('prodId').value) {
           preview.style.display = 'none';
        }
    }
});

/** 
 * Compress image using Canvas to base64 Data URL
 * Bypasses Firebase Storage entirely to fix permission and timeout issues.
 */
function compressImageToBase64(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to WebP or JPEG 80% quality
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProductBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const id = document.getElementById('prodId').value;
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const category = document.getElementById('prodCategory').value.trim();
    const prodStatus = document.getElementById('prodStatus').value;
    const discount = parseInt(document.getElementById('prodDiscount').value) || 0;
    const description = document.getElementById('prodDescription').value.trim();
    const file = document.getElementById('prodImageFile').files[0];

    try {
        const withTimeout = (promise, ms, label) => {
            let t;
            const timeout = new Promise((_, reject) => {
                t = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
            });
            return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
        };

        // Quick validation so we don't wait on network for obvious issues
        if (!name || !category || Number.isNaN(price)) {
            throw new Error('Please fill product name, category, and a valid price.');
        }

        let imageUrl = null;
        if (file) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Image...';
            // Compress and convert to base64 bypassing Firebase Storage configuration limits
            imageUrl = await compressImageToBase64(file);
        }

        const productData = {
            name, price, category, status: prodStatus, discount, description, updatedAt: new Date().toISOString()
        };

        if (imageUrl) productData.image = imageUrl;

        if (id) {
            // Edit
            await withTimeout(update(ref(db, `products/${id}`), productData), 15000, 'Saving product');
            showToast('Product updated successfully', 'success');
        } else {
            // Add
            productData.createdAt = new Date().toISOString();
            if (!productData.image) productData.image = 'https://via.placeholder.com/300x300';
            await withTimeout(push(ref(db, 'products'), productData), 15000, 'Saving product');
            showToast('Product added successfully', 'success');
        }

        closeModal('product-modal');
    } catch (error) {
        console.error('Error saving product:', error);
        showToast(`Failed to save product: ${error?.code || ''} ${error?.message || error}`.trim(), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Product';
    }
}

window.deleteProduct = async function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await remove(ref(db, `products/${id}`));
            showToast('Product deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete product', 'error');
        }
    }
};

window.closeModal = function(modalId = 'order-modal') {
    document.getElementById(modalId).classList.remove('show');
}

// ===== ACTIVE SESSION TRACKING =====
function trackActiveSession() {
    const sessionRef = ref(db, `stats/activeSessions`);
    // Simple counter — in production use Firebase presence system
    get(sessionRef).then(snapshot => {
        const current = snapshot.exists() ? snapshot.val() : 0;
        set(sessionRef, current + 1);

        // Decrease on page unload
        window.addEventListener('beforeunload', () => {
            const updated = Math.max(0, (current + 1) - 1);
            set(sessionRef, updated);
        });
    }).catch(err => console.log('Session tracking skipped:', err.message));
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${escapeHTML(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== UTILITY FUNCTIONS =====
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLast7Days() {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            key: formatDate(d.toISOString()),
            label: dayNames[d.getDay()] + ' ' + d.getDate()
        });
    }
    return days;
}

function getLast6Months() {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: monthNames[d.getMonth()] + ' ' + d.getFullYear()
        });
    }
    return months;
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== USER DETAIL MODAL =====
window.showUserDetail = function(uid) {
    const user = state.users.find(u => u.uid === uid);
    if (!user) return;

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
    const createdAt = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    // Find user's orders
    const userOrders = state.orders.filter(o => {
        const custName = `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim().toLowerCase();
        return custName === name.toLowerCase();
    });

    let ordersHTML = '';
    if (userOrders.length > 0) {
        ordersHTML = userOrders.map(o => `
            <div class="item-row" style="cursor:pointer;" onclick="showOrderDetail('${o.id}'); closeModal('user-modal');">
                <span style="color:var(--primary-color);">#${o.id.substring(0,8).toUpperCase()}</span>
                <span>EGP ${(o.total || 0).toLocaleString()}</span>
                <span class="status-badge ${o.status}">${o.status}</span>
            </div>
        `).join('');
    } else {
        ordersHTML = '<p style="color:var(--text-gray); font-size:1.3rem;">No orders found for this user</p>';
    }

    document.getElementById('modal-user-title').textContent = `User: ${escapeHTML(name)}`;
    document.getElementById('modal-user-body').innerHTML = `
        <div class="order-detail-grid">
            <div class="order-detail-item">
                <label>Full Name</label>
                <span>${escapeHTML(name)}</span>
            </div>
            <div class="order-detail-item">
                <label>Email</label>
                <span>${escapeHTML(user.email || 'N/A')}</span>
            </div>
            <div class="order-detail-item">
                <label>Phone</label>
                <span>${escapeHTML(user.phone || 'N/A')}</span>
            </div>
            <div class="order-detail-item">
                <label>Role</label>
                <span class="status-badge ${user.role === 'admin' ? 'active' : ''}">${user.role || 'user'}</span>
            </div>
            <div class="order-detail-item">
                <label>Status</label>
                <span class="status-badge ${user.status || 'active'}">${user.status || 'active'}</span>
            </div>
            <div class="order-detail-item">
                <label>Date of Birth</label>
                <span>${escapeHTML(user.dob || 'N/A')}</span>
            </div>
            <div class="order-detail-item">
                <label>Member Since</label>
                <span>${createdAt}</span>
            </div>
            <div class="order-detail-item">
                <label>UID</label>
                <span style="font-size:1.1rem; font-family:monospace;">${escapeHTML(user.uid)}</span>
            </div>
        </div>
        <div class="order-items-list">
            <h4><i class="fas fa-shopping-bag" style="color:var(--primary-color);margin-right:0.5rem;"></i> User Orders (${userOrders.length})</h4>
            ${ordersHTML}
        </div>
    `;

    document.getElementById('user-modal').classList.add('show');
    document.getElementById('user-modal').addEventListener('click', (e) => {
        if (e.target.id === 'user-modal') closeModal('user-modal');
    });
};

// ===== CUSTOMERS TABLE =====
function renderCustomersTable() {
    let filtered = [...state.customers];

    if (state.customersSearch) {
        filtered = filtered.filter(c =>
            (c.firstName || '').toLowerCase().includes(state.customersSearch) ||
            (c.lastName || '').toLowerCase().includes(state.customersSearch) ||
            (c.email || '').toLowerCase().includes(state.customersSearch) ||
            (c.phone || '').toLowerCase().includes(state.customersSearch)
        );
    }

    if (state.customersStatusFilter !== 'all') {
        filtered = filtered.filter(c => (c.status || 'active') === state.customersStatusFilter);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / state.itemsPerPage);
    const start = (state.customersPage - 1) * state.itemsPerPage;
    const paged = filtered.slice(start, start + state.itemsPerPage);

    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (paged.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <h4>No customers found</h4>
                        <p>Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paged.map(cust => {
            const name = `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Unknown';
            const initial = name.charAt(0).toUpperCase();
            const status = cust.status || 'active';
            const createdAt = cust.createdAt
                ? new Date(cust.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';

            // Count orders for this customer
            const orderCount = state.orders.filter(o => o.userId === cust.uid ||
                (`${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim().toLowerCase() === name.toLowerCase())
            ).length;

            return `
                <tr>
                    <td style="cursor:pointer;" onclick="window.showUserDetail('${cust.uid}')">
                        <div class="table-user">
                            <div class="table-user-avatar" style="background:linear-gradient(135deg,#e84393,#c0337a);">${initial}</div>
                            <div class="table-user-info">
                                <h4>${escapeHTML(name)}</h4>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHTML(cust.email || 'N/A')}</td>
                    <td>${escapeHTML(cust.phone || '—')}</td>
                    <td>
                        <span style="background:rgba(232,67,147,0.1);color:#e84393;padding:0.3rem 0.8rem;border-radius:0.5rem;font-size:1.2rem;font-weight:600;">
                            ${orderCount} order${orderCount !== 1 ? 's' : ''}
                        </span>
                    </td>
                    <td><span class="status-badge ${status}">${status}</span></td>
                    <td>${createdAt}</td>
                    <td style="display:flex;gap:0.5rem;">
                        <button class="table-action-btn" onclick="event.stopPropagation(); window.openCustomerModal('${cust.uid}')" title="Edit Customer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn ${status === 'active' ? 'danger' : 'success'}"
                            onclick="event.stopPropagation(); window.handleToggleUser('${cust.uid}', '${status}')"
                            title="${status === 'active' ? 'Disable' : 'Enable'} Customer">
                            <i class="fas fa-${status === 'active' ? 'ban' : 'check-circle'}"></i>
                        </button>
                        <button class="table-action-btn danger" onclick="event.stopPropagation(); window.deleteCustomer('${cust.uid}')" title="Delete Customer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('customers-showing').textContent = `Showing ${paged.length} of ${total} customers`;

    renderPagination('customers-pagination', state.customersPage, totalPages, (page) => {
        state.customersPage = page;
        renderCustomersTable();
    });
}

// ===== CUSTOMER MODAL =====
window.openCustomerModal = function(uid = null) {
    const form = document.getElementById('customerForm');
    form.reset();
    document.getElementById('custId').value = '';

    if (uid) {
        const cust = state.customers.find(c => c.uid === uid);
        if (cust) {
            document.getElementById('modal-customer-title').textContent = 'Edit Customer';
            document.getElementById('custId').value = cust.uid;
            document.getElementById('custFirstName').value = cust.firstName || '';
            document.getElementById('custLastName').value = cust.lastName || '';
            document.getElementById('custEmail').value = cust.email || '';
            document.getElementById('custPhone').value = cust.phone || '';
            document.getElementById('custDob').value = cust.dob || '';
            document.getElementById('custAddress').value = cust.address || '';
            document.getElementById('custStatus').value = cust.status || 'active';
        }
    } else {
        document.getElementById('modal-customer-title').textContent = 'Add New Customer';
    }

    document.getElementById('customer-modal').classList.add('show');
};

async function handleCustomerSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('saveCustomerBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const uid = document.getElementById('custId').value;
    const firstName = document.getElementById('custFirstName').value.trim();
    const lastName = document.getElementById('custLastName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const dob = document.getElementById('custDob').value;
    const address = document.getElementById('custAddress').value.trim();
    const custStatus = document.getElementById('custStatus').value;

    try {
        const customerData = {
            firstName, lastName, email, phone, dob, address,
            status: custStatus,
            role: 'user',
            updatedAt: new Date().toISOString()
        };

        if (uid) {
            // Edit existing customer
            await update(ref(db, `users/${uid}`), customerData);
            showToast('Customer updated successfully', 'success');
        } else {
            // Add note: actual Firebase Auth user creation requires Admin SDK
            // For now, we add to DB as a reference record
            customerData.createdAt = new Date().toISOString();
            const newRef = await push(ref(db, 'users'), customerData);
            showToast('Customer record added. Note: A Firebase Auth account must be created separately.', 'info');
        }

        closeModal('customer-modal');

    } catch (error) {
        console.error('Error saving customer:', error);
        showToast('Failed to save customer: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Customer';
    }
}

window.deleteCustomer = async function(uid) {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        try {
            await remove(ref(db, `users/${uid}`));
            showToast('Customer deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete customer: ' + error.message, 'error');
        }
    }
};

// ===== CSV EXPORT =====
window.exportCSV = function(type) {
    let csv = '';
    let filename = '';

    if (type === 'users') {
        csv = 'Name,Email,Phone,Role,Status,Created At\n';
        state.users.forEach(u => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            csv += `"${name}","${u.email || ''}","${u.phone || ''}","${u.role || 'user'}","${u.status || 'active'}","${u.createdAt || ''}"\n`;
        });
        filename = 'bloomy_users.csv';
    } else if (type === 'customers') {
        csv = 'Name,Email,Phone,Address,Status,Orders,Joined\n';
        state.customers.forEach(c => {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
            const orderCount = state.orders.filter(o => o.userId === c.uid).length;
            csv += `"${name}","${c.email || ''}","${c.phone || ''}","${c.address || ''}","${c.status || 'active'}","${orderCount}","${c.createdAt || ''}"\n`;
        });
        filename = 'bloomy_customers.csv';
    } else if (type === 'orders') {
        csv = 'Order ID,Customer,Phone,City,Total (EGP),Status,Date\n';
        state.orders.forEach(o => {
            const name = `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim();
            csv += `"${o.id.substring(0,8).toUpperCase()}","${name}","${o.customer?.phone || ''}","${o.customer?.city || ''}","${o.total || 0}","${o.status}","${o.orderDate || ''}"\n`;
        });
        filename = 'bloomy_orders.csv';
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast(`${type} exported successfully!`, 'success');
};

// Note: utilities (escapeHTML, debounce, etc.) are defined earlier in this file.
