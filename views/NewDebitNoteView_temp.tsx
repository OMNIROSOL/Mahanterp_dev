import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { SalesQuote } from '../types';
import apiService from '../services/apiService';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import FormInput from '../components/shared/FormInput';
import Badge from '../components/shared/Badge';
import {
    FileText,
    ChevronRight,
    CheckCircle2,
    History,
    UserPlus,
    Clock,
    DollarSign,
    Plus,
    Trash2,
    Copy,
    Info,
    User,
    MapPin,
    X,
    Search,
    MoreVertical,
    Settings,
    AlertTriangle,
    Package,
    ArrowLeft,
    Calendar,
    Layers,
    Calculator,
    Save,
    Send,
    Loader2,
    ChevronDown,
    ChevronUp,
    Hash,
    Briefcase,
    Image as ImageIcon,
    RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/shared/Tooltip";

const InputField = ({ label, value, onChange, placeholder, type = "text", Icon, error, readOnly }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-200'} rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} transition-all ${readOnly ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
            />
        </div>
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-300">{error}</p>}
    </div>
);

const SelectField = ({ label, value, onChange, Icon, children }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <select
                value={value}
                onChange={onChange}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

const TextareaField = ({ label, value, onChange, placeholder, rows = 3 }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
        ></textarea>
    </div>
);

const NewCreditNoteView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [customer, setCustomer] = useState('');
    const [salesInvoice, setSalesInvoice] = useState('Automatic');
    const [billingAddress, setBillingAddress] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [currency, setCurrency] = useState('ZMW');
    const [exchangeRate, setExchangeRate] = useState('1.00');
    const [fileName, setFileName] = useState('No file chosen');
    const [items, setItems] = useState<any[]>([{ id: Date.now(), item: 'Select Item', account: 'Inventory sales', qty: '1', unitPrice: '0', unitCost: '0', unit: '', taxCode: 'VAT 16%' }]);
    const [showOptionsArea, setShowOptionsArea] = useState(false);

    const [options, setOptions] = useState({
        columnLineNumber: true,
        columnDescription: false,
        columnDiscount: false,
        columnDiscountType: 'Percentage',
        amountsAreTaxInclusive: false,
        withholdingTax: false,
        withholdingTaxType: 'Rate',
        withholdingTaxValue: '0',
        showTaxAmount: false,
        customTitle: false,
        customTitleValue: 'Debit Note',
        footers: false,
        footerValue: 'Terms & Conditions apply.',
        alsoActsAsDeliveryNote: false,
        deliveryLocation: 'Main Warehouse'
    });

    const [dbCustomers, setDbCustomers] = useState<any[]>([]);
    const [dbItems, setDbItems] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [custs, itemsData] = await Promise.all([
                    apiService.getCustomers(),
                    apiService.getItems()
                ]);
                setDbCustomers(custs);
                setDbItems(itemsData);
            } catch (err) {
                console.error('Failed to load debit note master data:', err);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const sourceId = searchParams.get('copyFrom');

        if (id) {
            const fetchExisting = async () => {
                try {
                    const data = await apiService.getCreditNotes();
                    const note = data.find((n: any) => n.id === id);
                    if (note) {
                        setIssueDate(note.issueDate ? new Date(note.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                        setCustomer(note.customer?.name || note.customerName || note.customer || '');
                        setReference(note.reference || '');
                        setUseManualRef(true);
                        setDescription(note.description || '');
                        setCurrency(note.currency || 'ZMW');
                        if (note.items) {
                            setItems(note.items.map((i: any) => ({
                                id: i.id || (Date.now() + Math.random()),
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                itemId: i.itemId || i.item?.id || '',
                                account: i.account || 'Inventory sales',
                                qty: (i.qty || '1').toString(),
                                unitPrice: (i.unitPrice || '0').toString(),
                                unitCost: (i.unitCost || '0').toString(),
                                unit: i.unit || '',
                                taxCode: i.taxCode || 'VAT 16%'
                            })));
                        }
                        if (note.docOptions) setOptions(prev => ({ ...prev, ...note.docOptions }));
                    }
                } catch (err) {
                    console.error('Failed to load debit note:', err);
                }
            };
            fetchExisting();
        } else if (sourceId) {
            const fetchSource = async () => {
                try {
                    let sourceDoc: any = null;
                    try {
                        sourceDoc = await apiService.getInvoice(sourceId);
                    } catch (e) {
                        try {
                            sourceDoc = await apiService.getOrder(sourceId);
                        } catch (e2) {
                            try {
                                sourceDoc = await apiService.getQuote(sourceId);
                            } catch (e3) {
                                const [invoices, orders, quotes] = await Promise.all([
                                    apiService.getInvoices().catch(() => []),
                                    apiService.getOrders().catch(() => []),
                                    apiService.getQuotes().catch(() => [])
                                ]);
                                sourceDoc = invoices.find((i: any) => i.id === sourceId) ||
                                            orders.find((o: any) => o.id === sourceId) ||
                                            quotes.find((q: any) => q.id === sourceId);
                            }
                        }
                    }

                    if (sourceDoc) {
                        setCustomer(sourceDoc.customer?.name || sourceDoc.customerName || sourceDoc.customer || '');
                        setBillingAddress(sourceDoc.billingAddress || sourceDoc.customer?.billingAddress || '');
                        setCurrency(sourceDoc.currency || sourceDoc.customer?.currency?.split(' - ')[0] || 'ZMW');
                        setDescription(`Credit note for ${sourceDoc.reference}`);
                        if (sourceDoc.items) {
                            setItems(sourceDoc.items.map((i: any) => ({
                                id: Date.now() + Math.random(),
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                itemId: i.itemId || i.item?.id || '',
                                account: i.account || 'Inventory sales',
                                qty: (i.qty || '1').toString(),
                                unitPrice: (i.unitPrice || '0').toString(),
                                unitCost: (i.unitCost || '0').toString(),
                                unit: i.unit || i.item?.unitName || '',
                                taxCode: i.taxCode || 'VAT 16%'
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Failed to load source for debit note:', err);
                }
            };
            fetchSource();
        }
    }, [id, location.search]);

    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        let totalCOGS = 0;
        const lineCalcs = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const uCost = parseFloat(item.unitCost || '0') || 0;
            const discountValue = parseFloat((item as any).discount) || 0;
            let netTotal = qty * price;

            if (options.columnDiscount) {
                if ((options as any).columnDiscountType === 'Percentage') {
                    netTotal = netTotal * (1 - (discountValue / 100));
                } else {
                    netTotal = Math.max(0, netTotal - discountValue);
                }
            }

            let taxAmount = 0;
            if (item.taxCode === 'VAT 16%') {
                if (options.amountsAreTaxInclusive) {
                    taxAmount = netTotal - (netTotal / 1.16);
                    netTotal = netTotal - taxAmount;
                } else {
                    taxAmount = netTotal * 0.16;
                }
            }

            const grossTotal = netTotal + taxAmount;
            subtotal += netTotal;
            totalTax += taxAmount;
            totalCOGS += qty * uCost;
            return { taxAmount, grossTotal, netTotal };
        });

        let grandTotal = subtotal + totalTax;

        let whtAmount = 0;
        if (options.withholdingTax) {
            const whtVal = parseFloat(options.withholdingTaxValue) || 0;
            if (options.withholdingTaxType === 'Rate') {
                whtAmount = subtotal * (whtVal / 100);
            } else {
                whtAmount = whtVal;
            }
            grandTotal -= whtAmount;
        }

        return { lineCalcs, subtotal, totalTax, grandTotal, whtAmount, totalCOGS };
    }, [items, options]);

    const handleDuplicateItem = (item: any) => {
        const newItem = {
            ...item,
            id: Date.now() + Math.random() // Unique ID
        };
        const index = items.findIndex(i => i.id === item.id);
        const newItems = [...items];
        newItems.splice(index + 1, 0, newItem);
        setItems(newItems);
    };

    const handleSave = async () => {
        try {
            if (!customer) {
                alert('Please select a customer.');
                return;
            }
            
            const selectedDbCustomer = dbCustomers.find(c => c.name === customer || c.customerName === customer);
            const customerId = selectedDbCustomer?.id;

            if (!customerId) {
                alert('Invalid customer selected.');
                return;
            }

            const payload = {
                reference: useManualRef ? reference : undefined,
                issueDate,
                customerId,
                currency,
                description,
                grandTotal: calculations.grandTotal,
                balance: calculations.grandTotal, // Default balance to grandTotal
                options,
                items: items.filter(i => i.item !== 'Select Item').map(i => ({
                    itemId: i.itemId || null,
                    item: i.item,
                    description: i.description || i.item,
                    qty: i.qty,
                    unitPrice: i.unitPrice,
                    taxCode: i.taxCode,
                    discount: i.discount || 0,
                    totalAmount: parseFloat(i.qty || '0') * parseFloat(i.unitPrice || '0')
                }))
            };

            if (id) {
                // If update endpoint is needed in the future, it would go here. For now we do create or maybe update exists
                if ((apiService as any).updateCreditNote) {
                    await (apiService as any).updateCreditNote(id, payload);
                } else {
                    alert('Update debit note not implemented in apiService.');
                    return;
                }
            } else {
                await apiService.createCreditNote(payload);
            }
            
            navigate('/debit-notes');
        } catch (err: any) {
            console.error('Failed to save debit note:', err);
            alert(err?.response?.data?.error || 'Failed to save debit note');
        }
    };

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/debit-notes')}>Debit Notes List</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Configure Debit Note</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                        {id ? 'Modify Debit Note' : (options.alsoActsAsDeliveryNote ? 'Debit Note & Delivery Note' : (options.customTitle ? options.customTitleValue : 'New Debit Note'))}
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/debit-notes')}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-8">
                    <div className="space-y-8 animate-in fade-in duration-700">
                        {/* Basic Information */}
                        <div className="space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Basic Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <InputField label="Issue Date" type="date" value={issueDate} onChange={(e: any) => setIssueDate(e.target.value)} Icon={Calendar} />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference</label>
                                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                        <div
                                            className="h-full px-4 border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                                            onClick={() => {
                                                setUseManualRef(!useManualRef);
                                                if (!useManualRef) setReference('');
                                            }}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${!useManualRef ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 border-2'}`}>
                                                {!useManualRef && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={reference}
                                            onChange={(e) => useManualRef && setReference(e.target.value)}
                                            readOnly={!useManualRef}
                                            placeholder={useManualRef ? "Enter custom ref..." : "Automatic"}
                                            className={cn(
                                                "w-full bg-transparent border-none px-4 py-3 text-[13px] font-semibold outline-none transition-colors",
                                                !useManualRef ? "text-indigo-600 font-black" : "text-slate-700"
                                            )}
                                        />
                                    </div>
                                </div>
                                <SelectField label="Sales Invoice" value={salesInvoice} onChange={(e: any) => setSalesInvoice(e.target.value)} Icon={Layers}>
                                    <option value="Automatic">Automatic Selection</option>
                                    <option value="Manual">Manual Allocation</option>
                                </SelectField>
                            </div>
                        </div>

                        {/* Logistics & Memo */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                    <User size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Entity Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <SelectField label="Selected Customer" value={customer} onChange={(e: any) => {
                                        const custName = e.target.value;
                                        setCustomer(custName);
                                        const selected = dbCustomers.find(c => c.name === custName);
                                        if (selected) {
                                            const currencyCode = selected.currency?.split(' - ')[0] || 'ZMW';
                                            setCurrency(currencyCode);
                                            setBillingAddress(selected.billingAddress || '');
                                        }
                                    }} Icon={UserPlus}>
                                        <option value="">Select Target Customer...</option>
                                        {dbCustomers.filter(c => (!c.inactive && c.status !== 'Inactive') || c.name === customer).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </SelectField>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Currency</label>
                                            <div className="bg-slate-100 rounded-2xl px-5 py-3 text-[13px] font-black text-slate-500 border border-slate-200">
                                                {currency}
                                            </div>
                                        </div>
                                        <InputField label="Exchange Rate" value={exchangeRate} onChange={(e: any) => setExchangeRate(e.target.value)} Icon={RefreshCw} placeholder="1.00" />
                                    </div>

                                    <InputField label="General Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Reason for credit..." Icon={Briefcase} />
                                </div>
                                <TextareaField label="Billing Address" value={billingAddress} onChange={(e: any) => setBillingAddress(e.target.value)} placeholder="Physical address for tracking..." rows={7} />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                        <Package size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Adjustment Items</h2>
                                </div>
                                <button
                                    onClick={() => setItems(prev => [...prev, { id: Date.now(), item: 'Select Item', account: 'Inventory sales', qty: '1', unitPrice: '0', taxCode: 'VAT 16%' }])}
                                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                >
                                    <Plus size={14} /> <span>Add New Item</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {options.columnLineNumber && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">ITEM / ACCOUNT</th>
                                            {options.columnDescription && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">QTY / UNIT</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">UNIT PRICE</th>
                                            {options.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28 text-right whitespace-nowrap">DISCOUNT {(options as any).columnDiscountType === 'Percentage' ? '(%)' : `(${currency})`}</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">TAX CODE</th>
                                            {!options.amountsAreTaxInclusive && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">TAX AMOUNT</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">TOTAL</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, index) => {
                                            const calc = calculations.lineCalcs[index];
                                            return (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    {options.columnLineNumber && <td className="px-4 py-4 text-xs font-bold text-slate-400 text-center">{index + 1}</td>}
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="relative">
                                                                <select
                                                                    value={item.item}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const invItem = dbItems.find(it => it.itemName === val);
                                                                        setItems(prev => prev.map(i => i.id === item.id ? {
                                                                            ...i,
                                                                            item: val,
                                                                            unitPrice: invItem ? invItem.sellingPrice.toString() : i.unitPrice,
                                                                            unitCost: invItem ? invItem.purchasePrice.toString() : (i as any).unitCost || '0',
                                                                            unit: invItem ? invItem.unit : ''
                                                                        } : i));
                                                                    }}
                                                                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#2563eb] outline-none appearance-none cursor-pointer"
                                                                >
                                                                    <option value="Select Item">Select Item...</option>
                                                                    {dbItems.map(it => (
                                                                        <option key={it.id} value={it.itemName}>{it.itemName}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="relative">
                                                                <select
                                                                    value={item.account}
                                                                    onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, account: e.target.value } : i))}
                                                                    className="w-full bg-transparent border-none p-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider outline-none appearance-none cursor-pointer"
                                                                >
                                                                    <option value="Inventory sales">Inventory sales</option>
                                                                    <option value="Services">Services</option>
                                                                    <option value="Returns">Returns & Allowances</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {options.columnDescription && (
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="text"
                                                                value={(item as any).description || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, description: val } : i));
                                                                }}
                                                                className="w-full bg-transparent border-none p-0 text-sm text-slate-600 outline-none placeholder:text-slate-300"
                                                                placeholder="Add description..."
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4 relative group/qty">
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="text"
                                                                value={item.qty}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i));
                                                                }}
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-right text-slate-700 outline-none"
                                                            />
                                                            {item.unit && (
                                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1.5 opacity-80 decoration-indigo-200 decoration-2 underline-offset-2">
                                                                    {item.unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input
                                                            type="text"
                                                            value={item.unitPrice}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: val } : i));
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-right text-slate-700 outline-none"
                                                        />
                                                    </td>
                                                    {options.columnDiscount && (
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={(item as any).discount || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, discount: val } : i));
                                                                    }}
                                                                    className="w-16 bg-transparent border-none p-0 text-sm font-bold text-slate-700 text-right outline-none"
                                                                    placeholder="0"
                                                                />
                                                                <span className="text-[10px] text-slate-400 font-bold">{(options as any).columnDiscountType === 'Percentage' ? '%' : currency}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4">
                                                        <select
                                                            value={item.taxCode}
                                                            onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, taxCode: e.target.value } : i))}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value="No tax">No tax</option>
                                                            <option value="VAT 16%">VAT 16%</option>
                                                        </select>
                                                    </td>
                                                    {!options.amountsAreTaxInclusive && (
                                                        <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right">
                                                            {calc?.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right tabular-nums">
                                                        <span className="text-[10px] font-black text-slate-400 mr-1.5 opacity-60">{currency}</span>
                                                        {calc?.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => handleDuplicateItem(item)}
                                                                className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                                title="Duplicate Line"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                                title="Remove Line"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Summary */}
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end pr-24">
                                    <div className="w-full max-w-sm space-y-2">
                                        <div className="flex justify-end items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] gap-8">
                                            <span>Subtotal ({currency})</span>
                                            <span className="text-slate-700 font-bold tabular-nums text-[13px] w-32 text-right">
                                                {calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-end items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] gap-8">
                                            <span>Tax Component</span>
                                            <span className="text-slate-700 font-bold tabular-nums text-[13px] w-32 text-right">{calculations.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-end items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mt-4 h-16 gap-x-6">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Credit Total</p>
                                            </div>
                                            <h2 className="text-xl font-medium text-slate-900 tracking-tight tabular-nums flex items-baseline">
                                                <span className="text-xs font-medium text-indigo-400 mr-2 uppercase">{currency}</span>
                                                {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Options Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-50">
                            <div
                                onClick={() => setShowOptionsArea(!showOptionsArea)}
                                className="flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Advanced Configuration</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showOptionsArea ? 'Collapse settings' : 'Expand document adjustments'}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100/50 transition-all">
                                    <ChevronDown size={20} className={cn("transition-transform duration-300", showOptionsArea ? "rotate-180" : "")} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {showOptionsArea && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-hidden"
                                    >
                                        {([
                                            ['Tax Inclusive', 'amountsAreTaxInclusive'],
                                            ['Description', 'columnDescription'],
                                            ['Discount', 'columnDiscount'],
                                            ['Line Numbers', 'columnLineNumber'],
                                            ['Withholding Tax', 'withholdingTax'],
                                            ['Custom Title', 'customTitle'],
                                            ['Footers', 'footers'],
                                            ['Also acts as delivery note', 'alsoActsAsDeliveryNote']
                                        ] as const).map(([label, key]) => (
                                            <div key={key} className="space-y-3">
                                                <label className="flex items-center space-x-3 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={(options as any)[key]}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                                    />
                                                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{label}</span>
                                                </label>
                                                {key === 'columnDiscount' && options.columnDiscount && (
                                                    <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="relative flex-1">
                                                            <select
                                                                value={(options as any).columnDiscountType}
                                                                onChange={(e) => setOptions(prev => ({ ...prev, columnDiscountType: e.target.value }))}
                                                                className="w-full appearance-none bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                                                            >
                                                                <option value="Percentage">Percentage (%)</option>
                                                                <option value="Amount">Exact Amount</option>
                                                            </select>
                                                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                {key === 'customTitle' && options.customTitle && (
                                                    <input
                                                        type="text"
                                                        value={options.customTitleValue}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                        className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-[11px] font-bold text-indigo-600 focus:outline-none"
                                                    />
                                                )}
                                                {key === 'footers' && options.footers && (
                                                    <div className="space-y-3 animate-in slide-in-from-top-1 duration-300">
                                                        <select
                                                            onChange={async (e) => {
                                                                try {
                                                                    const footers = await apiService.getFooters();
                                                                    const footer = footers.find((f: any) => f.id === e.target.value);
                                                                    if (footer) {
                                                                        setOptions(prev => ({ ...prev, footerValue: footer.content }));
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to load footers:', err);
                                                                }
                                                            }}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none"
                                                        >
                                                            <option value="">-- Choose template --</option>
                                                            {/* We could pre-load these, but for now just showing the logic */}
                                                        </select>
                                                    </div>
                                                )}
                                                {key === 'alsoActsAsDeliveryNote' && options.alsoActsAsDeliveryNote && (
                                                    <div className="relative">
                                                        <select
                                                            value={(options as any).deliveryLocation}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, deliveryLocation: e.target.value }))}
                                                            className="w-full appearance-none bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-4 py-2 text-[11px] font-bold text-indigo-600 focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="Main Warehouse">Main Warehouse</option>
                                                            <option value="Showroom">Showroom</option>
                                                            <option value="Transit">Transit</option>
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Submission Bar */}
                        <div className="bg-slate-50 p-10 mt-12 mb-10 mx-[-48px] border-t border-slate-100 rounded-b-3xl">
                            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="flex-1 w-full flex items-center gap-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center bg-white border border-slate-200 border-dashed rounded-xl px-4 py-2 cursor-pointer hover:border-indigo-300 transition-all h-12"
                                    >
                                        <ImageIcon size={16} className="text-slate-400 mr-2" />
                                        <span className="text-[11px] font-bold text-slate-500 truncate max-w-[150px]">
                                            {fileName === 'No file chosen' ? 'Attach Document' : fileName}
                                        </span>
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || 'No file chosen')} />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4 w-full md:w-auto">
                                    <button
                                        onClick={() => navigate('/debit-notes')}
                                        className="px-8 py-4 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-[0.2em]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em] flex items-center gap-2"
                                    >
                                        <Save size={18} /> {id ? 'Update Debit Note' : 'Create Debit Note'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewCreditNoteView;
