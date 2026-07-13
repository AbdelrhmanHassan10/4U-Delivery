// legal.js - Shared JS for Terms, Privacy, Contact pages
import { auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Page Transition
function navigateWithCurtain(url) {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain) {
        curtain.classList.add('wipe-in');
        setTimeout(() => { window.location.href = url; }, 800);
    } else { window.location.href = url; }
}

// Ripple Effect
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.ripple-btn');
    if (!btn) return;
    const circle = document.createElement('span');
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    const r = d / 2;
    const rect = btn.getBoundingClientRect();
    circle.style.width = circle.style.height = `${d}px`;
    circle.style.left = `${e.clientX - rect.left - r}px`;
    circle.style.top = `${e.clientY - rect.top - r}px`;
    circle.classList.add('ripple');
    const old = btn.querySelector('.ripple');
    if (old) old.remove();
    btn.appendChild(circle);
});

// Intercept links for curtain
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:') && link.getAttribute('target') !== '_blank') {
                e.preventDefault();
                navigateWithCurtain(href);
            }
        });
    });

    // Mobile menu
    const mBtn = document.getElementById('mobile-menu-btn');
    const cBtn = document.getElementById('close-menu-btn');
    const mMenu = document.getElementById('mobile-menu');
    if (mBtn && cBtn && mMenu) {
        mBtn.addEventListener('click', () => mMenu.classList.add('open'));
        cBtn.addEventListener('click', () => mMenu.classList.remove('open'));
    }

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            // Toggle current
            if (!wasOpen) item.classList.add('open');
        });
    });

    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('تم إرسال رسالتك بنجاح! هنرد عليك في أقرب وقت ✅', 'success');
            contactForm.reset();
        });
    }
});

// Auth state
onAuthStateChanged(auth, (user) => {
    const authBtns = document.getElementById('nav-auth-buttons');
    const profileBtn = document.getElementById('nav-profile-button');
    const userName = document.getElementById('nav-user-name');
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');
    if (user) {
        if (authBtns) authBtns.classList.add('hidden');
        if (profileBtn) { profileBtn.classList.remove('hidden'); profileBtn.style.display = 'block'; }
        if (userName) userName.textContent = user.displayName || 'حسابي';
        if (mobileAuthBtn) { mobileAuthBtn.textContent = 'حسابي'; mobileAuthBtn.href = '../_2/profile.html'; }
    } else {
        if (authBtns) { authBtns.classList.remove('hidden'); authBtns.style.display = 'flex'; }
        if (profileBtn) profileBtn.classList.add('hidden');
    }
});

// Toast
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${type === 'success' ? 'check_circle' : 'error'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); toast.addEventListener('animationend', () => toast.remove()); }, 3500);
}
window.showToast = showToast;
