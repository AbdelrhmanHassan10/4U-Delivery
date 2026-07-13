// stamps.js

// ═════ PAGE TRANSITION CURTAIN ═════
window.navigateWithCurtain = function(url) {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain) {
        curtain.classList.remove('wipe-out');
        curtain.classList.add('wipe-in');
        setTimeout(() => {
            window.location.href = url;
        }, 800);
    } else {
        window.location.href = url;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Allow target="_blank" to open normally, and don't hijack javascript: links
            if (href && href !== '#' && !href.startsWith('javascript') && !link.hasAttribute('onclick') && link.getAttribute('target') !== '_blank') {
                e.preventDefault();
                window.navigateWithCurtain(href);
            }
        });
    });
});

// ═════ RIPPLE EFFECT ═════
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

// ═════ STAMP CARD LOGIC ═════
const initStampCard = () => {
    const brandNameEl = document.getElementById('brand-name');
    if (!brandNameEl) return; // Not on stamp card page

    const urlParams = new URLSearchParams(window.location.search);
    const brandName = urlParams.get('brand') || 'Dots';
    const stampsCount = parseInt(urlParams.get('stamps') || '0', 10);
    
    // Update text
    brandNameEl.textContent = brandName;
    const watermark = document.getElementById('brand-watermark');
    if(watermark) watermark.textContent = brandName;
    
    // Activate stamps
    const circles = document.querySelectorAll('.stamp-circle');
    circles.forEach(circle => {
        const index = parseInt(circle.getAttribute('data-index'), 10);
        if (index <= stampsCount) {
            circle.classList.add('active');
            
            // If it's the golden prize stamp
            if(index === 10) {
                // It already has the redeem icon inside, but we can change its color if needed
            } else {
                // Regular stamp checkmark
                circle.innerHTML = '<span class="material-symbols-outlined">verified</span>';
            }
        }
    });
};

// ═════ ADMIN DASHBOARD LOGIC ═════
const initAdminPanel = () => {
    const adminSelect = document.getElementById('admin-restaurant-select');
    if (!adminSelect) return; // Not on admin page

    const currentStampsEl = document.getElementById('admin-current-stamps');
    const remainingStampsEl = document.getElementById('admin-remaining-stamps');
    const iframeEl = document.getElementById('admin-live-preview-iframe');
    const fullScreenLink = document.getElementById('admin-full-screen-link');
    const btnAddStamp = document.getElementById('btn-add-stamp-action');

    // Simulated data store for the UI
    let currentStamps = 4;
    let selectedBrand = adminSelect.value;

    const updateAdminUI = () => {
        currentStampsEl.textContent = ArabicNumbers(currentStamps);
        remainingStampsEl.textContent = ArabicNumbers(10 - currentStamps);
        
        const url = `../_6/stamp_card.html?brand=${selectedBrand}&stamps=${currentStamps}`;
        iframeEl.src = url;
        fullScreenLink.href = url;
    };

    // Helper to convert to Arabic numerals for display
    const ArabicNumbers = (num) => {
        const arabicMap = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        return String(num).split('').map(digit => arabicMap[digit] || digit).join('');
    };

    adminSelect.addEventListener('change', (e) => {
        selectedBrand = e.target.value;
        // Simulate fetching data for this brand... let's just pick a random number between 0 and 9
        currentStamps = Math.floor(Math.random() * 8) + 1;
        updateAdminUI();
    });

    btnAddStamp.addEventListener('click', () => {
        if (currentStamps < 10) {
            currentStamps++;
            updateAdminUI();
            alert(`تم إضافة الختم بنجاح! إجمالي الأختام الآن: ${currentStamps}`);
        } else {
            alert('العميل أكمل كارت الأختام بالفعل (10/10)!');
        }
    });

    // Initial render
    updateAdminUI();
};

// Initialize the specific page logic
document.addEventListener('DOMContentLoaded', () => {
    initStampCard();
    initAdminPanel();
});
