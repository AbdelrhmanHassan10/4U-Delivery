import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Navbar Scroll
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => { 
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Intersection Observer for Reveal
const observer = new IntersectionObserver((entries) => { 
    entries.forEach(e => { 
        if (e.isIntersecting) e.target.classList.add('visible');
    });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Number Counter Animation
const animateCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-target'));
    const format = el.getAttribute('data-format') || '';
    let current = 0;
    const increment = target / 60; // Assuming 60 steps for animation
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) { 
            current = target; 
            clearInterval(timer); 
        }
        
        let displayValue = Math.floor(current);
        if (format === 'K') displayValue = displayValue + 'K';
        if (format === '%') displayValue = displayValue + '%';
        
        // Keep the '+' prefix if it exists in the original text, or just hardcode it for stats
        if (format === 'K' || !format) {
            el.textContent = '+' + displayValue;
        } else {
            el.textContent = displayValue;
        }
    }, 16);
};

// Counter trigger
const counterObserver = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            observerInstance.unobserve(entry.target); // Only animate once
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('.counter-target').forEach(el => counterObserver.observe(el));


// Page Transition Curtain Logic
window.navigateWithCurtain = function(url) {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain) {
        curtain.classList.remove('wipe-out');
        curtain.classList.add('wipe-in');
        setTimeout(() => {
            window.location.href = url;
        }, 800);
    } else {
        window.location.href = url;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript') && !link.hasAttribute('onclick')) {
                e.preventDefault();
                window.navigateWithCurtain(href);
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
    const glows = document.querySelectorAll('.about-hero-bg .glow-1, .about-hero-bg .glow-2');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    if (glows.length >= 2) {
        glows[0].style.transform = `translate(${x * -30}px, ${y * -30}px)`;
        glows[1].style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    }
});

// Firebase Logic
onAuthStateChanged(auth, async (user) => {
    const navActions = document.querySelector('.nav-actions');
    
    if (user) {
        if (navActions) {
            navActions.innerHTML = `
                <a href="../_2/profile.html" class="btn-primary ripple-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
                    <span class="material-symbols-outlined">person</span> <span id="nav-user-name">حسابي</span>
                </a>
                <button class="btn-menu ripple-btn"><span class="material-symbols-outlined">menu</span></button>
            `;
        }

        try {
            // Fetch user data from Firestore to get the real name
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            let name = user.displayName || "مستخدم";
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.name) name = data.name;
            }

            const navUserName = document.getElementById('nav-user-name');
            if(navUserName) navUserName.textContent = name.split(' ')[0];

        } catch (error) {
            console.error("Error fetching user data:", error);
            // Ignore error and just show display name if possible
            const navUserName = document.getElementById('nav-user-name');
            if(navUserName) navUserName.textContent = (user.displayName || "حسابي").split(' ')[0];
        }
    } else {
        // User is signed out, restore default buttons
        if (navActions) {
            navActions.innerHTML = `
                <a href="../_1/login.html" class="btn-login" onclick="localStorage.setItem('authTab','login'); window.navigateWithCurtain(this.href); return false;">دخول</a>
                <a href="../_1/login.html" class="btn-primary ripple-btn" onclick="localStorage.setItem('authTab','register'); window.navigateWithCurtain(this.href); return false;">اعمل حساب</a>
                <button class="btn-menu ripple-btn"><span class="material-symbols-outlined">menu</span></button>
            `;
        }
    }
});
