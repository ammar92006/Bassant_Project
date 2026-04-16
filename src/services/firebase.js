import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getDatabase, ref, onValue, set, push, get, update, remove, child } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

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
// Analytics is often blocked by ad-blockers/privacy tools; it should never break the app.
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  analytics = null;
}
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { 
    app, analytics, db, auth, storage, storageRef, uploadBytes, getDownloadURL, 
    ref, onValue, set, push, get, update, remove, child,
    onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword
};