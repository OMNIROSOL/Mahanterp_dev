const fs = require('fs');
const content = fs.readFileSync('server/index_old.ts', 'utf8');
const search = 'const totalDiscount = (inv.items || []).reduce((sum, item) => sum + (parseFloat(item.discount as string) || 0), 0);';
const replacement = `const totalDiscount = (inv.items || []).reduce((sum, item) => {
        const lineExTax = (Number(item.qty) * Number(item.unitPrice)) || 0;
        const discountVal = parseFloat(item.discount as string) || 0;
        const discountAmount = lineExTax * (discountVal / 100);
        return sum + discountAmount;
      }, 0);`;

const newContent = content.replace(search, replacement);
fs.writeFileSync('server/index.ts', newContent);
console.log('Successfully wrote server/index.ts');
