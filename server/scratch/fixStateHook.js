const fs = require('fs');
const path = require('path');

const files = [
  'ViewSalesOrderView.tsx',
  'ViewSalesQuoteView.tsx',
  'ViewSalesInvoiceView.tsx'
];

const basePath = path.join(__dirname, '../../views');

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);')) {
    content = content.replace(
      /const \[loading, setLoading\] = useState\(true\);/,
      `const [loading, setLoading] = useState(true);\n    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully fixed state hook in ${file}`);
});
