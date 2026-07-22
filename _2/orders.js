import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Navbar & Curtain logic
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

window.showToast = function(msg, type='success') {
    alert(msg); // fallback toast
};

// Map status to UI
const statusMap = {
    'pending': { text: 'قيد المراجعة ⏳', class: 'pending' },
    'on_the_way': { text: 'جاري التوصيل 🚚', class: 'pending' },
    'delivered': { text: 'تم التوصيل ✅', class: 'success' },
    'cancelled': { text: 'تم الإلغاء ❌', class: 'error' }
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

    const container = document.getElementById('orders-container');
    if (!container) return;

    if (!user) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; grid-column: 1/-1;">
                <span class="material-symbols-outlined" style="font-size:3rem; color:var(--dark-300);">lock</span>
                <p style="margin-top:1rem; color:var(--dark-100);">سجل الدخول عشان تشوف طلباتك</p>
                <a href="../_1/login.html" class="btn-primary" style="display:inline-block; margin-top:1rem;" onclick="navigateWithCurtain(this.href); return false;">تسجيل الدخول</a>
            </div>
        `;
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
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
        }

        const q = query(
            collection(db, "orders"), 
            where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; grid-column: 1/-1; background:rgba(255,255,255,0.02); border-radius:1rem;">
                    <span class="material-symbols-outlined" style="font-size:4rem; color:var(--brand); display:block; margin-bottom:1rem;">receipt_long</span>
                    <h3 style="color:white; font-size:1.5rem; margin-bottom:0.5rem;">لسا مفيش طلبات!</h3>
                    <p style="color:var(--dark-100);">اطلب أكل دلوقتي واستمتع بأحلى المطاعم.</p>
                    <a href="../_4/res.html" class="btn-primary" style="display:inline-block; margin-top:1.5rem;" onclick="navigateWithCurtain(this.href); return false;">تصفح المطاعم</a>
                </div>
            `;
            return;
        }

        let ordersArray = [];
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            ordersArray.push(data);
        });

        // ترتيب الطلبات من الأحدث للأقدم
        ordersArray.sort((a, b) => {
            let timeA = 0;
            if (a.createdAt) {
                if (typeof a.createdAt.toMillis === 'function') timeA = a.createdAt.toMillis();
                else if (a.createdAt.seconds) timeA = a.createdAt.seconds * 1000;
                else timeA = new Date(a.createdAt).getTime() || 0;
            }
            
            let timeB = 0;
            if (b.createdAt) {
                if (typeof b.createdAt.toMillis === 'function') timeB = b.createdAt.toMillis();
                else if (b.createdAt.seconds) timeB = b.createdAt.seconds * 1000;
                else timeB = new Date(b.createdAt).getTime() || 0;
            }
            return timeB - timeA;
        });

        let html = '';
        ordersArray.forEach(data => {
            
            let dateStr = 'تاريخ غير معروف';
            if (data.createdAt) {
                let dateObj = null;
                if (typeof data.createdAt.toDate === 'function') dateObj = data.createdAt.toDate();
                else if (data.createdAt.seconds) dateObj = new Date(data.createdAt.seconds * 1000);
                else dateObj = new Date(data.createdAt);
                
                if (dateObj && !isNaN(dateObj)) {
                    dateStr = dateObj.toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }

            const statusObj = statusMap[data.status] || { text: data.status || 'غير معروف', class: '' };
            const isActive = (data.status === 'pending' || data.status === 'on_the_way');

            // Format items list
            let itemsText = 'تفاصيل غير متاحة';
            if (data.items && Array.isArray(data.items)) {
                itemsText = data.items.map(item => `${item.quantity || 1}x ${item.name || 'صنف'}`).join('، ');
            } else if (data.orderText) {
                itemsText = data.orderText.substring(0, 50) + (data.orderText.length > 50 ? '...' : '');
            }

            const resName = data.restaurantName || data.customerName || 'طلب';
            const price = data.totalPrice || data.total || 0;

            html += `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-icon" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);color:var(--brand);border-radius:1rem;">
                        <span class="material-symbols-outlined" style="font-size:32px;">fastfood</span>
                    </div>
                    <div class="item-details">
                        <h3>${resName}</h3>
                        <p>رقم الطلب: #${data.id.substring(0,6).toUpperCase()} • ${dateStr}</p>
                        <p>${itemsText}</p>
                    </div>
                </div>
                <div class="item-meta">
                    <div class="status ${statusObj.class}">${statusObj.text}</div>
                </div>
                <div class="item-actions">
                    ${!isActive ? `
                    <a href="../_4/res.html" class="btn-action btn-secondary-action" onclick="navigateWithCurtain(this.href); return false;">
                        <span class="material-symbols-outlined">replay</span> إعادة طلب
                    </a>
                    ` : ''}
                </div>
            </div>
            `;
        });

        container.innerHTML = html;

    } catch (e) {
        console.error("Error loading orders:", e);
        // If there's an index error from Firestore, we handle it
        if (e.message && e.message.includes('index')) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; grid-column: 1/-1; color:#ff4757;">
                    يجب تفعيل الفهرسة (Index) في قاعدة البيانات لهذا الاستعلام. تحقق من الـ Console للحصول على الرابط.
                </div>
            `;
        } else {
            container.innerHTML = `<div style="text-align:center; padding:3rem; grid-column: 1/-1; color:#ff4757; direction:ltr;">Error: ${e.message}</div>`;
        }
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
