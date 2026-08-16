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
  if (!content.includes('EmailComposerModal')) {
    content = content.replace(
      /import apiService from '\.\.\/services\/apiService';/,
      `import apiService from '../services/apiService';\nimport EmailComposerModal from '../components/shared/EmailComposerModal';`
    );
  }

  // Add state
  if (!content.includes('isEmailModalOpen')) {
    content = content.replace(
      /const \[isLoading, setIsLoading\] = useState\(true\);/,
      `const [isLoading, setIsLoading] = useState(true);\n    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);`
    );
  }

  // Extract variables depending on the view
  let docRef = '';
  let emailVar = '';
  let nameVar = '';
  let docId = '';
  let defaultSubject = '';
  
  if (file.includes('PurchaseQuote')) {
    docRef = 'quote.reference';
    emailVar = 'supplierEmail';
    nameVar = 'quote.supplier'; 
    docId = 'purchase-quote-document';
    defaultSubject = 'Purchase Enquiry';
  } else if (file.includes('PurchaseInvoice')) {
    docRef = 'invoice.reference';
    emailVar = 'supplierEmail';
    nameVar = 'invoice.supplier';
    docId = 'purchase-invoice-document';
    defaultSubject = 'Purchase Invoice';
  } else if (file.includes('SalesOrder')) {
    docRef = 'order.reference';
    emailVar = 'customerEmail';
    nameVar = 'order.customer';
    docId = 'sales-order-document';
    defaultSubject = 'Sales Order';
  } else if (file.includes('SalesQuote')) {
    docRef = 'quote.reference';
    emailVar = 'customerEmail';
    nameVar = 'quote.customer';
    docId = 'sales-quote-document';
    defaultSubject = 'Sales Quotation';
  } else if (file.includes('SalesInvoice')) {
    docRef = 'invoice.reference';
    emailVar = 'customerEmail';
    nameVar = 'invoice.customer';
    docId = 'sales-invoice-document';
    defaultSubject = 'Sales Invoice';
  }

  const mailtoIndex = content.indexOf('mailto:');
  if (mailtoIndex === -1) {
      console.log(`mailto: not found in ${file}`);
      return;
  }

  const buttonStart = content.lastIndexOf('<button', mailtoIndex);
  let buttonEnd = content.indexOf('</button>', mailtoIndex);
  if (buttonStart === -1 || buttonEnd === -1) {
      console.log(`Button boundaries not found in ${file}`);
      return;
  }
  
  // Also include the </div></div> after the button
  const div1 = content.indexOf('</div>', buttonEnd + 9);
  const div2 = content.indexOf('</div>', div1 + 6);
  if (div1 === -1 || div2 === -1) {
      console.log(`Div boundaries not found in ${file}`);
      return;
  }

  const chunkToReplace = content.substring(buttonStart, div2 + 6);

  const replacement = `<button
                            onClick={() => setIsEmailModalOpen(true)}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Mail size={14} /> Email
                        </button>
                    </div>
                </div>

                <EmailComposerModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    defaultTo={${emailVar} || ''}
                    defaultSubject={\`${defaultSubject}: \${${docRef}}\`}
                    defaultBody={\`Dear \${typeof ${nameVar} === 'string' ? ${nameVar} : ${nameVar}?.name || 'Customer/Supplier' },\\n\\nPlease find attached our ${defaultSubject.toLowerCase()} \${${docRef}}.\\n\\nKind regards.\`}
                    attachmentName={\`\${${docRef} || 'Document'}.pdf\`}
                    onSend={async (emailData) => {
                        try {
                            const element = document.getElementById('${docId}');
                            if (!element) throw new Error('Document element not found');

                            const originalStyle = element.getAttribute('style') || '';
                            const clonedElement = element.cloneNode(true) as HTMLElement;
                            const container = document.createElement('div');
                            container.style.position = 'absolute';
                            container.style.top = '-9999px';
                            container.style.left = '-9999px';
                            container.style.width = '210mm';
                            container.style.background = 'white';
                            container.appendChild(clonedElement);
                            document.body.appendChild(container);

                            const html2canvas = (await import('html2canvas-pro')).default;
                            const jsPDF = (await import('jspdf')).jsPDF;

                            const canvas = await html2canvas(clonedElement, {
                                scale: 2,
                                useCORS: true,
                                logging: false,
                                backgroundColor: '#ffffff',
                                onclone: (clonedDoc) => {
                                    const style = clonedDoc.createElement('style');
                                    style.innerHTML = \`* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\`;
                                    clonedDoc.head.appendChild(style);
                                }
                            });

                            document.body.removeChild(container);

                            const imgData = canvas.toDataURL('image/png');
                            const pdf = new jsPDF('p', 'mm', 'a4');
                            const imgProps = pdf.getImageProperties(imgData);
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                            const pdfBlob = pdf.output('blob');

                            await apiService.sendEmailWithAttachment(emailData, pdfBlob, \`\${${docRef} || 'Document'}.pdf\`);
                            alert('Email sent successfully!');
                        } catch (err: any) {
                            console.error('Email send failed:', err);
                            throw err;
                        }
                    }}
                />`;

  content = content.replace(chunkToReplace, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated ${file}`);
});
