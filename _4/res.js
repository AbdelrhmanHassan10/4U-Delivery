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
                const firstName = userData.name ? userData.name.split(' ')[0] : 'حسابي';
                navUserName.textContent = firstName;
                userFavorites = userData.favorites || [];
                window.userStampsMap = userData.stamps || {}; // For loyalty highlighting
                window.userPointsMap = userData.pointsMap || {};
                
                const mobileAdminLink = document.getElementById('mobile-admin-link');
                if (mobileAdminLink && userData.isAdmin) {
                    mobileAdminLink.style.display = 'flex';
                }
                const navAdminLink = document.getElementById('nav-admin-link');
                const navAdminDivider = document.getElementById('nav-admin-divider');
                if (navAdminLink && userData.isAdmin) {
                    navAdminLink.style.display = 'flex';
                    if (navAdminDivider) navAdminDivider.style.display = 'block';
                }

                renderRestaurants(); // Update UI if favorites loaded after restaurants
            }
        } catch (error) {
            console.error("Error fetching user data for navbar:", error);
        }

    } else {
        // User is logged out
        currentUserUid = null;
        userFavorites = [];
        window.userStampsMap = {};
        window.userPointsMap = {};
        navAuthButtons.classList.remove('hidden');
        navProfileButton.classList.add('hidden');
        mobileAuthBtn.textContent = 'دخول / تسجيل حساب';
        mobileAuthBtn.href = '../_1/login.html';
        
        const mobileAdminLink = document.getElementById('mobile-admin-link');
        if (mobileAdminLink) mobileAdminLink.style.display = 'none';
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

async function loadSidebarCategories() {
    const container = document.getElementById("sidebar-categories");
    if (!container) return;
    
    try {
        let html = '<button class="tag-btn ripple-btn" data-cat="all">الكل</button>';
        
        const categoriesSet = new Set();
        allRestaurants.forEach(res => {
            if (Array.isArray(res.category)) {
                res.category.forEach(c => categoriesSet.add(c));
            } else if (res.category) {
                categoriesSet.add(res.category);
            }
        });
        
        Array.from(categoriesSet).forEach((catName) => {
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
    
    const filterRating45 = document.getElementById('filter-rating-45');
    const filterRating40 = document.getElementById('filter-rating-40');
    const filterTime30 = document.getElementById('filter-time-30');
    const filterTime45 = document.getElementById('filter-time-45');
    const filterSortSelect = document.getElementById('filter-sort-select');
    
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
        
        // Rating filter
        let matchRating = true;
        let ratingValue = parseFloat(res.rating) || 0;
        if (filterRating45 && filterRating45.checked && ratingValue < 4.5) matchRating = false;
        if (filterRating40 && filterRating40.checked && ratingValue < 4.0) matchRating = false;
        
        // Time filter
        let matchTime = true;
        let timeValue = parseInt(res.deliveryTime) || 999;
        if (filterTime30 && filterTime30.checked && timeValue > 30) matchTime = false;
        if (filterTime45 && filterTime45.checked && timeValue > 45) matchTime = false;
        
        return matchName && matchCat && matchRating && matchTime;
    });
    
    // Sort
    if (filterSortSelect) {
        const sortVal = filterSortSelect.value;
        if (sortVal === 'rating') {
            filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
        } else if (sortVal === 'time') {
            filtered.sort((a, b) => (parseInt(a.deliveryTime) || 999) - (parseInt(b.deliveryTime) || 999));
        } else {
            // Default sort: if user has stamps or points, bring those restaurants to the top
            if (window.userStampsMap || window.userPointsMap) {
                filtered.sort((a, b) => {
                    const stampsA = window.userStampsMap ? (window.userStampsMap[a.name] || 0) : 0;
                    const pointsA = window.userPointsMap ? (window.userPointsMap[a.name] || 0) : 0;
                    const scoreA = (stampsA > 0 || pointsA > 0) ? (pointsA + (stampsA * 10)) : 0;
                    
                    const stampsB = window.userStampsMap ? (window.userStampsMap[b.name] || 0) : 0;
                    const pointsB = window.userPointsMap ? (window.userPointsMap[b.name] || 0) : 0;
                    const scoreB = (stampsB > 0 || pointsB > 0) ? (pointsB + (stampsB * 10)) : 0;
                    
                    return scoreB - scoreA;
                });
            }
        }
    }
    
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

            // Stamp & Points logic
            const stampCount = window.userStampsMap ? (window.userStampsMap[data.name] || 0) : 0;
            const pointsCount = window.userPointsMap ? (window.userPointsMap[data.name] || 0) : 0;
            const stampClass = window.userStampsMap ? ((stampCount > 0 || pointsCount > 0) ? 'has-stamps' : 'no-stamps') : '';
            
            let badgeHtml = '';
            if (window.userStampsMap || window.userPointsMap) {
                const activeStampCount = stampCount > 0 && stampCount % 10 === 0 ? 10 : stampCount % 10;
                let stampBadge = '';
                if (stampCount > 0) {
                    stampBadge = `<div class="stamp-badge active-badge" title="الكروت"><span class="stamp-count">${activeStampCount}</span> <span class="material-symbols-outlined" style="font-size: 14px;">card_giftcard</span></div>`;
                } else {
                    stampBadge = `<div class="stamp-badge new-badge" title="الكروت"><span style="font-size: 11px; font-weight:700;">ابدأ التجميع</span> <span class="material-symbols-outlined" style="font-size: 14px;">add_circle</span></div>`;
                }

                let pointsBadge = '';
                if (pointsCount > 0) {
                    pointsBadge = `<div class="points-badge active-points-badge" title="النقاط"><span class="points-count">${pointsCount}</span> <span class="material-symbols-outlined icon-filled" style="font-size: 14px; color: var(--gold);">stars</span></div>`;
                } else {
                    pointsBadge = `<div class="points-badge new-points-badge" title="النقاط"><span style="font-size: 11px; font-weight:700;">0</span> <span class="material-symbols-outlined" style="font-size: 14px; color: var(--dark-300);">stars</span></div>`;
                }

                badgeHtml = `<div class="res-badges-wrapper">${pointsBadge}${stampBadge}</div>`;
            }

            html += `
            <div class="res-card-large glass ${stampClass}">
                <div class="res-image-wrapper">
                    <div class="res-image" style="background-image:url('${data.image}')"></div>
                    <div class="res-image-overlay"></div>
                    ${badgeHtml}
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
    await fetchRestaurants();
    await loadSidebarCategories();
    
    const filterInputs = document.querySelectorAll('#filter-rating-45, #filter-rating-40, #filter-time-all, #filter-time-30, #filter-time-45, #filter-sort-select');
    filterInputs.forEach(input => {
        input.addEventListener('change', () => {
            renderRestaurants();
        });
    });
});
