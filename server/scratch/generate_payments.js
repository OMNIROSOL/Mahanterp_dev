const fs = require('fs');
const path = require('path');

const viewsDir = path.join('d:', 'erp', 'views');

const filesToProcess = [
  { src: 'ReceiptsView.tsx', dest: 'PaymentsView.tsx' },
  { src: 'NewReceiptView.tsx', dest: 'NewPaymentView.tsx' },
  { src: 'ViewReceiptView.tsx', dest: 'ViewPaymentView.tsx' },
];

const replacements = [
  { search: /Receipts/g, replace: 'Payments' },
  { search: /receipts/g, replace: 'payments' },
  { search: /Receipt/g, replace: 'Payment' },
  { search: /receipt/g, replace: 'payment' },
  { search: /receivedInAccount/g, replace: 'paidFromAccount' },
  { search: /receivedIn/g, replace: 'paidFrom' },
  { search: /Received in/g, replace: 'Paid from' },
  { search: /paidByContact/g, replace: 'paidToContact' },
  { search: /paidBy/g, replace: 'paidTo' },
  { search: /Paid by/g, replace: 'Paid to' },
  { search: /RECEIVED FROM/g, replace: 'PAID TO' },
  { search: /RECEIPT/g, replace: 'PAYMENT' },
];

filesToProcess.forEach(({ src, dest }) => {
  const srcPath = path.join(viewsDir, src);
  const destPath = path.join(viewsDir, dest);
  
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    
    replacements.forEach(({ search, replace }) => {
      content = content.replace(search, replace);
    });
    
    fs.writeFileSync(destPath, content);
    console.log(`Created ${dest}`);
  } else {
    console.log(`Source file ${src} not found`);
  }
});
