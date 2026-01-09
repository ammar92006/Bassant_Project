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
  apiKey: "AIzaSyD6ZEDFn360LiNMYRYjsvodJZRNJDapUtg",
  authDomain: "bloomy-e92a3.firebaseapp.com",
  projectId: "bloomy-e92a3",
  storageBucket: "bloomy-e92a3.firebasestorage.app",
  messagingSenderId: "746284523804",
  appId: "1:746284523804:web:f65fca67970670a5f21ad9",
  measurementId: "G-3VS5K3QS15"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);

export {app, analytics, db, auth, ref, onValue, set, push, get};