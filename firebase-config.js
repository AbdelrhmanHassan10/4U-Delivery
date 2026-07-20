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

// Global UI Override for alerts
window.alert = function(msg, isSuccess = false) {
    if (window.showToast) {
        window.showToast(msg, isSuccess ? 'success' : 'error');
    } else {
        let container = document.getElementById('global-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            
            if (!document.getElementById('global-toast-style')) {
                const style = document.createElement('style');
                style.id = 'global-toast-style';
                style.textContent = `
                    .toast-container { position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 999999; display: flex; flex-direction: column; gap: 0.75rem; pointer-events: none; width: 90%; max-width: 400px; }
                    .toast { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-radius: 1rem; background: rgba(20,20,20,0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); color: white; font-weight: 600; font-size: 0.95rem; animation: toastSlideDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards; pointer-events: auto; }
                    .toast.success { border-color: rgba(46,204,113,0.3); background: linear-gradient(90deg, rgba(46,204,113,0.1) 0%, rgba(20,20,20,0.95) 100%); }
                    .toast.success .material-symbols-outlined { color: #2ecc71; }
                    .toast.error { border-color: rgba(231,76,60,0.3); background: linear-gradient(90deg, rgba(231,76,60,0.1) 0%, rgba(20,20,20,0.95) 100%); }
                    .toast.error .material-symbols-outlined { color: #e74c3c; }
                    @keyframes toastSlideDown { 0% { transform: translateY(-20px) scale(0.95); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                    @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
                `;
                document.head.appendChild(style);
            }
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${isSuccess ? 'check_circle' : 'error'}</span>
            ${msg}
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

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
