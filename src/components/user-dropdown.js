// ============================================
// BLOOMY - User Dropdown Module (Shared)
// Used by cart.html, favorites.html
// ============================================

import { auth, db, ref, get } from '/src/services/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    const userBtn = document.getElementById('user-btn');
    const userAvatarBtn = document.getElementById('user-avatar-btn');

    if (user) {
        if (userBtn) userBtn.style.display = 'none';
        if (userAvatarBtn) userAvatarBtn.style.display = 'flex';

        try {
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);

            let firstName = user.email.split('@')[0];
            let email = user.email;

            if (snapshot.exists()) {
                const data = snapshot.val();
                firstName = data.firstName || firstName;
                email = data.email || email;
            }

            const initial = firstName.charAt(0).toUpperCase();

            const headerAvatar = document.getElementById('header-avatar');
            const userNavName = document.getElementById('user-nav-name');
            const userDpAvatar = document.getElementById('user-dp-avatar');
            const userDpName = document.getElementById('user-dp-name');
            const userDpEmail = document.getElementById('user-dp-email');

            if (headerAvatar) headerAvatar.textContent = initial;
            if (userNavName) userNavName.textContent = firstName;
            if (userDpAvatar) userDpAvatar.textContent = initial;
            if (userDpName) userDpName.textContent = firstName;
            if (userDpEmail) userDpEmail.textContent = email;

        } catch (err) {
            console.log('Dropdown user load error:', err.message);
        }

        // Toggle dropdown
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

        // Logout
        const dpLogout = document.getElementById('dp-logout');
        if (dpLogout) {
            dpLogout.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    window.location.href = '/index.html';
                } catch (err) {
                    console.error('Logout error:', err);
                }
            });
        }

    } else {
        if (userBtn) userBtn.style.display = 'flex';
        if (userAvatarBtn) userAvatarBtn.style.display = 'none';
    }
});
