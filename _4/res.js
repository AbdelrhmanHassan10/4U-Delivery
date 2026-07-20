import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Static Filter tags logic removed, will be added dynamically
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
        currentUserUid = user.uid;
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
                userFavorites = userData.favorites || [];
                renderRestaurants(); // Update UI if favorites loaded after restaurants
            }
        } catch (error) {
            console.error("Error fetching user data for navbar:", error);
        }

    } else {
        // User is logged out
        currentUserUid = null;
        userFavorites = [];
        navAuthButtons.classList.remove('hidden');
        navProfileButton.classList.add('hidden');
        mobileAuthBtn.textContent = 'دخول / تسجيل حساب';
        mobileAuthBtn.href = '../_1/login.html';
    }
});

// --- DYNAMIC DATA FETCHING & FILTERING ---
let allRestaurants = [];
let currentCategory = 'all';
let currentUserUid = null;
let userFavorites = [];

// Setup Favorite Toggle globally
window.toggleFavorite = async function(resId, btnElement) {
    if (!currentUserUid) {
        window.showToast('يرجى تسجيل الدخول أولاً', 'error');
        return;
    }
    
    // Prevent event bubbling if it's inside a clickable card
    if (window.event) window.event.stopPropagation();
    
    const icon = btnElement.querySelector('span');
    const isCurrentlyFav = icon.classList.contains('icon-filled');
    
    try {
        const userRef = doc(db, "users", currentUserUid);
        if (isCurrentlyFav) {
            // Remove
            icon.classList.remove('icon-filled', 'text-gradient-red');
            await updateDoc(userRef, { favorites: arrayRemove(resId) });
            userFavorites = userFavorites.filter(id => id !== resId);
            window.showToast('تم إزالة المطعم من المفضلة');
        } else {
            // Add
            icon.classList.add('icon-filled', 'text-gradient-red');
            await updateDoc(userRef, { favorites: arrayUnion(resId) });
            userFavorites.push(resId);
            window.showToast('تمت الإضافة للمفضلة');
        }
    } catch(e) {
        console.error("Error toggling favorite", e);
        window.showToast('حدث خطأ', 'error');
        // revert UI
        if(isCurrentlyFav) icon.classList.add('icon-filled', 'text-gradient-red');
        else icon.classList.remove('icon-filled', 'text-gradient-red');
    }
};

const CATEGORIES = [
  "بيتزا",
  "فرايد تشيكن",
  "مشويات",
  "حلويات",
  "برجر",
  "وجبات سريعة",
  "مشروبات"
];

async function loadSidebarCategories() {
    const container = document.getElementById("sidebar-categories");
    if (!container) return;
    
    try {
        let html = '<button class="tag-btn ripple-btn" data-cat="all">الكل</button>';
        
        CATEGORIES.forEach((catName) => {
            html += `<button class="tag-btn ripple-btn" data-cat="${catName}">${catName}</button>`;
        });
        
        container.innerHTML = html;
        
        // Add event listeners to tags
        const tags = container.querySelectorAll('.tag-btn');
        tags.forEach(tag => {
            tag.addEventListener('click', () => {
                tags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentCategory = tag.getAttribute('data-cat');
                renderRestaurants(); // apply filter
            });
        });
        
        // Initial setup for active category from URL
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            const matchingBtn = container.querySelector(`.tag-btn[data-cat="${catParam}"]`);
            if (matchingBtn) {
                matchingBtn.classList.add('active');
                currentCategory = catParam;
            } else {
                tags[0].classList.add('active');
            }
        } else {
            tags[0].classList.add('active');
        }
        
    } catch (e) {
        console.error("Error loading categories:", e);
    }
}

async function fetchRestaurants() {
    const container = document.getElementById("restaurants-container");
    if (!container) return;
    
    try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        allRestaurants = [];
        querySnapshot.forEach(doc => {
            allRestaurants.push({ id: doc.id, ...doc.data() });
        });
        
        renderRestaurants();
    } catch (e) {
        console.error("Error loading restaurants:", e);
        container.innerHTML = '<p class="text-center w-100">فشل تحميل المطاعم</p>';
    }
}

function renderRestaurants() {
    const container = document.getElementById("restaurants-container");
    if (!container) return;
    
    const searchInput = document.querySelector('.search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Filter
    let filtered = allRestaurants.filter(res => {
        // Name filter
        const matchName = res.name && res.name.toLowerCase().includes(searchTerm);
        
        // Category filter
        let matchCat = true;
        if (currentCategory !== 'all') {
            const checkMatch = (val) => {
                if (!val) return false;
                if (currentCategory === 'مشويات' || currentCategory === 'مشاوي') {
                    return val.includes('مشويات') || val.includes('مشاوي');
                }
                return val.includes(currentCategory);
            };
            
            if (Array.isArray(res.category)) {
                matchCat = res.category.some(c => checkMatch(c));
            } else if (res.category) {
                matchCat = checkMatch(res.category);
            } else if (res.desc) {
                matchCat = checkMatch(res.desc);
            } else {
                matchCat = false;
            }
        }
        
        return matchName && matchCat;
    });
    
    let html = '';
    if (filtered.length === 0) {
        html = '<p class="text-center w-100" style="padding: 2rem;">لا توجد مطاعم مطابقة للبحث.</p>';
    } else {
        filtered.forEach(data => {
            const feeClass = data.deliveryFee === 'مجاني' ? 'text-success' : '';
            
            let categoryText = '';
            if (Array.isArray(data.category)) {
                categoryText = data.category.join('، ');
            } else {
                categoryText = data.category || data.desc || '';
            }

            html += `
            <div class="res-card-large glass">
                <div class="res-image-wrapper">
                    <div class="res-image" style="background-image:url('${data.image}')"></div>
                    <div class="res-image-overlay"></div>
                    <div class="res-rating-badge">
                        <span class="material-symbols-outlined icon-filled">star</span>
                        <span>${data.rating}</span>
                    </div>
                    ${data.isFeatured ? '<div class="res-offer-badge">مميز</div>' : ''}
                    <button class="res-fav-btn ripple-btn" onclick="window.toggleFavorite('${data.id}', this)">
                        <span class="material-symbols-outlined ${userFavorites.includes(data.id) ? 'icon-filled text-gradient-red' : ''}">favorite</span>
                    </button>
                </div>
                <div class="res-info">
                    <div>
                        <h3 class="res-title">${data.name}</h3>
                        <p class="res-desc">${categoryText}</p>
                    </div>
                    <div class="res-meta">
                        <div class="res-meta-item">
                            <span class="material-symbols-outlined">schedule</span>
                            <span>${data.deliveryTime}</span>
                        </div>
                        <div class="res-meta-item ${feeClass}">
                            <span class="material-symbols-outlined">delivery_dining</span>
                            <span>${data.deliveryFee} ${data.deliveryFee !== 'مجاني' ? 'توصيل' : ''}</span>
                        </div>
                    </div>
                    <a href="restaurant.html?id=${data.id}" class="btn-primary btn-order ripple-btn" style="text-decoration:none;">اطلب دلوقتي</a>
                </div>
            </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// Setup search listener
const searchInput = document.querySelector('.search-input');
if(searchInput) {
    searchInput.addEventListener('input', () => {
        renderRestaurants();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebarCategories();
    await fetchRestaurants();
});
