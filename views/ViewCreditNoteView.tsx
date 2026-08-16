import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { CreditNote, Customer } from '../types';
import {
    Printer,
    FileText,
    Mail,
    Edit,
    ChevronRight,
    ChevronLeft,
    Download,
    Copy,
    Clock,
    User,
    MapPin,
    Calendar,
    Hash,
    CheckCircle2,
    XCircle,
    X
} from 'lucide-react';
import Badge from '../components/shared/Badge';
import { cn } from '../utils/cn';

const ViewCreditNoteView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [creditNote, setCreditNote] = useState<any>(null);
    const [customerData, setCustomerData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [cns, custs, codes] = await Promise.all([
                    apiService.getCreditNotes(),
                    apiService.getCustomers(),
                    apiService.getTaxCodes().catch(() => [])
                ]);
                setCreditNotes(cns);
                setTaxCodes(codes);
                const cn = cns.find((c: any) => c.id === id || c.id === `cn-${id}` || c.id.toString() === id);
                if (cn) {
                    setCreditNote(cn);
                    const cust = custs.find((c: any) => c.name === cn.customer);
                    setCustomerData(cust);
                }
            } catch (err) {
                console.error('Failed to load credit note:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id]);

    const cnIndex = creditNotes.findIndex(c => c.id === id || c.id === `cn-${id}` || c.id.toString() === id);

    const customerEmail = customerData?.email || (creditNote ? `${creditNote.customer.toLowerCase().replace(/\s+/g, '.')}@example.com` : '');

    const totals = useMemo(() => {
        if (!creditNote) return { subtotal: 0, tax: 0, total: 0, costOfSales: 0 };
        const options = creditNote.docOptions || {};
        const isTaxInclusive = options.amountsAreTaxInclusive || false;
        
        let subtotal = 0;
        let tax = 0;
        (creditNote.items || []).forEach((item: any) => {
            const qty = parseFloat(item.qty as any) || 0;
            const price = parseFloat(item.unitPrice as any) || 0;
            const lineTotal = qty * price;
            
            let taxRate = 0;
            const itemTaxCode = (item.taxCode || '').toString().toLowerCase().trim();
            const selectedTax = taxCodes.find(tc => 
                tc.id === item.taxCode || 
                tc.name.toLowerCase() === itemTaxCode ||
                (itemTaxCode === 'zero rated' && tc.name === 'Zero Rated') ||
                (itemTaxCode === 'exempt' && tc.name === 'Exempt')
            );
            
            if (selectedTax) {
                taxRate = parseFloat(selectedTax.rate) / 100;
            } else {
                // Fallback for historical data - check if it looks like it should be 16%
                if (itemTaxCode.includes('16') || itemTaxCode.includes('vat') || !itemTaxCode) {
                    const defaultTax = taxCodes.find(tc => tc.name === 'VAT 16%') || { rate: 16 };
                    taxRate = (parseFloat(defaultTax.rate) || 16) / 100;
                } else {
                    taxRate = 0; // Default to 0 for unknown non-empty tax codes
                }
            }

            if (isTaxInclusive) {
                const lineTax = lineTotal - (lineTotal / (1 + taxRate));
                tax += lineTax;
                subtotal += (lineTotal - lineTax);
            } else {
                subtotal += lineTotal;
                tax += lineTotal * taxRate;
            }
        });
        return { subtotal, tax, total: parseFloat(creditNote.amount) || 0, costOfSales: parseFloat(creditNote.costOfSales) || 0 };
    }, [creditNote, taxCodes]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsCopyToOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isLoading) return <div className="p-20 text-center font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Document...</div>;

    if (!creditNote) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Credit Note not found.</div>;

    return (
        <div className="min-h-screen bg-[#f3f4f6]/50 flex flex-col font-sans">
            {/* Compact Action Toolbar */}
            <div className="bg-[#f8fafc] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/credit-notes')}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    <button
                        onClick={() => navigate(`/credit-notes/edit/${creditNote.id}`)}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Edit size={14} className="text-blue-600" /> Edit
                    </button>

                    <div className="w-[1px] h-6 bg-gray-200 mx-3"></div>

                    <div className="flex space-x-2">
                        <button onClick={() => window.print()} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                            <Printer size={14} /> Print
                        </button>
                        <button
                            onClick={async () => {
                                if (!pdfRef.current) return;
                                const html2canvas = (await import('html2canvas-pro')).default;
                                const jsPDF = (await import('jspdf')).jsPDF;

                                const element = pdfRef.current;
                                const originalStyle = element.getAttribute('style') || '';
                                element.style.maxWidth = 'none';
                                element.style.width = '850px';

                                try {
                                    const canvas = await html2canvas(element, {
                                        scale: 2,
                                        useCORS: true,
                                        logging: true,
                                        backgroundColor: '#ffffff',
                                        onclone: (clonedDoc) => {
                                            const style = clonedDoc.createElement('style');
                                            style.innerHTML = `
                                                * {
                                                    --color-slate-50: #f8fafc !important;
                                                    --color-slate-100: #f1f5f9 !important;
                                                    --color-slate-200: #e2e8f0 !important;
                                                    --color-slate-300: #cbd5e1 !important;
                                                    --color-slate-400: #94a3b8 !important;
                                                    --color-slate-500: #64748b !important;
                                                    --color-slate-600: #475569 !important;
                                                    --color-slate-700: #334155 !important;
                                                    --color-slate-800: #1e293b !important;
                                                    --color-slate-900: #0f172a !important;
                                                    --color-indigo-50: #eef2ff !important;
                                                    --color-indigo-100: #e0e7ff !important;
                                                    --color-indigo-200: #c7d2fe !important;
                                                    --color-indigo-300: #a5b4fc !important;
                                                    --color-indigo-400: #818cf8 !important;
                                                    --color-indigo-500: #6366f1 !important;
                                                    --color-indigo-600: #4f46e5 !important;
                                                    --color-indigo-700: #4338ca !important;
                                                    --color-indigo-800: #3730a3 !important;
                                                    --color-indigo-900: #312e81 !important;
                                                    --color-rose-50: #fff1f2 !important;
                                                    --color-rose-100: #ffe4e6 !important;
                                                    --color-rose-200: #fecdd3 !important;
                                                    --color-rose-300: #fda4af !important;
                                                    --color-rose-400: #fb7185 !important;
                                                    --color-rose-500: #f43f5e !important;
                                                    --color-rose-600: #e11d48 !important;
                                                    --color-blue-50: #eff6ff !important;
                                                    --color-blue-100: #dbeafe !important;
                                                    --color-blue-200: #bfdbfe !important;
                                                    --color-blue-300: #93c5fd !important;
                                                    --color-blue-400: #60a5fa !important;
                                                    --color-blue-500: #3b82f6 !important;
                                                    --color-blue-600: #2563eb !important;
                                                    --color-gray-50: #f9fafb !important;
                                                    --color-gray-100: #f3f4f6 !important;
                                                    --color-gray-200: #e5e7eb !important;
                                                    --color-gray-300: #d1d5db !important;
                                                    --color-gray-400: #9ca3af !important;
                                                    --color-gray-500: #6b7280 !important;
                                                    --color-gray-600: #4b5563 !important;
                                                    --color-gray-700: #374151 !important;
                                                    --color-gray-800: #1f2937 !important;
                                                    --color-gray-900: #111827 !important;
                                                    --color-emerald-50: #ecfdf5 !important;
                                                    --color-emerald-100: #d1fae5 !important;
                                                    --color-emerald-500: #10b981 !important;
                                                    --color-emerald-600: #059669 !important;
                                                    --color-amber-50: #fffbeb !important;
                                                    --color-amber-100: #fef3c7 !important;
                                                    --color-amber-500: #f59e0b !important;
                                                    --color-amber-600: #d97706 !important;
                                                }
                                            `;
                                            clonedDoc.head.appendChild(style);
                                        }
                                    });

                                    element.setAttribute('style', originalStyle);

                                    const imgData = canvas.toDataURL('image/png');
                                    const pdf = new jsPDF('p', 'mm', 'a4');
                                    const imgProps = pdf.getImageProperties(imgData);
                                    const pdfWidth = pdf.internal.pageSize.getWidth();
                                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                    pdf.save(`${creditNote.reference || 'CreditNote'}.pdf`);
                                } catch (err: any) {
                                    console.error('PDF Generation failed:', err);
                                    alert(`Failed to generate PDF: ${err.message || 'Unknown error'}`);
                                }
                            }}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Download size={14} /> PDF
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button
                            onClick={() => navigate(`/credit-notes/view/${creditNotes[0].id}`)}
                            disabled={cnIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} /> <ChevronLeft size={14} className="-ml-2" />
                        </button>
                        <button
                            onClick={() => navigate(`/credit-notes/view/${creditNotes[Math.max(0, cnIndex - 1)].id}`)}
                            disabled={cnIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} />
                        </button>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{cnIndex + 1} / {creditNotes.length}</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button
                            onClick={() => navigate(`/credit-notes/view/${creditNotes[Math.min(creditNotes.length - 1, cnIndex + 1)].id}`)}
                            disabled={cnIndex === creditNotes.length - 1}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronRight size={14} />
                        </button>
                        <button
                            onClick={() => navigate(`/credit-notes/view/${creditNotes[creditNotes.length - 1].id}`)}
                            disabled={cnIndex === creditNotes.length - 1}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
                        >
                            <ChevronRight size={14} /> <ChevronRight size={14} className="-ml-2" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 flex justify-start overflow-auto print:p-0">
                <div className="print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative" ref={pdfRef}>
                    <style>{`
                        @media print {
                            @page { margin: 10mm; size: auto; }
                            html, body, #root, #root > div, main { 
                                background: white !important; 
                                padding: 0 !important; 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important;
                                font-family: sans-serif !important; 
                                height: auto !important; 
                                min-height: none !important; 
                                overflow: visible !important; 
                                display: block !important; 
                            }
                            .no-print, nav, aside, header, .nav-bar, .side-bar, button, .breadcrumb-bar { display: none !important; }
                            .print-container { 
                                border: none !important; 
                                box-shadow: none !important; 
                                max-width: none !important; 
                                width: 100% !important; 
                                position: static !important;
                                padding: 48px !important;
                                background: white !important;
                                margin: 0 !important;
                            }
                            .print-bg-slate-50 {
                                background-color: #f8fafc !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                    `}</style>

                    <div className="flex justify-between items-start gap-12 mb-10 pb-10 border-b border-gray-100">
                        <div className="flex-1">
                            {/* Header Section */}
                            <div className="mb-6">
                                <div className="flex justify-between items-start mb-1">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">Credit Note</h1>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {creditNote.reference}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Customer Info */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Customer</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{creditNote.customer}</p>
                                    <div className="text-gray-500 space-y-1">
                                        <p className="whitespace-pre-wrap">{customerData?.billingAddress || '-'}</p>
                                        {customerEmail && <p className="text-blue-600 lowercase">{customerEmail}</p>}
                                    </div>
                                </div>

                                {/* Credit Note Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Issue Date:</span>
                                            <span className="font-semibold">{creditNote.issueDate}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Sales Invoice:</span>
                                            <span className="font-semibold text-indigo-600">{creditNote.salesInvoice || '-'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Currency:</span>
                                            <span className="font-semibold">{creditNote.currency || 'ZMW'}</span>
                                        </div>
                                        {creditNote.timestamp && (
                                            <div className="flex">
                                                <span className="w-32 text-gray-500">Timestamp:</span>
                                                <span className="font-semibold text-[11px] text-slate-400 tracking-tight">{creditNote.timestamp}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Logo - Large and Span across Header+Details */}
                        <div className="w-[180px] shrink-0 pt-2">
                            <img src="/logo.png" alt="Company Logo" className="w-full object-contain" />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-14">
                        <table className="w-full text-left">
                            <thead className="bg-[#f8fafc] border-y border-gray-200 overflow-hidden text-right print-bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Item</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Description</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit Price</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(creditNote.items || []).map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-semibold text-slate-900">{item.item || '-'}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-gray-500">{item.description || '-'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium">{item.qty}</td>
                                        <td className="px-4 py-4 text-right font-medium">{(parseFloat(item.unitPrice as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-4 text-right font-semibold">{((parseFloat(item.qty as any) || 0) * (parseFloat(item.unitPrice as any) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end">
                        <div className="w-80 space-y-3">
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">Subtotal</span>
                                <span className="font-semibold">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">Tax Component</span>
                                <span className="font-semibold">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Credit Total</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{creditNote.currency}</p>
                                    <p className="text-2xl font-bold text-slate-900 tracking-tighter">{creditNote.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 px-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost of Sales</span>
                                <span className="text-sm font-bold text-slate-600">{(creditNote.costOfSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCreditNoteView;
