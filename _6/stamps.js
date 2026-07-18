// stamps.js
import { db, auth } from "../firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ═════ PAGE TRANSITION CURTAIN ═════
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
            // Allow target="_blank" to open normally, and don't hijack javascript: links
            if (href && href !== '#' && !href.startsWith('javascript') && !link.hasAttribute('onclick') && link.getAttribute('target') !== '_blank') {
                e.preventDefault();
                window.navigateWithCurtain(href);
            }
        });
    });
});

// ═════ RIPPLE EFFECT ═════
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

// ═════ STAMP CARD LOGIC ═════
const initStampCard = async () => {
    const brandNameEl = document.getElementById('brand-name');
    if (!brandNameEl) return; // Not on stamp card page

    const urlParams = new URLSearchParams(window.location.search);
    let urlBrandName = urlParams.get('brand');
    let urlStampsCount = urlParams.get('stamps');

    const customerSelect = document.getElementById('customer-brand-select');

    // Helper to render the stamps
    const renderStampCard = (brandName, stampsCount) => {
        brandNameEl.textContent = brandName;
        const watermark = document.getElementById('brand-watermark');
        if(watermark) watermark.textContent = brandName;
        
        // Reset all circles first
        const circles = document.querySelectorAll('.stamp-circle');
        circles.forEach(circle => {
            circle.classList.remove('active');
            if (circle.classList.contains('golden')) {
                circle.innerHTML = '<span class="material-symbols-outlined">redeem</span>';
            } else {
                circle.innerHTML = '';
            }
        });

        // Activate based on count
        circles.forEach(circle => {
            const index = parseInt(circle.getAttribute('data-index'), 10);
            if (index <= stampsCount) {
                circle.classList.add('active');
                if (index !== 10) {
                    circle.innerHTML = '<span class="material-symbols-outlined">verified</span>';
                }
            }
        });
    };

    // 1. If parameters exist (Admin preview), use them directly
    if (urlBrandName !== null && urlStampsCount !== null) {
        renderStampCard(urlBrandName, parseInt(urlStampsCount, 10));
        return;
    }

    // 2. If no parameters (Customer view), fetch from Firebase
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const stampsMap = userData.stamps || {};
                    const brands = Object.keys(stampsMap);

                    if (brands.length === 0) {
                        // User has no stamps anywhere
                        renderStampCard("لا توجد أختام بعد", 0);
                    } else if (brands.length === 1) {
                        // One brand
                        renderStampCard(brands[0], stampsMap[brands[0]]);
                    } else {
                        // Multiple brands: show dropdown
                        customerSelect.classList.remove('hidden');
                        brandNameEl.classList.add('hidden'); // Hide the title since dropdown is replacing it

                        let optionsHtml = '';
                        brands.forEach(b => {
                            optionsHtml += `<option value="${b}">${b}</option>`;
                        });
                        customerSelect.innerHTML = optionsHtml;
                        
                        // Default to first brand
                        renderStampCard(brands[0], stampsMap[brands[0]]);
                        
                        customerSelect.addEventListener('change', (e) => {
                            const selected = e.target.value;
                            renderStampCard(selected, stampsMap[selected]);
                        });
                    }
                } else {
                    renderStampCard("لم يتم العثور على أختام", 0);
                }
            } catch (error) {
                console.error("Error fetching user stamps:", error);
                renderStampCard("خطأ في التحميل", 0);
            }
        } else {
            // Not logged in => redirect
            window.location.href = '../_1/login.html';
        }
    });
};

// ═════ ADMIN DASHBOARD LOGIC ═════

