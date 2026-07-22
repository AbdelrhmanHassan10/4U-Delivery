import { auth, db } from "../firebase-config.js";
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Auth Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../_1/login.html';
        return;
    }
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || docSnap.data().isAdmin !== true) {
            alert("غير مصرح لك بدخول هذه الصفحة!");
            window.location.href = '../_3/home.html';
            return;
        }
        
        // If user is a Moderator, redirect away
        if (docSnap.data().isModerator === true) {
            alert("غير مصرح لك بدخول هذه الصفحة! هذه الصفحة مخصصة للمدير فقط.");
            window.location.href = 'admin_orders.html';
            return;
        } else {
            // Full admin: show restricted links
            document.querySelectorAll('.admin-only-link').forEach(link => {
                link.style.display = 'flex';
            });
        }
    } catch (e) {
        window.location.href = '../_3/home.html';
        return;
    }
    // Load users after passing auth check
    loadUsers();
});

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

// Ripple Effect
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
    if (existingRipple) { existingRipple.remove(); }
    btn.appendChild(circle);
});

// Admin Users Logic
let allUsers = [];

const loadUsers = async () => {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    // Loading Style
    if (!document.getElementById('spin-style')) {
        const style = document.createElement('style');
        style.id = 'spin-style';
        style.textContent = `
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .animate-spin { display: inline-block; animation: spin 1s linear infinite; }
        `;
        document.head.appendChild(style);
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        allUsers = [];
        querySnapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt desc if exists
        allUsers.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
        });

        renderTable(allUsers);
    } catch (error) {
        console.error("Error fetching users: ", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--brand);">حدث خطأ أثناء تحميل البيانات</td></tr>`;
    }
};

