import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentUserUid = null;
let userAddresses = [];

onAuthStateChanged(auth, async (user) => {
    const container = document.getElementById('addresses-container');
    if (!container) return;

    if (!user) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; grid-column: 1/-1;">
                <span class="material-symbols-outlined" style="font-size:3rem; color:var(--dark-300);">lock</span>
                <p style="margin-top:1rem; color:var(--dark-100);">سجل الدخول عشان تدير عناوينك</p>
                <a href="../_1/login.html" class="btn-primary" style="display:inline-block; margin-top:1rem;" onclick="navigateWithCurtain(this.href); return false;">تسجيل الدخول</a>
            </div>
        `;
        return;
    }

    currentUserUid = user.uid;
    loadAddresses();
});

async function loadAddresses() {
    const container = document.getElementById('addresses-container');
    try {
        const userRef = doc(db, "users", currentUserUid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        userAddresses = userSnap.data().addresses || [];

        if (userAddresses.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; grid-column: 1/-1; background:rgba(255,255,255,0.02); border-radius:1rem;">
                    <span class="material-symbols-outlined" style="font-size:4rem; color:var(--dark-300); display:block; margin-bottom:1rem;">location_off</span>
                    <h3 style="color:white; font-size:1.5rem; margin-bottom:0.5rem;">مفيش عناوين محفوظة!</h3>
                    <p style="color:var(--dark-100);">ضيف عناوينك دلوقتي عشان تطلب أسرع.</p>
                </div>
            `;
            return;
        }

        let html = '';
        userAddresses.forEach((addr, index) => {
            const icon = addr.title.includes('عمل') ? 'work' : 'home';
            const iconColor = icon === 'work' ? '#fff' : 'var(--gold)';
            const iconBg = icon === 'work' ? 'rgba(255,255,255,0.05)' : 'rgba(240,192,64,0.1)';

            html += `
            <div class="item-card" id="addr-card-${index}">
                <div class="item-info">
                    <div class="item-icon" style="background:${iconBg}; color:${iconColor};"><span class="material-symbols-outlined icon-filled">${icon}</span></div>
                    <div class="item-details">
                        <h3>${addr.title} ${index === 0 ? '<span class="status success" style="margin:0 0.5rem; font-size:0.7rem; padding:0.1rem 0.5rem;">الافتراضي</span>' : ''}</h3>
                        <p>${addr.details}</p>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon-only remove-addr-btn" data-index="${index}" style="color:var(--brand-light);"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </div>
            `;
        });

        container.innerHTML = html;

        document.querySelectorAll('.remove-addr-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                addressToDeleteIndex = parseInt(e.currentTarget.getAttribute('data-index'));
                const confirmModal = document.getElementById('confirm-delete-modal');
                if(confirmModal) {
                    confirmModal.classList.remove('hidden');
                    confirmModal.style.display = 'flex';
                }
            });
        });

    } catch (e) {
        console.error("Error loading addresses:", e);
    }
}

// Delete Address Modal Logic
let addressToDeleteIndex = null;
document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    const confirmModal = document.getElementById('confirm-delete-modal');
    confirmModal.classList.add('hidden');
    confirmModal.style.display = 'none';
    addressToDeleteIndex = null;
});

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    if (addressToDeleteIndex === null) return;
    const index = addressToDeleteIndex;
    addressToDeleteIndex = null;
    
    const confirmModal = document.getElementById('confirm-delete-modal');
    confirmModal.classList.add('hidden');
    confirmModal.style.display = 'none';
    
    const newAddresses = [...userAddresses];
    newAddresses.splice(index, 1);
    
    try {
        await setDoc(doc(db, "users", currentUserUid), { addresses: newAddresses }, { merge: true });
        window.showToast('تم حذف العنوان بنجاح');
        loadAddresses();
    } catch(err) {
        console.error(err);
        window.showToast('حدث خطأ أثناء الحذف', 'error');
    }
});

// Modal Logic
const modal = document.getElementById('add-address-modal');
document.getElementById('btn-open-add-address').addEventListener('click', () => {
    if (!currentUserUid) {
        window.showToast("سجل الدخول أولاً", "error");
        return;
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // explicitly ensure it's visible
});

document.getElementById('btn-close-address').addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
});

document.getElementById('btn-save-address').addEventListener('click', async () => {
    const title = document.getElementById('new-addr-title').value.trim();
    const details = document.getElementById('new-addr-details').value.trim();

    if (!title || !details) {
        window.showToast("يرجى إكمال جميع الحقول", "error");
        return;
    }

    const btn = document.getElementById('btn-save-address');
    btn.textContent = 'جاري الحفظ...';
    btn.disabled = true;

    try {
        const newAddresses = [...userAddresses, { title, details }];
        await setDoc(doc(db, "users", currentUserUid), { addresses: newAddresses }, { merge: true });
        
        userAddresses = newAddresses; // update local cache
        window.showToast('تم حفظ العنوان بنجاح');
        
        document.getElementById('new-addr-title').value = '';
        document.getElementById('new-addr-details').value = '';
        modal.classList.add('hidden');
        modal.style.display = 'none';
        
        loadAddresses();
    } catch(e) {
        console.error("Error adding address:", e);
        window.showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
        btn.textContent = 'حفظ';
        btn.disabled = false;
    }
});
