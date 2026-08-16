const fs = require('fs');
const path = require('path');

const files = [
  'ViewPurchaseQuoteView.tsx',
  'ViewPurchaseInvoiceView.tsx',
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

  // Add imports
  if (!content.includes('import EmailComposerModal')) {
    content = content.replace(
      /import\s+(?:\{\s*apiService\s*\}|apiService)\s+from\s+'\.\.\/services\/apiService';/,
      `$& \nimport EmailComposerModal from '../components/shared/EmailComposerModal';`
    );
  }

  // Add state
  if (!content.includes('isEmailModalOpen')) {
    // Try to match isLoading or loading
    content = content.replace(
      /const\s+\[(isLoading|loading),\s+set(IsLoading|Loading)\]\s+=\s+useState\(true\);/,
      `$&\n    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully fixed ${file}`);
});
