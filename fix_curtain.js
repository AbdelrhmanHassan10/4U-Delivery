const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const files = [
    '_1/login.js',
    '_2/profile.js',
    '_3/home.js',
    '_4/res.js',
    '_5/About.js',
    '_6/stamps.js',
    '_7/legal.js'
];

const injectionCode = `
// ==========================================
// Curtain and Bfcache Fix
// ==========================================
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const curtain = document.querySelector('.page-transition-curtain');
        if (curtain) {
            curtain.classList.remove('wipe-in');
            curtain.style.transform = 'scaleY(0)'; // Force hide
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain && !curtain.innerHTML.trim()) {
        curtain.innerHTML = \`
            <div class="curtain-logo">
                <div class="nav-brand-icon" style="width:70px;height:70px;border-radius:1.2rem;background:#fff;color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:900;box-shadow:0 10px 25px rgba(0,0,0,0.2);">4U</div>
                <span style="font-size:3rem;font-weight:900;color:#fff;text-shadow:0 4px 10px rgba(0,0,0,0.3);">Delivery</span>
            </div>
        \`;
        
        curtain.style.display = 'flex';
        curtain.style.alignItems = 'center';
        curtain.style.justifyContent = 'center';
        curtain.style.zIndex = '99999';
        
        if (!document.getElementById('curtain-style')) {
            const style = document.createElement('style');
            style.id = 'curtain-style';
            style.textContent = \`
                .page-transition-curtain {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .curtain-logo {
                    display: flex;
                    align-items: center;
                    gap: 1.2rem;
                    opacity: 0;
                    transform: scale(0.5);
                    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .page-transition-curtain.wipe-in .curtain-logo {
                    opacity: 1;
                    transform: scale(1);
                    transition-delay: 0.3s;
                }
            \`;
            document.head.appendChild(style);
        }
    }
});

// Ensure navigateWithCurtain is globally accessible
window.navigateWithCurtain = function(url) {
    const curtain = document.querySelector('.page-transition-curtain');
    if (curtain) {
        curtain.style.transform = ''; // Clear forced hide
        curtain.classList.remove('wipe-out');
        curtain.classList.add('wipe-in');
        setTimeout(() => {
            window.location.href = url;
        }, 800);
    } else {
        window.location.href = url;
    }
};
// ==========================================
`;

files.forEach(file => {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove old navigateWithCurtain if exists
        content = content.replace(/function navigateWithCurtain\(url\) \{[\s\S]*?\}\s*else\s*\{\s*window\.location\.href = url;\s*\}\s*\}/g, '');
        content = content.replace(/window\.navigateWithCurtain = function\(url\) \{[\s\S]*?\}\s*else\s*\{\s*window\.location\.href = url;\s*\}\s*\};/g, '');
        
        content += '\\n' + injectionCode;
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + file);
    }
});

// Also update index.html which has inline scripts
const indexPath = path.join(projectDir, 'index.html');
if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    content = content.replace(/function navigateWithCurtain\(url\) \{[\s\S]*?\}\s*else\s*\{\s*window\.location\.href = url;\s*\}\s*\}/g, '');
    content = content.replace(/window\.navigateWithCurtain = function\(url\) \{[\s\S]*?\}\s*else\s*\{\s*window\.location\.href = url;\s*\}\s*\};/g, '');
    content = content.replace(/<script>/g, '<script>\\n' + injectionCode);
    fs.writeFileSync(indexPath, content);
    console.log('Updated index.html');
}
