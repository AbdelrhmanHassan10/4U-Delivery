import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => { 
    if(window.scrollY > 80) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Intersection Observer for Reveal Animations
const observer = new IntersectionObserver((entries) => { 
    entries.forEach(e => { 
        if(e.isIntersecting) e.target.classList.add('visible'); 
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Mobile Menu Logic
const mBtn = document.getElementById('mobile-menu-btn');
const cBtn = document.getElementById('close-menu-btn');
const mMenu = document.getElementById('mobile-menu');
if(mBtn && cBtn && mMenu) {
    mBtn.addEventListener('click', () => mMenu.classList.add('open'));
    cBtn.addEventListener('click', () => mMenu.classList.remove('open'));
}

// Filter Tags Logic
const filterTags = document.querySelectorAll('.tag-btn');
filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
        filterTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
    });
});

// Dynamic background effect based on mouse movement
document.addEventListener('mousemove', (e) => {
    const glows = document.querySelectorAll('.glow-brand, .glow-gold');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    if (glows.length >= 2) {
        glows[0].style.transform = `translate(${x * -40}px, ${y * -40}px)`;
        glows[1].style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    }
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

// Page Transition Exit Logic
function navigateWithCurtain(url) {
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
}

document.addEventListener('DOMContentLoaded', () => {
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

// Firebase Auth State Listener
onAuthStateChanged(auth, async (user) => {
    const navAuthButtons = document.getElementById('nav-auth-buttons');
    const navProfileButton = document.getElementById('nav-profile-button');
    const navUserName = document.getElementById('nav-user-name');
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');

    if (user) {
        // User is logged in
        navAuthButtons.classList.add('hidden');
        navProfileButton.classList.remove('hidden');
        mobileAuthBtn.textContent = 'حسابي';
        mobileAuthBtn.href = '../_2/profile.html';

        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                // Get first name only for navbar
                const firstName = userData.name ? userData.name.split(' ')[0] : 'حسابي';
                navUserName.textContent = firstName;
            }
        } catch (error) {
            console.error("Error fetching user data for navbar:", error);
        }

    } else {
        // User is logged out
        navAuthButtons.classList.remove('hidden');
        navProfileButton.classList.add('hidden');
        mobileAuthBtn.textContent = 'دخول / تسجيل حساب';
        mobileAuthBtn.href = '../_1/login.html';
    }
});
