// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABqg_5NoVOkptgpzLgRhEvNmMTl1aPYrQ",
  authDomain: "my-buddy-1b76b.firebaseapp.com",
  projectId: "my-buddy-1b76b",
  storageBucket: "my-buddy-1b76b.firebasestorage.app",
  messagingSenderId: "630974319364",
  appId: "1:630974319364:web:74282fcc7a53cc79441e51",
  measurementId: "G-KYS7YK76F9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getFirestore(app);

const auth = getAuth(app);

export { db, auth };