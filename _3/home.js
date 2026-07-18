import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Search Input Focus logic
const searchInput = document.querySelector('.hero-search-input');
const searchBox = document.querySelector('.hero-search-box');
searchInput?.addEventListener('focus', () => searchBox?.style.setProperty('border-color', 'rgba(200,16,46,0.3)'));
searchInput?.addEventListener('blur', () => searchBox?.style.removeProperty('border-color'));

// Mobile Menu Logic
const mBtn = document.getElementById('mobile-menu-btn');
const cBtn = document.getElementById('close-menu-btn');
const mMenu = document.getElementById('mobile-menu');
if(mBtn && cBtn && mMenu) {
    mBtn.addEventListener('click', () => mMenu.classList.add('open'));
    cBtn.addEventListener('click', () => mMenu.classList.remove('open'));
}

// Category Tabs Logic
const categories = document.querySelectorAll('.category-card');
categories.forEach(card => {
    card.addEventListener('click', () => {
        categories.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
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
        mobileAuthBtn.href = './_2/profile.html';

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
        mobileAuthBtn.href = './_1/login.html';
    }
});

// --- DYNAMIC DATA FETCHING & SETUP ---

const CATEGORIES = [
  { name: "بيتزا", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop" },
  { name: "فرايد تشيكن", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop" },
  { name: "مشويات", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop" },
  { name: "حلويات", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop" },
  { name: "برجر", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop" },
  { name: "شاورما", image: "../shawerma.png" },
  { name: "مشروبات", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&auto=format&fit=crop" }
];

const INITIAL_RESTAURANTS = [
  {
      name: "البرنس للمشويات",
      desc: "مشويات مصرية أصيلة بالخلطة السرية",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBd7vrccaZ2Pgsqt79vc1ddonOmxNNauM5-JI9yQ4lHv6b4Ulhj8gfw_nU5-lCoMsb1F7Xp_2BfkQCP7vxFlgEYaF8Q2DybTB1kEsgdTTsgDyU_zFXNx6mPp8QgxcIe92lJhaIQY3fANlBv5Mt9UUFSRxPjyfZaJW5Ong2AfB1Ep8NV61t7RF7CCld9MQlklhA26VPSvDOBGl0cOpL-P9sZM17GOmG2nxN6vjM9doM_rnrgTF-xqR8w",
      rating: "4.9",
      deliveryTime: "30-45 دقيقة",
      deliveryFee: "25 ج.م",
      isFeatured: true
  },
  {
      name: "كشري التحرير",
      desc: "ملك الكشري في مصر بلا منازع",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxpljn1Pk1qEnAD8jwgMD9n0t3cO0qeHoQkEhLZTWnbKv3dWi508bR7bBnPQ9qgGb315JeWFRhkbfEO02y3qFQT2Kcaa18yyOQJAVJvUL4Zik2rtoEECwvs0cVKTB_z5Y0V3b5R5elx1Ffgwyc7667S7f2uvYvl85UEZ8Hwaq5MzqbSktJTCQqnm-JXKQ0cBfonf7Upq2miSR0pb0TeFrrIB8s7ac-ZNH1v3u5t7b8ZEgjTMZZ7XHF",
      rating: "4.7",
      deliveryTime: "20-30 دقيقة",
      deliveryFee: "مجاني",
      isFeatured: true
  },
  {
      name: "حلويات ديوكس",
      desc: "أحلى حلويات شرقية وغربية بلمسة عصرية",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAy-D2WotH7O8BhVK58zR9Dv5PuYJjD_w_BfIc7iDrkdwL-ovUqy_Tl6oVxBw21BH5t_SPmKcjx3F5lvIcsOvKg_apc4BbD56bageNnXgsDjGQwhvfjgF9MaRTDiqrNdiYur6DNWDynDsOuGJa0z2DVq0gDB-8TY4RGb9me5KAgEyIvdvOpwNUBOZ2Osf_xaIU7Xb5YgyrygPKjzOvVjjoKESi_VXVl7_17IrwOlvv31tsyvaVJr1YY",
      rating: "4.8",
      deliveryTime: "40-55 دقيقة",
      deliveryFee: "30 ج.م",
      isFeatured: true
  }
];

async function initializeDataIfNeeded() {
    // Disabled dummy data initialization since we now have an admin panel for real restaurants
    console.log("Seeder disabled. Please use Admin Panel to add restaurants and categories.");
}

async function loadCategories() {
    const container = document.getElementById("categories-container");
    if (!container) return;
    
    try {
        let html = '';
        
        CATEGORIES.forEach((data) => {
            html += `
                <a href="./_4/res.html?category=${encodeURIComponent(data.name)}" class="category-card" style="text-decoration:none;">
                    <div class="category-img-bg" style="background-image:url('${data.image}')"></div>
                    <div class="category-overlay"></div>
                    <span class="category-name">${data.name}</span>
                </a>
            `;
        });
        
        container.innerHTML = html;
        
        // Setup active state logic for newly added categories
        const cards = container.querySelectorAll('.category-card');
        if (cards.length > 0) cards[0].classList.add('active'); // just for visual testing
        cards.forEach(card => {
            card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });
        
    } catch (error) {
        console.error("Error loading categories:", error);
        container.innerHTML = '<p class="text-center w-100">فشل تحميل التصنيفات</p>';
    }
}

async function loadFeaturedRestaurants() {
    const container = document.getElementById("featured-res-container");
    if (!container) return;
    
    try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        let allDocs = [];
        querySnapshot.forEach(d => allDocs.push({ id: d.id, ...d.data() }));
        
        let docs = allDocs.filter(d => d.isFeatured);
        if (docs.length === 0) {
            docs = allDocs.slice(0, 3);
        }

        let html = '';
        if (docs.length === 0) {
            container.innerHTML = '<p class="text-center w-100" style="color:var(--dark-400);">لا توجد مطاعم حالياً</p>';
            return;
        }

        docs.forEach((data) => {
            const feeClass = data.deliveryFee === 'مجاني' ? 'text-success' : '';
            let categoryText = '';
            if (Array.isArray(data.category)) {
                categoryText = data.category.join('، ');
            } else {
                categoryText = data.category || data.desc || '';
            }

            html += `
            <div class="res-card glass" onclick="window.location.href='./_4/restaurant.html?id=${data.id}'">
                <div class="res-image-wrapper">
                    <div class="res-image" style="background-image:url('${data.image}')"></div>
                    <div class="res-image-overlay"></div>
                    <div class="res-rating">
                        <span class="material-symbols-outlined icon-filled">star</span>
                        <span class="res-rating-text">${data.rating || '4.5'}</span>
                    </div>
                </div>
                <div class="res-info">
                    <h3 class="res-title">${data.name}</h3>
                    <p class="res-desc">${categoryText}</p>
                    <div class="res-meta">
                        <div class="res-meta-item"><span class="material-symbols-outlined">schedule</span> ${data.deliveryTime || '30-45 دقيقة'}</div>
                        <div class="res-meta-item ${feeClass}"><span class="material-symbols-outlined">delivery_dining</span> ${data.deliveryFee || '25 ج.م'}</div>
                    </div>
                </div>
            </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error("Error loading restaurants:", error);
        container.innerHTML = '<p class="text-center w-100">فشل تحميل المطاعم</p>';
    }
}

async function loadOffers() {
    const container = document.getElementById("offers-container");
    if (!container) return;
    
    try {
        const snapshot = await getDocs(query(collection(db, "offers"), where("isActive", "==", true)));
        if (snapshot.empty) {
            // Keep default static HTML if no dynamic offers exist
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const cardClass = data.type === 'gold' ? 'offer-gold glass glow-gold' : 'offer-brand glow-red';
            
            html += `
            <div class="offer-card ${cardClass}">
                <div class="offer-card-bg-icon"><span class="material-symbols-outlined icon-filled">${data.icon || 'local_offer'}</span></div>
                <div class="offer-content">
                    <div class="offer-badge">${data.badge}</div>
                    <h4 class="offer-title">${data.title}</h4>
                    <p class="offer-desc">${data.desc}</p>
                    <a href="${data.link || './_4/res.html'}" class="btn-offer ripple-btn" style="text-decoration:none;display:inline-block;">اطلب دلوقتي</a>
                </div>
            </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error("Error loading offers:", error);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDataIfNeeded();
    await loadCategories();
    await loadOffers();
    await loadFeaturedRestaurants();
});
