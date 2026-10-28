import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import DocumentActionBar from '../components/shared/DocumentActionBar';
import { formatDateDMY } from '../utils/dateUtils';
import { Payment as PaymentType } from '../types';
import {
    FolderOpen, ChevronRight, Edit, Printer, FileText, Mail,
    ChevronsLeft, ChevronLeft, ChevronRight as ChevronRightIcon,
    ChevronsRight, ChevronDown, Download
} from 'lucide-react';

const ViewPaymentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [payment, setPayment] = useState<PaymentType | null>(null);
    const [allPayments, setAllPayments] = useState<PaymentType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const paymentIndex = allPayments.findIndex(r => r.id === id || r.reference === id);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [paymentData, payments] = await Promise.all([
                    apiService.getPayment(id!),
                    apiService.getPayments()
                ]);
                setPayment(paymentData);
                setAllPayments(payments);
            } catch (err) {
                console.error('Failed to fetch payment:', err);
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
        if (paymentIndex < allPayments.length - 1) {
            navigate(`/payments/view/${allPayments[paymentIndex + 1].id}`);
        }
    };
    const handlePrev = () => {
        if (paymentIndex > 0) {
            navigate(`/payments/view/${allPayments[paymentIndex - 1].id}`);
        }
    };
    const handleFirst = () => navigate(`/payments/view/${allPayments[0].id}`);
    const handleLast = () => navigate(`/payments/view/${allPayments[allPayments.length - 1].id}`);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing payment view...</p>
            </div>
        );
    }

    if (!payment) {
        return (
            <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest">
                <p>Payment not found.</p>
                <button onClick={() => navigate('/payments')} className="mt-4 text-blue-500 hover:underline">Return to list</button>
            </div>
        );
    }

    return (
        <div className="bg-slate-100 min-h-full flex flex-col font-sans">
            {/* Breadcrumb */}
            <div className="bg-white px-6 py-2 border-b border-gray-200 flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-widest space-x-1.5 select-none no-print shadow-sm">
                <FolderOpen size={14} className="text-blue-500" />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/payments" className="text-blue-500 hover:text-blue-700 transition-colors">Payments</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-400">View</span>
            </div>

            <DocumentActionBar
                documentId={payment.id}
                documentType="Payment"
                reference={payment.reference}
                editUrl={`/payments/edit/${payment.id}`}
                cloneUrl={`/payments/new?copyFrom=${payment.id}`}
                copyToOptions={[
                    { label: 'New Receipt', url: `/receipts/new?copyFrom=${payment.id}` }
                ]}
                pdfRef={pdfRef}
                navigation={{
                    currentIndex: Math.max(0, paymentIndex),
                    totalCount: allPayments.length,
                    onFirst: handleFirst,
                    onPrev: handlePrev,
                    onNext: handleNext,
                    onLast: handleLast
                }}
            />



            {/* Document */}
            <div className="flex-1 p-6 flex justify-center overflow-auto bg-slate-100">
                <div className="print-container bg-white shadow-xl p-12 w-full max-w-[850px] min-h-[1100px] relative font-sans text-gray-900 border border-gray-200" ref={pdfRef}>
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
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">{payment.customTitle || 'Payment'}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Reference: {payment.reference}</p>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">{payment.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 items-start">
                                {/* Paid By */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Paid By</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{payment.paidToContact}</p>
                                    {payment.paidToOptional && <p className="text-gray-500 italic">{payment.paidToOptional}</p>}
                                    <div className="mt-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Received In</h4>
                                        <p className="text-sm font-semibold">{payment.paidFromAccount}</p>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Date:</span>
                                            <span className="font-semibold">{formatDateDMY(payment.date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Reference:</span>
                                            <span className="font-semibold">{payment.reference}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-500">Currency:</span>
                                            <span className="font-semibold">{payment.currency}</span>
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
                        <p className="text-[13px] text-gray-600 italic">Description: {payment.description}</p>
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
                            {payment.items?.map((item: any, idx: number) => (
                                <tr key={item.id || idx}>
                                    <td className="border border-gray-300 p-2">{item.account}</td>
                                    <td className="border border-gray-300 p-2">{item.description}</td>
                                    <td className="border border-gray-300 p-2 text-right">{parseFloat(item.amount || item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )) || (
                                    <tr>
                                        <td className="border border-gray-300 p-2" colSpan={2}>General Payment</td>
                                        <td className="border border-gray-300 p-2 text-right font-bold">{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="border border-gray-300 p-2 text-right font-bold uppercase bg-gray-50 print-bg-slate-50">Total {payment.currency}</td>
                                <td className="border border-gray-300 p-2 text-right font-bold bg-gray-50 print-bg-slate-50">{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {payment.footers && (
                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-[12px] text-gray-500 whitespace-pre-wrap">{payment.footers}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="no-print mt-8 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <DocumentAttachments documentType="payment" documentId={id} readOnly />
            </div>
        </div>
    );
};

export default ViewPaymentView;
