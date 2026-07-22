import { db, auth } from "../firebase-config.js";
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

// ═════ ADMIN AUTH & LOAD ═════
document.addEventListener('DOMContentLoaded', async () => {
    const btnRefresh = document.getElementById('btn-refresh');
    const messagesContainer = document.getElementById('messages-list-container');

    if (!messagesContainer) return;

    // 1. Check Admin Auth
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../_1/login.html';
            return;
        }
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                window.location.href = '../_3/home.html';
                return;
            }
            const userData = userDoc.data();
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
            // Is Admin -> load messages
            loadMessages();
        } catch (e) {
            console.error("Auth error:", e);
        }
    });

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            btnRefresh.classList.add('spinning');
            loadMessages().finally(() => btnRefresh.classList.remove('spinning'));
        });
    }

    async function loadMessages() {
        messagesContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">جاري تحميل الرسائل...</div>';
        
        try {
            const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                messagesContainer.innerHTML = `
                    <div style="text-align:center; padding:3rem; background:rgba(255,255,255,0.02); border-radius:1rem; border:1px solid rgba(255,255,255,0.05);">
                        <span class="material-symbols-outlined" style="font-size:48px; color:var(--dark-300); margin-bottom:1rem; display:block;">inbox</span>
                        <h3 style="color:white; margin-bottom:0.5rem;">صندوق الرسائل فارغ</h3>
                        <p style="color:var(--dark-300); font-size:0.9rem;">لا توجد رسائل تواصل حالياً.</p>
                    </div>`;
                return;
            }

            let html = '';
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                
                const isUnread = data.status === 'new';
                
                // Format Date
                let dateStr = 'وقت غير معروف';
                if (data.createdAt) {
                    const date = data.createdAt.toDate();
                    dateStr = date.toLocaleString('ar-EG', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                    });
                }

                // Make phone WhatsApp ready (remove leading 0 and add +20)
                let waPhone = data.phone || '';
                if(waPhone.startsWith('0')) waPhone = '+20' + waPhone.substring(1);

                const isReward = data.type === 'reward_request';
                const cardBorder = isReward ? 'border: 2px solid var(--gold); background: rgba(240,192,64,0.03);' : '';

                html += `
                <div class="message-card ${isUnread ? 'unread' : ''}" id="msg-${id}" style="${cardBorder}">
                    <div class="message-header">
                        <div class="message-meta">
                            <div class="message-subject">
                                <span class="material-symbols-outlined">${isReward ? 'workspace_premium' : 'label'}</span> 
                                <span style="${isReward ? 'color: var(--gold); font-weight: 800;' : ''}">${data.subject || 'بدون موضوع'}</span>
                            </div>
                            <div class="message-time">${dateStr}</div>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            ${isReward ? '<span style="background:var(--gold);color:black;padding:0.25rem 0.5rem;border-radius:0.5rem;font-size:0.75rem;font-weight:bold;">طلب مكافأة 🎁</span>' : ''}
                            ${isUnread ? '<span style="background:var(--brand);color:white;padding:0.25rem 0.5rem;border-radius:0.5rem;font-size:0.75rem;font-weight:bold;">جديد</span>' : ''}
                        </div>
                    </div>

                    <div class="customer-info">
                        <div class="info-item" title="اسم العميل">
                            <span class="material-symbols-outlined">person</span>
                            <span>${data.name || 'غير معروف'}</span>
                        </div>
                        <div class="info-item" title="رقم الموبايل">
                            <span class="material-symbols-outlined">phone_iphone</span>
                            <span dir="ltr">${data.phone || 'غير معروف'}</span>
                        </div>
                        ${data.email ? `
                        <div class="info-item" title="البريد الإلكتروني">
                            <span class="material-symbols-outlined">mail</span>
                            <span>${data.email}</span>
                        </div>` : ''}
                    </div>

                    <div class="message-body-box">
                        <div class="message-text">${data.message || 'لا يوجد نص'}</div>
                    </div>

                    <div class="message-actions">
                        <a href="https://wa.me/${waPhone}?text=مرحباً ${data.name || ''}، بخصوص رسالتك (${data.subject || ''}):" target="_blank" class="btn-action btn-whatsapp ripple-btn">
                            <span class="material-symbols-outlined">chat</span> تواصل واتساب
                        </a>
                        ${isUnread ? `
                        <button class="btn-action btn-read ripple-btn" onclick="markAsRead('${id}')">
                            <span class="material-symbols-outlined">done_all</span> مقروءة
                        </button>` : ''}
                        <button class="btn-action btn-delete ripple-btn" onclick="deleteMessage('${id}')">
                            <span class="material-symbols-outlined">delete</span> مسح
                        </button>
                    </div>
                </div>
                `;
            });
            
            messagesContainer.innerHTML = html;
        } catch (error) {
            console.error("Error loading messages: ", error);
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #ff4757;">حدث خطأ في تحميل الرسائل.</div>';
        }
    }

    window.markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, "messages", id), { status: 'read' });
            showToast('تم تحديد الرسالة كمقروءة', 'success');
            document.getElementById(`msg-${id}`).classList.remove('unread');
            const readBtn = document.querySelector(`#msg-${id} .btn-read`);
            if(readBtn) readBtn.remove();
            const tag = document.querySelector(`#msg-${id} .message-header span[style*="var(--gold)"]`);
            if(tag) tag.remove();
        } catch (e) {
            console.error(e);
            showToast('فشل التحديث', 'error');
        }
    };

    window.deleteMessage = async (id) => {
        if (!confirm('هل أنت متأكد من مسح هذه الرسالة نهائياً؟')) return;
        try {
            await deleteDoc(doc(db, "messages", id));
            showToast('تم مسح الرسالة', 'success');
            const card = document.getElementById(`msg-${id}`);
            card.style.transform = 'scale(0.9)';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        } catch (e) {
            console.error(e);
            showToast('فشل المسح', 'error');
        }
    };
});
