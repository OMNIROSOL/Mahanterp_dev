import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import { 
    ChevronLeft, ChevronRight, Printer, FileText, 
    Download, Mail, Edit, Copy, ChevronFirst, ChevronLast,
    Box, MapPin, Calendar, Info, FileStack, Clock, ChevronDown, User, Truck
} from 'lucide-react';
import { cn } from '../utils/cn';
import Badge from '../components/shared/Badge';
import { Check } from 'lucide-react';

const ViewGoodsReceiptView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const pdfRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const [note, setNote] = useState<any>(null);
    const [allNotes, setAllNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const queryParams = new URLSearchParams(location.search);
    const filterItem = queryParams.get('item');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch the list first as a fallback
                const notesList = await apiService.getGoodsReceivedNotes().catch(() => []);
                setAllNotes(notesList);

                try {
                    const specificNote = await apiService.getGoodsReceivedNote(id!);
                    setNote(specificNote);
                } catch (err) {
                    console.error('Direct fetch failed, trying fallback from list:', err);
                    const fallbackNote = notesList.find((n: any) => n.id === id || n.reference === id);
                    if (fallbackNote) {
                        setNote(fallbackNote);
                    } else {
                        throw err; // Re-throw if even fallback fails
                    }
                }
            } catch (err) {
                console.error('Failed to fetch goods received note:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const noteIndex = useMemo(() => allNotes.findIndex((n: any) => (n.id === id || n.reference === id)), [allNotes, id]);

    const displayItems = useMemo(() => {
        if (!note?.items) return [];
        if (!filterItem) return note.items;
        return note.items.filter((it: any) => (it.item || it.itemName || it.item?.itemName) === filterItem);
    }, [note, filterItem]);

    const totalQty = useMemo(() => {
        return displayItems.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0);
    }, [displayItems]);

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
        if (noteIndex < allNotes.length - 1) navigate(`/goods-received-notes/view/${allNotes[noteIndex + 1].id}${location.search}`);
    };
    const handlePrev = () => {
        if (noteIndex > 0) navigate(`/goods-received-notes/view/${allNotes[noteIndex - 1].id}${location.search}`);
    };
    const handleFirst = () => navigate(`/goods-received-notes/view/${allNotes[0].id}${location.search}`);
    const handleLast = () => navigate(`/goods-received-notes/view/${allNotes[allNotes.length - 1].id}${location.search}`);

    const handleApprove = async () => {
        if (!window.confirm("Are you sure you want to approve this GRN? This will update inventory and cannot be undone.")) return;
        try {
            await apiService.approveGoodsReceivedNote(note.id);
            const specificNote = await apiService.getGoodsReceivedNote(note.id);
            setNote(specificNote);
        } catch (err: any) {
            alert(err.message || 'Failed to approve GRN');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans bg-slate-50/50 min-h-screen">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Goods Received Note...</p>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-white rounded-[32px] p-12 text-center shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                        <Info size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Document Not Found</h2>
                    <p className="text-slate-500 text-sm mb-8 font-medium">The Goods Received Note you are looking for doesn't exist or has been removed.</p>
                    <button 
                        onClick={() => navigate('/goods-received-notes')} 
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        Return to List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3f4f6]/50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Compact Action Toolbar */}
            <div className="bg-[#f8fafc] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => navigate('/goods-received-notes')}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    {note.status === 'Draft' && (
                        <button 
                            onClick={handleApprove}
                            className="bg-white border border-emerald-300 px-4 py-1.5 text-[12px] font-bold text-emerald-700 rounded shadow-sm hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                        >
                            Approve
                        </button>
                    )}

                    <button 
                        onClick={() => navigate(`/goods-received-notes/edit/${note.id}`)}
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                        <Edit size={14} className="text-blue-600" /> Edit
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <Copy size={14} /> Copy To
                        </button>
                        {isCopyToOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-xl rounded py-1 z-[100] animate-in fade-in slide-in-from-top-1 duration-200">
                                {[
                                    { label: 'Purchase Invoice', path: '/purchase-invoices/new' },
                                    { label: 'Debit Note', path: '/debit-notes/new' }
                                ].map(item => (
                                    <button 
                                        key={item.label}
                                        onClick={() => { setIsCopyToOpen(false); navigate(`${item.path}?copyFrom=${note.id}`); }} 
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
                                    pdf.save(`${note.reference || 'GoodsReceivedNote'}.pdf`);
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

                {!note.isPurchaseInvoice && allNotes.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                            <button 
                                onClick={handleFirst} 
                                disabled={noteIndex === 0} 
                                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center transition-colors"
                            >
                                <ChevronFirst size={14} />
                            </button>
                            <button 
                                onClick={handlePrev} 
                                disabled={noteIndex === 0} 
                                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{noteIndex + 1} / {allNotes.length}</span>
                        <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                            <button 
                                onClick={handleNext} 
                                disabled={noteIndex === allNotes.length - 1} 
                                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button 
                                onClick={handleLast} 
                                disabled={noteIndex === allNotes.length - 1} 
                                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center transition-colors"
                            >
                                <ChevronLast size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Area */}
            <div className="flex-1 p-6 flex justify-start overflow-auto print:p-0">
                <div className="bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative rounded-none border border-gray-100 print:shadow-none print:border-none print:p-8 print:rounded-none" ref={pdfRef}>
                    <style>{`
                        @media print {
                            @media print { margin: 10mm; size: auto; }
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
                        <div className="flex-1 space-y-6">
                            {/* Header Section */}
                            <div className="mb-6">
                                <div className="flex items-center mb-1 gap-3">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">Goods Received Note</h1>
                                    {note.status === 'Draft' && (
                                        <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200 no-print animate-pulse">DRAFT</span>
                                    )}
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {note.reference}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Supplier */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Received From</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">
                                        {typeof note.supplier === 'string' ? note.supplier : note.supplier?.name || 'Unknown Supplier'}
                                    </p>
                                    <div className="text-gray-500 space-y-1">
                                        <p className="whitespace-pre-wrap leading-relaxed">
                                            {note.supplierAddress || note.supplier?.billingAddress || 'No supplier address recorded.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Shipment Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Shipment Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex">
                                            <span className="w-36 text-gray-500">Received Date:</span>
                                            <span className="font-semibold">{note.receivedDate || '-'}</span>
                                        </div>
                                        {note.purchaseOrder && (
                                            <div className="flex">
                                                <span className="w-36 text-gray-500">Purchase Order:</span>
                                                <span className="font-semibold">{note.purchaseOrder}</span>
                                            </div>
                                        )}
                                        {note.inventoryLocation && (
                                            <div className="flex">
                                                <span className="w-36 text-gray-500">Inventory Location:</span>
                                                <span className="font-semibold">{note.inventoryLocation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Logo */}
                        <div className="w-[180px] shrink-0 pt-2 animate-in fade-in zoom-in-95 duration-700">
                            <img src="/logo.png" alt="Company Logo" className="w-full object-contain" />
                        </div>
                    </div>

                    {/* Memo / Description */}
                    {note.description && (
                        <div className="mb-10 p-6 bg-slate-50/50 rounded-xl border border-slate-100 print-bg-slate-50">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Info size={12} /> Received Memo
                            </h2>
                            <p className="text-gray-600 leading-relaxed italic">{note.description}</p>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="mb-14 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f8fafc] border-y border-gray-200 text-right print-bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Item</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Description</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-32">Qty Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.map((item: any, idx: number) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-semibold text-slate-900 uppercase tracking-tight">
                                                {typeof item.item === 'object' ? (item.item?.itemName || item.item?.name) : (item.item || item.itemName || 'Unnamed Item')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            {item.description ? <p className="text-[12px] text-gray-500 leading-relaxed italic">{item.description}</p> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-slate-900">{item.qty}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.unit || 'PCS'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayItems.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-10 text-center text-slate-400 italic text-sm" colSpan={4}>No received items found in this note.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Summary */}
                    <div className="flex justify-end mb-20">
                        <div className="w-72 space-y-3">
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">Total Qty Received</span>
                                <span className="font-semibold">{totalQty}</span>
                            </div>
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">Item Types</span>
                                <span className="font-semibold">{displayItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Final Count</span>
                                <span className="text-2xl font-bold text-slate-900 tracking-tighter">{totalQty}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="mt-24 grid grid-cols-2 gap-20 px-4">
                        <div className="space-y-4">
                            <div className="h-px bg-slate-200 w-full mb-6 relative">
                                <div className="absolute -top-3 left-0 bg-white pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Received By / Carrier</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Name / ID</p>
                                    <div className="h-6 border-b border-slate-100"></div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Date / Time</p>
                                    <div className="h-6 border-b border-slate-100"></div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-px bg-slate-200 w-full mb-6 relative">
                                <div className="absolute -top-3 left-0 bg-white pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Storekeeper Signature</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Name / ID</p>
                                    <div className="h-6 border-b border-slate-100"></div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Signature</p>
                                    <div className="h-6 border-b border-slate-100"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ViewGoodsReceiptView;
