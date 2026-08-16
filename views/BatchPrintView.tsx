import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Printer, ChevronLeft } from 'lucide-react';
import { Customer } from '../types';
import apiService from '../services/apiService';

const BatchPrintView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { type } = useParams();

    const searchParams = new URLSearchParams(location.search);
    const selectedIds = searchParams.get('ids')?.split(',') || [];
    const reportType = searchParams.get('reportType'); // 'cogs' or 'transactions'
    const singleInvoiceId = searchParams.get('invoiceId');

    const isCustomers = type === 'customers';
    const isSuppliers = type === 'suppliers';
    const isSalesQuotes = type === 'sales-quotes';
    const isSalesOrders = type === 'sales-orders';
    const isSalesInvoices = type === 'sales-invoices';
    const isDeliveryNotes = type === 'delivery-notes';
    const isReceipts = type === 'receipts';
    const isPurchaseQuotes = type === 'purchase-quotes';
    const isPurchaseOrders = type === 'purchase-orders';

    const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
    const [allSuppliers, setAllSuppliers] = React.useState<any[]>([]);
    const [allQuotes, setAllQuotes] = React.useState<any[]>([]);
    const [allOrders, setAllOrders] = React.useState<any[]>([]);
    const [allInvoices, setAllInvoices] = React.useState<any[]>([]);
    const [allDeliveryNotes, setAllDeliveryNotes] = React.useState<any[]>([]);
    const [allReceipts, setAllReceipts] = React.useState<any[]>([]);
    const [allPurchaseQuotes, setAllPurchaseQuotes] = React.useState<any[]>([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = React.useState<any[]>([]);
    const [allFooters, setAllFooters] = React.useState<any[]>([]);
    const [taxCodes, setTaxCodes] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    useEffect(() => {
        const fetchBaseData = async () => {
            setIsLoading(true);
            try {
                const [custs, supps, quotes, orders, invs, dns, rects, pQuotes, pOrders, footers, codes] = await Promise.all([
                    apiService.getCustomers().catch(() => []),
                    apiService.getSuppliers().catch(() => []),
                    apiService.getQuotes().catch(() => []),
                    apiService.getOrders().catch(() => []),
                    apiService.getInvoices().catch(() => []),
                    apiService.getDeliveryNotes().catch(() => []),
                    apiService.getReceipts().catch(() => []),
                    apiService.getPurchaseEnquiries().catch(() => []),
                    apiService.getPurchaseOrders().catch(() => []),
                    apiService.getFooters().catch(() => []),
                    apiService.getTaxCodes().catch(() => [])
                ]);

                // Fallback for potentially missing records (deep fetch)
                let finalSupps = [...supps];
                let finalCusts = [...custs];
                let finalQuotes = [...quotes];
                let finalOrders = [...orders];
                let finalInvs = [...invs];

                const missingIds = selectedIds.filter(id => {
                    const tid = id.trim().toLowerCase();
                    if (isSuppliers) return !supps.find(s => s.id?.toString().toLowerCase() === tid);
                    if (isCustomers) return !custs.find(c => c.id?.toString().toLowerCase() === tid);
                    if (isSalesQuotes) return !quotes.find(q => q.id?.toString().toLowerCase() === tid);
                    if (isSalesOrders) return !orders.find(o => o.id?.toString().toLowerCase() === tid);
                    if (isSalesInvoices) return !invs.find(i => i.id?.toString().toLowerCase() === tid);
                    return false;
                });

                if (missingIds.length > 0) {
                    console.log(`Deep fetching ${missingIds.length} missing records...`);
                    const recovered = await Promise.all(missingIds.map(async (id) => {
                        try {
                            if (isSuppliers) return await apiService.getSupplier(id);
                            if (isCustomers) return await apiService.getCustomer(id);
                            if (isSalesQuotes) return await apiService.getQuote(id);
                            if (isSalesOrders) return await apiService.getOrder(id);
                            if (isSalesInvoices) return await apiService.getInvoice(id);
                        } catch (e) { return null; }
                    }));
                    
                    const validRecovered = recovered.filter(Boolean);
                    if (isSuppliers) finalSupps = [...finalSupps, ...validRecovered];
                    if (isCustomers) finalCusts = [...finalCusts, ...validRecovered];
                    if (isSalesQuotes) finalQuotes = [...finalQuotes, ...validRecovered];
                    if (isSalesOrders) finalOrders = [...finalOrders, ...validRecovered];
                    if (isSalesInvoices) finalInvs = [...finalInvs, ...validRecovered];
                }

                setAllCustomers(finalCusts);
                setAllSuppliers(finalSupps);
                setAllQuotes(finalQuotes);
                setAllOrders(finalOrders);
                setAllInvoices(finalInvs);
                setAllDeliveryNotes(dns);
                setAllReceipts(rects);
                setAllPurchaseQuotes(pQuotes);
                setAllPurchaseOrders(pOrders);
                setAllFooters(footers);
                setTaxCodes(codes);
            } catch (err) {
                console.error('Failed to fetch print data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBaseData();
    }, [isSuppliers, isCustomers, isSalesQuotes, isSalesOrders, isSalesInvoices, selectedIds.join(',')]);

    const items = useMemo(() => {
        // Handle Single-Invoice Detail Reports (Selected Lines)
        if (singleInvoiceId && reportType) {
            const invoice = allInvoices.find(inv => inv.id === singleInvoiceId || inv.id === `inv-${singleInvoiceId}` || inv.id.toString() === singleInvoiceId);
            if (!invoice) return [];

            if (reportType === 'cogs') {
                const cogsLines = (invoice.items || []).map((item: any, idx: number) => ({
                    id: item.id || `cogs-${idx}`,
                    itemName: item.item || item.itemName,
                    description: item.description,
                    qty: parseFloat(item.qty) || 0,
                    unitCost: (parseFloat(item.unitPrice) || 0) * 0.7,
                    totalCost: ((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)) * 0.7,
                    invoiceRef: invoice.reference,
                    customer: invoice.customer?.name || invoice.customer,
                    issueDate: invoice.issueDate,
                    reportType: 'cogs'
                }));
                return [{
                    id: `report-${invoice.id}`,
                    type: 'cogs',
                    title: 'Cost of Sales Report',
                    label: 'COGS BREAKDOWN',
                    invoice,
                    data: cogsLines.filter((line: any) => selectedIds.includes(line.id.toString()))
                }];
            }

            if (reportType === 'transactions') {
                const transactions = [
                    { id: 't1', date: invoice.issueDate, type: 'Sales Invoice', reference: invoice.reference, amount: invoice.invoiceAmount || invoice.grandTotal, balance: invoice.invoiceAmount || invoice.grandTotal },
                ];
                return [{
                    id: `report-${invoice.id}`,
                    type: 'transactions',
                    title: 'Statement of Transactions',
                    label: 'ACCOUNT ACTIVITY',
                    invoice,
                    data: transactions.filter(t => selectedIds.includes(t.id))
                }];
            }
        }

        // Handle Multi-Invoice Detail Reports (Batch from Main List)
        if (!singleInvoiceId && reportType && isSalesInvoices) {
            const invoices = allInvoices.filter(inv => selectedIds.includes(inv.id));
            return invoices.map(inv => {
                if (reportType === 'cogs') {
                    const cogsLines = (inv.items || []).map((item: any, idx: number) => ({
                        id: item.id || `cogs-${idx}`,
                        itemName: item.item || item.itemName,
                        description: item.description,
                        qty: parseFloat(item.qty) || 0,
                        unitCost: (parseFloat(item.unitPrice) || 0) * 0.7,
                        totalCost: ((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)) * 0.7,
                        invoiceRef: inv.reference,
                        customer: inv.customer?.name || inv.customer,
                        issueDate: inv.issueDate,
                        reportType: 'cogs'
                    }));
                    return {
                        id: `report-${inv.id}`,
                        type: 'cogs',
                        title: 'Cost of Sales Report',
                        label: 'COGS BREAKDOWN',
                        invoice: inv,
                        data: cogsLines
                    };
                }

                const transactions = [
                    { id: 't1', date: inv.issueDate, type: 'Sales Invoice', reference: inv.reference, amount: inv.invoiceAmount || inv.grandTotal, balance: inv.invoiceAmount || inv.grandTotal },
                ];
                return {
                    id: `report-${inv.id}`,
                    type: 'transactions',
                    title: 'Statement of Transactions',
                    label: 'ACCOUNT ACTIVITY',
                    invoice: inv,
                    data: transactions
                };
            });
        }

        // Default Batch Prints (Documents/Customers)
        if (isSuppliers) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const found = allSuppliers.find(s => s.id?.toString().toLowerCase() === id);
                if (found) return found;
                // Return a clear placeholder if still not found after deep fetch
                return { 
                    id, 
                    name: `Record Not Found (${id})`, 
                    code: 'MISSING', 
                    isMissing: true,
                    division: 'Unknown',
                    email: 'N/A'
                };
            });
        }

        if (isCustomers) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const found = allCustomers.find(c => c.id?.toString().toLowerCase() === id);
                if (found) return found;
                return { id, name: `Record Not Found (${id})`, code: 'MISSING', isMissing: true };
            });
        }

        if (isSalesQuotes) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const found = allQuotes.find(q => q.id?.toString().toLowerCase() === id);
                if (found) return {
                    ...found,
                    _docType: 'sales-quote',
                    customerName: found.customer?.name || found.customer || 'Unknown',
                    currency: found.currency || found.customer?.currency?.split(' - ')[0] || 'ZMW'
                };
                return { id, isMissing: true, _docType: 'sales-quote' };
            });
        }

        if (isSalesOrders) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const o = allOrders.find(order => order.id?.toString().toLowerCase() === id);
                if (!o) return { id, isMissing: true, _docType: 'sales-order' };
                return {
                    ...o,
                    _docType: 'sales-order',
                    customerName: o.customer?.name || o.customer || 'Unknown',
                    currency: o.currency || o.customer?.currency?.split(' - ')[0] || 'ZMW',
                    orderDate: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    items: (o.items || []).map((it: any) => ({
                        ...it,
                        item: it.item?.itemName || it.itemName || it.item || 'Select Item',
                        description: it.description || it.item?.description || '',
                        total: (parseFloat(it.qty) * parseFloat(it.unitPrice)).toFixed(2)
                    }))
                };
            });
        }

        if (isSalesInvoices) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const i = allInvoices.find(inv => inv.id?.toString().toLowerCase() === id);
                if (!i) return { id, isMissing: true, _docType: 'sales-invoice' };
                return {
                    ...i,
                    _docType: 'sales-invoice',
                    customerName: i.customer?.name || i.customer || 'Unknown',
                    currency: i.currency || i.customer?.currency?.split(' - ')[0] || 'ZMW'
                };
            });
        }

        if (isDeliveryNotes) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => {
                const dn = allDeliveryNotes.find((d: any) => d.id?.toString().toLowerCase() === id);
                if (!dn) return { id, isMissing: true, _docType: 'delivery-note' };
                return {
                    ...dn,
                    _docType: 'delivery-note',
                    customerName: dn.customer?.name || dn.customer || 'Unknown'
                };
            });
        }

        if (isReceipts) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => 
                allReceipts.find(r => r.id?.toString().toLowerCase() === id)
            ).filter(Boolean).map(r => ({
                ...r,
                customer: r.customer?.name || r.customer || 'Unknown'
            }));
        }

        if (isPurchaseQuotes) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => 
                allPurchaseQuotes.find(q => q.id?.toString().toLowerCase() === id)
            ).filter(Boolean).map(q => ({
                ...q,
                supplierName: q.supplier?.name || q.supplier || 'Unknown'
            }));
        }

        if (isPurchaseOrders) {
            const normalizedIds = selectedIds.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
            return normalizedIds.map(id => 
                allPurchaseOrders.find(o => o.id?.toString().toLowerCase() === id)
            ).filter(Boolean).map(o => ({
                ...o,
                supplierName: o.supplier?.name || o.supplier || 'Unknown'
            }));
        }

        return [];
    }, [allCustomers, allSuppliers, allQuotes, allOrders, allInvoices, allDeliveryNotes, allReceipts, allPurchaseQuotes, allPurchaseOrders, selectedIds, isCustomers, isSuppliers, isSalesQuotes, isPurchaseQuotes, isPurchaseOrders, isSalesOrders, isSalesInvoices, reportType, singleInvoiceId]);

    useEffect(() => {
        console.log('BatchPrintView Print Check:', { isLoading, itemsCount: items.length });
        if (!isLoading && items.length > 0) {
            const timer = setTimeout(() => {
                console.log('Executing window.print()');
                window.print();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isLoading, items]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Documents...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
                <div className="bg-white p-12 rounded-[32px] shadow-xl border border-slate-100 text-center max-w-md">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-4">No Data Selected</p>
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Nothing to Print</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen p-0 sm:p-12 font-sans">
            <style>{`
                @media print {
                    @page { margin: 15mm; size: auto; }
                    html, body, #root, #root > div, main { 
                        background: white !important; 
                        padding: 0 !important; 
                        -webkit-print-color-adjust: exact; 
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
                        padding: 24px !important;
                        background: white !important;
                    }
                    .status-badge-print { 
                        display: block !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .summary-box-print { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        background-color: #f8fafc !important; 
                        border: none !important;
                    }
                    .summary-box-print * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .print-break { page-break-after: always; }
                    .document-page { 
                        box-shadow: none !important; 
                        border: none !important; 
                        width: 100% !important; 
                        max-width: none !important; 
                        break-inside: avoid;
                        height: auto !important;
                        min-height: auto !important;
                    }
                }
            `}</style>

            <div className="max-w-[850px] mx-auto space-y-12 relative pt-24 pb-12 print:pt-0 print:pb-0 print:space-y-0">
                <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[100] px-8 py-4 flex justify-between items-center no-print">
                    <div className="flex items-center space-x-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Print Package</span>
                            <span className="text-[16px] font-black text-slate-900 tracking-tight">
                                {reportType ? `${items.length} Reports` : `${items.length} Documents`} Ready
                            </span>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => window.print()}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-3"
                        >
                            <Printer size={16} /> <span>Start Printing</span>
                        </button>
                    </div>
                </div>

                {items.map((item: any, index) => {
                    const isReport = item.type === 'cogs' || item.type === 'transactions';

                    if (isReport) {
                        return (
                            <div key={item.id} className={`document-page print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative mx-auto ${index < items.length - 1 ? 'print-break mb-12' : ''}`}>
                                <div className="flex justify-between items-start mb-16">
                                    <div>
                                        <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3 block opacity-50">{item.label}</span>
                                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{item.title}</h1>
                                        <div className="w-20 h-2 bg-slate-900 mt-6 rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <div className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-4">ERP SYSTEM MANAGEMENT SUITE</div>
                                        <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest space-y-1">
                                            <p>123 Enterprise Plaza, Corporate Way</p>
                                            <p>Lusaka, Zambia</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-12 mb-12">
                                    <div className="col-span-7">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3 block">Related Customer</span>
                                        <p className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{item.invoice.customer}</p>
                                    </div>
                                    <div className="col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Ref</span>
                                            <span className="text-xs font-black text-indigo-600">{item.invoice.reference}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Date</span>
                                            <span className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}</span>
                                        </div>
                                    </div>
                                </div>

                                {item.type === 'cogs' ? (
                                    <table className="w-full text-left border-separate border-spacing-0 mb-12">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="px-4 py-3 rounded-l-xl text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Item Detail</th>
                                                <th className="px-4 py-3 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Qty</th>
                                                <th className="px-4 py-3 text-right text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Unit Cost</th>
                                                <th className="px-4 py-3 rounded-r-xl text-right text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Total Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {item.data.map((line: any, idx: number) => (
                                                <tr key={line.id || idx}>
                                                    <td className="px-4 py-4 text-xs font-bold text-slate-900">{line.itemName}</td>
                                                    <td className="px-4 py-4 text-center font-bold">{line.qty}</td>
                                                    <td className="px-4 py-4 text-right text-slate-500">{line.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-4 text-right font-black text-slate-900">{line.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3} className="px-4 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total COGS for {item.invoice.reference}</td>
                                                <td className="px-4 py-6 text-right text-xl font-black text-slate-900">
                                                    {item.data.reduce((sum: number, i: any) => sum + i.totalCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                ) : (
                                    <table className="w-full text-left border-separate border-spacing-0 mb-12">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="px-4 py-3 rounded-l-xl text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                                <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Type / Ref</th>
                                                <th className="px-4 py-3 text-right text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                                                <th className="px-4 py-3 rounded-r-xl text-right text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {item.data.map((t: any, idx: number) => (
                                                <tr key={t.id || idx}>
                                                    <td className="px-4 py-4 text-xs tabular-nums">{t.date}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-900">{t.type} <span className="text-indigo-500 ml-2">#{t.reference}</span></td>
                                                    <td className="px-4 py-4 text-right font-black">{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-4 text-right font-black text-indigo-600">{t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    }

                    const isInvoice = item._docType === 'sales-invoice' || ('issueDate' in item && 'balanceDue' in item);
                    const isQuote = item._docType === 'sales-quote' || ('issueDate' in item && 'reference' in item && !isInvoice);
                    const isOrder = item._docType === 'sales-order' || ('orderDate' in item && 'reference' in item);
                    const isPurchaseQuote = isQuote && 'supplier' in item;
                    const isPurchaseOrder = isOrder && 'supplier' in item;
                    const isDeliveryNote = item._docType === 'delivery-note' || ('deliveryDate' in item && 'orderNumber' in item);
                    const isReceipt = item._docType === 'receipt' || ('paidByContact' in item && 'paymentMethod' in item);

                    if (isQuote || isOrder || isInvoice || isDeliveryNote || isReceipt) {
                        const dateLabel = isQuote || isInvoice ? 'Issue Date' : (isOrder ? 'Order Date' : (isDeliveryNote ? 'Delivery Date' : 'Receipt Date'));
                        const dateValue = (isQuote || isInvoice) ? item.issueDate : 
                                         (isOrder ? item.orderDate : 
                                         (isDeliveryNote ? (item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '-') : 
                                         item.date));

                        const hasOptions = !!item.options;
                        const documentTitle = (hasOptions && item.options.customTitle && item.options.customTitleValue)
                            ? item.options.customTitleValue
                            : (item.customTitle || (isPurchaseQuote ? 'Purchase Enquiry' : (isPurchaseOrder ? 'Purchase Order' : (isQuote ? 'Quotation' : (isInvoice ? 'Sales Invoice' : (isDeliveryNote ? 'Delivery Note' : (isReceipt ? 'Official Receipt' : 'Sales Order')))))));

                        const subTitle = isPurchaseQuote ? 'PROCUREMENT REQUEST' : (isQuote ? 'OFFICIAL PROPOSAL' : (isInvoice ? 'TAX INVOICE' : (isDeliveryNote ? 'PROOF OF DELIVERY' : (isReceipt ? 'PAYMENT CONFIRMATION' : (isPurchaseOrder ? 'ORDER TO SUPPLIER' : 'CONFIRMED ORDER')))));

                        let footerValue = (item.options?.footers && item.options?.footerValue) ? item.options.footerValue : (item.footer || '');

                        if ((isPurchaseOrder || isPurchaseQuote) && !footerValue) {
                            const footer = allFooters.find(f => f.name === 'Purchase Enquiry');
                            if (footer) footerValue = footer.content;
                        }

                        let expiryDate = null;
                        if (isQuote) {
                            const parts = (item.issueDate || '').split('.');
                            if (parts.length === 3 && item.expiryDays) {
                                const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                date.setDate(date.getDate() + parseInt(item.expiryDays));
                                expiryDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
                            }
                        }

                        return (
                            <div key={item.id} className={`document-page print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative mx-auto ${index < items.length - 1 ? 'print-break mb-12' : ''}`}>
                                <div className="flex justify-between items-start gap-12 mb-10 pb-10 border-b border-gray-100">
                                    <div className="flex-1">
                                        {/* Header Section */}
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-1">
                                                <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">{documentTitle}</h1>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">{isPurchaseQuote ? 'Ref' : 'Reference'}: {item.reference}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-12 items-start">
                                            {/* Billed To / Supplier */}
                                            <div>
                                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">{isDeliveryNote ? 'Delivered To' : ((isPurchaseQuote || isPurchaseOrder) ? 'Supplier' : 'Billed To')}</h3>
                                                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-2">{(isPurchaseQuote || isPurchaseOrder) ? item.supplierName : item.customerName}</p>
                                                <p className="text-slate-500 text-[12px] font-medium leading-relaxed max-w-xs whitespace-pre-wrap">
                                                    {isDeliveryNote 
                                                        ? (item.deliveryAddress || item.customer?.deliveryAddress || item.customer?.billingAddress || 'No delivery address recorded.')
                                                        : (item.billingAddress || item.customer?.billingAddress || ((isPurchaseQuote || isPurchaseOrder) ? '' : 'No billing address provided'))
                                                    }
                                                </p>
                                            </div>

                                            {/* Order Details */}
                                            <div className="border-l border-gray-100 pl-12">
                                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">{isReceipt ? 'Receipt Details' : 'Document Details'}</h3>
                                                <div className="space-y-3">
                                                    <div className="flex">
                                                        <span className="w-32 text-gray-500">{dateLabel}:</span>
                                                        <span className="font-semibold">{dateValue}</span>
                                                    </div>
                                                    {isQuote && expiryDate && (
                                                        <div className="flex">
                                                            <span className="w-32 text-gray-500">Valid Until:</span>
                                                            <span className="font-semibold">{expiryDate}</span>
                                                        </div>
                                                    )}
                                                    {isInvoice && item.dueDate && (
                                                        <div className="flex">
                                                            <span className="w-32 text-gray-500">Due Date:</span>
                                                            <span className="font-semibold text-rose-600">{item.dueDate}</span>
                                                        </div>
                                                    )}
                                                    {isDeliveryNote && item.orderNumber && (
                                                        <div className="flex">
                                                            <span className="w-32 text-gray-500">Order Ref:</span>
                                                            <span className="font-semibold text-indigo-600">{item.orderNumber}</span>
                                                        </div>
                                                    )}
                                                    {isReceipt && item.paymentMethod && (
                                                        <div className="flex">
                                                            <span className="w-32 text-gray-500">Method:</span>
                                                            <span className="font-semibold">{item.paymentMethod}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex">
                                                        <span className="w-32 text-gray-500">Currency:</span>
                                                        <span className="font-semibold">{item.currency || 'ZMW'}</span>
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

                                <div className="mb-14">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#f8fafc] border-y border-gray-200 overflow-hidden text-right print-bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left w-12">#</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Item</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Description</th>
                                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Qty</th>
                                                {!isDeliveryNote && !isPurchaseQuote && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Unit Price</th>}
                                                {!isDeliveryNote && !isPurchaseQuote && item.options?.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Disc</th>}
                                                {!isDeliveryNote && !isPurchaseQuote && (isPurchaseOrder || isPurchaseQuote) && !item.options?.amountsAreTaxInclusive && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Tax Amount</th>}
                                                {!isDeliveryNote && !isPurchaseQuote && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {item.items && item.items.length > 0 ? item.items.map((line: any, idx: number) => {
                                                const qty = parseFloat(line.qty) || 0;
                                                const price = parseFloat(line.unitPrice || line.price) || 0;
                                                const discVal = parseFloat(line.discount) || 0;

                                                let lineTotal = qty * price;
                                                if (item.options?.columnDiscount) {
                                                    if (item.options?.columnDiscountType === 'Percentage') lineTotal *= (1 - discVal / 100);
                                                    else lineTotal -= discVal;
                                                }

                                                return (
                                                    <tr key={line.id || idx}>
                                                        <td className="px-4 py-4 text-slate-400 font-medium text-[12px]">{idx + 1}</td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-semibold text-slate-900">{line.item?.itemName || line.item || line.itemName || '-'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-gray-500">{line.description || '-'}</p>
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-medium">{Number(line.qty).toLocaleString()} <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{line.unit || ''}</span></td>
                                                        {!isDeliveryNote && !isPurchaseQuote && <td className="px-4 py-4 text-right font-medium">{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                                        {!isDeliveryNote && !isPurchaseQuote && item.options?.columnDiscount && (
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="text-xs font-bold text-rose-500">
                                                                    {line.discount ? (item.options.columnDiscountType === 'Percentage' ? `${line.discount}%` : parseFloat(line.discount).toLocaleString()) : '-'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {!isDeliveryNote && !isPurchaseQuote && (isPurchaseOrder || isPurchaseQuote) && !item.options?.amountsAreTaxInclusive && (
                                                            <td className="px-4 py-4 text-right font-medium text-slate-400">
                                                                {(lineTotal * (line.taxCode === 'VAT 16%' ? 0.16 : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                        )}
                                                        {!isDeliveryNote && !isPurchaseQuote && <td className="px-4 py-4 text-right font-semibold">{(lineTotal * (line.taxCode === 'VAT 16%' ? (item.options?.amountsAreTaxInclusive ? 1 : 1.16) : 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td className="px-4 py-5 text-slate-400 font-medium text-[12px]">1</td>
                                                    <td className="px-4 py-5 font-semibold text-slate-900">General Item</td>
                                                    <td className="px-4 py-5 font-medium text-slate-500">{item.description || '-'}</td>
                                                    <td className="px-4 py-5 text-right font-medium">1</td>
                                                    {!isPurchaseQuote && <td className="px-4 py-5 text-right font-medium">{parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                                    {!isPurchaseQuote && item.options?.columnDiscount && <td className="px-4 py-5 text-right font-bold text-rose-500">-</td>}
                                                    {!isPurchaseQuote && <td className="px-4 py-5 text-right font-semibold">{parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {isReceipt && (
                                    <div className="mb-12 pt-8 border-t border-slate-100 relative overflow-hidden">
                                        <div className="grid grid-cols-2 gap-8 relative z-10">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Received From</span>
                                                <p className="text-sm font-black text-slate-900">{item.paidByContact}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">For Account</span>
                                                <p className="text-sm font-black text-slate-900">{item.accountName}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end items-start gap-12">
                                    <div className="w-80 space-y-3">
                                        {(() => {
                                            const isTaxInclusive = item.options?.amountsAreTaxInclusive || false;
                                            let subtotal = 0;
                                            let tax = 0;

                                            const lines = item.items || [];
                                            if (lines.length > 0) {
                                                lines.forEach((line: any) => {
                                                    const qty = parseFloat(line.qty) || 0;
                                                    const price = parseFloat(line.unitPrice || line.price) || 0;
                                                    const discVal = parseFloat(line.discount) || 0;

                                                    let lineTotal = qty * price;
                                                    if (item.options?.columnDiscount) {
                                                        if (item.options?.columnDiscountType === 'Percentage') lineTotal *= (1 - discVal / 100);
                                                        else lineTotal -= discVal;
                                                    }

                                                    let taxRate = 0;
                                                    const lineTaxCode = (line.taxCode || '').toString().toLowerCase().trim();
                                                    const selectedTax = taxCodes.find(tc =>
                                                        tc.id === line.taxCode ||
                                                        tc.name.toLowerCase() === lineTaxCode ||
                                                        (lineTaxCode === 'zero rated' && tc.name === 'Zero Rated') ||
                                                        (lineTaxCode === 'exempt' && tc.name === 'Exempt')
                                                    );

                                                    if (selectedTax) {
                                                        taxRate = parseFloat(selectedTax.rate) / 100;
                                                    } else {
                                                        // Fallback for historical data - check if it looks like it should be 16%
                                                        if (lineTaxCode.includes('16') || lineTaxCode.includes('vat') || !lineTaxCode) {
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
                                            } else {
                                                const total = parseFloat(item.amount || 0);
                                                const defaultTax = taxCodes.find(tc => tc.name === 'VAT 16%') || { rate: 16 };
                                                const taxRate = (parseFloat(defaultTax.rate) || 16) / 100;
                                                tax = isTaxInclusive ? total * taxRate / (1 + taxRate) : total * taxRate;
                                                subtotal = isTaxInclusive ? total - tax : total;
                                            }

                                            let grandTotal = subtotal + tax;
                                            let wTaxAmount = 0;
                                            if (item.options?.withholdingTax) {
                                                const val = parseFloat(item.options.withholdingTaxValue) || 0;
                                                if (item.options.withholdingTaxType === 'Rate') wTaxAmount = subtotal * (val / 100);
                                                else wTaxAmount = val;
                                                grandTotal -= wTaxAmount;
                                            }

                                            if (isDeliveryNote) {
                                                const totalQty = (item.items || []).reduce((sum: number, line: any) => sum + (parseFloat(line.qty) || 0), 0);
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center text-gray-500">
                                                            <span className="text-[11px] font-bold uppercase tracking-widest">Item Count</span>
                                                            <span className="font-semibold">{item.items?.length || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                                            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Total Quantity</span>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">UNITS</p>
                                                                <p className="text-2xl font-bold text-slate-900 tracking-tighter">{totalQty.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            if (isPurchaseQuote) {
                                                return null;
                                            }

                                            return (
                                                <>
                                                    <div className="flex justify-between items-center text-gray-500">
                                                        <span className="text-[11px] font-bold uppercase tracking-widest">{item.options?.amountsAreTaxInclusive ? 'Subtotal (Excl. Tax)' : 'Subtotal'}</span>
                                                        <span className="font-semibold">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-gray-500">
                                                        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Tax Component</span>
                                                        <span className="font-semibold">{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {item.options?.withholdingTax && (
                                                        <div className="flex justify-between items-center text-rose-500">
                                                            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400">Withholding Tax ({item.options.withholdingTaxType === 'Rate' ? `${item.options.withholdingTaxValue}%` : 'Amount'})</span>
                                                            <span className="font-semibold">-{wTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center bg-slate-50 p-4 border-t-2 border-slate-900 mt-2 print-bg-slate-50">
                                                        <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">Total</span>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.currency?.split(' ')[0] || 'ZMW'}</p>
                                                            <p className="text-2xl font-bold text-slate-900 tracking-tighter">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {footerValue && (
                                    <div className="pt-6 border-t border-slate-100 uppercase tracking-widest mt-12">
                                        <span className="text-[10px] font-black text-slate-400 block mb-3 lowercase tracking-[0.2em] italic">Terms & Conditions</span>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-2xl whitespace-pre-wrap">
                                            {footerValue}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (isSuppliers) {
                        return (
                            <div key={item.id} className={`document-page print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative mx-auto ${index < items.length - 1 ? 'print-break mb-12' : ''}`}>
                                <div className="mb-14">
                                    <div className="flex justify-between items-center mb-2">
                                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase leading-none">{item.name}</h1>
                                    </div>
                                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">SUN: {item.code}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-12 mb-10">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Business Details</h3>
                                        <div className="space-y-2">
                                            <div className="flex">
                                                <span className="w-32 text-gray-500">Division:</span>
                                                <span className="font-medium">{item.division || 'General'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Financial Settings</h3>
                                        <div className="space-y-2">
                                            <div className="flex">
                                                <span className="w-32 text-gray-500">Currency:</span>
                                                <span className="font-medium">{item.currency || 'ZMW'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-12 mb-10">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Contact & Address</h3>
                                        <div className="space-y-2">
                                            <div className="flex">
                                                <span className="w-32 text-gray-500">Email:</span>
                                                <a href={`mailto:${item.email || ''}`} className="font-medium text-blue-600 lowercase hover:underline">{item.email || '-'}</a>
                                            </div>
                                            <div className="flex mt-3">
                                                <span className="w-32 text-gray-500">Address:</span>
                                                <span className="font-medium whitespace-pre-wrap">{item.billingAddress || item.address || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="summary-box-print mt-20 bg-slate-50 p-10 rounded-none">
                                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight mb-8">Accounts Payable Summary</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest text-[12px]">Outstanding Balance</span>
                                        <span className="font-black text-3xl text-slate-900 tracking-tighter">
                                            <span className="text-[14px] mr-3 text-slate-400 font-bold">{item.currency || 'ZMW'}</span>
                                            {(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.id} className={`document-page print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative mx-auto ${index < items.length - 1 ? 'print-break mb-12' : ''}`}>
                            <div className="mb-14">
                                <div className="flex justify-between items-center mb-2">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase leading-none">{item.name}</h1>
                                </div>
                                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">UCN: {item.code}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-12 mb-10">
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Company Details</h3>
                                    <div className="space-y-2">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">TPIN:</span>
                                            <span className="font-medium">{item.tpin || '-'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Division:</span>
                                            <span className="font-medium">{item.division || 'General'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Sales Person:</span>
                                            <span className="font-medium">{item.salesPerson || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Financial Settings</h3>
                                    <div className="space-y-2">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Currency:</span>
                                            <span className="font-medium">{item.currency || 'ZMW - Zambian Kwacha'}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Credit Days:</span>
                                            <span className="font-medium">{item.creditDays || 30} days</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Credit Limit:</span>
                                            <span className="font-medium">
                                                {item.creditLimit ? `${item.currency?.split(' ')[0] || 'ZMW'} ${item.creditLimit.toLocaleString()}` : 'None'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-12 mb-10">
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Billing Details</h3>
                                    <div className="space-y-2">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Email:</span>
                                            <a href={`mailto:${item.email || ''}`} className="font-medium text-blue-600 lowercase hover:underline">{item.email || '-'}</a>
                                        </div>
                                        <div className="flex mt-3">
                                            <span className="w-32 text-gray-500">Billing Address:</span>
                                            <span className="font-medium whitespace-pre-wrap">{item.billingAddress || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Delivery Details</h3>
                                    <div className="space-y-2">
                                        <div className="flex">
                                            <span className="w-32 text-gray-500">Delivery Address:</span>
                                            <span className="font-medium whitespace-pre-wrap">{item.deliveryAddress || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="summary-box-print mt-20 bg-slate-50 p-10 rounded-none">
                                <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight mb-8">Account Summary</h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[12px]">Total Outstanding Balance</span>
                                    <span className="font-black text-3xl text-slate-900 tracking-tighter">
                                        <span className="text-[14px] mr-3 text-slate-400 font-bold">{item.currency?.split(' ')[0] || 'ZMW'}</span>
                                        {(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BatchPrintView;
