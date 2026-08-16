import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseEnquiry, Supplier } from '../types';
import apiService from '../services/apiService';
import EmailComposerModal from '../components/shared/EmailComposerModal';
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
    Package,
    Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';

const ViewPurchaseQuoteView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<HTMLDivElement>(null);
    const [quote, setQuote] = useState<PurchaseEnquiry | null>(null);
    const [allQuotes, setAllQuotes] = useState<PurchaseEnquiry[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [pq, pqs, supps, codes, items] = await Promise.all([
                    apiService.getPurchaseEnquiry(id),
                    apiService.getPurchaseEnquiries(),
                    apiService.getSuppliers(),
                    apiService.getTaxCodes().catch(() => []),
                    apiService.getItems().catch(() => [])
                ]);
                setQuote(pq);
                setAllQuotes(pqs);
                setAllSuppliers(supps);
                setTaxCodes(codes);
                setInventoryItems(items);
            } catch (err) {
                console.error('Failed to fetch purchase enquiry data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const quoteIndex = useMemo(() => {
        return allQuotes.findIndex(pq => pq.id === id);
    }, [allQuotes, id]);

    const supplierData = useMemo(() => {
        if (!quote) return null;
        const supplierName = typeof quote.supplier === 'object' ? quote.supplier?.name : quote.supplier;
        return allSuppliers.find(s => s.name === supplierName);
    }, [quote, allSuppliers]);

    const supplierEmail = supplierData?.email || (quote?.supplier && typeof quote.supplier === 'string' ? `${quote.supplier.toLowerCase().replace(/\s+/g, '.')}@example.com` : '');

    const totals = useMemo(() => {
        if (!quote) return { subtotal: 0, tax: 0, total: 0, whtAmount: 0, lineCalcs: [] };
        const dOptions = quote.docOptions || quote.options || {};
        const isTaxInclusive = dOptions.amountsAreTaxInclusive || false;

        let subtotal = 0;
        let tax = 0;
        const lineCalcs = (quote.items || []).map(item => {
            const qty = parseFloat(item.qty as any) || 0;
            const price = parseFloat(item.unitPrice as any) || 0;
            const discountValue = parseFloat(item.discount as any) || 0;

            let netTotal = qty * price;
            if (dOptions.columnDiscount) {
                if (dOptions.columnDiscountType === 'Percentage') netTotal *= (1 - (discountValue / 100));
                else netTotal = Math.max(0, netTotal - discountValue);
            }

            let taxAmount = 0;
            const itemTaxCode = (item.taxCode || '').toString().toLowerCase().trim();
            const selectedTax = taxCodes.find(tc =>
                tc.id === item.taxCode ||
                tc.name.toLowerCase() === itemTaxCode
            );
            const taxRate = selectedTax ? (parseFloat(selectedTax.rate) / 100) : 0;

            if (taxRate > 0) {
                if (isTaxInclusive) {
                    taxAmount = netTotal - (netTotal / (1 + taxRate));
                    netTotal -= taxAmount;
                } else {
                    taxAmount = netTotal * taxRate;
                }
            }

            subtotal += netTotal;
            tax += taxAmount;
            return { taxAmount, netTotal, grossTotal: netTotal + taxAmount };
        });

        let grandTotal = subtotal + tax;
        if (dOptions.rounding) {
            if (dOptions.roundingType === 'Round to nearest') grandTotal = Math.round(grandTotal);
            else if (dOptions.roundingType === 'Round down') grandTotal = Math.floor(grandTotal);
        }

        let whtAmount = 0;
        if (dOptions.withholdingTax) {
            const whtVal = parseFloat(dOptions.withholdingTaxValue) || 0;
            if (dOptions.withholdingTaxType === 'Rate') whtAmount = subtotal * (whtVal / 100);
            else whtAmount = whtVal;
            grandTotal -= whtAmount;
        }

        return { subtotal, tax, total: grandTotal, whtAmount, lineCalcs };
    }, [quote, taxCodes]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsCopyToOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Purchase Enquiry...</p>
                </div>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
                <div className="bg-white p-12 rounded-[32px] shadow-xl border border-slate-100 text-center max-w-md">
                    <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-20" />
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Enquiry Not Found</h2>
                    <p className="text-slate-500 font-medium mb-8 text-sm">The purchase enquiry you are looking for does not exist or has been removed.</p>
                    <button
                        onClick={() => navigate('/purchase-quotes')}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        Return to List
                    </button>
                </div>
            </div>
        );
    }

    const dOptions = (quote.docOptions || (quote as any).options || {}) as any;

    return (
        <div className="min-h-screen bg-[#f3f4f6]/50 flex flex-col font-sans">
            {/* Compact Action Toolbar */}
            <div className="bg-[#f8fafc] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/purchase-quotes')}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    <button
                        onClick={() => navigate(`/purchase-quotes/edit/${quote.id}`)}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Edit size={14} className="text-blue-600" /> Edit
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Copy size={14} /> Copy To
                        </button>
                        {isCopyToOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-xl rounded py-1 z-[100]">
                                {[
                                    { label: 'Purchase Enquiry', path: '/purchase-quotes/new' },
                                    { label: 'Purchase Order', path: '/purchase-orders/new' },
                                    { label: 'Purchase Invoice', path: '/purchase-invoices/new' },
                                    { label: 'Goods Receipt', path: '/goods-receipts/new' },
                                    { label: 'Debit Note', path: '/debit-notes/new' }
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { setIsCopyToOpen(false); navigate(`${item.path}?copyFrom=${quote.id}`); }}
                                        className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                    >
                                        New {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-3"></div>

                    <div className="flex space-x-2">
                        <button onClick={() => window.print()} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                            <Printer size={14} /> Print
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    if (!pdfRef.current) {
                                        alert('Error: Content to capture not found.');
                                        return;
                                    }
                                    const html2canvas = (await import('html2canvas-pro')).default;
                                    const jsPDF = (await import('jspdf')).jsPDF;

                                    const element = pdfRef.current;
                                    const originalStyle = element.getAttribute('style') || '';
                                    element.style.maxWidth = 'none';
                                    element.style.width = '850px';

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
                                    pdf.save(`${quote.reference || 'PurchaseEnquiry'}.pdf`);
                                } catch (err: any) {
                                    console.error('PDF Generation failed:', err);
                                    alert(`Failed to generate PDF: ${err.message || 'Unknown error'}`);
                                }
                            }}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Download size={14} /> PDF
                        </button>
                        <button
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
                    defaultTo={supplierEmail || ''}
                    defaultSubject={`Purchase Enquiry: ${quote.reference}`}
                    defaultBody={`Dear ${typeof quote.supplier === 'string' ? quote.supplier : quote.supplier?.name || 'Customer/Supplier' },\n\nPlease find attached our purchase enquiry ${quote.reference}.\n\nKind regards.`}
                    attachmentName={`${quote.reference || 'Document'}.pdf`}
                    onSend={async (emailData) => {
                        try {
                            const element = pdfRef.current;
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
                                    style.innerHTML = `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`;
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

                            await apiService.sendEmailWithAttachment(emailData, pdfBlob, `${quote.reference || 'Document'}.pdf`);
                            alert('Email sent successfully!');
                        } catch (err: any) {
                            console.error('Email send failed:', err);
                            throw err;
                        }
                    }}
                />

                <div className="flex items-center space-x-2">
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button
                            onClick={() => navigate(`/purchase-quotes/view/${allQuotes[0].id}`)}
                            disabled={quoteIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} /> <ChevronLeft size={14} className="-ml-2" />
                        </button>
                        <button
                            onClick={() => navigate(`/purchase-quotes/view/${allQuotes[Math.max(0, quoteIndex - 1)].id}`)}
                            disabled={quoteIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} />
                        </button>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{quoteIndex + 1} / {allQuotes.length}</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button
                            onClick={() => navigate(`/purchase-quotes/view/${allQuotes[Math.min(allQuotes.length - 1, quoteIndex + 1)].id}`)}
                            disabled={quoteIndex === allQuotes.length - 1}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronRight size={14} />
                        </button>
                        <button
                            onClick={() => navigate(`/purchase-quotes/view/${allQuotes[allQuotes.length - 1].id}`)}
                            disabled={quoteIndex === allQuotes.length - 1}
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
                                <div className="flex justify-between items-center mb-1">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">
                                        {(dOptions.customTitle && dOptions.customTitleValue) ? dOptions.customTitleValue : (quote.customTitle || 'Purchase Enquiry')}
                                    </h1>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {quote.reference}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Vendor */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Vendor / Supplier</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">
                                        {typeof quote.supplier === 'object' ? quote.supplier?.name : quote.supplier || '-'}
                                    </p>
                                    <div className="text-gray-500 space-y-1">
                                        <p className="whitespace-pre-wrap">
                                            {supplierData?.billingAddress || (supplierData as any)?.address || quote.billingAddress || (quote as any)?.address || '-'}
                                        </p>
                                        {supplierEmail && <p className="text-blue-600 lowercase">{supplierEmail}</p>}
                                    </div>
                                </div>

                                {/* Quote Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Enquiry Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Issue Date:</span>
                                            <span className="font-semibold">
                                                {(() => {
                                                    if (!quote.issueDate) return '-';
                                                    try {
                                                        // Handle YYYY-MM-DD or ISO strings
                                                        if (quote.issueDate.includes('-')) {
                                                            const parts = quote.issueDate.split('T')[0].split('-');
                                                            if (parts.length === 3) {
                                                                 const [y, m, d] = parts;
                                                                 return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
                                                            }
                                                        }
                                                        // Handle DD.MM.YYYY or other dotted formats
                                                        if (quote.issueDate.includes('.')) {
                                                            const parts = quote.issueDate.split('.');
                                                            if (parts.length === 3) {
                                                                 const [d, m, y] = parts;
                                                                 return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
                                                            }
                                                        }
                                                        // Fallback for valid date objects
                                                        const date = new Date(quote.issueDate);
                                                        if (!isNaN(date.getTime())) {
                                                            return `${date.getDate().toString().padStart(2, '0')}.${((date.getMonth() + 1)).toString().padStart(2, '0')}.${date.getFullYear()}`;
                                                        }
                                                    } catch (e) {
                                                        console.error('Date parsing failed:', e);
                                                    }
                                                    return quote.issueDate;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Currency:</span>
                                            <span className="font-semibold">{quote.currency || 'ZMW'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Logo */}
                        <div className="w-[180px] shrink-0 pt-2">
                            <img src="/logo.png" alt="Company Logo" className="w-full object-contain" />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-14">
                        <table className="w-full text-left">
                            <thead className="bg-[#f8fafc] border-y border-gray-200 overflow-hidden text-right print-bg-slate-50">
                                <tr>
                                    {dOptions.columnLineNumber !== false && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>}
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Item</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Description</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {quote.items && quote.items.length > 0 ? quote.items.map((item: any, idx: number) => {
                                    return (
                                        <tr key={idx}>
                                            {dOptions.columnLineNumber !== false && <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>}
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {item.itemName || (typeof item.item === 'object' ? item.item?.itemName : item.item) || inventoryItems.find(i => i.id === item.itemId)?.itemName || '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-gray-500">{item.description || '-'}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium">{item.qty} <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{item.unit || ''}</span></td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        {dOptions.columnLineNumber !== false && <td className="px-4 py-5 text-slate-400 font-medium text-[12px]">1</td>}
                                        <td className="px-4 py-5 font-semibold text-slate-900">General Item</td>
                                        <td className="px-4 py-5 font-medium text-slate-500">{quote.description || '-'}</td>
                                        <td className="px-4 py-5 text-right font-medium">1</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>



                    {/* Footers Section */}
                    {(dOptions.footers || dOptions.footer || quote.footer) && (dOptions.footerValue || quote.footer) && (
                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Notes & Terms</p>
                            <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">{dOptions.footerValue || quote.footer}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[#f3f4f6] px-8 py-4 border-t border-gray-200 flex justify-end no-print">
                <div className="flex space-x-2">
                    <button onClick={() => window.print()} className="bg-white border border-gray-300 px-6 py-2 text-[11px] font-bold text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition uppercase tracking-widest flex items-center gap-2">
                        <Printer size={14} /> Print Document
                    </button>
                    <button onClick={() => navigate(`/purchase-quotes/edit/${quote.id}`)} className="bg-blue-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-blue-700 transition uppercase tracking-widest flex items-center gap-2">
                        <Edit size={14} /> Edit Enquiry
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewPurchaseQuoteView;
