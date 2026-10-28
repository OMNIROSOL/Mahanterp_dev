import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import DocumentActionBar from '../components/shared/DocumentActionBar';
import { formatDateDMY } from '../utils/dateUtils';
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

    const customerEmail = customerData?.email || '';

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
        <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans">
            <DocumentActionBar
                documentId={creditNote.id}
                documentType="Credit Note"
                reference={creditNote.reference}
                editUrl={`/credit-notes/edit/${creditNote.id}`}
                cloneUrl={`/credit-notes/new?copyFrom=${creditNote.id}`}
                copyToOptions={[
                    { label: 'New Sales Invoice', url: `/sales-invoices/new?copyFrom=${creditNote.id}` }
                ]}
                pdfRef={pdfRef}
                navigation={{
                    currentIndex: Math.max(0, cnIndex),
                    totalCount: creditNotes.length,
                    onFirst: () => creditNotes[0] && navigate(`/credit-notes/view/${creditNotes[0].id}`),
                    onPrev: () => cnIndex > 0 && navigate(`/credit-notes/view/${creditNotes[cnIndex - 1].id}`),
                    onNext: () => cnIndex < creditNotes.length - 1 && navigate(`/credit-notes/view/${creditNotes[cnIndex + 1].id}`),
                    onLast: () => creditNotes.length > 0 && navigate(`/credit-notes/view/${creditNotes[creditNotes.length - 1].id}`)
                }}
            />




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
                                            <span className="font-semibold">{formatDateDMY(creditNote.issueDate)}</span>
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
                            <thead className="bg-slate-50 border-y border-gray-200 overflow-hidden text-right print-bg-slate-50">
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
                                <span className="text-[11px] font-bold uppercase tracking-widest">Tax Component {totals.subtotal > 0 && totals.tax > 0 ? `(${((totals.tax / totals.subtotal) * 100).toFixed(1).replace(/\.0$/, '')}%)` : ''}</span>
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
