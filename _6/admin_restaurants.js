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

    // Load data after passing auth check
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

// Rewards Logic
const rewardsContainer = document.getElementById('rewards-container');
const addRewardBtn = document.getElementById('add-reward-btn');

function createRewardRow(points = '', desc = '', icon = 'local_offer') {
    const row = document.createElement('div');
    row.className = 'reward-row';
    row.style = 'display: flex; gap: 0.5rem; align-items: center; background: rgba(255,255,255,0.02); padding: 0.5rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap;';
    row.innerHTML = `
        <div style="flex: 1; min-width: 80px;">
            <input type="number" class="reward-points input-control" placeholder="النقاط (مثال: 300)" value="${points}" style="padding: 0.5rem; height: 35px; border-radius: 0.5rem; font-size: 0.9rem;" required>
        </div>
        <div style="flex: 2; min-width: 150px;">
            <input type="text" class="reward-desc input-control" placeholder="وصف الجائزة (مثال: خصم 50%)" value="${desc}" style="padding: 0.5rem; height: 35px; border-radius: 0.5rem; font-size: 0.9rem;" required>
        </div>
        <div style="flex: 1; min-width: 120px;">
            <select class="reward-icon input-control" style="padding: 0.5rem; height: 35px; border-radius: 0.5rem; font-size: 0.9rem;">
                <option value="local_offer" ${icon === 'local_offer' ? 'selected' : ''}>خصم (تيكيت)</option>
                <option value="local_shipping" ${icon === 'local_shipping' ? 'selected' : ''}>توصيل (موتوسيكل)</option>
                <option value="inventory_2" ${icon === 'inventory_2' ? 'selected' : ''}>صندوق (بوكس)</option>
                <option value="fastfood" ${icon === 'fastfood' ? 'selected' : ''}>وجبة (برجر)</option>
                <option value="redeem" ${icon === 'redeem' ? 'selected' : ''}>هدية (صندوق)</option>
                <option value="star" ${icon === 'star' ? 'selected' : ''}>نجمة</option>
            </select>
        </div>
        <button type="button" class="btn-remove-reward" style="background: rgba(200, 16, 46, 0.2); color: #ff4d4d; border: none; width: 35px; height: 35px; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
        </button>
    `;
    row.querySelector('.btn-remove-reward').addEventListener('click', () => row.remove());
    if(rewardsContainer) rewardsContainer.appendChild(row);
}

if(addRewardBtn) {
    addRewardBtn.addEventListener('click', () => createRewardRow());
}

