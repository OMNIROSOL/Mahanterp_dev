import React from 'react';
import { getCompanyProfile } from '../../utils/companyProfile';

export const DOCUMENT_PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body, #root, #root > div, main {
    background: white !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    display: block !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print, nav, aside, header, button { display: none !important; }
  .print-container, .document-print-sheet {
    border: none !important;
    box-shadow: none !important;
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  .print-bg-slate-50 {
    background-color: #f8fafc !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;

const DocumentPrintHeader = ({ title, reference }: { title: string; reference?: string }) => {
  const company = getCompanyProfile();
  return (
    <div className="flex justify-between items-start gap-8 mb-8 pb-6 border-b border-gray-200">
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{company.name}</p>
        {company.address && <p className="text-[12px] text-slate-500 whitespace-pre-wrap">{company.address}</p>}
        <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
          {company.tpin && <p><span className="font-bold text-slate-400 uppercase tracking-widest mr-2">TPIN</span>{company.tpin}</p>}
          {company.phone && <p>{company.phone}</p>}
          {company.email && <p>{company.email}</p>}
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase mt-6">{title}</h1>
        {reference && (
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Reference: {reference}</p>
        )}
      </div>
      <div className="w-[140px] shrink-0">
        <img src="/logo.png" alt={company.name} className="w-full object-contain" />
      </div>
    </div>
  );
};

export default DocumentPrintHeader;
