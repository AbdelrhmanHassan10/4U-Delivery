import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    loadRestaurants();
});

// Image Upload Logic (Logo)
const imgUpload = document.getElementById('res-image-upload');
const imgPreview = document.getElementById('res-image-preview');
let currentBase64Image = '';

imgPreview.addEventListener('click', () => imgUpload.click());

imgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentBase64Image = canvas.toDataURL('image/jpeg', 0.8);
            imgPreview.src = currentBase64Image;
        };
    };
});

// Image Upload Logic (Menu)
const menuUpload = document.getElementById('res-menu-upload');
const menuPreviewContainer = document.getElementById('res-menu-preview-container');
let currentBase64Menus = [];

function processMenuImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Aggressive compression for multiple images to avoid Firestore 1MB limit
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // 0.6 quality for lower size
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

menuUpload.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 20) {
        showToast("لا يمكن رفع أكثر من 20 صورة للمنيو", "error");
        return;
    }

    menuPreviewContainer.innerHTML = '<span style="color:#aaa; font-size: 0.9rem;">جاري معالجة الصور...</span>';
    currentBase64Menus = [];
    
    // Process files sequentially to maintain order and avoid freezing
    for (let i = 0; i < files.length; i++) {
        const base64 = await processMenuImage(files[i]);
        if (base64) {
            currentBase64Menus.push(base64);
        }
    }
    
    // Render previews
    menuPreviewContainer.innerHTML = '';
    currentBase64Menus.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.style.width = '60px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '0.5rem';
        img.style.border = '1px solid rgba(255,255,255,0.2)';
        menuPreviewContainer.appendChild(img);
    });
});

// Category Logic
const addCustomCategoryBtn = document.getElementById('add-custom-category');
const customCategoryInput = document.getElementById('custom-category-input');
const categoryContainer = document.getElementById('res-category-container');

addCustomCategoryBtn.addEventListener('click', () => {
    const val = customCategoryInput.value.trim();
    if (val) {
        const chip = document.createElement('label');
        chip.className = 'chip';
        chip.innerHTML = `<input type="checkbox" value="${val}" class="category-checkbox" checked> ${val}`;
        categoryContainer.insertBefore(chip, customCategoryInput.parentElement);
        customCategoryInput.value = '';
    }
});
customCategoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addCustomCategoryBtn.click();
    }
});

// Add Restaurant
const addForm = document.getElementById('add-res-form');
const btnAdd = document.getElementById('btn-add-res');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('res-name').value;
    
    const checkedCategories = document.querySelectorAll('.category-checkbox:checked');
    const categories = Array.from(checkedCategories).map(cb => cb.value);
    
    if (categories.length === 0) {
        showToast("يرجى اختيار قسم واحد على الأقل!", "error");
        return;
    }

    const rating = parseFloat(document.getElementById('res-rating').value);
    
    if (rating < 1 || rating > 5) {
        showToast("يجب أن يكون التقييم بين 1 و 5", "error");
        return;
    }
    const time = document.getElementById('res-time').value;
    const fee = document.getElementById('res-fee').value;

    if(!currentBase64Image) {
        showToast("يرجى اختيار صورة المطعم!", "error");
        return;
    }

    btnAdd.innerHTML = 'جاري الإضافة...';
    btnAdd.disabled = true;

    try {
        await addDoc(collection(db, "restaurants"), {
            name: name,
            category: categories,
            rating: rating,
            deliveryTime: time,
            deliveryFee: fee,
            image: currentBase64Image,
            menuImages: currentBase64Menus,
            isFeatured: false,
            createdAt: new Date().toISOString()
        });

        showToast("تم إضافة المطعم بنجاح!");
        addForm.reset();
        document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
        imgPreview.src = "";
        currentBase64Image = '';
        menuPreviewContainer.innerHTML = '';
        currentBase64Menus = [];
        
        loadRestaurants(); // Refresh list

    } catch (error) {
        console.error("Error adding restaurant:", error);
        showToast("حدث خطأ أثناء الإضافة", "error");
    }

    btnAdd.innerHTML = 'إضافة المطعم';
    btnAdd.disabled = false;
});

// Load Restaurants
async function loadRestaurants() {
    const listContainer = document.getElementById('restaurant-list-container');
    listContainer.innerHTML = '<div style="text-align: center; width: 100%; grid-column: span 3; color: #aaa;">جاري التحميل...</div>';
    
    try {
        const snap = await getDocs(collection(db, "restaurants"));
        if (snap.empty) {
            listContainer.innerHTML = '<div style="text-align: center; width: 100%; grid-column: span 3; color: #aaa;">لا يوجد مطاعم حتى الآن.</div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            // Use placeholder if no image
            const imgSrc = data.image || 'https://via.placeholder.com/300x150?text=No+Image';
            
            // Format category nicely with spaces so it wraps
            let categoryText = '';
            if (Array.isArray(data.category)) {
                categoryText = data.category.join('، ');
            } else {
                categoryText = data.category || '';
            }

            html += `
                <div class="res-card">
                    <button class="btn-delete" onclick="deleteRestaurant('${doc.id}', '${data.name}')" title="حذف المطعم">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <img src="${imgSrc}" alt="${data.name}">
                    <div class="res-title">${data.name}</div>
                    <div class="res-category" style="line-height: 1.5; word-break: break-word;">${categoryText}</div>
                    <div class="res-info">
                        <span>⭐ ${data.rating}</span>
                        <span>🕒 ${data.deliveryTime}</span>
                        <span>🛵 ${data.deliveryFee}</span>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading restaurants:", error);
        listContainer.innerHTML = '<div style="text-align: center; width: 100%; grid-column: span 3; color: #aaa;">حدث خطأ في جلب البيانات.</div>';
    }
}

// Delete Restaurant
window.deleteRestaurant = async (id, name) => {
    if(!confirm(`هل أنت متأكد أنك تريد حذف مطعم "${name}" نهائياً؟`)) return;
    
    try {
        await deleteDoc(doc(db, "restaurants", id));
        showToast("تم حذف المطعم بنجاح");
        loadRestaurants();
    } catch (error) {
        console.error("Error deleting restaurant:", error);
        showToast("حدث خطأ أثناء الحذف", "error");
    }
};