// Add Restaurant
const addForm = document.getElementById('add-res-form');
const btnAdd = document.getElementById('btn-add-res');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const editId = document.getElementById('edit-res-id').value;
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

    // Collect Rewards
    const rewardRows = document.querySelectorAll('.reward-row');
    const rewards = [];
    rewardRows.forEach(row => {
        const p = row.querySelector('.reward-points').value;
        const d = row.querySelector('.reward-desc').value.trim();
        const i = row.querySelector('.reward-icon').value;
        if(p && d) {
            rewards.push({ points: parseInt(p), description: d, icon: i });
        }
    });

    btnAdd.innerHTML = 'جاري الإضافة...';
    btnAdd.disabled = true;

    try {
        if (editId) {
            const updateData = {
                name: name,
                category: categories,
                rating: rating,
                deliveryTime: time,
                deliveryFee: fee,
                rewards: rewards
            };
            if (currentBase64Image) updateData.image = currentBase64Image;
            if (currentBase64Menus && currentBase64Menus.length > 0) updateData.menuImages = currentBase64Menus;

            await updateDoc(doc(db, "restaurants", editId), updateData);
            showToast("تم تعديل المطعم بنجاح!");
            
            document.getElementById('edit-res-id').value = '';
            document.querySelector('.admin-page-title').textContent = "إضافة مطعم جديد";
            document.querySelector('.admin-page-desc').textContent = "قم بإدخال بيانات المطعم وصورته لإضافته فوراً في التطبيق للعملاء.";
        } else {
            if(!currentBase64Image) {
                btnAdd.innerHTML = 'إضافة المطعم';
                btnAdd.disabled = false;
                showToast("يرجى اختيار صورة المطعم!", "error");
                return;
            }
            await addDoc(collection(db, "restaurants"), {
                name: name,
                category: categories,
                rating: rating,
                deliveryTime: time,
                deliveryFee: fee,
                image: currentBase64Image,
                menuImages: currentBase64Menus,
                rewards: rewards,
                isFeatured: false,
                createdAt: new Date().toISOString()
            });
            showToast("تم إضافة المطعم بنجاح!");
        }

        addForm.reset();
        document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
        imgPreview.src = "";
        currentBase64Image = '';
        menuPreviewContainer.innerHTML = '';
        currentBase64Menus = [];
        if(rewardsContainer) rewardsContainer.innerHTML = '';
        
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
                    <div style="position: absolute; top: 1rem; left: 1rem; display: flex; gap: 0.5rem; z-index: 10;">
                        <button class="btn-action edit" onclick="editRestaurant('${doc.id}')" title="تعديل المطعم" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(5px); transition: 0.3s;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span>
                        </button>
                        <button class="btn-action delete" onclick="deleteRestaurant('${doc.id}', '${data.name}')" title="حذف المطعم" style="background: rgba(200, 16, 46, 0.8); border: none; color: #fff; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(5px); transition: 0.3s;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                        </button>
                    </div>
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
        if (document.getElementById('edit-res-id').value === id) {
            document.getElementById('add-res-form').reset();
            document.getElementById('edit-res-id').value = '';
            document.querySelector('.admin-page-title').textContent = "إضافة مطعم جديد";
            const btnAdd = document.getElementById('btn-add-res');
            btnAdd.innerHTML = 'إضافة المطعم';
            currentBase64Image = '';
            imgPreview.src = '';
            if(rewardsContainer) rewardsContainer.innerHTML = '';
        }
        showToast("تم حذف المطعم بنجاح");
        loadRestaurants();
    } catch (error) {
        console.error("Error deleting restaurant:", error);
        showToast("حدث خطأ أثناء الحذف", "error");
    }
};

// Edit Restaurant
window.editRestaurant = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "restaurants", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('edit-res-id').value = id;
            document.getElementById('res-name').value = data.name;
            document.getElementById('res-rating').value = data.rating;
            document.getElementById('res-time').value = data.deliveryTime;
            document.getElementById('res-fee').value = data.deliveryFee;
            
            // Handle image preview
            if (data.image) {
                currentBase64Image = data.image;
                document.getElementById('res-image-preview').src = data.image;
            } else {
                currentBase64Image = '';
                document.getElementById('res-image-preview').src = '';
            }

            // Handle menus preview
            if (data.menuImages) {
                currentBase64Menus = data.menuImages;
                const menuPreviewContainer = document.getElementById('res-menu-preview-container');
                menuPreviewContainer.innerHTML = '';
                data.menuImages.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.style.width = '60px';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '0.5rem';
                    img.style.border = '1px solid rgba(255,255,255,0.2)';
                    menuPreviewContainer.appendChild(img);
                });
            }

            // Handle categories
            document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
            if (data.category && Array.isArray(data.category)) {
                data.category.forEach(cat => {
                    const checkbox = document.querySelector(`.category-checkbox[value="${cat}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    } else {
                        // Create new chip for custom category
                        const chip = document.createElement('label');
                        chip.className = 'chip';
                        chip.innerHTML = `<input type="checkbox" value="${cat}" class="category-checkbox" checked> ${cat}`;
                        const customInput = document.getElementById('custom-category-input');
                        document.getElementById('res-category-container').insertBefore(chip, customInput.parentElement);
                    }
                });
            }

            // Handle rewards
            if(rewardsContainer) {
                rewardsContainer.innerHTML = '';
                if(data.rewards && Array.isArray(data.rewards)) {
                    data.rewards.forEach(r => {
                        createRewardRow(r.points, r.description, r.icon);
                    });
                }
            }

            document.querySelector('.admin-page-title').textContent = "تعديل بيانات المطعم";
            document.querySelector('.admin-page-desc').textContent = "تعديل البيانات واضغط حفظ.";
            const btnAdd = document.getElementById('btn-add-res');
            btnAdd.innerHTML = '<span class="material-symbols-outlined">save</span> حفظ التعديلات';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const adminMain = document.querySelector('.admin-main');
            if (adminMain) {
                adminMain.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    } catch(err) {
        console.error(err);
        showToast("خطأ في جلب بيانات المطعم", "error");
    }
}