const renderTable = (users) => {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--dark-400);">لا يوجد عملاء حتى الآن</td></tr>`;
        return;
    }

    let html = '';
    users.forEach(user => {
        const name = user.name || 'عميل بدون اسم';
        const phone = user.phone || 'غير متوفر';
        const points = (user.points || 0).toLocaleString('ar-EG');
        const wallet = (user.wallet || 0).toLocaleString('ar-EG');
        const tier = user.tier || 'Silver';
        
        let tierClass = 'tier-silver';
        if (tier.toLowerCase() === 'gold') tierClass = 'tier-gold';
        if (tier.toLowerCase() === 'platinum') tierClass = 'tier-platinum';
        if (tier.toLowerCase() === 'vip') tierClass = 'tier-vip';

        // Calculate total stamps across all brands
        let totalStamps = 0;
        if (user.stamps) {
            Object.values(user.stamps).forEach(count => {
                totalStamps += (count || 0);
            });
        }

        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '👤';

        const isFullAdmin = user.isAdmin === true && user.isModerator !== true;
        const isMod = user.isAdmin === true && user.isModerator === true;

        const adminStyle = isFullAdmin 
            ? `opacity:1; border:1px solid rgba(240,192,64,0.6); color:var(--gold); background:rgba(240,192,64,0.15);`
            : `opacity:0.4; border:1px solid rgba(240,192,64,0.2); color:var(--gold); background:transparent;`;
            
        const modStyle = isMod
            ? `opacity:1; border:1px solid rgba(52,152,219,0.6); color:#3498db; background:rgba(52,152,219,0.15);`
            : `opacity:0.4; border:1px solid rgba(52,152,219,0.2); color:#3498db; background:transparent;`;

        html += `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-initials">${initials}</div>
                        <div>
                            <div style="font-weight: 700;">${name}</div>
                            <div style="font-size: 0.75rem; color: var(--dark-400);">${user.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td style="direction: ltr; text-align: right; color: var(--brand-light); font-weight: 600;">${phone}</td>
                <td><span class="tier-badge ${tierClass}">${tier}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="material-symbols-outlined" style="font-size:1.2rem; color:var(--brand);">verified</span> <span style="font-weight:700;">${totalStamps}</span>
                        <span style="color:var(--dark-400);">|</span>
                        <span class="material-symbols-outlined" style="font-size:1.2rem; color:var(--gold);">stars</span> <span style="font-weight:700; color:var(--gold);">${points}</span>
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:0.5rem; flex-wrap:nowrap; justify-content:flex-end; align-items:center;">
                        <button onclick="this.innerHTML = '<span class=\\'material-symbols-outlined animate-spin\\' style=\\'font-size:1.1rem;\\'>progress_activity</span>'; this.style.opacity = '0.7'; this.disabled = true; window.navigateWithCurtain('admin_stamps.html?phone=${encodeURIComponent(phone)}');" class="btn-action edit ripple-btn" style="border:none; cursor:pointer; display:inline-flex; align-items:center; gap:0.5rem; background:rgba(200,16,46,0.1); color:var(--brand-light); border:1px solid rgba(200,16,46,0.3); padding:0.5rem 1rem; border-radius:0.5rem; font-weight:600; font-size:0.85rem; white-space:nowrap;" title="عرض وإدارة العميل">
                            <span class="material-symbols-outlined" style="font-size:1.1rem;">manage_accounts</span>
                            إدارة
                        </button>
                        
                        <button onclick="window.toggleUserRole('${user.id}', 'moderator', this)" class="btn-action ripple-btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border-radius:0.5rem; font-weight:600; font-size:0.85rem; white-space:nowrap; transition:all 0.2s; ${modStyle}" title="تبديل صلاحية مشرف">
                            <span class="material-symbols-outlined" style="font-size:1.1rem;">shield_person</span> مشرف
                        </button>
                        
                        <button onclick="window.toggleUserRole('${user.id}', 'admin', this)" class="btn-action ripple-btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border-radius:0.5rem; font-weight:600; font-size:0.85rem; white-space:nowrap; transition:all 0.2s; ${adminStyle}" title="تبديل صلاحية أدمن">
                            <span class="material-symbols-outlined" style="font-size:1.1rem;">security</span> مدير
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

// Search Filter
document.getElementById('users-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => {
        const nameMatch = (user.name || '').toLowerCase().includes(term);
        const phoneMatch = (user.phone || '').includes(term);
        return nameMatch || phoneMatch;
    });
    renderTable(filtered);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // loadUsers() is now called after auth check
});

// Toggle Role Logic
window.toggleUserRole = async function(userId, roleToToggle, btnElement) {
    const user = allUsers.find(u => u.id === userId);
    if(!user) return;

    const isCurrentlyFullAdmin = user.isAdmin === true && user.isModerator !== true;
    const isCurrentlyMod = user.isAdmin === true && user.isModerator === true;
    
    let newIsAdmin = false;
    let newIsModerator = false;
    let msg = "";

    if (roleToToggle === 'admin') {
        if (isCurrentlyFullAdmin) {
            // Remove admin -> make normal
            newIsAdmin = false;
            newIsModerator = false;
            msg = "تم سحب صلاحيات الأدمن (أصبح مستخدم عادي)";
        } else {
            // Make full admin
            newIsAdmin = true;
            newIsModerator = false;
            msg = "تم منح صلاحيات الأدمن بنجاح!";
        }
    } else if (roleToToggle === 'moderator') {
        if (isCurrentlyMod) {
            // Remove moderator -> make normal
            newIsAdmin = false;
            newIsModerator = false;
            msg = "تم سحب صلاحيات المشرف (أصبح مستخدم عادي)";
        } else {
            // Make moderator
            newIsAdmin = true;
            newIsModerator = true;
            msg = "تم تعيين المستخدم كمشرف بنجاح!";
        }
    }

    if(!confirm(`هل أنت متأكد من تغيير صلاحيات هذا المستخدم؟`)) return;
    
    btnElement.disabled = true;
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:1.1rem;">progress_activity</span>';
    
    try {
        await updateDoc(doc(db, "users", userId), {
            isAdmin: newIsAdmin,
            isModerator: newIsModerator
        });
        
        user.isAdmin = newIsAdmin;
        user.isModerator = newIsModerator;
        
        renderTable(allUsers); // Re-render to update UI colors and state
    } catch(e) {
        console.error("Error toggling user role:", e);
        alert("حدث خطأ أثناء تغيير الصلاحيات!");
        btnElement.disabled = false;
        btnElement.innerHTML = originalHtml;
    }
};
