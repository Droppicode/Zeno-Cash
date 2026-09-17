const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (!filePath.endsWith('.js')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  let changed = false;
  
  // Match borderRadius: NUMBER * z
  content = content.replace(/borderRadius:\s*(\d+)\s*\*\s*z/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    let newNum = 6;
    if (num >= 20) newNum = 8;
    else if (num < 10) newNum = 4;
    changed = true;
    return `borderRadius: ${newNum} * z`;
  });

  // Match borderRadius: NUMBER (without * z)
  content = content.replace(/borderRadius:\s*(\d+)(?![\d\s\*]*z)/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    let newNum = 6;
    if (num >= 20) newNum = 8;
    else if (num < 10) newNum = 4;
    changed = true;
    return `borderRadius: ${newNum}`;
  });
  
  // Match borderTopLeftRadius: NUMBER * z
  content = content.replace(/borderTopLeftRadius:\s*(\d+)\s*\*\s*z/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    let newNum = 6;
    if (num >= 20) newNum = 8;
    else if (num < 10) newNum = 4;
    changed = true;
    return `borderTopLeftRadius: ${newNum} * z`;
  });

  content = content.replace(/borderTopRightRadius:\s*(\d+)\s*\*\s*z/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    let newNum = 6;
    if (num >= 20) newNum = 8;
    else if (num < 10) newNum = 4;
    changed = true;
    return `borderTopRightRadius: ${newNum} * z`;
  });


  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
