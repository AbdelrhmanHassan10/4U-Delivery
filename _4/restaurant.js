import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ripple Effect Logic
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

// State
let currentRestaurant = null;
let currentMenuImages = [];
let currentViewerIndex = 0;
let currentUser = null;

// Auth Check
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // Pre-fill phone if available from previous sessions or user profile if we fetched it
    }
});

// Load Restaurant Data
async function loadRestaurantDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const resId = urlParams.get('id');
    
    if (!resId) {
        window.location.href = '../_4/res.html';
        return;
    }

    try {
        const docRef = doc(db, "restaurants", resId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            currentRestaurant = { id: docSnap.id, ...docSnap.data() };
            renderRestaurantData();
        } else {
            showToast("المطعم غير موجود", "error");
            setTimeout(() => window.location.href = '../_4/res.html', 1500);
        }
    } catch (error) {
        console.error("Error loading restaurant:", error);
        showToast("حدث خطأ أثناء تحميل البيانات", "error");
    }
}

function renderRestaurantData() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('restaurant-content').classList.remove('hidden');

    const res = currentRestaurant;
    
    // Header Info
    document.getElementById('res-cover-img').style.backgroundImage = `url('${res.image}')`;
    document.getElementById('res-name').textContent = res.name;
    document.getElementById('res-rating').textContent = res.rating || 'N/A';
    document.getElementById('res-time').textContent = res.deliveryTime || 'غير محدد';
    document.getElementById('res-fee').textContent = res.deliveryFee === 'مجاني' ? 'توصيل مجاني' : `${res.deliveryFee} توصيل`;
    if (res.deliveryFee !== 'مجاني') {
        document.getElementById('res-fee-container').classList.remove('text-success');
    }

    let categoryText = '';
    if (Array.isArray(res.category)) {
        categoryText = res.category.join('، ');
    } else {
        categoryText = res.category || res.desc || 'مطعم';
    }
    document.getElementById('res-category').textContent = categoryText;

    // Menu Images
    const galleryContainer = document.getElementById('menu-gallery');
    const noMenuMsg = document.getElementById('no-menu-msg');
    
    if (res.menuImages && res.menuImages.length > 0) {
        currentMenuImages = res.menuImages;
        let html = '';
        res.menuImages.forEach((imgSrc, index) => {
            html += `
                <div class="menu-img-item" onclick="openImageViewer(${index})">
                    <img src="${imgSrc}" loading="lazy" alt="Menu Page ${index + 1}">
                    <div class="menu-img-overlay">
                        <span class="material-symbols-outlined">zoom_in</span>
                    </div>
                </div>
            `;
        });
        galleryContainer.innerHTML = html;
        noMenuMsg.classList.add('hidden');
    } else {
        galleryContainer.innerHTML = '';
        noMenuMsg.classList.remove('hidden');
    }
}

// Image Viewer Logic
const viewerModal = document.getElementById('image-viewer-modal');
const viewerImg = document.getElementById('viewer-img');
const viewerCounter = document.getElementById('viewer-counter');

window.openImageViewer = function(index) {
    if (currentMenuImages.length === 0) return;
    currentViewerIndex = index;
    updateViewer();
    viewerModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

document.getElementById('btn-close-viewer').addEventListener('click', () => {
    viewerModal.classList.add('hidden');
    document.body.style.overflow = '';
});

document.getElementById('btn-viewer-next').addEventListener('click', () => {
    if (currentViewerIndex < currentMenuImages.length - 1) {
        currentViewerIndex++;
        updateViewer();
    }
});

document.getElementById('btn-viewer-prev').addEventListener('click', () => {
    if (currentViewerIndex > 0) {
        currentViewerIndex--;
        updateViewer();
    }
});

function updateViewer() {
    viewerImg.src = currentMenuImages[currentViewerIndex];
    viewerCounter.textContent = `${currentViewerIndex + 1} / ${currentMenuImages.length}`;
}

// Order Form Logic
const orderModal = document.getElementById('order-modal');

document.getElementById('btn-open-order').addEventListener('click', () => {
    if (!currentUser) {
        showToast("يرجى تسجيل الدخول للطلب", "error");
        setTimeout(() => window.location.href = '../_1/login.html', 1500);
        return;
    }
    orderModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
});

document.getElementById('btn-close-order').addEventListener('click', () => {
    orderModal.classList.add('hidden');
    document.body.style.overflow = '';
});

const orderForm = document.getElementById('order-form');
const btnSubmitOrder = document.getElementById('btn-submit-order');

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !currentRestaurant) return;

    const details = document.getElementById('order-details').value.trim();
    const address = document.getElementById('order-address').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const notes = document.getElementById('order-notes').value.trim();

    if (!details || !address || !phone) {
        showToast("يرجى إكمال جميع الحقول المطلوبة", "error");
        return;
    }

    btnSubmitOrder.innerHTML = 'جاري إرسال الطلب...';
    btnSubmitOrder.disabled = true;

    try {
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            restaurantId: currentRestaurant.id,
            restaurantName: currentRestaurant.name,
            details: details,
            address: address,
            phone: phone,
            notes: notes,
            status: 'pending', // pending, on_the_way, delivered
            createdAt: new Date().toISOString()
        });

        showToast("تم استلام طلبك بنجاح! جاري التجهيز", "success");
        orderForm.reset();
        orderModal.classList.add('hidden');
        document.body.style.overflow = '';
        
    } catch (error) {
        console.error("Error submitting order:", error);
        showToast("حدث خطأ أثناء إرسال الطلب", "error");
    }

    btnSubmitOrder.innerHTML = 'تأكيد الطلب';
    btnSubmitOrder.disabled = false;
});

document.addEventListener('DOMContentLoaded', () => {
    loadRestaurantDetails();
});
