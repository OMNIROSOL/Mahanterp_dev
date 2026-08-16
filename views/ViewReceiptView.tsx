import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { Receipt as ReceiptType } from '../types';
import {
    FolderOpen, ChevronRight, Edit, Printer, FileText, Mail,
    ChevronsLeft, ChevronLeft, ChevronRight as ChevronRightIcon,
    ChevronsRight, ChevronDown, Download
} from 'lucide-react';

const ViewReceiptView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [receipt, setReceipt] = useState<ReceiptType | null>(null);
    const [allReceipts, setAllReceipts] = useState<ReceiptType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const receiptIndex = allReceipts.findIndex(r => r.id === id || r.reference === id);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [receiptData, receipts] = await Promise.all([
                    apiService.getReceipt(id!),
                    apiService.getReceipts()
                ]);
                setReceipt(receiptData);
                setAllReceipts(receipts);
            } catch (err) {
                console.error('Failed to fetch receipt:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCopyToOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNext = () => {
        if (receiptIndex < allReceipts.length - 1) {
            navigate(`/receipts/view/${allReceipts[receiptIndex + 1].id}`);
        }
    };
    const handlePrev = () => {
        if (receiptIndex > 0) {
            navigate(`/receipts/view/${allReceipts[receiptIndex - 1].id}`);
        }
    };
    const handleFirst = () => navigate(`/receipts/view/${allReceipts[0].id}`);
    const handleLast = () => navigate(`/receipts/view/${allReceipts[allReceipts.length - 1].id}`);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing receipt view...</p>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest">
                <p>Receipt not found.</p>
                <button onClick={() => navigate('/receipts')} className="mt-4 text-blue-500 hover:underline">Return to list</button>
            </div>
        );
    }

    return (
        <div className="bg-[#f3f4f6] min-h-full flex flex-col font-sans">
            {/* Breadcrumb */}
            <div className="bg-white px-6 py-2 border-b border-gray-200 flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-widest space-x-1.5 select-none no-print shadow-sm">
                <FolderOpen size={14} className="text-blue-500" />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/receipts" className="text-blue-500 hover:text-blue-700 transition-colors">Receipts</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-400">View</span>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between no-print shadow-sm">
                <div className="flex items-center space-x-4">
                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest mr-2">Receipt</span>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-visible relative group">
                        <button
                            onClick={() => navigate(`/receipts/edit/${receipt.id}`)}
                            className="px-5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 border-r border-slate-200 transition-all flex items-center gap-2"
                        >
                            <Edit size={14} className="text-blue-500" /> Edit
                        </button>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                                className={`px-5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center h-full transition-all group ${isCopyToOpen ? 'bg-slate-50' : ''}`}
                            >
                                <ChevronDown size={14} className={`mr-2 text-slate-400 transition-transform duration-300 ${isCopyToOpen ? 'rotate-180 text-blue-500' : ''}`} />
                                Copy to
                            </button>
                            {isCopyToOpen && (
                                <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 shadow-2xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</span>
                                    </div>
                                    <button disabled className="w-full text-left px-4 py-2.5 text-[12px] text-slate-300 cursor-not-allowed font-medium italic">New Payment (Incoming)</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-200 mx-2"></div>
                    <div className="flex space-x-2">
                        <button onClick={() => window.print()} className="bg-white border border-slate-200 px-5 py-2 text-[12px] font-bold text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Printer size={14} className="text-slate-400" /> Print
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    if (!pdfRef.current) return;
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
                                    pdf.save(`${receipt.reference || 'Receipt'}.pdf`);
                                } catch (err: any) {
                                    console.error('PDF Generation failed:', err);
                                    alert(`Failed to generate PDF: ${err.message || 'Unknown error'}`);
                                }
                            }} 
                            className="bg-white border border-slate-200 px-5 py-2 text-[12px] font-bold text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Download size={14} className="text-slate-400" /> PDF
                        </button>
                        <button className="bg-white border border-slate-200 px-5 py-2 text-[12px] font-bold text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Mail size={14} className="text-slate-400" /> Email
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <button onClick={handleFirst} disabled={receiptIndex === 0} className="px-3.5 py-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 border-r border-slate-200 disabled:opacity-20 transition-all"><ChevronsLeft size={16} /></button>
                        <button onClick={handlePrev} disabled={receiptIndex === 0} className="px-3.5 py-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-20 transition-all"><ChevronLeft size={16} /></button>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 tracking-widest">{receiptIndex + 1} / {allReceipts.length}</span>
                    <div className="flex bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <button onClick={handleNext} disabled={receiptIndex === allReceipts.length - 1} className="px-3.5 py-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 border-r border-slate-200 disabled:opacity-20 transition-all"><ChevronRightIcon size={16} /></button>
                        <button onClick={handleLast} disabled={receiptIndex === allReceipts.length - 1} className="px-3.5 py-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-20 transition-all"><ChevronsRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Document */}
            <div className="flex-1 p-6 flex justify-center overflow-auto bg-[#f3f4f6]">
                <div className="bg-white shadow-xl p-12 w-full max-w-[850px] min-h-[1100px] relative font-sans text-gray-900 border border-gray-200" ref={pdfRef}>
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
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">{receipt.customTitle || 'Receipt'}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {receipt.reference}</p>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">{receipt.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Paid By */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Paid By</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{receipt.paidByContact}</p>
                                    {receipt.paidByOptional && <p className="text-gray-500 italic">{receipt.paidByOptional}</p>}
                                    <div className="mt-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Received In</h4>
                                        <p className="text-sm font-semibold">{receipt.receivedInAccount}</p>
                                    </div>
                                </div>

                                {/* Receipt Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Date:</span>
                                            <span className="font-semibold">{receipt.date}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Reference:</span>
                                            <span className="font-semibold">{receipt.reference}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Currency:</span>
                                            <span className="font-semibold">{receipt.currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Logo - Large and Span across Header+Details */}
                        <div className="w-[180px] shrink-0 pt-2">
                            <img src="/logo.png" alt="Company Logo" className="w-full object-contain" />
                        </div>
                    </div>

                    <div className="mb-10 p-4 bg-gray-50 rounded border border-gray-100 print-bg-slate-50">
                        <p className="text-[13px] text-gray-600 italic">Description: {receipt.description}</p>
                    </div>

                    <table className="w-full border-collapse border border-gray-300 text-[13px]">
                        <thead>
                            <tr className="bg-gray-100 print-bg-slate-50">
                                <th className="border border-gray-300 p-2 text-left font-bold w-[40%]">Account</th>
                                <th className="border border-gray-300 p-2 text-left font-bold">Description</th>
                                <th className="border border-gray-300 p-2 text-right font-bold w-[15%]">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items?.map((item: any, idx: number) => (
                                <tr key={item.id || idx}>
                                    <td className="border border-gray-300 p-2">{item.account}</td>
                                    <td className="border border-gray-300 p-2">{item.description}</td>
                                    <td className="border border-gray-300 p-2 text-right">{parseFloat(item.amount || item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )) || (
                                    <tr>
                                        <td className="border border-gray-300 p-2" colSpan={2}>General Payment</td>
                                        <td className="border border-gray-300 p-2 text-right font-bold">{receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="border border-gray-300 p-2 text-right font-bold uppercase bg-gray-50 print-bg-slate-50">Total {receipt.currency}</td>
                                <td className="border border-gray-300 p-2 text-right font-bold bg-gray-50 print-bg-slate-50">{receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {receipt.footers && (
                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-[12px] text-gray-500 whitespace-pre-wrap">{receipt.footers}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewReceiptView;
