// stamps.js
import { db, auth } from "../firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
    const renderStampCard = (brandName, stampsCount, pointsCount = 0) => {
        if (!brandName) brandName = "اختر مطعماً";
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

        // Fetch and set dynamic background
        (async () => {
            try {
                const q = query(collection(db, "restaurants"), where("name", "==", brandName));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const brandData = snap.docs[0].data();
                    const imgUrl = brandData.image || brandData.logo;
                    if (imgUrl) {
                        const logoEl = document.getElementById('brand-logo-img');
                        if (logoEl) {
                            logoEl.src = imgUrl;
                            logoEl.classList.remove('hidden');
                        }

                        let bgDiv = document.getElementById('dynamic-bg-image');
                        if (!bgDiv) {
                            bgDiv = document.createElement('div');
                            bgDiv.id = 'dynamic-bg-image';
                            bgDiv.style.position = 'fixed';
                            bgDiv.style.inset = '0';
                            bgDiv.style.backgroundSize = 'cover';
                            bgDiv.style.backgroundPosition = 'center';
                            bgDiv.style.opacity = '0.15';
                            bgDiv.style.zIndex = '0';
                            bgDiv.style.pointerEvents = 'none';
                            bgDiv.style.transition = 'background-image 0.5s ease-in-out';
                            document.body.insertBefore(bgDiv, document.body.firstChild);
                        }
                        bgDiv.style.backgroundImage = `url('${imgUrl}')`;
                    }

                    // Render dynamic rewards
                    const rewardsGrid = document.getElementById('dynamic-rewards-grid');
                    if (rewardsGrid) {
                        rewardsGrid.innerHTML = '';
                        if (brandData.rewards && brandData.rewards.length > 0) {
                            brandData.rewards.forEach((r, idx) => {
                                const box = document.createElement('div');
                                const isBrand = idx % 2 !== 0;
                                box.className = isBrand ? 'reward-box reward-box-brand' : 'reward-box reward-box-dark';
                                
                                // Make items take full width if 1, half if 2, etc.
                                const itemsCount = brandData.rewards.length;
                                box.style.flex = "1 1 calc(" + (100 / Math.min(itemsCount, 3)) + "% - 1rem)";
                                box.style.minWidth = "120px";
                                box.style.position = "relative";
                                box.style.overflow = "hidden";
                                
                                const iconColor = isBrand ? 'text-brand-light' : 'text-gold';
                                const canRedeem = pointsCount >= r.points;
                                
                                let statusHtml = '';
                                if(canRedeem) {
                                    box.style.boxShadow = "0 0 15px rgba(46, 204, 113, 0.4)";
                                    box.style.border = "1px solid #2ecc71";
                                    statusHtml = `<div style="position: absolute; top: 0; left: 0; background: #2ecc71; color: #fff; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-bottom-right-radius: 0.5rem; font-weight: bold;">متاح</div>`;
                                } else {
                                    const progress = Math.min(100, Math.round((pointsCount / r.points) * 100));
                                    statusHtml = `<div style="width: 100%; background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; margin-top: 0.5rem; overflow: hidden;"><div style="width: ${progress}%; background: ${canRedeem ? '#2ecc71' : (isBrand ? '#fff' : 'var(--gold)')}; height: 100%;"></div></div>`;
                                }

                                box.innerHTML = `
                                    ${statusHtml}
                                    <span class="material-symbols-outlined ${iconColor}" style="font-size:24px; margin-bottom: 0.25rem;">${r.icon || 'local_offer'}</span>
                                    <span class="reward-text" style="font-size: 0.9rem;">${r.description}<br><small style="font-size: 0.75rem; opacity: 0.8; font-weight: normal; display: block; margin-top: 0.25rem;">${r.points} نقطة</small></span>
                                `;
                                rewardsGrid.appendChild(box);
                            });
                        } else {
                            rewardsGrid.innerHTML = '<span style="color: #aaa; font-size: 0.9rem;">لا توجد جوائز محددة لهذا المطعم حالياً.</span>';
                        }
                    }
                }
            } catch(e) {
                console.error("Failed to load background image or rewards", e);
            }
        })();
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
                    const pointsMap = userData.pointsMap || {};
                    const brands = Object.keys(stampsMap);

                    if (brands.length === 0) {
                        // User has no stamps anywhere
                        renderStampCard("لا توجد أختام بعد", 0, 0);
                    } else if (brands.length === 1) {
                        // One brand
                        const count = stampsMap[brands[0]] || 0;
                        const pCount = pointsMap[brands[0]] || 0;
                        const activeCount = (count > 0 && count % 10 === 0) ? 10 : (count % 10);
                        renderStampCard(brands[0], activeCount, pCount);
                    } else {
                        // Multiple brands: show wallet
                        const walletContainer = document.getElementById('wallet-cards-container');
                        if (walletContainer) {
                            walletContainer.classList.remove('hidden');
                            brandNameEl.classList.add('hidden'); // Hide the single title
                            
                            const renderWallet = (activeBrand) => {
                                let cardsHtml = '';
                                brands.forEach(b => {
                                    const count = stampsMap[b] || 0;
                                    const activeCount = (count > 0 && count % 10 === 0) ? 10 : (count % 10);
                                    const isActive = b === activeBrand;
                                    const isGold = activeCount === 10;
                                    const activeClass = isActive ? 'active' : '';
                                    const goldClass = isGold ? 'gold-tier' : '';
                                    
                                    cardsHtml += `
                                        <div class="mini-card ${activeClass} ${goldClass}" data-brand="${b}">
                                            <span class="mini-card-title">${b}</span>
                                            <span class="mini-card-count">${activeCount}/10</span>
                                        </div>
                                    `;
                                });
                                walletContainer.innerHTML = cardsHtml;
                                
                                // Bind click events
                                const cards = walletContainer.querySelectorAll('.mini-card');
                                cards.forEach(card => {
                                    card.addEventListener('click', () => {
                                        const clickedBrand = card.getAttribute('data-brand');
                                        renderWallet(clickedBrand);
                                        const count = stampsMap[clickedBrand] || 0;
                                        const pCount = pointsMap[clickedBrand] || 0;
                                        renderStampCard(clickedBrand, (count > 0 && count % 10 === 0) ? 10 : (count % 10), pCount);
                                    });
                                });
                            };
                            
                            // Initialize with the first brand
                            renderWallet(brands[0]);
                            const initCount = stampsMap[brands[0]] || 0;
                            const initPCount = pointsMap[brands[0]] || 0;
                            renderStampCard(brands[0], (initCount > 0 && initCount % 10 === 0) ? 10 : (initCount % 10), initPCount);
                        }
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
    // Custom Dropdown Elements
    const customSelectBox = document.getElementById('custom-restaurant-select');
    const customSelectText = document.getElementById('custom-select-text');
    const customSelectIcon = document.getElementById('custom-select-icon');
    const customDropdown = document.getElementById('custom-restaurant-dropdown');
    let allRestaurants = [];
    const searchBtn = document.getElementById('admin-search-btn');
    const searchPhone = document.getElementById('admin-search-phone');
    const searchResult = document.getElementById('admin-search-result');
    const userNameEl = document.getElementById('admin-user-name');
    const userPhoneEl = document.getElementById('admin-user-phone');
    const stampActionArea = document.getElementById('admin-stamp-action-area');
    
    if (!customSelectBox || !searchBtn) return; // Not on admin page

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
        if (!docSnap.exists()) {
            window.location.href = '../_3/home.html';
            return;
        }
        const userData = docSnap.data();
        if (userData.isAdmin !== true && userData.isModerator !== true) {
            alert("غير مصرح لك بدخول هذه الصفحة!");
            window.location.href = '../_3/home.html';
            return;
        }
        
        // Show Admin-only links if user is a full Admin
        if (userData.isModerator !== true) {
            document.querySelectorAll('.admin-only-link').forEach(link => {
                link.style.display = 'flex';
            });
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

    // Points
    const pointsWalletCard = document.getElementById('admin-points-wallet-card');
    const addPointsInput = document.getElementById('admin-add-points-input');
    const addPointsBtn = document.getElementById('admin-add-points-btn');

    let currentUserDoc = null;
    let currentUserData = null;
    let selectedBrand = '';

    const ArabicNumbers = (num) => {
        const arabicMap = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        return String(num).split('').map(digit => arabicMap[digit] || digit).join('');
    };

    const updateAdminUI = () => {
        let currentStamps = 0;
        let globalPoints = 0;
        let globalStamps = 0;
        
        if (currentUserData) {
            const stampsMap = currentUserData.stamps || {};
            currentStamps = stampsMap[selectedBrand] || 0;
            
            const pointsMap = currentUserData.pointsMap || {};
            
            Object.values(pointsMap).forEach(p => globalPoints += (p || 0));
            Object.values(stampsMap).forEach(s => globalStamps += (s || 0));
        }

        let globalTier = "Bronze";
        if (globalPoints <= 600) globalTier = "Bronze";
        else if (globalPoints <= 1200) globalTier = "Silver";
        else if (globalPoints <= 1800) globalTier = "Gold";
        else if (globalPoints <= 2400) globalTier = "Platinum";
        else globalTier = "Elite";

        const activeStamps = (currentStamps > 0 && currentStamps % 10 === 0) ? 10 : (currentStamps % 10);
        const completedCards = Math.floor(currentStamps / 10);

        if (currentStampsEl && remainingStampsEl) {
            currentStampsEl.textContent = ArabicNumbers(activeStamps) + (completedCards > 0 ? ` (+${ArabicNumbers(completedCards)} كروت مكتملة)` : '');
            remainingStampsEl.textContent = ArabicNumbers(10 - activeStamps);
        }
        
        const pointsEl = document.getElementById('admin-user-points');
        if (pointsEl) pointsEl.textContent = globalPoints.toLocaleString('ar-EG');
        const tierEl = document.getElementById('admin-user-tier');
        if (tierEl) tierEl.textContent = globalTier;
        
        const url = `../_6/stamp_card.html?brand=${encodeURIComponent(selectedBrand)}&stamps=${activeStamps}`;
        if (iframeEl) iframeEl.src = url;
        if (fullScreenLink) fullScreenLink.href = url;
    };

    // Render Custom Dropdown
    const renderRestaurantsDropdown = () => {
        if (!customDropdown) return;
        
        let sortedRes = [...allRestaurants];
        const stampsMap = (currentUserData && currentUserData.stamps) ? currentUserData.stamps : {};
        
        // Sort: first by user's stamps (descending), then by restaurant's global points (descending)
        sortedRes.sort((a, b) => {
            const stampsA = stampsMap[a.name] || 0;
            const stampsB = stampsMap[b.name] || 0;
            if (stampsA !== stampsB) {
                return stampsB - stampsA;
            }
            return (b.points || 0) - (a.points || 0);
        });

        let html = '';
        if (sortedRes.length === 0) {
            html = '<div style="padding: 1rem; text-align: center; color: var(--dark-300);">لا يوجد مطاعم</div>';
        } else {
            sortedRes.forEach(res => {
                const userStamps = stampsMap[res.name] || 0;
                const points = res.points || 0;
                html += `<div class="custom-dropdown-item" data-name="${res.name}" style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; color: white; display: flex; justify-content: space-between; align-items: center;">
                            <span class="dropdown-res-name">${res.name}</span>
                            <div style="display: flex; gap: 0.5rem;">
                                ${userStamps > 0 ? `<span style="color: var(--brand); font-size: 0.8rem; background: rgba(228,62,61,0.1); padding: 0.2rem 0.5rem; border-radius: 0.25rem;">${userStamps} ختم</span>` : ''}
                                <span style="color: var(--gold); font-size: 0.8rem; background: rgba(240,192,64,0.1); padding: 0.2rem 0.5rem; border-radius: 0.25rem;">${points.toLocaleString('ar-EG')} نقطة</span>
                            </div>
                         </div>`;
            });
        }
        
        customDropdown.innerHTML = html;

        // Add event listeners
        document.querySelectorAll('.custom-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const resItem = e.target.closest('.custom-dropdown-item');
                const resName = resItem.dataset.name;
                
                customSelectText.textContent = resName;
                customSelectText.style.color = "white";
                customDropdown.classList.add('hidden');
                if (customSelectIcon) customSelectIcon.style.transform = 'rotate(0deg)';
                
                selectedBrand = resName;
                updateAdminUI();
            });
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.05)');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        });
    };

    // Toggle dropdown
    if (customSelectBox) {
        customSelectBox.addEventListener('click', () => {
            if (allRestaurants.length === 0) return; // Not loaded yet or none
            customDropdown.classList.toggle('hidden');
            if (customDropdown.classList.contains('hidden')) {
                if (customSelectIcon) customSelectIcon.style.transform = 'rotate(0deg)';
            } else {
                if (customSelectIcon) customSelectIcon.style.transform = 'rotate(180deg)';
                renderRestaurantsDropdown(); // Re-render to ensure latest sort is shown
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (customDropdown && !e.target.closest('.custom-select-wrapper')) {
            customDropdown.classList.add('hidden');
            if (customSelectIcon) customSelectIcon.style.transform = 'rotate(0deg)';
        }
    });

    // Load Restaurants Initial Fetch
    try {
        const resSnap = await getDocs(collection(db, "restaurants"));
        allRestaurants = [];
        resSnap.forEach((doc) => {
            const data = doc.data();
            allRestaurants.push({ id: doc.id, name: data.name, points: data.points || 0 });
        });
        
        if (allRestaurants.length > 0 && customSelectText) {
            customSelectText.textContent = "-- اختر المطعم --";
            // Do not pre-select automatically so they have to choose
            // selectedBrand = allRestaurants[0].name;
            // updateAdminUI();
        } else if (customSelectText) {
            customSelectText.textContent = "لا يوجد مطاعم";
        }
    } catch (e) {
        console.error("Error loading restaurants:", e);
        if (customSelectText) customSelectText.textContent = "خطأ في التحميل";
    }



    // ═════ TOAST NOTIFICATION ═════
    const showToast = (msg, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
            ${msg}
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Search User
    searchBtn.addEventListener('click', async () => {
        let phone = searchPhone.value.trim();
        
        // Normalize Arabic numerals to English numerals
        const arabicToEnglish = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
        phone = String(phone).replace(/[٠-٩]/g, d => arabicToEnglish[d]);

        if (!phone) {
            showToast('يرجى إدخال رقم الموبايل', 'error');
            return;
        }

        searchBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:1rem; animation: spin 1s linear infinite;">progress_activity</span> جاري البحث...';
        searchBtn.disabled = true;
        
        searchResult.classList.add('hidden');
        stampActionArea.classList.add('hidden');
        if (pointsWalletCard) pointsWalletCard.classList.add('hidden');
        const dangerZone = document.getElementById('admin-danger-zone-card');
        if (dangerZone) dangerZone.classList.add('hidden');
        
        const loadingEl = document.getElementById('admin-search-loading');
        if (loadingEl) loadingEl.classList.remove('hidden');

        try {
            const q = query(collection(db, "users"), where("phone", "==", phone));
            const querySnapshot = await getDocs(q);
            
            if (loadingEl) loadingEl.classList.add('hidden');

            if (querySnapshot.empty) {
                showToast('العميل غير مسجل بالنظام!', 'error');
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
                
                // Tier/Points will be updated in updateAdminUI
                searchResult.classList.remove('hidden');
                stampActionArea.classList.remove('hidden');
                if (pointsWalletCard) pointsWalletCard.classList.remove('hidden');
                if (dangerZone) dangerZone.classList.remove('hidden');
                updateAdminUI();
                showToast('تم العثور على العميل بنجاح');
            }
        } catch (error) {
            console.error("Search Error:", error);
            showToast('حدث خطأ أثناء البحث.', 'error');
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

    // Custom dropdown selection is handled in renderRestaurantsDropdown()

    // Reset User Handler
    const btnResetUser = document.getElementById('btn-reset-user');
    if (btnResetUser) {
        btnResetUser.addEventListener('click', () => {
            if (!currentUserDoc || !currentUserData) return;
            
            const modal = document.getElementById('custom-confirm-modal');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            
            if(!modal) return;
            
            modal.classList.add('show');
            const closeModal = () => modal.classList.remove('show');
            cancelBtn.onclick = closeModal;

            confirmBtn.onclick = async () => {
                closeModal();
                btnResetUser.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:1rem; animation: spin 1s linear infinite;">progress_activity</span> جاري التصفير...';
                btnResetUser.disabled = true;

                try {
                    const resetData = {
                        pointsMap: {},
                        tierMap: {},
                        stamps: {},
                        points: 0,
                        tier: "Bronze"
                    };

                    await updateDoc(doc(db, "users", currentUserDoc.id), resetData);

                    // Log activity
                    await addDoc(collection(db, "activities"), {
                        userId: currentUserDoc.id,
                        title: 'تصفير الحساب (إدارة)',
                        type: 'points',
                        value: 'تم تصفير الأختام والنقاط',
                        date: new Date().toLocaleDateString('ar-EG'),
                        createdAt: new Date().toISOString()
                    });

                    // Update local data
                    currentUserData.pointsMap = {};
                    currentUserData.tierMap = {};
                    currentUserData.stamps = {};
                    currentUserData.points = 0;
                    currentUserData.tier = "Bronze";

                    // Update UI
                    updateAdminUI();
                    showToast('تم تصفير حساب العميل بنجاح!');
                } catch (error) {
                    console.error("Error resetting user:", error);
                    showToast("حدث خطأ أثناء تصفير الحساب.", "error");
                }

                btnResetUser.innerHTML = 'تصفير الحساب';
                btnResetUser.disabled = false;
            };
        });
    }

    const recalculateTier = (points) => {
        if (points > 2400) return "Elite";
        if (points > 1800) return "Platinum";
        if (points > 1200) return "Gold";
        if (points > 600) return "Silver";
        return "Bronze";
    };

    const btnRemoveStamp = document.getElementById('btn-remove-stamp-action');

    btnAddStamp.addEventListener('click', async () => {
        if (!currentUserDoc || !currentUserData) return;

        const stampsMap = currentUserData.stamps || {};
        const pointsMap = currentUserData.pointsMap || {};
        
        let currentStamps = stampsMap[selectedBrand] || 0;
        let currentPoints = pointsMap[selectedBrand] || 0;

        currentStamps++;
        currentPoints += 30; // 30 points per stamp

        stampsMap[selectedBrand] = currentStamps;
        pointsMap[selectedBrand] = currentPoints;
        
        // Calculate global points
        let globalPoints = 0;
        Object.values(pointsMap).forEach(p => globalPoints += (p || 0));
        const newTier = recalculateTier(globalPoints);
        
        btnAddStamp.innerHTML = '<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">progress_activity</span> جاري الإضافة...';
        btnAddStamp.disabled = true;

        try {
            // Update User
            await updateDoc(doc(db, "users", currentUserDoc.id), {
                stamps: stampsMap,
                pointsMap: pointsMap,
                points: globalPoints,
                tier: newTier
            });
            
            // Log activity
            await addDoc(collection(db, "activities"), {
                userId: currentUserDoc.id,
                title: `إضافة ختم - ${selectedBrand}`,
                type: 'stamp',
                value: '+1 ختم (+30 نقطة)',
                date: new Date().toLocaleDateString('ar-EG'),
                createdAt: new Date().toISOString()
            });

            // Update Restaurant (10 points to the restaurant)
            const resData = allRestaurants.find(r => r.name === selectedBrand);
            if (resData && resData.id) {
                resData.points = (resData.points || 0) + 10;
                await updateDoc(doc(db, "restaurants", resData.id), {
                    points: resData.points
                });
            }

            // Update local data
            currentUserData.stamps = stampsMap;
            currentUserData.pointsMap = pointsMap;
            currentUserData.points = globalPoints;
            currentUserData.tier = newTier;

            updateAdminUI();
            showToast(`تم إضافة الختم بنجاح!`);
        } catch (error) {
            console.error("Error adding stamp:", error);
            showToast("حدث خطأ أثناء الإضافة.", "error");
        }
        btnAddStamp.innerHTML = '<span class="material-symbols-outlined text-brand">verified</span> إضافة ختم جديد الآن';
        btnAddStamp.disabled = false;
    });

    if (btnRemoveStamp) {
        btnRemoveStamp.addEventListener('click', async () => {
            if (!currentUserDoc || !currentUserData) return;

            const stampsMap = currentUserData.stamps || {};
            const pointsMap = currentUserData.pointsMap || {};
            
            let currentStamps = stampsMap[selectedBrand] || 0;
            let currentPoints = pointsMap[selectedBrand] || 0;

            if (currentStamps > 0) {
                currentStamps--;
                currentPoints = Math.max(0, currentPoints - 30);
                
                stampsMap[selectedBrand] = currentStamps;
                pointsMap[selectedBrand] = currentPoints;
                
                // Calculate global points
                let globalPoints = 0;
                Object.values(pointsMap).forEach(p => globalPoints += (p || 0));
                const newTier = recalculateTier(globalPoints);

                btnRemoveStamp.innerHTML = '<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">progress_activity</span> جاري الإزالة...';
                btnRemoveStamp.disabled = true;

                try {
                    await updateDoc(doc(db, "users", currentUserDoc.id), {
                        stamps: stampsMap,
                        pointsMap: pointsMap,
                        points: globalPoints,
                        tier: newTier
                    });
                    
                    // Log activity
                    await addDoc(collection(db, "activities"), {
                        userId: currentUserDoc.id,
                        title: `إزالة ختم - ${selectedBrand}`,
                        type: 'stamp',
                        value: '-1 ختم (-30 نقطة)',
                        date: new Date().toLocaleDateString('ar-EG'),
                        createdAt: new Date().toISOString()
                    });

                    // Update Restaurant (-10 points to the restaurant)
                    const resData = allRestaurants.find(r => r.name === selectedBrand);
                    if (resData && resData.id && resData.points > 0) {
                        resData.points = Math.max(0, resData.points - 10);
                        await updateDoc(doc(db, "restaurants", resData.id), {
                            points: resData.points
                        });
                    }

                    // Update local data
                    currentUserData.stamps = stampsMap;
                    currentUserData.pointsMap = pointsMap;
                    currentUserData.points = globalPoints;
                    currentUserData.tier = newTier;

                    updateAdminUI();
                    showToast(`تم إزالة الختم بنجاح!`);
                } catch (error) {
                    console.error("Error removing stamp:", error);
                    showToast("حدث خطأ أثناء الإزالة.", "error");
                }
                btnRemoveStamp.innerHTML = '<span class="material-symbols-outlined text-dark-300">do_not_disturb_on</span> إزالة ختم';
                btnRemoveStamp.disabled = false;
            } else {
                showToast('لا يوجد أختام لإزالتها من هذا المطعم!', 'error');
            }
        });
    }

    // Add Points Logic
    const processAddPoints = async (pointsToAdd, btnElement, originalText) => {
        if (!currentUserDoc || !currentUserData) return;
        if (!pointsToAdd || pointsToAdd === 0) {
            showToast('يرجى إدخال عدد نقاط صحيح', 'error');
            return;
        }

        btnElement.innerHTML = '<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">progress_activity</span> جاري الإضافة...';
        btnElement.disabled = true;

        try {
            const pointsMap = currentUserData.pointsMap || {};
            const currentPoints = pointsMap[selectedBrand] || 0;
            const newPoints = Math.max(0, currentPoints + pointsToAdd);
            pointsMap[selectedBrand] = newPoints;
            
            let globalPoints = 0;
            Object.values(pointsMap).forEach(p => globalPoints += (p || 0));

            let globalTier = "Bronze";
            if (globalPoints <= 600) globalTier = "Bronze";
            else if (globalPoints <= 1200) globalTier = "Silver";
            else if (globalPoints <= 1800) globalTier = "Gold";
            else if (globalPoints <= 2400) globalTier = "Platinum";
            else globalTier = "Elite";

            await updateDoc(doc(db, "users", currentUserDoc.id), {
                pointsMap: pointsMap,
                tier: globalTier
            });

            // Log activity
            await addDoc(collection(db, "activities"), {
                userId: currentUserDoc.id,
                title: pointsToAdd > 0 ? `إضافة نقاط - ${selectedBrand}` : `خصم نقاط - ${selectedBrand}`,
                type: 'points',
                value: pointsToAdd > 0 ? `+${pointsToAdd} نقطة` : `${pointsToAdd} نقطة`,
                date: new Date().toLocaleDateString('ar-EG'),
                createdAt: new Date().toISOString()
            });

            // Update local data
            currentUserData.pointsMap = pointsMap;
            currentUserData.tier = globalTier;

            updateAdminUI();

            if (addPointsInput) addPointsInput.value = '';
            showToast(`تم ${pointsToAdd > 0 ? 'إضافة' : 'خصم'} ${Math.abs(pointsToAdd)} نقطة بنجاح! الرصيد: ${newPoints}`);
        } catch (error) {
            console.error("Error adding points:", error);
            showToast("حدث خطأ أثناء إضافة النقاط.", "error");
        }
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    };

    addPointsBtn?.addEventListener('click', () => {
        const pointsToAdd = parseInt(addPointsInput.value, 10);
        processAddPoints(pointsToAdd, addPointsBtn, 'إضافة نقاط');
    });

    const add30PointsBtn = document.getElementById('admin-add-30-points-btn');
    add30PointsBtn?.addEventListener('click', () => {
        processAddPoints(30, add30PointsBtn, '+30 نقطة (سريع)');
    });

    // Auto Search if URL has ?phone=...
    const urlParams = new URLSearchParams(window.location.search);
    const urlPhone = urlParams.get('phone');
    if (urlPhone) {
        searchPhone.value = urlPhone;
        searchBtn.click();
    }

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