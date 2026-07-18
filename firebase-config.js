// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Hide admin links by default globally to prevent non-admins from seeing them
const adminStyle = document.createElement('style');
adminStyle.id = 'admin-link-hider';
adminStyle.innerHTML = `a[href*="admin_stamps.html"] { display: none !important; }`;
document.head.appendChild(adminStyle);

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

// Check if user is admin globally to show admin links
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                // User is admin, remove the hider style so admin links appear
                const hider = document.getElementById('admin-link-hider');
                if (hider) hider.remove();
            }
        } catch (e) {
            console.error("Error checking admin status:", e);
        }
    }
});

export { app, auth, db };
