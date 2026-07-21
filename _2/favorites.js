import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const curtain = document.querySelector('.page-transition-curtain');
        if (curtain) {
            curtain.classList.remove('wipe-in');
            curtain.style.transform = 'scaleY(0)';
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

window.showToast = function(msg, type='success') {
    alert(msg); // fallback toast
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

    const container = document.getElementById('favorites-container');
    if (!container) return;

    if (!user) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; grid-column: 1/-1;">
                <span class="material-symbols-outlined" style="font-size:3rem; color:var(--dark-300);">lock</span>
                <p style="margin-top:1rem; color:var(--dark-100);">سجل الدخول عشان تشوف مفضلتك</p>
                <a href="../_1/login.html" class="btn-primary" style="display:inline-block; margin-top:1rem;" onclick="navigateWithCurtain(this.href); return false;">تسجيل الدخول</a>
            </div>
        `;
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("بيانات المستخدم غير موجودة");
        }

        const userData = userSnap.data();
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

        const favIds = userData.favorites || [];

        if (favIds.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; grid-column: 1/-1; background:rgba(255,255,255,0.02); border-radius:1rem;">
                    <span class="material-symbols-outlined" style="font-size:4rem; color:var(--brand); display:block; margin-bottom:1rem;">favorite_border</span>
                    <h3 style="color:white; font-size:1.5rem; margin-bottom:0.5rem;">قائمة المفضلة فاضية!</h3>
                    <p style="color:var(--dark-100);">ضيف مطاعمك اللي بتحبها عشان تلاقيها هنا بسهولة.</p>
                    <a href="../_4/res.html" class="btn-primary" style="display:inline-block; margin-top:1.5rem;" onclick="navigateWithCurtain(this.href); return false;">تصفح المطاعم</a>
                </div>
            `;
            return;
        }

        let html = '';
        
        // Fetch each restaurant from favorites
        for (const resId of favIds) {
            const resRef = doc(db, "restaurants", resId);
            const resSnap = await getDoc(resRef);
            
            if (resSnap.exists()) {
                const data = resSnap.data();
                const image = data.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=150&h=150';
                
                let categoryText = '';
                if (data.category && Array.isArray(data.category)) {
                    categoryText = data.category.join(' • ');
                } else {
                    categoryText = data.category || data.desc || 'مطعم';
                }

                html += `
                <div class="item-card" id="fav-card-${resId}">
                    <div class="item-info">
                        <div class="item-icon">
                            <img src="${image}" alt="${data.name}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">
                        </div>
                        <div class="item-details">
                            <h3>${data.name}</h3>
                            <p>${categoryText}</p>
                            <p style="color:var(--gold); display:flex; align-items:center; gap:0.25rem;">
                                <span class="material-symbols-outlined icon-filled" style="font-size:16px;">star</span> 
                                ${data.rating || '4.5'}
                            </p>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon-only remove-fav-btn" data-id="${resId}">
                            <span class="material-symbols-outlined icon-filled" style="color:var(--brand-light);">favorite</span>
                        </button>
                        <a href="../_4/restaurant.html?id=${resId}" class="btn-action btn-primary-action" onclick="navigateWithCurtain(this.href); return false;">
                            <span class="material-symbols-outlined">storefront</span> زيارة المطعم
                        </a>
                    </div>
                </div>
                `;
            }
        }

        container.innerHTML = html || `<div style="text-align:center; padding:3rem; grid-column: 1/-1;">لا يوجد مطاعم صحيحة في المفضلة.</div>`;

        // Add event listeners for removing favorites
        document.querySelectorAll('.remove-fav-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const resId = button.getAttribute('data-id');
                const card = document.getElementById(`fav-card-${resId}`);
                
                try {
                    // Update UI immediately for responsiveness
                    if (card) card.style.display = 'none';
                    
                    // Update Firebase
                    await updateDoc(userRef, {
                        favorites: arrayRemove(resId)
                    });
                    
                    window.showToast('تم إزالة المطعم من المفضلة');
                    
                    // Check if empty now
                    if (document.querySelectorAll('.item-card[style!="display: none;"]').length === 0) {
                        // Reload page to show empty state
                        window.location.reload();
                    }
                } catch (error) {
                    console.error("Error removing favorite:", error);
                    window.showToast('حدث خطأ أثناء الإزالة', 'error');
                    if (card) card.style.display = ''; // Revert UI
                }
            });
        });

    } catch (e) {
        console.error("Error loading favorites:", e);
        container.innerHTML = `<div style="text-align:center; padding:3rem; grid-column: 1/-1; color:#ff4757;">حدث خطأ في تحميل المفضلة: ${e.message}</div>`;
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
