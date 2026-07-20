import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Mobile Menu
const mBtn = document.getElementById('mobile-menu-btn');
const cBtn = document.getElementById('close-menu-btn');
const mMenu = document.getElementById('mobile-menu');
if (mBtn && cBtn && mMenu) {
    mBtn.addEventListener('click', () => mMenu.classList.add('open'));
    cBtn.addEventListener('click', () => mMenu.classList.remove('open'));
}

// Intersection Observer for Reveal
const observer = new IntersectionObserver((entries) => { 
    entries.forEach(e => { 
        if (e.isIntersecting) e.target.classList.add('visible');
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Page Transition Curtain Logic
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

function navigateWithCurtain(url) { window.navigateWithCurtain(url); };

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

// Removed 3D mouse effect to prevent glitches

// Firebase Logic
onAuthStateChanged(auth, async (user) => {
    // Navbar update logic
    const navActions = document.querySelector('.nav-actions');
    
    if (user) {
        if (navActions) {
            navActions.innerHTML = `
                <a href="../_2/profile.html" class="btn-primary ripple-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
                    <span class="material-symbols-outlined">person</span> <span id="nav-user-name">حسابي</span>
                </a>
                <button id="mobile-menu-btn" class="btn-menu ripple-btn" onclick="document.getElementById('mobile-menu')?.classList.add('open')"><span class="material-symbols-outlined">menu</span></button>
            `;
        }

        try {
            // Fetch user data from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Update DOM elements
                const name = data.name || "مستخدم 4U";
                document.getElementById('profile-name').textContent = name;
                document.getElementById('profile-email').textContent = data.email || user.email;
                const phoneEl = document.getElementById('profile-phone');
                if (phoneEl) phoneEl.textContent = data.phone || "لا يوجد رقم موبايل";
                const navUserName = document.getElementById('nav-user-name');
                if(navUserName) navUserName.textContent = name.split(' ')[0];
                
                const pointsMap = data.pointsMap || {};
                const stampsMap = data.stamps || {};
                const tierMap = data.tierMap || {};
                
                const brandsSet = new Set([...Object.keys(pointsMap), ...Object.keys(stampsMap), ...Object.keys(tierMap)]);
                const brands = Array.from(brandsSet);
                
                const brandSelectContainer = document.getElementById('profile-brand-selector-container');
                const brandSelect = document.getElementById('profile-brand-select');

                const renderStatsForBrand = (brand) => {
                    if (!brand) {
                        document.getElementById('stat-points').textContent = "0";
                        const statCards = document.getElementById('stat-cards');
                        if (statCards) statCards.textContent = "0";
                        document.getElementById('stat-tier').textContent = "Bronze";
                        
                        document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">Bronze</span>`;
                        document.getElementById('loyalty-subtitle').textContent = `لم تبدأ بعد في تجميع النقاط!`;
                        document.getElementById('loyalty-progress-fill').style.width = `0%`;
                        document.getElementById('loyalty-current-tier').textContent = "Bronze";
                        document.getElementById('loyalty-next-tier').textContent = "Silver";
                        return;
                    }

                    const points = pointsMap[brand] || 0;
                    const stamps = stampsMap[brand] || 0;
                    const tier = tierMap[brand] || "Bronze";
                    const completedCards = Math.floor(stamps / 10);

                    document.getElementById('stat-points').textContent = points.toLocaleString('ar-EG');
                    const statCards = document.getElementById('stat-cards');
                    if (statCards) statCards.textContent = completedCards.toLocaleString('ar-EG');
                    document.getElementById('stat-tier').textContent = tier;
                    
                    document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">${tier}</span>`;
                    
                    let nextTier = "Silver";
                    let progressPercent = 0;

                    if (points <= 500) {
                        nextTier = "Silver";
                        progressPercent = (points / 500) * 100;
                        document.getElementById('loyalty-subtitle').textContent = `جمّع نقاط في ${brand} لترقية مستواك لـ ${nextTier}!`;
                        document.getElementById('loyalty-current-tier').textContent = "Bronze";
                        document.getElementById('loyalty-next-tier').textContent = "Silver";
                    } else if (points <= 1000) {
                        nextTier = "Gold";
                        progressPercent = ((points - 500) / 500) * 100;
                        document.getElementById('loyalty-subtitle').textContent = `جمّع نقاط في ${brand} لترقية مستواك لـ ${nextTier}!`;
                        document.getElementById('loyalty-current-tier').textContent = "Silver";
                        document.getElementById('loyalty-next-tier').textContent = "Gold";
                    } else if (points <= 1500) {
                        nextTier = "Platinum";
                        progressPercent = ((points - 1000) / 500) * 100;
                        document.getElementById('loyalty-subtitle').textContent = `جمّع نقاط في ${brand} لترقية مستواك لـ ${nextTier}!`;
                        document.getElementById('loyalty-current-tier').textContent = "Gold";
                        document.getElementById('loyalty-next-tier').textContent = "Platinum";
                    } else if (points <= 2000) {
                        nextTier = "Elite";
                        progressPercent = ((points - 1500) / 500) * 100;
                        document.getElementById('loyalty-subtitle').textContent = `جمّع نقاط في ${brand} لترقية مستواك لـ ${nextTier}!`;
                        document.getElementById('loyalty-current-tier').textContent = "Platinum";
                        document.getElementById('loyalty-next-tier').textContent = "Elite";
                    } else {
                        progressPercent = 100;
                        document.getElementById('loyalty-subtitle').textContent = `أنت في أعلى مستوى في ${brand}!`;
                        document.getElementById('loyalty-current-tier').textContent = "Elite";
                        document.getElementById('loyalty-next-tier').textContent = "VIP";
                    }

                    document.getElementById('loyalty-progress-fill').style.width = `${progressPercent}%`;
                };

                if (brands.length === 0) {
                    if (brandSelectContainer) brandSelectContainer.classList.add('hidden');
                    renderStatsForBrand(null);
                } else {
                    if (brandSelectContainer && brandSelect) {
                        brandSelectContainer.classList.remove('hidden');
                        let optionsHtml = '';
                        brands.forEach(b => {
                            optionsHtml += `<option value="${b}">${b}</option>`;
                        });
                        brandSelect.innerHTML = optionsHtml;
                        
                        // Select default
                        const previouslySelected = brandSelect.getAttribute('data-last-selected');
                        const targetBrand = previouslySelected && brands.includes(previouslySelected) ? previouslySelected : brands[0];
                        brandSelect.value = targetBrand;
                        renderStatsForBrand(targetBrand);
                        
                        brandSelect.addEventListener('change', (e) => {
                            const selected = e.target.value;
                            brandSelect.setAttribute('data-last-selected', selected);
                            renderStatsForBrand(selected);
                        });
                    } else {
                        renderStatsForBrand(brands[0]);
                    }
                }
                // Update Avatar
                if (data.avatar) {
                    const avatarBg = document.getElementById('profile-avatar-bg');
                    if(avatarBg) avatarBg.style.backgroundImage = `url('${data.avatar}')`;
                }

                // Fetch Recent Activity (Orders)
                const activityContainer = document.getElementById('recent-activity-list');
                if (activityContainer) {
                    try {
                        const actQuery = query(
                            collection(db, "orders"), 
                            where("userId", "==", user.uid)
                        );
                        
                        let html = '';
                        try {
                            const actSnap = await getDocs(actQuery);
                            if (actSnap.empty) {
                                html = '<p class="text-center w-100" style="padding: 1rem; color: #aaa;">لا يوجد نشاطات أو طلبات حالياً.</p>';
                            } else {
                                let orders = [];
                                actSnap.forEach(docSnap => orders.push(docSnap.data()));
                                
                                // Sort descending in memory to avoid Firebase Index errors
                                orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                                
                                // Take top 3
                                const recentOrders = orders.slice(0, 3);
                                
                                recentOrders.forEach(act => {
                                    const icon = 'restaurant';
                                    let statusText = 'قيد المراجعة';
                                    let valClass = 'val-brand';
                                    
                                    if(act.status === 'delivered') { statusText = 'تم التوصيل'; valClass = 'text-gradient-gold'; }
                                    else if(act.status === 'on_the_way') { statusText = 'في الطريق'; valClass = 'val-brand'; }
                                    else if(act.status === 'pending') { statusText = 'جاري التجهيز'; valClass = 'val-brand'; }
                                    
                                    // Format Date
                                    const dateObj = new Date(act.createdAt);
                                    const dateStr = dateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                                    html += `
                                    <div class="activity-item">
                                        <div class="activity-info">
                                            <div class="activity-icon card-brand" style="background: rgba(255,255,255,0.1);"><span class="material-symbols-outlined icon-filled">${icon}</span></div>
                                            <div>
                                                <p class="activity-title">طلب من ${act.restaurantName || 'مطعم'}</p>
                                                <p class="activity-time" style="direction:ltr; text-align:right;">${dateStr}</p>
                                            </div>
                                        </div>
                                        <span class="activity-value ${valClass}" style="font-size:0.9rem;">${statusText}</span>
                                    </div>
                                    `;
                                });
                            }
                        } catch(err) {
                            html = '<p class="text-center w-100" style="padding: 1rem; color: #aaa;">لا يوجد نشاطات حالياً.</p>';
                            console.error("Error fetching activities", err);
                        }
                        activityContainer.innerHTML = html;
                    } catch (e) {
                        console.error("Error with activities:", e);
                    }
                }

            } else {
                console.log("No such document!");
                applyFallbacks(user);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Apply fallbacks even if there's an error (like Firestore not being enabled)
            applyFallbacks(user);
        }
    } else {
        // User is signed out, redirect to login page
        window.navigateWithCurtain('../_1/login.html');
    }
});

function applyFallbacks(user) {
    document.getElementById('profile-name').textContent = user.displayName || "مستخدم جديد";
    document.getElementById('profile-email').textContent = user.email || "";
    document.getElementById('stat-points').textContent = "0";
    document.getElementById('stat-wallet').textContent = "0 ج.م";
    document.getElementById('stat-tier').textContent = "New";
    
    document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">New</span>`;
    document.getElementById('loyalty-subtitle').textContent = `باقيلك 1000 نقطة عشان توصل لـ Silver!`;
    document.getElementById('loyalty-current-tier').textContent = "New (0)";
    document.getElementById('loyalty-next-tier').textContent = "Silver (1000)";
    document.getElementById('loyalty-progress-fill').style.width = `0%`;
}

// Logout Handler
document.getElementById('btn-logout')?.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.navigateWithCurtain('../_1/login.html');
    }).catch((error) => {
        console.error("Sign Out Error", error);
    });
});

