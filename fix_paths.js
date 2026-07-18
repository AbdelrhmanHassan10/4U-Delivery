const fs = require('fs');
const filePath = 'd:/projects/4U Delivery/index.html';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\.\.\/_/g, './_');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed paths');
