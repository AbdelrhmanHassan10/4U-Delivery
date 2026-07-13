import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Navbar Scroll
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => { 
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Intersection Observer for Reveal
const observer = new IntersectionObserver((entries) => { 
    entries.forEach(e => { 
        if (e.isIntersecting) e.target.classList.add('visible');
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Page Transition Curtain Logic
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
            if (href && href !== '#' && !href.startsWith('javascript') && !link.hasAttribute('onclick')) {
                e.preventDefault();
                window.navigateWithCurtain(href);
            }
        });
    });
});

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

// Dynamic background effect based on mouse movement
document.addEventListener('mousemove', (e) => {
    const glows = document.querySelectorAll('.glow-brand, .glow-gold');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    if (glows.length >= 2) {
        glows[0].style.transform = `translate(${x * -30}px, ${y * -30}px)`;
        glows[1].style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    }
});

// Firebase Logic
onAuthStateChanged(auth, async (user) => {
    // Navbar update logic
    const navActions = document.querySelector('.nav-actions');
    
    if (user) {
        if (navActions) {
            navActions.innerHTML = `
                <a href="../_2/profile.html" class="btn-primary ripple-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
                    <span class="material-symbols-outlined">person</span> <span id="nav-user-name">حسابي</span>
                </a>
                <button class="btn-menu ripple-btn"><span class="material-symbols-outlined">menu</span></button>
            `;
        }

        try {
            // Fetch user data from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Update DOM elements
                const name = data.name || "مستخدم 4U";
                document.getElementById('profile-name').textContent = name;
                document.getElementById('profile-email').textContent = data.email || user.email;
                const navUserName = document.getElementById('nav-user-name');
                if(navUserName) navUserName.textContent = name.split(' ')[0];
                document.getElementById('stat-points').textContent = (data.points || 0).toLocaleString('ar-EG');
                document.getElementById('stat-wallet').textContent = (data.wallet || 0).toLocaleString('ar-EG') + " ج.م";
                document.getElementById('stat-tier').textContent = data.tier || "Silver";
                
                // Update Loyalty Card
                document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">${data.tier || "Silver"}</span>`;
                
                const points = data.points || 0;
                let nextTier = "Gold";
                let nextTierPoints = 1000;
                let progressPercent = 0;

                if (points < 1000) {
                    nextTier = "Gold";
                    nextTierPoints = 1000;
                    progressPercent = (points / 1000) * 100;
                    document.getElementById('loyalty-subtitle').textContent = `باقيلك ${1000 - points} نقطة عشان توصل لـ ${nextTier}!`;
                    document.getElementById('loyalty-current-tier').textContent = "Silver (0)";
                    document.getElementById('loyalty-next-tier').textContent = "Gold (1000)";
                } else if (points < 2500) {
                    nextTier = "Platinum";
                    nextTierPoints = 2500;
                    progressPercent = ((points - 1000) / 1500) * 100;
                    document.getElementById('loyalty-subtitle').textContent = `باقيلك ${2500 - points} نقطة عشان توصل لـ ${nextTier}!`;
                    document.getElementById('loyalty-current-tier').textContent = "Gold (1000)";
                    document.getElementById('loyalty-next-tier').textContent = "Platinum (2500)";
                } else {
                    progressPercent = 100;
                    document.getElementById('loyalty-subtitle').textContent = `أنت في أعلى مستوى!`;
                    document.getElementById('loyalty-current-tier').textContent = "Platinum (2500)";
                    document.getElementById('loyalty-next-tier').textContent = "VIP";
                }

                document.getElementById('loyalty-progress-fill').style.width = `${progressPercent}%`;

            } else {
                console.log("No such document!");
                applyFallbacks(user);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Apply fallbacks even if there's an error (like Firestore not being enabled)
            applyFallbacks(user);
        }
    } else {
        // User is signed out, redirect to login page
        window.navigateWithCurtain('../_1/login.html');
    }
});

function applyFallbacks(user) {
    document.getElementById('profile-name').textContent = user.displayName || "مستخدم جديد";
    document.getElementById('profile-email').textContent = user.email || "";
    document.getElementById('stat-points').textContent = "0";
    document.getElementById('stat-wallet').textContent = "0 ج.م";
    document.getElementById('stat-tier').textContent = "New";
    
    document.getElementById('loyalty-title').innerHTML = `عضوية 4U <span class="text-gradient-gold">New</span>`;
    document.getElementById('loyalty-subtitle').textContent = `باقيلك 1000 نقطة عشان توصل لـ Silver!`;
    document.getElementById('loyalty-current-tier').textContent = "New (0)";
    document.getElementById('loyalty-next-tier').textContent = "Silver (1000)";
    document.getElementById('loyalty-progress-fill').style.width = `0%`;
}

// Logout Handler
document.getElementById('btn-logout')?.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.navigateWithCurtain('../_1/login.html');
    }).catch((error) => {
        console.error("Sign Out Error", error);
    });
});
