// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 설정 
const firebaseConfig = {
  apiKey: "AIzaSyDc9YgKQLVj3Wtn0SFBXiGMe2sGu16XiQQ",
  authDomain: "savemate-db.firebaseapp.com",
  projectId: "savemate-db",
  storageBucket: "savemate-db.firebasestorage.app",
  messagingSenderId: "959772330199",
  appId: "1:959772330199:web:c9b88e929c9495e4ab0892",
  measurementId: "G-MFXGJ96HY7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore DB 인스턴스 export
export const db = getFirestore(app);
