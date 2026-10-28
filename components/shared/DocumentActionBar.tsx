import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Edit, Copy, Printer, FileText, Mail, ChevronDown, ChevronLeft, 
    ChevronRight, ChevronsLeft, ChevronsRight, Paperclip, BookOpen, X, Download
} from 'lucide-react';
import DocumentAttachments from './DocumentAttachments';
import { api } from '../../services/apiService';

export interface CopyToOption {
    label: string;
    onClick?: () => void;
    url?: string;
}

export interface NavigationProps {
    currentIndex: number;
    totalCount: number;
    onFirst?: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    onLast?: () => void;
}

export interface DocumentActionBarProps {
    documentId: string;
    documentType: string;
    reference?: string;
    onEdit?: () => void;
    editUrl?: string;
    onClone?: () => void;
    cloneUrl?: string;
    copyToOptions?: CopyToOption[];
    onPrint?: () => void;
    onPdf?: () => void;
    pdfRef?: React.RefObject<HTMLDivElement | null>;
    onEmail?: () => void;
    navigation?: NavigationProps;
    showTransactionJournal?: boolean;
    showAttachments?: boolean;
}

export const DocumentActionBar: React.FC<DocumentActionBarProps> = ({
    documentId,
    documentType,
    reference,
    onEdit,
    editUrl,
    onClone,
    cloneUrl,
    copyToOptions = [],
    onPrint,
    onPdf,
    pdfRef,
    onEmail,
    navigation,
    showTransactionJournal = true,
    showAttachments = true,
}) => {
    const navigate = useNavigate();
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
    const [journalEntries, setJournalEntries] = useState<any[]>([]);
    const [isJournalLoading, setIsJournalLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCopyToOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = () => {
        if (onEdit) onEdit();
        else if (editUrl) navigate(editUrl);
    };

    const handleClone = () => {
        if (onClone) onClone();
        else if (cloneUrl) navigate(cloneUrl);
    };

    const handlePrint = () => {
        if (onPrint) onPrint();
        else window.print();
    };

    const handlePdf = async () => {
        if (onPdf) {
            onPdf();
            return;
        }
        if (!pdfRef?.current) {
            window.print();
            return;
        }
        try {
            const html2canvas = (await import('html2canvas-pro')).default;
            const jsPDF = (await import('jspdf')).jsPDF;
            const element = pdfRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${reference || 'Document'}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            window.print();
        }
    };

    const handleOpenJournal = async () => {
        setIsJournalOpen(true);
        setIsJournalLoading(true);
        try {
            const res = await api.get(`/ledger/document/${documentId}`);
            setJournalEntries(res.data || []);
        } catch (err) {
            console.error('Failed to load transaction journal:', err);
            setJournalEntries([]);
        } finally {
            setIsJournalLoading(false);
        }
    };

    return (
        <>
            <div className="bg-white px-8 py-2.5 border-b border-gray-200 flex justify-between items-center text-[12px] no-print select-none shadow-xs sticky top-0 z-30">
                <div className="flex items-center space-x-2">
                    {/* EDIT */}
                    {(onEdit || editUrl) && (
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                        >
                            <Edit size={13} className="text-gray-500" />
                            <span>Edit</span>
                        </button>
                    )}

                    {/* CLONE */}
                    {(onClone || cloneUrl) && (
                        <button
                            type="button"
                            onClick={handleClone}
                            className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                        >
                            <Copy size={13} className="text-gray-500" />
                            <span>Clone</span>
                        </button>
                    )}

                    {/* COPY TO */}
                    {copyToOptions.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                                className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                            >
                                <span>Copy To</span>
                                <ChevronDown size={13} className="text-gray-400" />
                            </button>
                            {isCopyToOpen && (
                                <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {copyToOptions.map((opt, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setIsCopyToOpen(false);
                                                if (opt.onClick) opt.onClick();
                                                else if (opt.url) navigate(opt.url);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="w-[1px] h-5 bg-gray-200 mx-2"></div>

                    {/* PRINT */}
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                        <Printer size={13} className="text-gray-500" />
                        <span>Print</span>
                    </button>

                    {/* PDF */}
                    <button
                        type="button"
                        onClick={handlePdf}
                        className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                        <Download size={13} className="text-gray-500" />
                        <span>PDF</span>
                    </button>

                    {/* EMAIL */}
                    {onEmail && (
                        <button
                            type="button"
                            onClick={onEmail}
                            className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                        >
                            <Mail size={13} className="text-gray-500" />
                            <span>Email</span>
                        </button>
                    )}

                    <div className="w-[1px] h-5 bg-gray-200 mx-2"></div>

                    {/* ATTACHMENTS */}
                    {showAttachments && (
                        <button
                            type="button"
                            onClick={() => setIsAttachmentsOpen(true)}
                            className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                        >
                            <Paperclip size={13} className="text-gray-500" />
                            <span>Attachments</span>
                        </button>
                    )}

                    {/* TRANSACTION JOURNAL */}
                    {showTransactionJournal && documentId && (
                        <button
                            type="button"
                            onClick={handleOpenJournal}
                            className="bg-white border border-gray-300 px-3.5 py-1.5 font-bold text-indigo-700 rounded shadow-xs hover:bg-indigo-50/50 flex items-center gap-1.5 transition-colors"
                        >
                            <BookOpen size={13} className="text-indigo-600" />
                            <span>Transaction Journal</span>
                        </button>
                    )}
                </div>

                {/* NAVIGATION */}
                {navigation && navigation.totalCount > 0 && (
                    <div className="flex items-center space-x-1">
                        <div className="flex bg-white border border-gray-300 rounded shadow-xs">
                            <button
                                type="button"
                                onClick={navigation.onFirst}
                                disabled={navigation.currentIndex <= 0}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 disabled:hover:bg-white"
                                title="First Document"
                            >
                                <ChevronsLeft size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={navigation.onPrev}
                                disabled={navigation.currentIndex <= 0}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white"
                                title="Previous Document"
                            >
                                <ChevronLeft size={13} />
                            </button>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest font-mono">
                            {navigation.currentIndex + 1} / {navigation.totalCount}
                        </span>
                        <div className="flex bg-white border border-gray-300 rounded shadow-xs">
                            <button
                                type="button"
                                onClick={navigation.onNext}
                                disabled={navigation.currentIndex >= navigation.totalCount - 1}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 disabled:hover:bg-white"
                                title="Next Document"
                            >
                                <ChevronRight size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={navigation.onLast}
                                disabled={navigation.currentIndex >= navigation.totalCount - 1}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white"
                                title="Last Document"
                            >
                                <ChevronsRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* TRANSACTION JOURNAL MODAL */}
            {isJournalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center space-x-2.5">
                                <BookOpen size={18} className="text-indigo-600" />
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">General Ledger Journal Entries</h3>
                                    <p className="text-[11px] font-bold text-slate-400">Document #{reference || documentId}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsJournalOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[500px] overflow-y-auto">
                            {isJournalLoading ? (
                                <div className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                                    Loading ledger journal postings...
                                </div>
                            ) : journalEntries.length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                                    No General Ledger entries recorded for this document.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">
                                            <th className="py-2.5 px-3">Account</th>
                                            <th className="py-2.5 px-3 text-right">Debit (ZMW)</th>
                                            <th className="py-2.5 px-3 text-right">Credit (ZMW)</th>
                                            <th className="py-2.5 px-3 text-right">Foreign (FC)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {journalEntries.map((row: any) => (
                                            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                                                    {row.accountCode ? <span className="font-mono text-slate-400 mr-2">[{row.accountCode}]</span> : null}
                                                    {row.accountName}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                                    {row.debit > 0 ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                                    {row.credit > 0 ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-slate-500">
                                                    {row.currency !== 'ZMW' && (row.foreignDebit > 0 || row.foreignCredit > 0)
                                                        ? `${row.currency} ${(row.foreignDebit || row.foreignCredit).toFixed(2)} (@ ${row.exchangeRate})`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-300 font-black text-slate-900 bg-slate-50">
                                            <td className="py-3 px-3 uppercase text-[10px] tracking-wider font-sans">Total Postings:</td>
                                            <td className="py-3 px-3 text-right font-mono text-indigo-700">
                                                {journalEntries.reduce((s, r) => s + Number(r.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-indigo-700">
                                                {journalEntries.reduce((s, r) => s + Number(r.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsJournalOpen(false)}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors uppercase tracking-wider"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ATTACHMENTS MODAL */}
            {isAttachmentsOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center space-x-2.5">
                                <Paperclip size={18} className="text-indigo-600" />
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Document Attachments</h3>
                                    <p className="text-[11px] font-bold text-slate-400">Document #{reference || documentId}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAttachmentsOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <DocumentAttachments
                                documentType={documentType}
                                documentId={documentId}
                            />
                        </div>

                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAttachmentsOpen(false)}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors uppercase tracking-wider"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DocumentActionBar;
