import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseOrder, Supplier } from '../types';
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
    Loader2,
    Truck
} from 'lucide-react';
import { cn } from '../utils/cn';

const ViewPurchaseOrderView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [ord, ords, supps, codes] = await Promise.all([
                    apiService.getPurchaseOrder(id),
                    apiService.getPurchaseOrders(),
                    apiService.getSuppliers(),
                    apiService.getTaxCodes().catch(() => [])
                ]);
                setOrder(ord);
                setAllOrders(ords);
                setAllSuppliers(supps);
                setTaxCodes(codes);
            } catch (err) {
                console.error('Failed to fetch purchase order data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const orderIndex = useMemo(() => {
        return allOrders.findIndex(ord => ord.id === id);
    }, [allOrders, id]);

    const supplierData = useMemo(() => {
        if (!order) return null;
        const sName = typeof order.supplier === 'string' ? order.supplier : (order.supplier as any)?.name;
        return allSuppliers.find(s => s.name === sName);
    }, [order, allSuppliers]);

    const supplierName = useMemo(() => {
        if (!order) return '';
        return typeof order.supplier === 'string' ? order.supplier : (order.supplier as any)?.name || 'Unknown';
    }, [order]);

    const supplierEmail = supplierData?.email || (supplierName ? `${supplierName.toLowerCase().replace(/\s+/g, '.')}@example.com` : '');

    const totals = useMemo(() => {
        if (!order) return { subtotal: 0, tax: 0, total: 0, whtAmount: 0, lineCalcs: [] };
        const opts = order.docOptions || order.options || {};
        const isTaxInclusive = opts.amountsAreTaxInclusive || false;
        let subtotal = 0;
        let tax = 0;

        const lineCalcs = (order.items || []).map((item: any) => {
            const qty = parseFloat(item.qty as any) || 0;
            const price = parseFloat(item.unitPrice as any) || 0;
            const discountValue = parseFloat(item.discount || '0') || 0;

            let netTotal = qty * price;
            if (opts.columnDiscount) {
                if (opts.columnDiscountType === 'Percentage') netTotal *= (1 - (discountValue / 100));
                else netTotal = Math.max(0, netTotal - discountValue);
            }

            let taxAmount = 0;
            const itemTaxCode = (item.taxCode || '').toString().toLowerCase().trim();
            const selectedTax = taxCodes.find(tc => 
                tc.id === item.taxCode || 
                tc.name.toLowerCase() === itemTaxCode ||
                (itemTaxCode === 'zero rated' && tc.name === 'Zero Rated') ||
                (itemTaxCode === 'exempt' && tc.name === 'Exempt')
            );
            
            const taxRate = selectedTax ? (parseFloat(selectedTax.rate) / 100) : 0;

            if (isTaxInclusive) {
                taxAmount = netTotal - (netTotal / (1 + taxRate));
                netTotal = netTotal - taxAmount;
            } else {
                taxAmount = netTotal * taxRate;
            }

            subtotal += netTotal;
            tax += taxAmount;
            return { taxAmount, grossTotal: netTotal + taxAmount, netTotal };
        });

        let grandTotal = subtotal + tax;
        if (opts.rounding) {
            if (opts.roundingType === 'Round to nearest') grandTotal = Math.round(grandTotal);
            else if (opts.roundingType === 'Round down') grandTotal = Math.floor(grandTotal);
        }

        let whtAmount = 0;
        if (opts.withholdingTax) {
            const whtVal = parseFloat(opts.withholdingTaxValue) || 0;
            if (opts.withholdingTaxType === 'Rate') whtAmount = subtotal * (whtVal / 100);
            else whtAmount = whtVal;
            grandTotal -= whtAmount;
        }

        return { subtotal, tax, total: grandTotal, whtAmount, lineCalcs };
    }, [order, taxCodes]);

    const handleStatusChange = async (newStatus: string, shouldInvoice: boolean = false) => {
        if (!id || !order) return;
        try {
            const finalStatus = shouldInvoice ? 'Invoiced' : newStatus;
            
            // The backend PATCH route handles the automatic creation of the invoice 
            // when the status is 'Invoiced' or 'Approved'. We just need to call it.
            await apiService.updatePurchaseOrderStatus(id, finalStatus);

            if (shouldInvoice) {
                navigate('/purchase-invoices');
                return;
            }

            // Refresh order data
            const updatedOrder = await apiService.getPurchaseOrder(id);
            setOrder(updatedOrder);
            window.dispatchEvent(new Event('purchase_orders_updated'));
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status in database.');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsCopyToOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!order) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Purchase Order not found.</div>;

    return (
        <div className="min-h-screen bg-[#f3f4f6]/50 flex flex-col font-sans">
            {/* Compact Action Toolbar */}
            <div className="bg-[#f8fafc] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/purchase-orders')}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    <button
                        onClick={() => navigate(`/purchase-orders/edit/${order.id}`)}
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
                                    { label: 'Sales Quote', path: '/sales-quotes/new' },
                                    { label: 'Sales Order', path: '/sales-orders/new' },
                                    { label: 'Sales Invoice', path: '/sales-invoices/new' },
                                    { label: 'Delivery Note', path: '/delivery-notes/new' },
                                    { label: 'Credit Note', path: '/credit-notes/new' },
                                    { label: 'Purchase Enquiry', path: '/purchase-quotes/new' },
                                    { label: 'Purchase Order', path: '/purchase-orders/new' },
                                    { label: 'Purchase Invoice', path: '/purchase-invoices/new' },
                                    { label: 'Goods Receipt', path: '/goods-receipts/new' },
                                    { label: 'Debit Note', path: '/debit-notes/new' }
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { setIsCopyToOpen(false); navigate(`${item.path}?copyFrom=${order.id}`); }}
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
                                    pdf.save(`${order.reference || 'PurchaseOrder'}.pdf`);
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
                    defaultSubject={`Purchase Order: ${order.reference}`}
                    defaultBody={`Dear ${supplierName},\n\nPlease find attached our purchase order ${order.reference}.\n\nKind regards.`}
                    attachmentName={`${order.reference || 'PurchaseOrder'}.pdf`}
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

                            await apiService.sendEmailWithAttachment(emailData, pdfBlob, `${order.reference || 'PurchaseOrder'}.pdf`);
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
                            onClick={() => navigate(`/purchase-orders/view/${allOrders[0].id}`)}
                            disabled={orderIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} /> <ChevronLeft size={14} className="-ml-2" />
                        </button>
                        <button
                            onClick={() => navigate(`/purchase-orders/view/${allOrders[Math.max(0, orderIndex - 1)].id}`)}
                            disabled={orderIndex <= 0}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"
                        >
                            <ChevronLeft size={14} />
                        </button>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{orderIndex + 1} / {allOrders.length}</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button
                            onClick={() => navigate(`/purchase-orders/view/${allOrders[Math.min(allOrders.length - 1, orderIndex + 1)].id}`)}
                            disabled={orderIndex === allOrders.length - 1}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"
                        >
                            <ChevronRight size={14} />
                        </button>
                        <button
                            onClick={() => navigate(`/purchase-orders/view/${allOrders[allOrders.length - 1].id}`)}
                            disabled={orderIndex === allOrders.length - 1}
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
                                        {(order.options?.customTitle && order.options?.customTitleValue) ? order.options.customTitleValue : (order.customTitle || 'Purchase Order')}
                                    </h1>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {order.reference}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Vendor */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Vendor / Supplier</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{supplierName}</p>
                                    <div className="text-gray-500 space-y-1">
                                        <p className="whitespace-pre-wrap">{supplierData?.billingAddress || order.billingAddress || '-'}</p>
                                        {supplierEmail && <p className="text-blue-600 lowercase">{supplierEmail}</p>}
                                    </div>
                                </div>

                                {/* Order Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Order Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Order Date:</span>
                                            <span className="font-semibold">
                                                {(() => {
                                                    if (!order.orderDate) return '—';
                                                    try {
                                                        const d = new Date(order.orderDate);
                                                        if (isNaN(d.getTime())) return order.orderDate;
                                                        return d.toLocaleDateString('en-GB').replace(/\//g, '.');
                                                    } catch {
                                                        return order.orderDate;
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Currency:</span>
                                            <span className="font-semibold">{order.currency || 'ZMW'}</span>
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
                                    {order.options?.columnLineNumber !== false && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>}
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Item</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Description</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit Price</th>
                                    {order.docOptions?.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disc</th>}
                                    {!order.docOptions?.amountsAreTaxInclusive && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Amount</th>}
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items && order.items.length > 0 ? order.items.map((item: any, idx: number) => {
                                    const calc = totals.lineCalcs[idx];
                                    return (
                                        <tr key={idx}>
                                            {order.docOptions?.columnLineNumber !== false && <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>}
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {item.item?.itemName || item.itemName || (typeof item.item === 'string' ? item.item : '-') }
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-gray-500">{item.description || '-'}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium">{item.qty} <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{item.unit || ''}</span></td>
                                            <td className="px-4 py-4 text-right font-medium">{(parseFloat(item.unitPrice as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            {order.docOptions?.columnDiscount && (
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-bold text-rose-500">
                                                        {item.discount ? (order.docOptions.columnDiscountType === 'Percentage' ? `${item.discount}%` : parseFloat(item.discount).toLocaleString()) : '-'}
                                                    </span>
                                                </td>
                                            )}
                                            {!order.docOptions?.amountsAreTaxInclusive && (
                                                <td className="px-4 py-4 text-right font-medium text-slate-400">
                                                    {calc?.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-right font-semibold">
                                                {calc?.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        {order.options?.columnLineNumber !== false && <td className="px-4 py-5 text-slate-400 font-medium text-[12px]">1</td>}
                                        <td className="px-4 py-5 font-semibold text-slate-900">General Item</td>
                                        <td className="px-4 py-5 font-medium text-slate-500">{order.description || '-'}</td>
                                        <td className="px-4 py-5 text-right font-medium">1</td>
                                        <td className="px-4 py-5 text-right font-medium">{(parseFloat(order.amount as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-5 text-right font-semibold">{(parseFloat(order.amount as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Totals Section */}
                    <div className="flex justify-end items-start gap-12 mt-8 mb-12">
                        <div className="w-80 space-y-3">
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">{(order.docOptions || order.options)?.amountsAreTaxInclusive ? 'Subtotal (Excl. Tax)' : 'Subtotal'}</span>
                                <span className="font-semibold">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 pb-2 border-b border-gray-50">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tax Component</span>
                                <span className="font-semibold">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            {(order.docOptions || order.options)?.withholdingTax && (
                                <div className="flex justify-between items-center text-rose-500">
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Withholding Tax</span>
                                    <span className="font-semibold">-{totals.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Total</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{order.currency?.split(' ')[0] || 'ZMW'}</p>
                                    <p className="text-2xl font-bold text-slate-900 tracking-tighter">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-start gap-12 mt-12 pb-20 relative">
                        <div className="flex-1">
                            <div className="pt-8 border-t border-gray-100">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-12">Authorized Signature</p>
                                <div className="relative">
                                    <div className="w-48 h-[1px] bg-gray-300"></div>
                                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Stamp & Date</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(order.docOptions || order.options)?.footers && (order.docOptions || order.options)?.footerValue && (
                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Terms & Conditions</p>
                            <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">{(order.docOptions || order.options).footerValue}</p>
                        </div>
                    )}
                </div>
            </div>

                <div className="bg-[#f3f4f6] px-8 py-4 border-t border-gray-200 flex justify-end no-print">
                <div className="flex space-x-2">
                    {(order.status !== 'Received' && order.status !== 'Rejected' && order.status !== 'Completed') && (
                        <>
                            {(order.status !== 'Ordered' && order.status !== 'Approved') ? (
                                <>
                                    <button onClick={() => handleStatusChange('Ordered', true)} className="bg-emerald-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-emerald-700 transition uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 size={14} /> Approve & Invoice
                                    </button>
                                    <button onClick={() => handleStatusChange('Rejected')} className="bg-white border border-rose-200 text-rose-600 px-6 py-2 text-[11px] font-bold rounded-md shadow-sm hover:bg-rose-50 transition uppercase tracking-widest flex items-center gap-2">
                                        <XCircle size={14} /> Reject
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => navigate(`/purchase-invoices/new?copyFrom=${order.id}`)} className="bg-emerald-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-emerald-700 transition uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 size={14} /> Generate Invoice
                                </button>
                            )}
                        </>
                    )}
                    <button onClick={() => window.print()} className="bg-white border border-gray-300 px-6 py-2 text-[11px] font-bold text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition uppercase tracking-widest flex items-center gap-2">
                        <Printer size={14} /> Print Document
                    </button>
                    <button onClick={() => navigate(`/purchase-orders/edit/${order.id}`)} className="bg-blue-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-blue-700 transition uppercase tracking-widest flex items-center gap-2">
                        <Edit size={14} /> Edit Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewPurchaseOrderView;