const initAdminPanel = async () => {
    const adminSelect = document.getElementById('admin-restaurant-select');
    const searchBtn = document.getElementById('admin-search-btn');
    const searchPhone = document.getElementById('admin-search-phone');
    const searchResult = document.getElementById('admin-search-result');
    const userNameEl = document.getElementById('admin-user-name');
    const userPhoneEl = document.getElementById('admin-user-phone');
    const stampActionArea = document.getElementById('admin-stamp-action-area');
    
    if (!adminSelect || !searchBtn) return; // Not on admin page

    const currentUser = await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });

    if (!currentUser) {
        window.location.href = '../_1/login.html';
        return;
    }
    try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (!docSnap.exists() || docSnap.data().isAdmin !== true) {
            alert("غير مصرح لك بدخول هذه الصفحة!");
            window.location.href = '../_3/home.html';
            return;
        }
    } catch (e) {
        console.error(e);
        window.location.href = '../_3/home.html';
        return;
    }

    const currentStampsEl = document.getElementById('admin-current-stamps');
    const remainingStampsEl = document.getElementById('admin-remaining-stamps');
    const iframeEl = document.getElementById('admin-live-preview-iframe');
    const fullScreenLink = document.getElementById('admin-full-screen-link');
    const btnAddStamp = document.getElementById('btn-add-stamp-action');

    // Points and Wallet
    const pointsWalletCard = document.getElementById('admin-points-wallet-card');
    const addPointsInput = document.getElementById('admin-add-points-input');
    const addPointsBtn = document.getElementById('admin-add-points-btn');
    const addWalletInput = document.getElementById('admin-add-wallet-input');
    const addWalletBtn = document.getElementById('admin-add-wallet-btn');

    let currentUserDoc = null;
    let currentUserData = null;
    let selectedBrand = '';

    // Load Restaurants
    try {
        const resSnap = await getDocs(collection(db, "restaurants"));
        let optionsHtml = '';
        if (resSnap.empty) {
            optionsHtml = '<option value="">لا يوجد مطاعم</option>';
        } else {
            resSnap.forEach((doc) => {
                const data = doc.data();
                optionsHtml += `<option value="${data.name}">${data.name}</option>`;
            });
        }
        adminSelect.innerHTML = optionsHtml;
        adminSelect.disabled = false;
        selectedBrand = adminSelect.value;
    } catch (e) {
        console.error("Error loading restaurants:", e);
        adminSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
    }

    const ArabicNumbers = (num) => {
        const arabicMap = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        return String(num).split('').map(digit => arabicMap[digit] || digit).join('');
    };

    const updateAdminUI = () => {
        if (!currentUserData) return;

        // Get stamps for selected brand
        const stampsMap = currentUserData.stamps || {};
        let currentStamps = stampsMap[selectedBrand] || 0;
        if (currentStamps > 10) currentStamps = 10;

        currentStampsEl.textContent = ArabicNumbers(currentStamps);
        remainingStampsEl.textContent = ArabicNumbers(10 - currentStamps);
        
        const url = `../_6/stamp_card.html?brand=${encodeURIComponent(selectedBrand)}&stamps=${currentStamps}`;
        iframeEl.src = url;
        fullScreenLink.href = url;
    };

    // Search User
    searchBtn.addEventListener('click', async () => {
        let phone = searchPhone.value.trim();
        
        // Normalize Arabic numerals to English numerals
        const arabicToEnglish = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
        phone = String(phone).replace(/[٠-٩]/g, d => arabicToEnglish[d]);

        if (!phone) {
            alert('يرجى إدخال رقم الموبايل');
            return;
        }

        searchBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:1rem; animation: spin 1s linear infinite;">progress_activity</span> جاري البحث...';
        searchBtn.disabled = true;

        try {
            const q = query(collection(db, "users"), where("phone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert('العميل غير مسجل بالنظام!');
                searchResult.classList.add('hidden');
                stampActionArea.classList.add('hidden');
                pointsWalletCard?.classList.add('hidden');
                currentUserDoc = null;
                currentUserData = null;
            } else {
                currentUserDoc = querySnapshot.docs[0];
                currentUserData = currentUserDoc.data();
                
                userNameEl.textContent = currentUserData.name || 'عميل';
                userPhoneEl.textContent = currentUserData.phone;
                
                searchResult.classList.remove('hidden');
                stampActionArea.classList.remove('hidden');
                pointsWalletCard?.classList.remove('hidden');
                updateAdminUI();
            }
        } catch (error) {
            console.error("Search Error:", error);
            alert('حدث خطأ أثناء البحث.');
        }

        searchBtn.innerHTML = 'بحث';
        searchBtn.disabled = false;
    });

    // Support pressing Enter to search
    searchPhone.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    adminSelect.addEventListener('change', (e) => {
        selectedBrand = e.target.value;
        updateAdminUI();
    });

    btnAddStamp.addEventListener('click', async () => {
        if (!currentUserDoc || !currentUserData) return;

        const stampsMap = currentUserData.stamps || {};
        let currentStamps = stampsMap[selectedBrand] || 0;

        if (currentStamps < 10) {
            currentStamps++;
            stampsMap[selectedBrand] = currentStamps;
            
            btnAddStamp.innerHTML = '<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">progress_activity</span> جاري الإضافة...';
            btnAddStamp.disabled = true;

            try {
                await updateDoc(doc(db, "users", currentUserDoc.id), {
                    stamps: stampsMap
                });
                // Update local data
                currentUserData.stamps = stampsMap;
                updateAdminUI();
                alert(`تم إضافة الختم بنجاح. رصيد العميل الحالي في مطعم ${selectedBrand} هو ${newStampsCount} ختم.`);
            } catch (error) {
                console.error("Error adding stamp:", error);
                alert("حدث خطأ أثناء الإضافة.");
            }
            btnAddStamp.innerHTML = '<span class="material-symbols-outlined text-brand">verified</span> إضافة ختم جديد الآن';
            btnAddStamp.disabled = false;
        } else {
            alert('العميل أكمل كارت الأختام بالفعل (10/10) لهذا المطعم!');
        }
    });

    // Add Points Handler
    addPointsBtn?.addEventListener('click', async () => {
        if (!currentUserDoc || !currentUserData) return;
        const pointsToAdd = parseInt(addPointsInput.value, 10);
        if (!pointsToAdd || pointsToAdd <= 0) {
            alert('يرجى إدخال عدد نقاط صحيح أكبر من صفر');
            return;
        }

        addPointsBtn.innerHTML = 'جاري الإضافة...';
        addPointsBtn.disabled = true;

        try {
            const currentPoints = currentUserData.points || 0;
            const newPoints = currentPoints + pointsToAdd;

            await updateDoc(doc(db, "users", currentUserDoc.id), {
                points: newPoints
            });

            // Update local data
            currentUserData.points = newPoints;
            addPointsInput.value = '';
            alert(`تم إضافة ${pointsToAdd} نقطة بنجاح! الرصيد الحالي: ${newPoints} نقطة.`);
        } catch (error) {
            console.error("Error adding points:", error);
            alert("حدث خطأ أثناء إضافة النقاط.");
        }
        addPointsBtn.innerHTML = 'إضافة نقاط';
        addPointsBtn.disabled = false;
    });

    // Add Wallet Handler
    addWalletBtn?.addEventListener('click', async () => {
        if (!currentUserDoc || !currentUserData) return;
        const walletToAdd = parseInt(addWalletInput.value, 10);
        if (!walletToAdd || walletToAdd <= 0) {
            alert('يرجى إدخال رصيد صحيح أكبر من صفر');
            return;
        }

        addWalletBtn.innerHTML = 'جاري الإضافة...';
        addWalletBtn.disabled = true;

        try {
            const currentWallet = currentUserData.wallet || 0;
            const newWallet = currentWallet + walletToAdd;

            await updateDoc(doc(db, "users", currentUserDoc.id), {
                wallet: newWallet
            });

            // Update local data
            currentUserData.wallet = newWallet;
            addWalletInput.value = '';
            alert(`تم إضافة ${walletToAdd} ج.م بنجاح! الرصيد الحالي: ${newWallet} ج.م.`);
        } catch (error) {
            console.error("Error adding wallet balance:", error);
            alert("حدث خطأ أثناء إضافة الرصيد.");
        }
        addWalletBtn.innerHTML = 'إضافة رصيد';
        addWalletBtn.disabled = false;
    });

    // Initial load animation style for spin if not exists
    if (!document.getElementById('spin-style')) {
        const style = document.createElement('style');
        style.id = 'spin-style';
        style.textContent = `
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .animate-spin { display: inline-block; }
        `;
        document.head.appendChild(style);
    }
};

// Initialize the specific page logic
document.addEventListener('DOMContentLoaded', () => {
    initStampCard();
    initAdminPanel();
});
