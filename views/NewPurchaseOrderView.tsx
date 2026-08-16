import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import { PurchaseOrder, FooterTemplate } from '../types';
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
    Image as ImageIcon
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

const NewPurchaseOrderView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = Boolean(id);

    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [billingAddress, setBillingAddress] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [status, setStatus] = useState('Ordered');
    const [items, setItems] = useState([{ id: Date.now(), item: 'Select Item', description: '', qty: '1', unitPrice: '0', discount: '', taxCode: 'VAT 16%' }]);
    const [showOptionsArea, setShowOptionsArea] = useState(false);
    const [options, setOptions] = useState({
        amountsAreTaxInclusive: false,
        columnLineNumber: true,
        columnDiscount: false,
        columnDiscountType: 'Percentage',
        withholdingTax: false,
        withholdingTaxType: 'Rate',
        withholdingTaxValue: '0',
        rounding: false,
        roundingType: 'Round to nearest',
        customTitle: false,
        customTitleValue: 'Purchase Order',
        footers: false,
        footerValue: 'Terms & Conditions apply.'
    });

    const [dbSuppliers, setDbSuppliers] = useState<any[]>([]);
    const [dbItems, setDbItems] = useState<any[]>([]);
    const [dbFooters, setDbFooters] = useState<FooterTemplate[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [sups, itemsData, footersData, codesData] = await Promise.all([
                    apiService.getSuppliers(),
                    apiService.getItems(),
                    apiService.getFooters(),
                    apiService.getTaxCodes()
                ]);
                setDbSuppliers(sups);
                setDbItems(itemsData);
                setDbFooters(footersData);
                setTaxCodes(codesData);

                if (!id && !location.search.includes('copyFrom')) {
                    const nextRef = await apiService.getNextReference('purchase-order');
                    setReference(nextRef);
                }
            } catch (err) {
                console.error('Failed to load purchase order data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const sourceId = searchParams.get('copyFrom');
        if (id) {
            const fetchOrder = async () => {
                try {
                    const order = await apiService.getPurchaseOrder(id);
                    if (order) {
                        let initialIssueDate = new Date().toISOString().split('T')[0];
                        const dateToParse = order.orderDate || order.issueDate;
                        if (dateToParse) {
                            const dottedPattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
                            if (dottedPattern.test(dateToParse)) {
                                const [day, month, year] = dateToParse.split('.');
                                initialIssueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                const d = new Date(dateToParse);
                                if (!isNaN(d.getTime())) {
                                    initialIssueDate = d.toISOString().split('T')[0];
                                }
                            }
                        }
                        setIssueDate(initialIssueDate);
                        setSupplier(order.supplier?.name || order.supplierName || order.supplier || '');
                        setReference(order.reference || '');
                        setUseManualRef(true);
                        setDescription(order.description || '');
                        setCurrency(order.currency || 'ZMW');
                        setBillingAddress(order.supplier?.billingAddress || '');
                        if (order.docOptions) {
                            setOptions(prev => ({ ...prev, ...order.docOptions }));
                        }
                        if (order.items) {
                            setItems(order.items.map((i: any) => ({
                                id: i.id || (Date.now() + Math.random()),
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                description: i.description || i.item?.description || '',
                                qty: (i.qty || '1').toString(),
                                unitPrice: (i.unitPrice || '0').toString(),
                                discount: (i.discount || '').toString(),
                                taxCode: i.taxCode || 'VAT 16%'
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch order details:', err);
                }
            };
            fetchOrder();
        } else if (sourceId) {
            const fetchSource = async () => {
                try {
                    let sourceDoc: any = null;
                    try {
                        sourceDoc = await apiService.getPurchaseOrder(sourceId);
                    } catch (e) {
                        try {
                            sourceDoc = await apiService.getPurchaseEnquiry(sourceId);
                        } catch (e2) {
                            try {
                                sourceDoc = await apiService.getInvoice(sourceId);
                            } catch (e3) {
                                try {
                                    sourceDoc = await apiService.getOrder(sourceId);
                                } catch (e4) {
                                    try {
                                        sourceDoc = await apiService.getQuote(sourceId);
                                    } catch (e5) {
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
                        }
                    }

                    if (sourceDoc) {
                        setCurrency(sourceDoc.currency || sourceDoc.customer?.currency?.split(' - ')[0] || 'ZMW');
                        setDescription(`Purchase for ${sourceDoc.reference}`);
                        setBillingAddress(sourceDoc.customer?.billingAddress || '');
                        if (sourceDoc.docOptions || sourceDoc.options) {
                            setOptions(prev => ({ ...prev, ...(sourceDoc.docOptions || sourceDoc.options) }));
                        }
                        if (sourceDoc.items) {
                            setItems(sourceDoc.items.map((i: any) => ({
                                id: Date.now() + Math.random(),
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                description: i.description || i.item?.description || '',
                                qty: (i.qty || '1').toString(),
                                // For Purchase Orders, we use Purchase Price if available, else Unit Price from Sales
                                unitPrice: (i.item?.purchasePrice || i.unitPrice || '0').toString(),
                                discount: (i.discount || '').toString(),
                                taxCode: i.taxCode || 'VAT 16%'
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Failed to load source for purchase order:', err);
                }
            };
            fetchSource();
        }
    }, [id, location.search]);

    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        const lineCalcs = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const discountValue = parseFloat(item.discount) || 0;

            let netTotal = qty * price;
            if (options.columnDiscount) {
                if (options.columnDiscountType === 'Percentage') netTotal *= (1 - (discountValue / 100));
                else netTotal = Math.max(0, netTotal - discountValue);
            }

            let taxAmount = 0;
            const selectedTax = taxCodes.find(tc => tc.name === item.taxCode);
            const taxRate = selectedTax ? (parseFloat(selectedTax.rate) / 100) : 0;

            if (taxRate > 0) {
                if (options.amountsAreTaxInclusive) {
                    taxAmount = netTotal - (netTotal / (1 + taxRate));
                    netTotal = netTotal - taxAmount;
                } else taxAmount = netTotal * taxRate;
            }
            subtotal += netTotal;
            totalTax += taxAmount;
            return { taxAmount, grossTotal: netTotal + taxAmount, netTotal };
        });

        let grandTotal = subtotal + totalTax;
        if (options.rounding) {
            if (options.roundingType === 'Round to nearest') grandTotal = Math.round(grandTotal);
            else if (options.roundingType === 'Round down') grandTotal = Math.floor(grandTotal);
        }
        let whtAmount = 0;
        if (options.withholdingTax) {
            const whtVal = parseFloat(options.withholdingTaxValue) || 0;
            if (options.withholdingTaxType === 'Rate') whtAmount = subtotal * (whtVal / 100);
            else whtAmount = whtVal;
            grandTotal -= whtAmount;
        }

        return { lineCalcs, subtotal, totalTax, grandTotal, whtAmount };
    }, [items, options, taxCodes]);

    const handleSave = async (statusOverride?: string) => {
        if (!supplier) {
            alert('Please select a supplier.');
            return;
        }

        const validItems = items.filter(i => i.item !== 'Select Item' && i.item !== '');
        if (validItems.length === 0) {
            alert('Please add at least one valid item.');
            return;
        }

        const selectedSup = dbSuppliers.find(s => s.name === supplier);
        if (!selectedSup) {
            alert('Selected supplier not found in database.');
            return;
        }

        const quoteData: any = {
            reference: reference,
            supplierId: selectedSup.id,
            orderDate: issueDate,
            amount: calculations.grandTotal,
            description: description,
            currency: currency,
            status: typeof statusOverride === 'string' ? statusOverride : 'Open',
            items: validItems.map((i, index) => {
                const dbItem = dbItems.find(it => it.itemName === i.item);
                const calc = calculations.lineCalcs[index];
                return {
                    itemId: dbItem?.id,
                    description: i.description,
                    qty: parseFloat(i.qty) || 0,
                    unitPrice: parseFloat(i.unitPrice) || 0,
                    totalAmount: calc.grossTotal, // This is the final line total including discount and tax
                    taxCode: i.taxCode,
                    discount: i.discount
                };
            }),
            docOptions: options
        };

        try {
            if (isEditing && id) {
                await apiService.updatePurchaseOrder(id, quoteData);
            } else {
                await apiService.createPurchaseOrder(quoteData);
            }
            navigate('/purchase-orders');
        } catch (err: any) {
            console.error('Failed to save purchase order:', err);
            const errMsg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to save purchase order to database: ${errMsg}`);
        }
    };

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/purchase-orders')}>Purchase Orders</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{isEditing ? 'Edit Existing' : 'Configure New'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{isEditing ? 'Modify Purchase Order' : 'New Purchase Order'}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/purchase-orders')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-8">
                    <div className="space-y-8 animate-in fade-in duration-700">
                        <div className="space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Basic Information</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.6fr] gap-8">
                                <InputField label="Order Date" type="date" value={issueDate} onChange={(e: any) => setIssueDate(e.target.value)} Icon={Calendar} />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference</label>
                                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                        <div className="h-full px-4 border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => { setUseManualRef(!useManualRef); if (!useManualRef) setReference(''); }}>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${!useManualRef ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 border-2'}`}>
                                                {!useManualRef && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={reference}
                                            onChange={(e) => useManualRef && setReference(e.target.value)}
                                            readOnly={!useManualRef}
                                            placeholder={useManualRef ? "Enter custom ref..." : ""}
                                            className={cn(
                                                "w-full bg-transparent border-none px-4 py-3 text-[13px] font-semibold outline-none transition-colors",
                                                !useManualRef ? "text-indigo-600 font-black" : "text-slate-700"
                                            )}
                                        />
                                    </div>
                                </div>
                                <InputField label="Overall Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Main purpose of this order..." Icon={Briefcase} />
                            </div>
                        </div>

                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                    <User size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Supplier & Logistics</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <SelectField label="Selected Supplier" value={supplier} onChange={(e: any) => {
                                        const supName = e.target.value;
                                        setSupplier(supName);
                                        const selected = dbSuppliers.find(s => s.name === supName);
                                        if (selected) {
                                            setCurrency(selected.currency?.split(' - ')[0] || 'ZMW');
                                            setBillingAddress(selected.billingAddress || '');
                                        }
                                    }} Icon={User}>
                                        <option value="">Select Target Supplier...</option>
                                        {dbSuppliers.filter(s => (!s.inactive && s.status !== 'Inactive') || s.name === supplier).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </SelectField>
                                </div>
                                <TextareaField label="Supplier Address" value={billingAddress} onChange={(e: any) => setBillingAddress(e.target.value)} placeholder="Physical address of supplier..." rows={3} />
                            </div>
                        </div>


                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                        <Package size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Order Line Items</h2>
                                </div>
                                <button onClick={() => setItems(prev => [...prev, { id: Date.now(), item: 'Select Item', description: '', qty: '1', unitPrice: '0', discount: '', taxCode: 'No tax' }])} className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all">
                                    <Plus size={14} /> <span>Add Row</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {options.columnLineNumber && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">ITEM</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">QTY</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">UNIT PRICE</th>
                                            {options.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28 text-right whitespace-nowrap">DISCOUNT</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">TAX CODE</th>
                                            {!options.amountsAreTaxInclusive && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right text-slate-400">TAX AMOUNT</th>}
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
                                                        <select
                                                            value={item.item}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const invItem = dbItems.find(it => it.itemName === val);
                                                                setItems(prev => prev.map(i => i.id === item.id ? {
                                                                    ...i,
                                                                    item: val,
                                                                    unitPrice: invItem ? invItem.purchasePrice.toString() : i.unitPrice,
                                                                    description: invItem ? val : i.description
                                                                } : i));
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#2563eb] outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value="Select Item">Select Item</option>
                                                            {dbItems.map(it => (
                                                                <option key={it.id} value={it.itemName}>{it.itemName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setItems(prev => prev.map(i => i.id === item.id ? { ...i, description: val } : i));
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm text-slate-600 outline-none placeholder:text-slate-300"
                                                            placeholder="Add description..."
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 relative group/qty text-right">
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="text"
                                                                value={item.qty}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i));
                                                                }}
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none text-slate-700"
                                                            />
                                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter flex items-center justify-between w-full">
                                                                <span>Stock: {(dbItems.find(it => it.itemName === item.item)?.qtyOnHand || 0).toLocaleString()}</span>
                                                                <span className="text-indigo-500 font-black">{dbItems.find(it => it.itemName === item.item)?.unit || ''}</span>
                                                            </div>
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
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none text-slate-700 placeholder:text-slate-300"
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                    {options.columnDiscount && (
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={item.discount}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, discount: val } : i));
                                                                    }}
                                                                    className="w-16 bg-transparent border-none p-0 text-sm font-bold text-indigo-600 text-right outline-none placeholder:text-slate-300"
                                                                    placeholder="0"
                                                                />
                                                                <span className="text-[10px] text-slate-400 font-bold">{options.columnDiscountType === 'Percentage' ? '%' : currency}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4">
                                                        <select
                                                            value={item.taxCode}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setItems(prev => prev.map(i => i.id === item.id ? { ...i, taxCode: val } : i));
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value="" disabled>Select Tax...</option>
                                                            <option value="No tax">No tax</option>
                                                            {taxCodes.map(tc => (
                                                                <option key={tc.id} value={tc.name}>{tc.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    {!options.amountsAreTaxInclusive && (
                                                        <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">
                                                            {calc?.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right tabular-nums">
                                                        {calc?.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => {
                                                                    const newItem = { ...item, id: Date.now() };
                                                                    setItems(prev => {
                                                                        const newArr = [...prev];
                                                                        newArr.splice(index + 1, 0, newItem);
                                                                        return newArr;
                                                                    });
                                                                }}
                                                                className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                                title="Duplicate Row"
                                                            >
                                                                <Copy size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                                title="Delete Row"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end pr-24">
                                    <div className="w-full max-w-xs space-y-2">
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
                                        {options.withholdingTax && (
                                            <div className="flex justify-end items-center text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] gap-8 text-right">
                                                <span>Withholding Tax</span>
                                                <span className="text-rose-600 font-bold tabular-nums text-[13px] w-32 text-right">-{calculations.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-end items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 mt-2 h-14 gap-x-6">
                                            <div className="flex-1 text-left">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Total Payable</p>
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900 tracking-tight tabular-nums flex items-baseline">
                                                <span className="text-xs font-medium text-indigo-400 mr-2 uppercase">{currency}</span>
                                                {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Options Area */}
                        <div className="space-y-6 pt-6 border-t border-slate-50 text-left">
                            <div
                                onClick={() => setShowOptionsArea(!showOptionsArea)}
                                className="flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Document Options</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showOptionsArea ? 'Hide configuration' : 'Configure procurement settings'}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100/50 transition-all">
                                    <ChevronDown size={20} className={cn("transition-transform duration-300", showOptionsArea ? "rotate-180" : "")} />
                                </div>
                            </div>

                            {showOptionsArea && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                                    {([
                                        ['Tax Inclusive', 'amountsAreTaxInclusive'],
                                        ['Line Numbers', 'columnLineNumber'],
                                        ['Discount', 'columnDiscount'],
                                        ['Withholding Tax', 'withholdingTax'],
                                        ['Rounding', 'rounding'],
                                        ['Custom Title', 'customTitle'],
                                        ['Footers', 'footers']
                                    ] as const).map(([label, key]) => (
                                        <div key={key} className="space-y-3">
                                            <label className="flex items-center space-x-3 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={(options as any)[key]}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                                    />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{label}</span>
                                            </label>
                                            {key === 'columnDiscount' && options.columnDiscount && (
                                                <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={options.columnDiscountType}
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
                                            {key === 'withholdingTax' && options.withholdingTax && (
                                                <div className="space-y-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="relative">
                                                        <select
                                                            value={options.withholdingTaxType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, withholdingTaxType: e.target.value }))}
                                                            className="w-full appearance-none bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 text-[10px] font-black text-rose-600 uppercase tracking-wider focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="Rate">Rate (%)</option>
                                                            <option value="Amount">Amount</option>
                                                        </select>
                                                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={options.withholdingTaxValue}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, withholdingTaxValue: e.target.value }))}
                                                        placeholder="Value..."
                                                        className="w-full bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-rose-600 focus:outline-none placeholder:text-rose-300"
                                                    />
                                                </div>
                                            )}
                                            {key === 'rounding' && options.rounding && (
                                                <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={options.roundingType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, roundingType: e.target.value }))}
                                                            className="w-full appearance-none bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                                                        >
                                                            <option value="Round to nearest">Round to nearest</option>
                                                            <option value="Round down">Round down</option>
                                                        </select>
                                                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                            )}
                                            {key === 'customTitle' && options.customTitle && (
                                                <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <input
                                                        type="text"
                                                        value={options.customTitleValue}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                        placeholder="e.g. Purchase Order"
                                                        className="w-full bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-4 py-2 text-[11px] font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-indigo-300/50"
                                                    />
                                                </div>
                                            )}
                                            {key === 'footers' && options.footers && (
                                                <div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <select
                                                        value={dbFooters.find(f => f.content === options.footerValue)?.id || ''}
                                                        onChange={(e) => {
                                                            const footer = dbFooters.find(f => f.id === e.target.value);
                                                            if (footer) setOptions(prev => ({ ...prev, footerValue: footer.content }));
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none"
                                                    >
                                                        <option value="">-- Choose template --</option>
                                                        {dbFooters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Attachment Area */}
                        <div className="mt-6 pt-4 border-t border-slate-50 text-left">
                            <div className="space-y-3 max-w-md">
                                <div className="flex items-center space-x-2.5 mb-1 opacity-60">
                                    <ImageIcon size={14} className="text-slate-400" />
                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Documentation</h3>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []) as File[];
                                            const newAttachments = await Promise.all(files.map(file => {
                                                return new Promise<any>((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        resolve({
                                                            name: file.name,
                                                            type: file.type,
                                                            size: file.size,
                                                            data: reader.result
                                                        });
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            }));
                                            setOptions(prev => ({
                                                ...prev,
                                                attachments: [...(prev.attachments || []), ...newAttachments]
                                            }));
                                        }}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="group relative flex items-center bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-2 cursor-pointer hover:bg-white hover:border-indigo-300 transition-all duration-300 w-full"
                                    >
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-3 group-hover:text-indigo-500 transition-colors shadow-sm">
                                            <Plus size={16} className={cn("transition-transform duration-300", (options.attachments || []).length > 0 ? "rotate-45" : "")} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">
                                                {(options.attachments || []).length === 0 ? 'Attach Technical Specs' : `${(options.attachments || []).length} Files Attached`}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
                                                Specs, plans or references
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* File List */}
                                {(options.attachments || []).length > 0 && (
                                    <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {(options.attachments || []).map((file: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-all">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div className="max-w-[200px]">
                                                        <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setOptions(prev => ({
                                                            ...prev,
                                                            attachments: prev.attachments.filter((_: any, i: number) => i !== idx)
                                                        }));
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-8">
                            <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="rounded-2xl px-8 py-4">Cancel</Button>
                            {!isEditing && (
                                <Button variant="outline" onClick={() => handleSave('Ordered')} className="rounded-2xl px-8 py-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300">
                                    <CheckCircle2 size={18} className="mr-2" />
                                    Approve & Save
                                </Button>
                            )}
                            {isEditing && (
                                <Button variant="outline" onClick={() => handleSave('Ordered')} className="rounded-2xl px-8 py-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300">
                                    <CheckCircle2 size={18} className="mr-2" />
                                    Approve & Update
                                </Button>
                            )}
                            <Button variant="primary" onClick={() => handleSave()} className="rounded-2xl px-12 py-4 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200">
                                <Save size={18} className="mr-2" />
                                {isEditing ? 'Update Order' : 'Save Order'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewPurchaseOrderView;
