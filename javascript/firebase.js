// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {getDatabase, ref, onValue, set, push, get} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB37722VPoROeS7M533bmKvxpsYgyXFbmo",
    authDomain: "pinky-flowers.firebaseapp.com",
    projectId: "pinky-flowers",
    storageBucket: "pinky-flowers.firebasestorage.app",
    messagingSenderId: "1068975597110",
    appId: "1:1068975597110:web:9eb01d924a18dbfb0f9a97",
    measurementId: "G-N0R86ECGJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);

export {app, analytics, db, auth, ref, onValue, set, push, get};