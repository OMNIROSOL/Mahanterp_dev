import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

export const generatePdfFromElement = async (elementId: string): Promise<jsPDF> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Document element not found');

  const originalStyle = element.getAttribute('style') || '';
  
  // Clone element to avoid modifying the DOM
  const clonedElement = element.cloneNode(true) as HTMLElement;
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.background = 'white';
  container.appendChild(clonedElement);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  } finally {
    document.body.removeChild(container);
  }
};
