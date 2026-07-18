import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Toast Notification
window.showToast = function(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
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
    } catch (e) {
        window.location.href = '../_3/home.html';
        return;
    }

    loadOrders();
});

const statusMap = {
    'pending': { text: 'قيد المراجعة', class: 'status-pending', icon: 'pending_actions' },
    'on_the_way': { text: 'جاري التوصيل', class: 'status-on_the_way', icon: 'local_shipping' },
    'delivered': { text: 'مكتمل', class: 'status-delivered', icon: 'check_circle' }
};

async function loadOrders() {
    const listContainer = document.getElementById('orders-list-container');
    listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">جاري تحميل الطلبات...</div>';
    
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">لا يوجد طلبات حتى الآن.</div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.createdAt);
            const formattedDate = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG');
            const currentStatus = statusMap[data.status] || statusMap['pending'];

            html += `
                <div class="order-card" id="order-${doc.id}">
                    <div class="order-header">
                        <div class="order-meta">
                            <span class="res-name"><span class="material-symbols-outlined">restaurant</span> ${data.restaurantName || 'مطعم غير معروف'}</span>
                            <span class="order-id">#${doc.id.substring(0,8).toUpperCase()}</span>
                            <span class="order-time"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle;">schedule</span> ${formattedDate}</span>
                        </div>
                        <div class="order-status ${currentStatus.class}">
                            <span class="material-symbols-outlined">${currentStatus.icon}</span>
                            ${currentStatus.text}
                        </div>
                    </div>
                    
                    <div class="order-details-box">
                        <div class="order-details-text">${data.details}</div>
                        ${data.notes ? `<div style="margin-top: 0.5rem; color: var(--gold); font-size: 0.9rem;"><strong>ملاحظات:</strong> ${data.notes}</div>` : ''}
                    </div>

                    <div class="customer-info">
                        <div class="info-item">
                            <span class="material-symbols-outlined">location_on</span>
                            <span>${data.address}</span>
                        </div>
                        <div class="info-item">
                            <span class="material-symbols-outlined">call</span>
                            <span dir="ltr">${data.phone}</span>
                        </div>
                    </div>

                    <div class="order-actions">
                        <button onclick="updateOrderStatus('${doc.id}', 'pending')" class="btn-status btn-pending ${data.status === 'pending' ? 'hidden' : ''}">قيد المراجعة</button>
                        <button onclick="updateOrderStatus('${doc.id}', 'on_the_way')" class="btn-status btn-on_the_way ${data.status === 'on_the_way' ? 'hidden' : ''}">جاري التوصيل</button>
                        <button onclick="updateOrderStatus('${doc.id}', 'delivered')" class="btn-status btn-delivered ${data.status === 'delivered' ? 'hidden' : ''}">تحديد كمكتمل</button>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading orders:", error);
        listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">حدث خطأ في جلب البيانات. قد يكون الفهرس (Index) قيد الإنشاء في Firebase. يرجى مراجعة الـ Console.</div>';
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => {
    loadOrders();
});

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            status: newStatus
        });
        showToast("تم تحديث حالة الطلب بنجاح");
        loadOrders(); // Refresh to reflect UI changes
    } catch (error) {
        console.error("Error updating status:", error);
        showToast("حدث خطأ أثناء تحديث الحالة", "error");
    }
};
