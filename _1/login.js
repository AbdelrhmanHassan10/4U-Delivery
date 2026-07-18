import { auth, db } from "../firebase-config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.toggleAuth = function(type) {
    const login = document.getElementById('login-screen');
    const register = document.getElementById('register-screen');
    const container = document.getElementById('auth-container');
    
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    container.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        if (type === 'register') { 
            login.classList.add('hidden'); 
            register.classList.remove('hidden'); 
            document.title = "4U Delivery | حساب جديد"; 
        } else { 
            register.classList.add('hidden'); 
            login.classList.remove('hidden'); 
            document.title = "4U Delivery | دخول"; 
        }
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 300);
};

window.togglePasswordVisibility = function(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.textContent = 'visibility';
        iconElement.style.color = 'var(--brand)';
    } else {
        input.type = 'password';
        iconElement.textContent = 'visibility_off';
        iconElement.style.color = 'var(--dark-400)';
    }
};

window.showToast = function(message, type = 'error') {
    // Create container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    
    const icon = type === 'error' ? 'error' : 'check_circle';
    
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3.5 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
};

// Page Transition Exit Logic
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const curtain = document.querySelector('.page-transition-curtain');
        if (curtain) {
            curtain.classList.remove('wipe-in');
            curtain.style.transform = 'scaleY(0)';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain && !curtain.innerHTML.trim()) {
        curtain.innerHTML = `
            <div class="curtain-logo">
                <div class="nav-brand-icon" style="width:70px;height:70px;border-radius:1.2rem;background:#fff;color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:900;box-shadow:0 10px 25px rgba(0,0,0,0.2);">4U</div>
                <span style="font-size:3rem;font-weight:900;color:#fff;text-shadow:0 4px 10px rgba(0,0,0,0.3);">Delivery</span>
            </div>
        `;
        curtain.style.display = 'flex';
        curtain.style.alignItems = 'center';
        curtain.style.justifyContent = 'center';
        curtain.style.zIndex = '99999';
        
        if (!document.getElementById('curtain-style')) {
            const style = document.createElement('style');
            style.id = 'curtain-style';
            style.textContent = `
                .page-transition-curtain { display: flex !important; align-items: center !important; justify-content: center !important; }
                .curtain-logo { display: flex; align-items: center; gap: 1.2rem; opacity: 0; transform: scale(0.5); transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .page-transition-curtain.wipe-in .curtain-logo { opacity: 1; transform: scale(1); transition-delay: 0.3s; }
            `;
            document.head.appendChild(style);
        }
    }
});

window.navigateWithCurtain = function(url) {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain) {
        curtain.style.transform = '';
        curtain.classList.remove('wipe-out');
        curtain.classList.add('wipe-in');
        setTimeout(() => { window.location.href = url; }, 800);
    } else {
        window.location.href = url;
    }
};

function navigateWithCurtain(url) { window.navigateWithCurtain(url); }

document.addEventListener('DOMContentLoaded', () => {
    // Read local storage for initial tab
    const tab = localStorage.getItem('authTab');
    if (tab === 'register') {
        window.toggleAuth('register');
        localStorage.removeItem('authTab');
    }

    // Intercept all links for curtain effect
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript')) {
                e.preventDefault();
                navigateWithCurtain(href);
            }
        });
    });
});

// Ripple Effect Logic
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.ripple-btn');
    if (!btn) return;

    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;

    const rect = btn.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const existingRipple = btn.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    btn.appendChild(circle);
});

// Dynamic background effect based on mouse movement
document.addEventListener('mousemove', (e) => {
    const glows = document.querySelectorAll('.glow-brand, .glow-gold');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    if (glows.length >= 2) {
        glows[0].style.transform = `translate(${x * -30}px, ${y * -30}px)`;
        glows[1].style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    }
});

// Firebase Auth Forms
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> جاري الدخول...';
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Login success, redirect to home
        navigateWithCurtain('../_3/home.html');
    } catch (error) {
        console.error("Login Error:", error);
        window.showToast("فشل تسجيل الدخول. تأكد من الإيميل وكلمة السر.", "error");
        btn.innerHTML = 'دخول';
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;

    if (password !== confirmPassword) {
        window.showToast("كلمة السر غير متطابقة!", "error");
        return;
    }

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> جاري التسجيل...';
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile with name so it's always available!
        await updateProfile(user, {
            displayName: name
        });

        // Save user data to Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            phone: phone,
            points: 0, 
            wallet: 0, 
            tier: "New",
            createdAt: new Date().toISOString()
        });

        // Register success, redirect to home
        navigateWithCurtain('../_3/home.html');
    } catch (error) {
        console.error("Register Error:", error);
        
        // Make error messages more friendly
        let errorMsg = "حدث خطأ أثناء التسجيل.";
        if (error.code === 'auth/email-already-in-use') errorMsg = "هذا الإيميل مسجل بالفعل!";
        if (error.code === 'auth/weak-password') errorMsg = "كلمة السر ضعيفة، يجب أن تكون 6 أحرف على الأقل.";
        if (error.code === 'auth/invalid-email') errorMsg = "الإيميل غير صحيح.";

        window.showToast(errorMsg, "error");
        btn.innerHTML = 'تسجيل';
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
});
