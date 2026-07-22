import { db, auth } from "../firebase-config.js";
import { doc, getDoc, collection, getDocs, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../_1/login.html';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                // ONLY 'admin' can access this page
                if (data.isAdmin !== true) {
                    window.location.href = '../_3/home.html';
                } else {
                    document.querySelectorAll('.admin-only-link').forEach(link => {
                        link.style.display = 'flex';
                    });
                }
            } else {
                window.location.href = '../_3/home.html';
            }
        } catch (err) {
            console.error(err);
        }
    });

    // DOM Elements
    const searchResInput = document.getElementById('admin-search-restaurant');
    const customSelectBox = document.getElementById('custom-restaurant-select');
    const customSelectText = document.getElementById('custom-select-text');
    const customSelectIcon = document.getElementById('custom-select-icon');
    const customDropdown = document.getElementById('custom-restaurant-dropdown');
    
    const pointsWalletCard = document.getElementById('admin-points-wallet-card');
    const restaurantPointsDisplay = document.getElementById('restaurant-points-display');
    const currentRestaurantPointsEl = document.getElementById('current-restaurant-points');
    
    const addPointsInput = document.getElementById('admin-add-points-input');
    const addPointsBtn = document.getElementById('admin-add-points-btn');
    const add10PointsBtn = document.getElementById('admin-add-10-points-btn');
    const resetPointsBtn = document.getElementById('admin-reset-points-btn');

    let allRestaurants = [];
    let selectedResDoc = null;

    // Load Restaurants
    const loadRestaurants = async () => {
        try {
            const snap = await getDocs(collection(db, "restaurants"));
            allRestaurants = [];
            snap.forEach(docSnap => {
                allRestaurants.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            renderRestaurants(allRestaurants);
        } catch (err) {
            console.error("Error loading restaurants:", err);
            customDropdown.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--dark-300);">خطأ في التحميل</div>';
        }
    };
    loadRestaurants();

    const renderRestaurants = (list) => {
        if (list.length === 0) {
            customDropdown.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--dark-300);">لم يتم العثور على مطاعم</div>';
            return;
        }
        
        // Sort by points (highest first)
        const sortedList = [...list].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        let html = '';
        sortedList.forEach(res => {
            const currentPoints = res.points || 0;
            html += `<div class="custom-dropdown-item" data-id="${res.id}" style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <span class="dropdown-res-name">${res.name}</span>
                        <span style="color: var(--gold); font-size: 0.8rem; background: rgba(240,192,64,0.1); padding: 0.2rem 0.5rem; border-radius: 0.25rem;">${currentPoints.toLocaleString('ar-EG')} نقطة</span>
                     </div>`;
        });
        customDropdown.innerHTML = html;

        // Add event listeners to items
        document.querySelectorAll('.custom-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const resId = e.target.closest('.custom-dropdown-item').dataset.id;
                const resNameSpan = e.target.closest('.custom-dropdown-item').querySelector('.dropdown-res-name');
                const resName = resNameSpan ? resNameSpan.innerText : e.target.closest('.custom-dropdown-item').innerText;
                
                customSelectText.textContent = resName;
                customSelectText.style.color = "white"; // Highlight selection
                customDropdown.classList.add('hidden');
                customSelectIcon.style.transform = 'rotate(0deg)';
                
                // Reset search box so next time they open the dropdown, all restaurants show
                searchResInput.value = '';
                // renderRestaurants(allRestaurants) will be called when opening dropdown or typing again, 
                // but we can call it here silently to reset the DOM
                setTimeout(() => renderRestaurants(allRestaurants), 300);

                // Trigger selection logic
                handleRestaurantSelection(resId);
            });
            // Add hover effect
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.05)');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        });
    };

    // Toggle dropdown
    customSelectBox.addEventListener('click', () => {
        customDropdown.classList.toggle('hidden');
        if (customDropdown.classList.contains('hidden')) {
            customSelectIcon.style.transform = 'rotate(0deg)';
        } else {
            customSelectIcon.style.transform = 'rotate(180deg)';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            customDropdown.classList.add('hidden');
            customSelectIcon.style.transform = 'rotate(0deg)';
        }
    });

    // Filter Restaurants by Search
    searchResInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        
        // Open dropdown while typing
        customDropdown.classList.remove('hidden');
        customSelectIcon.style.transform = 'rotate(180deg)';

        if (!val) {
            renderRestaurants(allRestaurants);
            return;
        }
        const filtered = allRestaurants.filter(r => r.name && r.name.toLowerCase().includes(val));
        renderRestaurants(filtered);
    });

    // Handle Selection Logic
    const handleRestaurantSelection = (resId) => {
        if (!resId) {
            pointsWalletCard.classList.add('hidden');
            restaurantPointsDisplay.style.display = 'none';
            selectedResDoc = null;
            return;
        }

        selectedResDoc = allRestaurants.find(r => r.id === resId);
        const currentPoints = selectedResDoc.points || 0;
        
        currentRestaurantPointsEl.textContent = currentPoints.toLocaleString('ar-EG');
        pointsWalletCard.classList.remove('hidden');
        restaurantPointsDisplay.style.display = 'block';
    };

    // Add Points Logic
    const processAddPoints = async (pointsToAdd, btnElement, originalText) => {
        if (!selectedResDoc) {
            alert("الرجاء اختيار المطعم أولاً.");
            return;
        }

        if (!pointsToAdd || pointsToAdd === 0) {
            alert("الرجاء إدخال عدد نقاط صحيح.");
            return;
        }

        btnElement.disabled = true;
        btnElement.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> جاري...';

        try {
            const currentPoints = selectedResDoc.points || 0;
            const newPoints = Math.max(0, currentPoints + pointsToAdd); // Prevent negative points if deducting

            // Update Restaurant Doc
            await updateDoc(doc(db, "restaurants", selectedResDoc.id), {
                points: newPoints
            });

            // Update Local State
            selectedResDoc.points = newPoints;
            currentRestaurantPointsEl.textContent = newPoints.toLocaleString('ar-EG');
            
            alert(`تم ${pointsToAdd > 0 ? 'إضافة' : 'خصم'} النقاط بنجاح للمطعم!`, true);
            addPointsInput.value = "";
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء حفظ النقاط.");
        } finally {
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
        }
    };

    addPointsBtn.addEventListener('click', () => {
        const p = parseInt(addPointsInput.value, 10);
        processAddPoints(p, addPointsBtn, 'إضافة العدد المكتوب');
    });

    add10PointsBtn.addEventListener('click', () => {
        processAddPoints(10, add10PointsBtn, '+10 نقاط (سريع)');
    });

    // Custom Confirm Function
    const showConfirm = (msg) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm-modal');
            const msgEl = document.getElementById('custom-confirm-message');
            const btnYes = document.getElementById('custom-confirm-yes');
            const btnNo = document.getElementById('custom-confirm-no');
            
            msgEl.textContent = msg;
            modal.style.display = 'flex'; // Override hidden
            modal.classList.remove('hidden');
            
            const cleanup = () => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
                btnYes.removeEventListener('click', onYes);
                btnNo.removeEventListener('click', onNo);
            };
            
            const onYes = () => { cleanup(); resolve(true); };
            const onNo = () => { cleanup(); resolve(false); };
            
            btnYes.addEventListener('click', onYes);
            btnNo.addEventListener('click', onNo);
        });
    };

    resetPointsBtn.addEventListener('click', async () => {
        if (!selectedResDoc) {
            alert("الرجاء اختيار المطعم أولاً.");
            return;
        }
        
        const confirmed = await showConfirm(`هل أنت متأكد من تصفير (مسح) كل نقاط مطعم ${selectedResDoc.name}؟ لا يمكن التراجع عن هذا الإجراء!`);
        if (!confirmed) {
            return;
        }

        resetPointsBtn.disabled = true;
        const originalText = resetPointsBtn.innerHTML;
        resetPointsBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> جاري...';

        try {
            await updateDoc(doc(db, "restaurants", selectedResDoc.id), {
                points: 0
            });

            selectedResDoc.points = 0;
            currentRestaurantPointsEl.textContent = "0";
            
            // Re-render the dropdown so the 0 points reflects immediately
            renderRestaurants(allRestaurants);
            
            alert(`تم تصفير جميع نقاط المطعم بنجاح!`, true);
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء تصفير النقاط.");
        } finally {
            resetPointsBtn.disabled = false;
            resetPointsBtn.innerHTML = originalText;
        }
    });
});
