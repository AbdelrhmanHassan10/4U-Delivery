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

    await loadRestaurantsForFilter();
    loadOrders();
});

const statusMap = {
    'pending': { text: 'قيد المراجعة', class: 'status-pending', icon: 'pending_actions' },
    'on_the_way': { text: 'جاري التوصيل', class: 'status-on_the_way', icon: 'local_shipping' },
    'delivered': { text: 'مكتمل', class: 'status-delivered', icon: 'check_circle' }
};

let allOrders = [];

async function loadRestaurantsForFilter() {
    try {
        const resSnap = await getDocs(collection(db, "restaurants"));
        const resSelect = document.getElementById('filter-restaurant');
        if (!resSelect) return;
        
        const currentVal = resSelect.value;
        let html = '<option value="all">كل المطاعم</option>';
        
        const resNames = [];
        resSnap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                resNames.push(data.name);
                html += `<option value="${data.name}">${data.name}</option>`;
            }
        });
        
        resSelect.innerHTML = html;
        if (resNames.includes(currentVal)) {
            resSelect.value = currentVal;
        }
    } catch (e) {
        console.error("Error loading restaurants list:", e);
    }
}

async function loadOrders() {
    const listContainer = document.getElementById('orders-list-container');
    listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">جاري تحميل الطلبات...</div>';
    
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        allOrders = [];
        const userIds = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allOrders.push(data);
            if (data.userId && !data.customerName) {
                userIds.add(data.userId);
            }
        });

        // Fetch missing users info for backwards compatibility
        if (userIds.size > 0) {
            const userPromises = Array.from(userIds).map(uid => getDoc(doc(db, "users", uid)));
            const userSnaps = await Promise.all(userPromises);
            const usersMap = {};
            userSnaps.forEach(uSnap => {
                if (uSnap.exists()) {
                    usersMap[uSnap.id] = uSnap.data();
                }
            });
            
            allOrders.forEach(order => {
                if (order.userId && !order.customerName && usersMap[order.userId]) {
                    order.customerName = usersMap[order.userId].name;
                    order.customerEmail = usersMap[order.userId].email;
                }
            });
        }

        renderOrders();
        
    } catch (error) {
        console.error("Error loading orders:", error);
        listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">حدث خطأ في جلب البيانات. يرجى مراجعة الـ Console.</div>';
    }
}

function renderOrders() {
    const listContainer = document.getElementById('orders-list-container');
    
    const searchTerm = (document.getElementById('filter-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-status')?.value || 'all';
    const dateFilter = document.getElementById('filter-date')?.value || 'all';
    const resFilter = document.getElementById('filter-restaurant')?.value || 'all';

    let filtered = allOrders.filter(order => {
        // Search Filter
        const matchSearch = (order.phone || '').toLowerCase().includes(searchTerm) || 
                            order.id.toLowerCase().includes(searchTerm) ||
                            (order.restaurantName || '').toLowerCase().includes(searchTerm) ||
                            (order.address || '').toLowerCase().includes(searchTerm);
        if (!matchSearch && searchTerm !== '') return false;

        // Status Filter
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;

        // Restaurant Filter
        if (resFilter !== 'all' && order.restaurantName !== resFilter) return false;

        // Date Filter
        if (dateFilter !== 'all' && order.createdAt) {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            const diffTime = Math.abs(now - orderDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (dateFilter === 'today') {
                if (orderDate.toDateString() !== now.toDateString()) return false;
            } else if (dateFilter === 'yesterday') {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                if (orderDate.toDateString() !== yesterday.toDateString()) return false;
            } else if (dateFilter === 'week') {
                if (diffDays > 7) return false;
            }
        }

        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #aaa;">لا توجد طلبات تطابق الفلتر أو البحث.</div>';
        return;
    }

    let html = '';
    filtered.forEach(data => {
        const date = new Date(data.createdAt);
        const formattedDate = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG');
        const currentStatus = statusMap[data.status] || statusMap['pending'];

        html += `
            <div class="order-card" id="order-${data.id}">
                <div class="order-header">
                    <div class="order-meta">
                        <span class="res-name"><span class="material-symbols-outlined">restaurant</span> ${data.restaurantName || 'مطعم غير معروف'}</span>
                        <span class="order-id">#${data.id.substring(0,8).toUpperCase()}</span>
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
                        <span class="material-symbols-outlined">person</span>
                        <span>${data.customerName || 'عميل مسجل'}</span>
                    </div>
                    ${data.customerEmail ? `
                    <div class="info-item">
                        <span class="material-symbols-outlined">mail</span>
                        <span style="direction: ltr; text-align: right; unicode-bidi: embed;">${data.customerEmail}</span>
                    </div>` : ''}
                    <div class="info-item">
                        <span class="material-symbols-outlined">location_on</span>
                        <span>${data.address}</span>
                    </div>
                    <div class="info-item">
                        <span class="material-symbols-outlined">call</span>
                        <span style="direction: ltr; text-align: right; unicode-bidi: embed;">${data.phone}</span>
                    </div>
                </div>

                <div class="order-actions">
                    <button onclick="updateOrderStatus('${data.id}', 'pending')" class="btn-status btn-pending ${data.status === 'pending' ? 'hidden' : ''}">قيد المراجعة</button>
                    <button onclick="updateOrderStatus('${data.id}', 'on_the_way')" class="btn-status btn-on_the_way ${data.status === 'on_the_way' ? 'hidden' : ''}">جاري التوصيل</button>
                    <button onclick="updateOrderStatus('${data.id}', 'delivered')" class="btn-status btn-delivered ${data.status === 'delivered' ? 'hidden' : ''}">تحديد كمكتمل</button>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

// Attach filter events
document.getElementById('filter-search')?.addEventListener('input', renderOrders);
document.getElementById('filter-status')?.addEventListener('change', renderOrders);
document.getElementById('filter-date')?.addEventListener('change', renderOrders);
document.getElementById('filter-restaurant')?.addEventListener('change', renderOrders);

document.getElementById('btn-refresh').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('spinning');
    await loadOrders();
    btn.classList.remove('spinning');
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
