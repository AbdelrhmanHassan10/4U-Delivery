import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Page Transition Logic
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

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript') && !link.hasAttribute('onclick') && link.getAttribute('target') !== '_blank') {
                e.preventDefault();
                window.navigateWithCurtain(href);
            }
        });
    });
});

// Toast Logic
window.showToast = (msg, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};



let currentUserRecord = null;
let currentUserId = null;

window.requestReward = async (rewardTitle, costType, costValue, event) => {
    if (!currentUserRecord || !currentUserId) return;
    
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    
    const customerSelect = document.getElementById('customer-brand-select');
    let selectedBrand = null;
    if (customerSelect && !customerSelect.classList.contains('hidden')) {
        selectedBrand = customerSelect.getAttribute('data-last-selected');
    } else {
        const brandNameEl = document.getElementById('brand-name');
        selectedBrand = brandNameEl ? brandNameEl.textContent : null;
    }

    if (!selectedBrand || selectedBrand === 'لا توجد أختام' || selectedBrand === 'لم تبدأ بعد') {
        window.showToast("لم تختر مطعماً أو لا يوجد رصيد", "error");
        return;
    }

    if (costType === 'points') {
        const pointsMap = currentUserRecord.pointsMap || {};
        const currentPoints = pointsMap[selectedBrand] || 0;
        if (currentPoints < costValue) {
            window.showToast(`عفواً، رصيد نقاطك في ${selectedBrand} غير كافي (تحتاج ${costValue} نقطة)`, 'error');
            return;
        }
    } else if (costType === 'stamps') {
        const stampsMap = currentUserRecord.stamps || {};
        const currentStamps = stampsMap[selectedBrand] || 0;
        if (currentStamps < costValue) {
            window.showToast(`عفواً، كارت أختام ${selectedBrand} غير مكتمل`, 'error');
            return;
        }
    }

    try {
        btn.textContent = 'جاري الإرسال...';
        btn.disabled = true;

        await addDoc(collection(db, "messages"), {
            userId: currentUserId,
            name: currentUserRecord.name || 'مستخدم',
            phone: currentUserRecord.phone || 'غير محدد',
            email: currentUserRecord.email || '',
            subject: `طلب مكافأة: ${rewardTitle}`,
            message: `أرغب في استبدال ${costValue} ${costType === 'points' ? 'نقطة' : 'ختم'} للحصول على مكافأة: ${rewardTitle}. (المطعم: ${selectedBrand})`,
            rewardTitle: rewardTitle,
            costType: costType,
            costValue: costValue,
            type: 'reward_request',
            status: 'new',
            createdAt: serverTimestamp()
        });

        window.showToast('تم إرسال طلب الاستبدال للإدارة وسيتم التواصل معك قريباً!', 'success');
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch(err) {
        console.error(err);
        window.showToast('حدث خطأ أثناء الإرسال', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

let restaurantsImageMap = {};

// Points & Stamps Logic
const renderLoyaltyData = (data) => {
    if (!data) return;

    const navUserName = document.getElementById('nav-user-name');
    if (navUserName) {
        const name = data.name || "مستخدم";
        navUserName.textContent = name.split(' ')[0];
    }

    const pointsMap = data.pointsMap || {};
    const tierMap = data.tierMap || {};
    const stampsMap = data.stamps || {};
    
    const brandsSet = new Set([...Object.keys(pointsMap), ...Object.keys(tierMap), ...Object.keys(stampsMap)]);
    const brands = Array.from(brandsSet);

    const brandSelectorContainer = document.getElementById('brand-selector-container');
    const customerSelect = document.getElementById('customer-brand-select');
    const brandNameEl = document.getElementById('brand-name');
    
    const renderBrandData = (brand) => {
        const bgImgElements = document.querySelectorAll('.loyalty-box-bg');
        
        if (!brand) {
            brandNameEl.textContent = "لم تبدأ بعد";
            brandNameEl.classList.remove('hidden');
            if (brandSelectorContainer) brandSelectorContainer.classList.add('hidden');
            bgImgElements.forEach(el => el.style.backgroundImage = 'none');
            updateUIForBrand(0, "Bronze", 0);
            return;
        }

        const brandImg = restaurantsImageMap[brand];
        bgImgElements.forEach(el => {
            if (brandImg) {
                el.style.backgroundImage = `url('${brandImg}')`;
            } else {
                el.style.backgroundImage = 'none';
            }
        });

        const points = pointsMap[brand] || 0;
        const tier = tierMap[brand] || "Bronze";
        const stampsCount = stampsMap[brand] || 0;
        
        updateUIForBrand(points, tier, stampsCount);
    };

    const updateUIForBrand = (points, currentTier, totalStamps) => {
        // Points UI
        const pointsVal = document.getElementById('loyalty-points-val');
        if (pointsVal) pointsVal.textContent = points.toLocaleString('ar-EG');
        
        let nextTier = "Silver";
        let progressPercent = 0;

        if (points <= 600) {
            nextTier = "Silver";
            progressPercent = (points / 600) * 100;
            const nextTierText = document.getElementById('loyalty-next-tier-text');
            if (nextTierText) nextTierText.textContent = `باقي ${601 - points} نقطة لـ ${nextTier}`;
        } else if (points <= 1200) {
            nextTier = "Gold";
            progressPercent = ((points - 600) / 600) * 100;
            const nextTierText = document.getElementById('loyalty-next-tier-text');
            if (nextTierText) nextTierText.textContent = `باقي ${1201 - points} نقطة لـ ${nextTier}`;
        } else if (points <= 1800) {
            nextTier = "Platinum";
            progressPercent = ((points - 1200) / 600) * 100;
            const nextTierText = document.getElementById('loyalty-next-tier-text');
            if (nextTierText) nextTierText.textContent = `باقي ${1801 - points} نقطة لـ ${nextTier}`;
        } else if (points <= 2400) {
            nextTier = "Elite";
            progressPercent = ((points - 1800) / 600) * 100;
            const nextTierText = document.getElementById('loyalty-next-tier-text');
            if (nextTierText) nextTierText.textContent = `باقي ${2401 - points} نقطة لـ ${nextTier}`;
        } else {
            progressPercent = 100;
            const nextTierText = document.getElementById('loyalty-next-tier-text');
            if (nextTierText) nextTierText.textContent = `أنت في أعلى مستوى!`;
        }

        const tierValEl = document.getElementById('loyalty-tier-val');
        if (tierValEl) tierValEl.textContent = currentTier;

        const progressFill = document.getElementById('loyalty-tier-progress');
        if (progressFill) progressFill.style.width = `${progressPercent}%`;

        // Stamps UI
        const activeStamps = (totalStamps > 0 && totalStamps % 10 === 0) ? 10 : (totalStamps % 10);
        const completedCards = Math.floor(totalStamps / 10);
        
        const completedTextEl = document.getElementById('completed-cards-text');
        if (completedTextEl) {
            if (completedCards > 0) {
                completedTextEl.textContent = `أكملت ${completedCards} كروت سابقة`;
                completedTextEl.classList.remove('hidden');
            } else {
                completedTextEl.classList.add('hidden');
            }
        }
        
        const circles = document.querySelectorAll('.stamp-circle');
        circles.forEach(circle => {
            circle.classList.remove('active');
            if (circle.classList.contains('golden')) {
                circle.innerHTML = '<span class="material-symbols-outlined">redeem</span>';
            } else {
                circle.innerHTML = '';
            }
        });

        circles.forEach(circle => {
            const index = parseInt(circle.getAttribute('data-index'), 10);
            if (index <= activeStamps) {
                circle.classList.add('active');
                if (index !== 10) {
                    circle.innerHTML = '<span class="material-symbols-outlined">verified</span>';
                }
            }
        });
    };

    if (brands.length === 0) {
        renderBrandData(null);
    } else {
        if (brandSelectorContainer && customerSelect && brandNameEl) {
            brandNameEl.classList.add('hidden');
            brandSelectorContainer.classList.remove('hidden');
            
            // Render first one by default if not previously selected
            const previouslySelected = customerSelect.getAttribute('data-last-selected');
            const targetBrand = previouslySelected && brands.includes(previouslySelected) ? previouslySelected : brands[0];
            
            let chipsHtml = '';
            brands.forEach(b => {
                const activeClass = b === targetBrand ? 'active' : '';
                chipsHtml += `<button class="brand-chip ${activeClass}" data-brand="${b}">${b}</button>`;
            });
            customerSelect.innerHTML = chipsHtml;
            customerSelect.setAttribute('data-last-selected', targetBrand);
            renderBrandData(targetBrand);
            
            // Add click listeners
            const chips = customerSelect.querySelectorAll('.brand-chip');
            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const selected = chip.getAttribute('data-brand');
                    
                    // Update active class
                    chips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    customerSelect.setAttribute('data-last-selected', selected);
                    renderBrandData(selected);
                });
            });
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    const navAuthButtons = document.getElementById('nav-auth-buttons');
    const navProfileButton = document.getElementById('nav-profile-button');
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');

    if (user) {
        if(navAuthButtons) navAuthButtons.classList.add('hidden');
        if(navProfileButton) navProfileButton.classList.remove('hidden');
        if(mobileAuthBtn) {
            mobileAuthBtn.textContent = 'حسابي';
            mobileAuthBtn.href = '../_2/profile.html';
        }
    }

    if (!user) {
        window.navigateWithCurtain('../_1/login.html');
        return;
    }

    try {
        if (Object.keys(restaurantsImageMap).length === 0) {
            const snap = await getDocs(collection(db, "restaurants"));
            snap.forEach(doc => {
                const data = doc.data();
                if (data.name && data.image) {
                    restaurantsImageMap[data.name] = data.image;
                }
            });
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const previewPhone = urlParams.get('previewPhone');

        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
            const userData = uDoc.data();
            const navUserName = document.getElementById('nav-user-name');
            if (navUserName && userData.name) navUserName.textContent = userData.name.split(' ')[0];
            
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
        }

        if (previewPhone) {
            // Check admin
            if (uDoc.exists() && uDoc.data().isAdmin) {
                const q = query(collection(db, "users"), where("phone", "==", previewPhone));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const targetDocId = snap.docs[0].id;
                    const initialData = snap.docs[0].data();
                    
                    // Update header to indicate preview mode
                    const pageHeader = document.querySelector('.loyalty-header p');
                    if (pageHeader) pageHeader.innerHTML = `<span style="color:var(--brand); font-weight:bold;">(وضع المعاينة للأدمن)</span> عرض مكافآت العميل: ${initialData.name}`;
                    
                    // Listen to live updates
                    onSnapshot(doc(db, "users", targetDocId), (docSnap) => {
                        if (docSnap.exists()) {
                            currentUserRecord = docSnap.data();
                            currentUserId = targetDocId;
                            renderLoyaltyData(currentUserRecord);
                        }
                    });
                } else {
                    window.showToast("العميل غير موجود", "error");
                    return;
                }
            }
        } else {
            // Listen to current user live updates
            onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    currentUserRecord = docSnap.data();
                    currentUserId = user.uid;
                    renderLoyaltyData(currentUserRecord);
                }
            });
        }

    } catch (error) {
        console.error("Error loading loyalty data:", error);
    }
});

// Mobile Menu Listener
document.addEventListener('DOMContentLoaded', () => {
    const mBtn = document.getElementById('mobile-menu-btn');
    const cBtn = document.getElementById('close-menu-btn');
    const mMenu = document.getElementById('mobile-menu');
    if (mBtn && cBtn && mMenu) {
        mBtn.addEventListener('click', () => mMenu.classList.add('open'));
        cBtn.addEventListener('click', () => mMenu.classList.remove('open'));
    }
});
