import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/apiService'; 
import EmailComposerModal from '../components/shared/EmailComposerModal';
import DocumentActionBar from '../components/shared/DocumentActionBar';
import { Invoice, Customer } from '../types';
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
    Package
} from 'lucide-react';
import Badge from '../components/shared/Badge';
import { cn } from '../utils/cn';
import DocumentPrintHeader, { DOCUMENT_PRINT_CSS } from '../components/shared/DocumentPrintHeader';

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB').replace(/\//g, '.');
    } catch (e) {
        return dateStr;
    }
};

const ViewSalesInvoiceView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const [invoice, setInvoice] = useState<any>(null);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [data, codes] = await Promise.all([
                    apiService.getInvoice(id),
                    apiService.getTaxCodes().catch(() => [])
                ]);
                setInvoice(data);
                setTaxCodes(codes);
            } catch (err) {
                console.error('Failed to fetch invoice:', err);
                // Fallback to searching in list if single fetch fails
                try {
                    const invoices = await apiService.getInvoices();
                    const found = invoices.find((inv: any) => inv.id === id);
                    if (found) setInvoice(found);
                } catch (e) { }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const customerData = invoice?.customer;
    const customerEmail = customerData?.email || '';

    const totals = useMemo(() => {
        if (!invoice) return { subtotal: 0, tax: 0, total: 0 };
        const totalAmount = parseFloat(String(invoice.grandTotal || invoice.invoiceAmount || invoice.amount || 0));
        const options = invoice.docOptions || {};
        const isTaxInclusive = options.amountsAreTaxInclusive || false;

        if (!invoice.items || invoice.items.length === 0) {
            const defaultTax = taxCodes.find(tc => tc.name === 'VAT 16%') || { rate: 16 };
            const taxRate = (parseFloat(defaultTax.rate) || 16) / 100;
            const tax = isTaxInclusive ? totalAmount * taxRate / (1 + taxRate) : totalAmount * taxRate;
            return { subtotal: isTaxInclusive ? totalAmount - tax : totalAmount, tax, total: totalAmount };
        }

        let subtotal = 0;
        let tax = 0;
        invoice.items.forEach((item: any) => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const lineTotal = qty * price;
            
            let taxRate = 0;
            const itemTaxCode = (item.taxCode || item.tax_codes?.name || '').toString().toLowerCase().trim();
            const itemTaxId = item.tax_code_id || item.taxCode;
            const selectedTax = taxCodes.find(tc => 
                tc.id === itemTaxId || 
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
        return { subtotal, tax, total: totalAmount || subtotal + tax };
    }, [invoice, taxCodes]);

    const handleMoveToDeliveryNote = async () => {
        if (!invoice) return;
        try {
            const newNote = {
                customerId: invoice.customerId,
                reference: `DN-${invoice.reference.split('-').pop()}`,
                description: `Shipment for Invoice ${invoice.reference}`,
                items: (invoice.items || []).map((it: any) => ({
                    itemId: it.itemId,
                    qty: it.qty
                }))
            };
            await apiService.createDeliveryNote(newNote);
            await apiService.updateInvoiceStatus(invoice.id, 'Delivered');
            navigate('/delivery-notes');
        } catch (err) {
            console.error('Failed to create delivery note:', err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsCopyToOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Loading invoice...</div>;
    if (!invoice) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Invoice not found.</div>;

    return (
        <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans">
            {/* Compact Action Toolbar */}
            <DocumentActionBar
                documentId={invoice.id}
                documentType="sales-invoice"
                reference={invoice.reference}
                editUrl={`/sales-invoices/edit/${invoice.id}`}
                cloneUrl={`/sales-invoices/new?copyFrom=${invoice.id}`}
                copyToOptions={[
                    { label: 'Sales Quote', url: `/sales-quotes/new?copyFrom=${invoice.id}` },
                    { label: 'Sales Order', url: `/sales-orders/new?copyFrom=${invoice.id}` },
                    { label: 'Sales Invoice', url: `/sales-invoices/new?copyFrom=${invoice.id}` },
                    { label: 'Delivery Note', onClick: handleMoveToDeliveryNote },
                    { label: 'Credit Note', url: `/credit-notes/new?copyFrom=${invoice.id}` },
                    { label: 'Receipt', url: `/receipts/new?copyFrom=${invoice.id}` }
                ]}
                pdfRef={pdfRef}
                onEmail={() => setIsEmailModalOpen(true)}
                navigation={{
                    currentIndex: 0,
                    totalCount: 1,
                }}
                showTransactionJournal={true}
                showAttachments={true}
            />

            <EmailComposerModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                defaultTo={customerEmail || ''}
                defaultSubject={`Sales Invoice: ${invoice.reference}`}
                defaultBody={`Dear ${typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.name || 'Customer/Supplier' },\n\nPlease find attached our sales invoice ${invoice.reference}.\n\nKind regards.`}
                attachmentName={`${invoice.reference || 'Document'}.pdf`}
                onSend={async (emailData) => {
                    try {
                        const element = pdfRef.current;
                        if (!element) throw new Error('Document element not found');

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

                        await apiService.sendEmailWithAttachment(emailData, pdfBlob, `${invoice.reference || 'Invoice'}.pdf`);
                        alert('Email sent successfully!');
                    } catch (err: any) {
                        console.error('Email send failed:', err);
                        throw err;
                    }
                }}
            />

            <div className="flex-1 p-6 flex justify-start overflow-auto print:p-0">
                <div className="print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative" ref={pdfRef}>
                    <style>{DOCUMENT_PRINT_CSS}</style>

                    <DocumentPrintHeader
                        title={invoice.docOptions?.customTitleValue || 'Sales Invoice'}
                        reference={invoice.reference}
                    />

                    <div className="grid grid-cols-2 gap-12 items-start mb-10">
                                {/* Billed To */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Billed To</h3>
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{invoice.customer?.name || 'Unknown Customer'}</p>
                                    <div className="text-gray-500 space-y-1">
                                        <p className="whitespace-pre-wrap">{invoice.customer?.billingAddress || invoice.billingAddress || '-'}</p>
                                        {customerEmail && <p className="text-blue-600 lowercase">{customerEmail}</p>}
                                        {invoice.customer?.tpin && <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">TPIN: {invoice.customer.tpin}</p>}
                                    </div>
                                </div>

                                {/* Invoice Details */}
                                <div className="border-l border-gray-100 pl-12">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Invoice Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Issue Date:</span>
                                            <span className="font-semibold">{formatDate(invoice.issueDate)}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Due Date:</span>
                                            <span className="font-semibold">
                                                {(() => {
                                                    if (invoice.dueDate) return formatDate(invoice.dueDate);
                                                    if (invoice.issueDate) {
                                                        const d = new Date(invoice.issueDate);
                                                        d.setDate(d.getDate() + 30);
                                                        return d.toLocaleDateString('en-GB').replace(/\//g, '.');
                                                    }
                                                    return '-';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Currency:</span>
                                            <span className="font-semibold">{invoice.currency || invoice.customer?.currency?.split(' - ')[0] || 'ZMW'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Division:</span>
                                            <span className="font-semibold">{invoice.items?.[0]?.division || invoice.docOptions?.division || invoice.customer?.division || 'General'}</span>
                                        </div>
                                        {invoice.status && (
                                            <div className="flex">
                                                <span className="w-32 text-gray-500">Status:</span>
                                                <Badge variant={invoice.status === 'Paid' ? 'success' : invoice.status === 'Overdue' ? 'danger' : 'warning'}>
                                                    {invoice.status}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
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
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Division</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Qty</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Unit Price</th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-semibold text-slate-900">{item.item?.itemName || item.item || item.itemName || '-'}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-gray-500">
                                                {item.description || item.item?.description || (item.item?.itemName || item.item || item.itemName || '-')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-gray-500">{item.division || 'General'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium">{item.qty}</td>
                                        <td className="px-4 py-4 text-right font-medium">{(parseFloat(item.unitPrice as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-4 text-right font-semibold">{(parseFloat(item.totalAmount as any) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">No items found in this invoice.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Area: Totals */}
                    <div className="flex justify-between items-start gap-12">
                        {/* Summary Section */}
                        <div className="flex-1"></div>
                        <div className="w-80 space-y-3">
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">{invoice.docOptions?.amountsAreTaxInclusive ? 'Net (excl. VAT)' : 'Subtotal'}</span>
                                <span className="font-semibold">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-bold uppercase tracking-widest">{invoice.docOptions?.amountsAreTaxInclusive ? 'VAT' : 'Tax Component'} {totals.subtotal > 0 && totals.tax > 0 ? `(${((totals.tax / totals.subtotal) * 100).toFixed(1).replace(/\.0$/, '')}%)` : ''}</span>
                                <span className="font-semibold">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Total</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{(invoice.currency || invoice.customer?.currency?.split(' - ')[0] || 'ZMW').split(' ')[0]}</p>
                                    <p className="text-2xl font-bold text-slate-900 tracking-tighter">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-100 px-8 py-4 border-t border-gray-200 flex justify-end no-print">
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/sales-invoices/print-batch?ids=${invoice.id}`)} className="bg-white border border-gray-300 px-6 py-2 text-[11px] font-bold text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition uppercase tracking-widest flex items-center gap-2">
                        <Printer size={14} /> Print Document
                    </button>
                    <button onClick={() => navigate(`/sales-invoices/edit/${invoice.id}`)} className="bg-blue-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-blue-700 transition uppercase tracking-widest flex items-center gap-2">
                        <Edit size={14} /> Edit Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewSalesInvoiceView;