// Avatar Upload Logic
const btnEditAvatar = document.getElementById('btn-edit-avatar');
const avatarUpload = document.getElementById('profile-avatar-upload');
const avatarBg = document.getElementById('profile-avatar-bg');
const avatarLoading = document.getElementById('avatar-loading-overlay');

btnEditAvatar?.addEventListener('click', () => {
    avatarUpload.click();
});

avatarUpload?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    // Show loading overlay
    if (avatarLoading) avatarLoading.classList.remove('hidden');

    try {
        // Read file and compress it using Canvas (avoid Firebase Storage)
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get compressed base64 string
                const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);

                try {
                    // Update Firestore directly with base64 string
                    await updateDoc(doc(db, "users", user.uid), {
                        avatar: base64Avatar
                    });

                    // Update UI
                    avatarBg.style.backgroundImage = `url('${base64Avatar}')`;
                    alert("تم تحديث الصورة بنجاح!", true);
                } catch (dbError) {
                    console.error("Error saving avatar to db:", dbError);
                    alert("حدث خطأ أثناء حفظ الصورة في قاعدة البيانات.");
                } finally {
                    if (avatarLoading) avatarLoading.classList.add('hidden');
                    avatarUpload.value = ''; // reset input
                }
            };
        };
    } catch (error) {
        console.error("Error processing avatar:", error);
        alert("حدث خطأ أثناء معالجة الصورة.");
        if (avatarLoading) avatarLoading.classList.add('hidden');
        avatarUpload.value = '';
    }
});
