// Firebase Admin Utilities
// Re-exports firebase.js + additional admin-specific functions

import { 
    app, db, auth, storage, storageRef, uploadBytes, getDownloadURL, 
    ref, onValue, set, push, get, update, remove, child,
    onAuthStateChanged, signOut 
} from '/src/services/firebase.js';

// ===== ADMIN AUTH GUARD =====
async function checkAdminAccess() {
    return new Promise((resolve, reject) => {
        let settled = false;
        let unsubscribe = null;

        const settle = (fn) => {
            if (settled) return false;
            settled = true;
            try { if (typeof unsubscribe === 'function') unsubscribe(); } catch { /* ignore */ }
            clearTimeout(authTimeout);
            fn();
            return true;
        };

        // Hard timeout so we never get stuck on "Loading Dashboard..."
        const authTimeout = setTimeout(() => {
            settle(() => reject(new Error('Auth initialization timeout. Please check your internet connection and browser settings (ad-blockers can block Firebase).')));
        }, 8000);

        // We only want the first auth state emission for this guard
        unsubscribe = onAuthStateChanged(auth, async (user) => {
            // We'll settle explicitly below (success/failure)
            
            if (!user) {
                // Not logged in at all
                window.location.href = 'admin-login.html';
                settle(() => reject(new Error('Not authenticated')));
                return;
            }

            try {
                const userRef = ref(db, `users/${user.uid}`);
                
                // Add a timeout because Firebase get() can wait indefinitely if offline or blocked
                const timeoutPromise = new Promise((_, r) => setTimeout(() => r(new Error('Firebase DB timeout - make sure you have internet access.')), 10000));
                const snapshot = await Promise.race([get(userRef), timeoutPromise]);

                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData.role === 'admin' || userData.role === 'user') {
                        settle(() => resolve({ user, userData }));
                    } else {
                        window.location.href = '/src/pages/unauthorized.html';
                        settle(() => reject(new Error('Not admin or staff')));
                    }
                } else {
                    window.location.href = '/src/pages/unauthorized.html';
                    settle(() => reject(new Error('User data not found')));
                }
            } catch (error) {
                console.error('Admin check error:', error);
                // If it's a timeout error, we might just want to show an error message instead of unauthorized
                settle(() => reject(error instanceof Error ? error : new Error(String(error))));
            }
        });
    });
}

// ===== ADMIN HELPER FUNCTIONS =====

// Update a user's role
async function updateUserRole(uid, newRole) {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, { role: newRole });
}

// Toggle user status (active/disabled)
async function toggleUserStatus(uid, newStatus) {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, { status: newStatus });
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    const orderRef = ref(db, `orders/${orderId}`);
    await update(orderRef, { status: newStatus });

    // Create notification
    await createNotification({
        type: 'status_change',
        message: `Order #${orderId.substring(0, 8).toUpperCase()} status changed to ${newStatus}`,
        relatedId: orderId
    });
}

// Create a notification
async function createNotification(data) {
    const notifRef = ref(db, 'notifications');
    const newNotifRef = push(notifRef);
    await set(newNotifRef, {
        ...data,
        timestamp: new Date().toISOString(),
        read: false
    });
}

// Mark notification as read
async function markNotificationRead(notifId) {
    const notifRef = ref(db, `notifications/${notifId}`);
    await update(notifRef, { read: true });
}

// Mark all notifications as read
async function markAllNotificationsRead(notifications) {
    const updates = {};
    Object.keys(notifications).forEach(key => {
        updates[`notifications/${key}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
        const rootRef = ref(db);
        await update(rootRef, updates);
    }
}

// Delete a notification
async function deleteNotification(notifId) {
    const notifRef = ref(db, `notifications/${notifId}`);
    await remove(notifRef);
}

export {
    app, db, auth, storage, storageRef, uploadBytes, getDownloadURL, 
    ref, onValue, set, push, get, update, remove, child,
    onAuthStateChanged, signOut,
    checkAdminAccess,
    updateUserRole,
    toggleUserStatus,
    updateOrderStatus,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
};
