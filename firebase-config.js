// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: ضع أكواد إعدادات الفايربيز الخاصة بك هنا بدلاً من هذه القيم الفارغة
const firebaseConfig = {
    apiKey: "AIzaSyA8XCsxwI-s6dFj9JRsZneFE-a2UP-OQ_8",
    authDomain: "u-delivery-21587.firebaseapp.com",
    projectId: "u-delivery-21587",
    storageBucket: "u-delivery-21587.firebasestorage.app",
    messagingSenderId: "1068821875416",
    appId: "1:1068821875416:web:578a7f3ca44deed189e5ad",
    measurementId: "G-LMZH3FSHSB"
};

// تهيئة الفايربيز
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
