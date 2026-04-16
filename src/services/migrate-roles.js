import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

// Use the same config as firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDlKj3QaFIRa_In_2i-lLfOPoOoCP9NN08",
  authDomain: "bloomy-60661.firebaseapp.com",
  databaseURL: "https://bloomy-60661-default-rtdb.firebaseio.com",
  projectId: "bloomy-60661",
  storageBucket: "bloomy-60661.appspot.com",
  messagingSenderId: "670888475192",
  appId: "1:670888475192:web:4e7482961b0088361c84cd",
  measurementId: "G-ZDTL8Q1GJ2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function migrateCustomers() {
    console.log("Starting customer migration...");
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const updates = {};
            let count = 0;
            
            for (const [uid, user] of Object.entries(data)) {
                // If the role is 'user', but we know staff are also 'user', we need to be careful.
                // In the old system, ALL non-admin users were customers and given 'user'.
                // If you have actual staff that were manually added as 'user', you might need to exclude their emails here.
                // Assuming all 'user' roles in the database are currently just customers:
                if (user.role === 'user') {
                    updates[`users/${uid}/role`] = 'customer';
                    count++;
                }
            }
            
            if (count > 0) {
                console.log(`Found ${count} legacy users to migrate to 'customer'. Running update...`);
                await update(ref(db), updates);
                console.log("Migration complete!");
            } else {
                console.log("No users found that need migration.");
            }
        } else {
            console.log("No users data found in database.");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    }
    process.exit();
}

migrateCustomers();
