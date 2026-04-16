import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
import fs from "fs";
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

// ==========================================
// Firebase Migration Script (Node.js)
// ==========================================

const rl = readline.createInterface({ input, output });

async function runMigration() {
    console.log("🔥 Welcome to Firebase Migration Tool\n");

    try {
        // 1. Get old config
        console.log("Enter the OLD Firebase config JSON:");
        console.log("Example: { \"apiKey\": \"...\", \"authDomain\": \"...\", \"databaseURL\": \"...\", \"projectId\": \"...\" }");
        const oldConfigStr = await rl.question("> ");
        const oldConfig = JSON.parse(oldConfigStr);

        // 2. Init OLD project connection
        console.log("\n[1/5] Connecting to OLD project...");
        const oldApp = initializeApp(oldConfig, "oldApp");
        const oldDb = getDatabase(oldApp);
        const oldRootRef = ref(oldDb, "/");

        // 3. Fetch data from OLD project
        console.log("[2/5] Fetching data from OLD Realtime Database...");
        const snapshot = await get(oldRootRef);

        if (!snapshot.exists()) {
            console.log("⚠️ No data found in the old database root ('/'). Migration stopped.");
            process.exit(0);
        }

        const data = snapshot.val();
        console.log(`✅ Data fetched successfully. Total root nodes: ${Object.keys(data).length}`);

        // 4. Create Backup JSON
        const backupFileName = `backup_${Date.now()}.json`;
        console.log(`[3/5] Creating backup file: ${backupFileName}...`);
        fs.writeFileSync(backupFileName, JSON.stringify(data, null, 2));
        console.log("✅ Backup saved locally.");

        // 5. Get new config
        console.log("\nEnter the NEW Firebase config JSON:");
        const newConfigStr = await rl.question("> ");
        const newConfig = JSON.parse(newConfigStr);

        // 6. Init NEW project connection
        console.log("\n[4/5] Connecting to NEW project...");
        const newApp = initializeApp(newConfig, "newApp");
        const newDb = getDatabase(newApp);
        const newRootRef = ref(newDb, "/");

        // 7. Upload to NEW project
        console.log("[5/5] Uploading data to NEW Realtime Database...");
        await set(newRootRef, data);
        console.log("✅ Data uploaded successfully.");

        // 8. Verification (Read back from NEW project)
        console.log("\n🔍 Verifying data integrity...");
        const verifySnapshot = await get(newRootRef);
        
        if (verifySnapshot.exists()) {
            const verifyData = JSON.stringify(verifySnapshot.val());
            const originalData = JSON.stringify(data);

            if (verifyData === originalData) {
                console.log("\n🎉 Migration Success! Data matches perfectly.");
            } else {
                console.log("\n⚠️ Warning: Migration completed, but verification mismatch.");
                console.log("Different sizes or unreadable objects. Check Firebase Console.");
            }
        } else {
            console.log("\n❌ Error: Failed to read data from the new project after uploading.");
        }

    } catch (error) {
        console.log("\n❌ FATAL ERROR:");
        if (error.message.includes("Unexpected token")) {
            console.log("-> Invalid JSON format entered for config.");
        } else if (error.message.includes("PERMISSION_DENIED")) {
            console.log("-> Permission Denied: Check your Firebase Database Rules (Make sure they allow read/write or authenticate first).");
        } else if (error.code === 'ECONNREFUSED' || error.message.includes("network")) {
            console.log("-> Network Error: Please check your internet connection.");
        } else {
            console.log("-> " + error.message);
        }
    } finally {
        rl.close();
        process.exit();
    }
}

runMigration();
