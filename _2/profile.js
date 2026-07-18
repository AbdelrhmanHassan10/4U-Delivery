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
                <button class="btn-menu ripple-btn"><span class="material-symbols-outlined">menu</span></button>
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
                const navUserName = document.getElementById('nav-user-name');
                if(navUserName) navUserName.textContent = name.split(' ')[0];
                document.getElementById('stat-points').textContent = (data.points || 0).toLocaleString('ar-EG');
                
                const statCards = document.getElementById('stat-cards');
                if (statCards) statCards.textContent = (data.cards || 0).toLocaleString('ar-EG');
                
                document.getElementById('stat-tier').textContent = data.tier || "Silver";
                
                // Avatar
                if (data.avatar) {
                    document.getElementById('profile-avatar-bg').style.backgroundImage = `url('${data.avatar}')`;
                }
                
                // Update Loyalty Card
                document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">${data.tier || "Silver"}</span>`;
                
                const points = data.points || 0;
                let nextTier = "Gold";
                let nextTierPoints = 1000;
                let progressPercent = 0;

                if (points < 1000) {
                    nextTier = "Gold";
                    nextTierPoints = 1000;
                    progressPercent = (points / 1000) * 100;
                    document.getElementById('loyalty-subtitle').textContent = `باقيلك ${1000 - points} نقطة عشان توصل لـ ${nextTier}!`;
                    document.getElementById('loyalty-current-tier').textContent = "Silver (0)";
                    document.getElementById('loyalty-next-tier').textContent = "Gold (1000)";
                } else if (points < 2500) {
                    nextTier = "Platinum";
                    nextTierPoints = 2500;
                    progressPercent = ((points - 1000) / 1500) * 100;
                    document.getElementById('loyalty-subtitle').textContent = `باقيلك ${2500 - points} نقطة عشان توصل لـ ${nextTier}!`;
                    document.getElementById('loyalty-current-tier').textContent = "Gold (1000)";
                    document.getElementById('loyalty-next-tier').textContent = "Platinum (2500)";
                } else {
                    progressPercent = 100;
                    document.getElementById('loyalty-subtitle').textContent = `أنت في أعلى مستوى!`;
                    document.getElementById('loyalty-current-tier').textContent = "Platinum (2500)";
                    document.getElementById('loyalty-next-tier').textContent = "VIP";
                }

                document.getElementById('loyalty-progress-fill').style.width = `${progressPercent}%`;

                // Update Avatar
                if (data.avatar) {
                    const avatarBg = document.getElementById('profile-avatar-bg');
                    if(avatarBg) avatarBg.style.backgroundImage = `url('${data.avatar}')`;
                }

                // Fetch Recent Activity
                const activityContainer = document.getElementById('recent-activity-list');
                if (activityContainer) {
                    try {
                        const actQuery = query(
                            collection(db, "activities"), 
                            where("userId", "==", user.uid),
                            limit(5)
                        );
                        // Try fetching with index (if it fails due to missing index, we fallback)
                        let html = '';
                        try {
                            const actSnap = await getDocs(actQuery);
                            if (actSnap.empty) {
                                html = '<p class="text-center w-100" style="padding: 1rem; color: #aaa;">لا يوجد نشاطات حالياً.</p>';
                            } else {
                                actSnap.forEach(docSnap => {
                                    const act = docSnap.data();
                                    // simple ui rendering
                                    const isGold = act.type === 'points';
                                    const cardClass = isGold ? 'card-gold' : 'card-brand';
                                    const valClass = isGold ? 'val-gold' : 'val-brand';
                                    const icon = isGold ? 'stars' : 'payments'; // generic
                                    html += `
                                    <div class="activity-item">
                                        <div class="activity-info">
                                            <div class="activity-icon ${cardClass}" style="background: rgba(255,255,255,0.1);"><span class="material-symbols-outlined icon-filled">${icon}</span></div>
                                            <div>
                                                <p class="activity-title">${act.title}</p>
                                                <p class="activity-time">${act.date || 'مؤخراً'}</p>
                                            </div>
                                        </div>
                                        <span class="activity-value ${valClass}">${act.value}</span>
                                    </div>
                                    `;
                                });
                            }
                        } catch(err) {
                            // Fallback if index is missing: just show empty state
                            html = '<p class="text-center w-100" style="padding: 1rem; color: #aaa;">لا يوجد نشاطات حالياً.</p>';
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
                    alert("تم تحديث الصورة بنجاح!");
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
