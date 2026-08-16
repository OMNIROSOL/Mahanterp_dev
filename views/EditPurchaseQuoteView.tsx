import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import {
    Plus,
    X,
    FileText,
    Calendar,
    User,
    Briefcase,
    Copy,
    Trash2,
    Settings,
    ChevronDown,
    ChevronRight,
    Image as ImageIcon,
    CheckCircle2,
    AlertTriangle,
    Save,
    Package
} from 'lucide-react';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';
import { PurchaseEnquiry, Supplier, InventoryItem, FooterTemplate } from '../types';

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

const EditPurchaseQuoteView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditing = Boolean(id);

    const [isLoading, setIsLoading] = useState(true);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [fileName, setFileName] = useState('No file chosen');
    const [status, setStatus] = useState('Active');
    const [items, setItems] = useState([{ id: Date.now(), item: 'Select Item', description: '', qty: '1', unitPrice: '0', unit: '', discount: '', taxCode: 'VAT 16%' }]);

    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [footers, setFooters] = useState<FooterTemplate[]>([]);
    const [historicalInvoices, setHistoricalInvoices] = useState<any[]>([]);
    const [historicalQuotes, setHistoricalQuotes] = useState<any[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);

    const updateItem = (id: any, field: string, value: any) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const [options, setOptions] = useState({
        amountsAreTaxInclusive: false,
        rounding: false,
        roundingType: 'Round to nearest',
        columnLineNumber: true,
        columnDiscount: false,
        columnDiscountType: 'Percentage',
        columnTaxAmount: true,
        columnTotal: true,
        withholdingTax: false,
        withholdingTaxType: 'Rate',
        withholdingTaxValue: '0',
        hideTotalAmount: false,
        customTitle: false,
        customTitleValue: 'Purchase Enquiry',
        footers: false,
        footerValue: 'Terms & Conditions apply.',
        cancelled: false
    });

    const [showOptionsArea, setShowOptionsArea] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [suppliers, itemsData, footersData, codesData] = await Promise.all([
                    apiService.getSuppliers().catch(e => { console.error('Suppliers failed:', e); return []; }),
                    apiService.getItems().catch(e => { console.error('Items failed:', e); return []; }),
                    apiService.getFooters().catch(e => { console.error('Footers failed:', e); return []; }),
                    apiService.getTaxCodes().catch(e => { console.error('Tax codes failed:', e); return []; })
                ]);

                setAllSuppliers(suppliers);
                setInventoryItems(itemsData);
                setFooters(footersData);
                setTaxCodes(codesData);

                // Load historical data separately
                apiService.getPurchaseEnquiries().then(setHistoricalQuotes).catch(e => console.error('Quotes failed:', e));
                apiService.getPurchaseInvoices().then(setHistoricalInvoices).catch(e => console.error('Invoices failed:', e));

                const searchParams = new URLSearchParams(location.search);
                const copyFromId = searchParams.get('copyFrom');

                if (id || copyFromId) {
                    const quoteId = id || copyFromId;
                    const enquiry = await apiService.getPurchaseEnquiry(quoteId!);
                    if (enquiry) {
                        let initialIssueDate = new Date().toISOString().split('T')[0];
                        if (enquiry.issueDate) {
                            const dottedPattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
                            if (dottedPattern.test(enquiry.issueDate)) {
                                const [day, month, year] = enquiry.issueDate.split('.');
                                initialIssueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                const d = new Date(enquiry.issueDate);
                                if (!isNaN(d.getTime())) {
                                    initialIssueDate = d.toISOString().split('T')[0];
                                }
                            }
                        }
                        setIssueDate(initialIssueDate);
                        setSupplier(enquiry.supplier?.name || enquiry.supplier || '');
                        setCurrency(enquiry.currency || enquiry.supplier?.currency?.split(' - ')[0] || 'ZMW');
                        setAddress(enquiry.supplier?.billingAddress || enquiry.billingAddress || '');

                        if (copyFromId) {
                            const nextRef = await apiService.getNextReference('purchase-enquiry').catch(() => '');
                            setReference(nextRef);
                            setUseManualRef(false);
                        } else {
                            setReference(enquiry.reference || '');
                            setUseManualRef(true);
                        }

                        setDescription(enquiry.description || '');
                        setStatus(id ? (enquiry.status || 'Active') : 'Active');
                        setItems(enquiry.items?.map((i: any) => ({
                            id: i.id || Date.now() + Math.random(),
                            item: i.item?.itemName || itemsData.find((it: any) => it.id === i.itemId)?.itemName || i.item || '',
                            description: i.description || '',
                            qty: (i.qty || 0).toString(),
                            unitPrice: (i.unitPrice || 0).toString(),
                            unit: i.unit || '',
                            discount: i.discount || '',
                            taxCode: i.taxCode || 'VAT 16%'
                        })) || []);
                        const dOptions = enquiry.docOptions || enquiry.options;
                        if (dOptions) {
                            setOptions(prev => ({ ...prev, ...dOptions }));
                        }
                    }
                } else {
                    setIssueDate(new Date().toISOString().split('T')[0]);
                    const nextRef = await apiService.getNextReference('purchase-enquiry').catch(() => '');
                    setReference(nextRef);
                    setItems([{ id: Date.now(), item: 'Select Item', description: '', qty: '1', unitPrice: '', unit: '', discount: '', taxCode: 'VAT 16%' }]);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, location.search]);

    const formatDateForSave = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        if (dateStr.includes('.')) {
            const [day, month, year] = dateStr.split('.');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return dateStr;
    };

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
                    netTotal -= taxAmount;
                } else {
                    taxAmount = netTotal * taxRate;
                }
            }

            subtotal += netTotal;
            totalTax += taxAmount;
            return { taxAmount, netTotal, grossTotal: netTotal + taxAmount };
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

    const handleSave = async () => {
        if (!supplier) { alert('Please select a supplier.'); return; }
        const validItems = items.filter(i => i.item && i.item !== 'Select Item');
        if (validItems.length === 0) { alert('Please select at least one valid item.'); return; }

        const selectedSupplier = allSuppliers.find(s => s.name === supplier);
        if (!selectedSupplier) {
            alert('Supplier not found in database.');
            return;
        }

        const quoteData = {
            issueDate: formatDateForSave(issueDate),
            reference: reference,
            supplierId: selectedSupplier.id,
            description: description,
            currency: currency,
            amount: 0,
            status: status,
            billingAddress: address,
            items: items.filter(i => i.item && i.item !== 'Select Item').map((i) => {
                const invItem = inventoryItems.find(it => it.itemName === i.item);
                const qty = parseFloat(i.qty) || 0;
                return {
                    itemId: invItem?.id || null,
                    itemName: i.item,
                    description: i.description || i.item,
                    qty: qty,
                    unitPrice: 0,
                    taxCode: "No tax",
                    unit: i.unit,
                    discount: "",
                    totalAmount: 0
                };
            }),
            docOptions: options
        };

        try {
            if (isEditing && id) {
                await apiService.updatePurchaseEnquiry(id, quoteData);
            } else {
                await apiService.createPurchaseEnquiry(quoteData);
            }
            navigate('/purchase-quotes');
        } catch (err: any) {
            console.error('Failed to save purchase enquiry:', err);
            const errMsg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to save purchase enquiry: ${errMsg}`);
        }
    };

    const requiresApproval = false;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading enquiry details...</p>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 font-sans">
            <div className="flex justify-between items-center text-left">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/purchase-quotes')}>PURCHASE ENQUIRY</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{isEditing ? 'Edit' : 'New'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                        {isEditing ? 'Edit Purchase Enquiry' : 'New Purchase Enquiry'}
                    </h1>
                </div>
                <button onClick={() => navigate('/purchase-quotes')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:bg-slate-50 transition-colors shadow-sm"><X size={20} /></button>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-10 space-y-8 animate-in fade-in duration-700">
                <div className="space-y-8">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                            <FileText size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight text-left">Basic Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                        <InputField label="Issue Date" type="date" value={issueDate} onChange={(e: any) => setIssueDate(e.target.value)} Icon={Calendar} />
                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference</label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                <div className="h-full px-4 border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => setUseManualRef(!useManualRef)}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${!useManualRef ? 'bg-indigo-600' : 'border-slate-300 border-2'}`}>
                                        {!useManualRef && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                </div>
                                <input type="text" value={reference} onChange={(e) => useManualRef && setReference(e.target.value)} readOnly={!useManualRef} placeholder={useManualRef ? "Enter custom ref..." : ""} className={cn("w-full bg-transparent border-none px-4 py-3 text-[13px] font-semibold outline-none transition-colors", !useManualRef ? "text-indigo-600 font-black" : "text-slate-700")} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                    <div className="space-y-6">
                        <SelectField label="Supplier" value={supplier} onChange={(e: any) => {
                            setSupplier(e.target.value);
                            const selected = allSuppliers.find(s => s.name === e.target.value);
                            if (selected) {
                                setCurrency(selected.currency || 'ZMW');
                                setAddress(selected.billingAddress || (selected as any).address || '');
                            }
                        }} Icon={User}>
                            <option value="">Select Supplier...</option>
                            {allSuppliers.filter(s => (!s.inactive && s.status !== 'Inactive') || s.name === supplier).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </SelectField>
                        <InputField label="Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Summary of request..." Icon={Briefcase} />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Address</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={4}
                            placeholder="Supplier address details..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                        ></textarea>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                <Package size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight text-left">Line Items</h2>
                        </div>
                        <button
                            onClick={() => setItems(prev => [...prev, { id: Date.now(), item: 'Select Item', description: '', qty: '1', unitPrice: '0', unit: '', discount: '', taxCode: 'VAT 16%' }])}
                            className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                            <Plus size={14} /> <span>Add New Row</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto mx-[-40px] scrollbar-hide">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {options.columnLineNumber && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">#</th>}
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[180px]">ITEM</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[160px]">DESCRIPTION</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 text-right">QTY</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-left">
                                {items.map((item, index) => {
                                    const invItem = inventoryItems.find(i => i.itemName === item.item || i.itemCode === item.item);
                                    return (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                            {options.columnLineNumber && <td className="px-6 py-5 text-center text-sm font-bold text-slate-300">{index + 1}</td>}
                                            <td className="px-6 py-5">
                                                <select
                                                    value={item.item}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const selected = inventoryItems.find(i => i.itemName === val);
                                                        setItems(prev => prev.map(i => i.id === item.id ? {
                                                            ...i,
                                                            item: val,
                                                            description: selected ? (selected.description || val) : i.description,
                                                            unit: selected ? (selected.unitName || '') : i.unit
                                                        } : i));
                                                    }}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-black text-indigo-600 outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="Select Item">Select Item</option>
                                                    {inventoryItems.map(i => <option key={i.id} value={i.itemName}>{i.itemName}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-5">
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    rows={1}
                                                    placeholder="Enter details..."
                                                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-600 outline-none resize-none placeholder:text-slate-300 min-h-[20px] scrollbar-hide"
                                                />
                                            </td>
                                            <td className="px-6 py-5 relative group/qty text-right">
                                                <div className="flex flex-col items-end min-w-[60px]">
                                                    <input
                                                        type="text"
                                                        value={item.qty}
                                                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none text-slate-700 tabular-nums"
                                                    />
                                                    <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                        <span className="opacity-70">Stock: {(invItem?.qtyOnHand || 0).toLocaleString()}</span>
                                                        <span className="text-indigo-500 font-black">{invItem?.unitName || (item as any).unit || ''}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                    <button
                                                        onClick={() => {
                                                            const newItem = { ...item, id: Date.now() + Math.random() };
                                                            const idx = items.findIndex(i => i.id === item.id);
                                                            const newItems = [...items];
                                                            newItems.splice(idx + 1, 0, newItem);
                                                            setItems(newItems);
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                        title="Duplicate Row"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                        title="Remove Row"
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
                                ['Line Numbers', 'columnLineNumber'],
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
                                    {(key as string) === 'customTitle' && options.customTitle && (
                                        <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                            <input
                                                type="text"
                                                value={options.customTitleValue}
                                                onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                placeholder="e.g. Price Enquiry"
                                                className="w-full bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-4 py-2 text-[11px] font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-indigo-300/50"
                                            />
                                        </div>
                                    )}
                                    {(key as string) === 'footers' && options.footers && (
                                        <div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
                                            <select
                                                value={footers.find(f => f.content === options.footerValue)?.id || ''}
                                                onChange={(e) => {
                                                    const footer = footers.find(f => f.id === e.target.value);
                                                    if (footer) setOptions(prev => ({ ...prev, footerValue: footer.content }));
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none"
                                            >
                                                <option value="">-- Choose template --</option>
                                                {footers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Attachment Area */}
                    <div className="mt-6 pt-4 border-t border-slate-50 text-left">
                        <div className="space-y-3 max-w-md">
                            <div className="flex items-center space-x-2.5 mb-1 opacity-60">
                                <ImageIcon size={14} className="text-slate-400" />
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Documentation</h3>
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative flex items-center bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-2 cursor-pointer hover:bg-white hover:border-indigo-300 transition-all duration-300"
                            >
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-3 group-hover:text-indigo-500 transition-colors shadow-sm">
                                    <Plus size={16} className={cn("transition-transform duration-300", fileName !== 'No file chosen' ? "rotate-45" : "")} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">
                                        {fileName === 'No file chosen' ? 'Attach Technical Specs' : fileName}
                                    </p>
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
                                        {fileName === 'No file chosen' ? 'Specs, plans or references' : 'Linked to quote'}
                                    </p>
                                </div>
                                {fileName !== 'No file chosen' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFileName('No file chosen'); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="w-7 h-7 flex items-center justify-center bg-rose-50 text-rose-500 rounded-md hover:bg-rose-100 transition-all"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFileName(file.name); }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submission Area */}
                <div className="bg-slate-50 p-10 mt-12 mb-[-40px] mx-[-40px] border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 rounded-b-[40px]">
                    <div className="flex-1 w-full text-left">
                        {requiresApproval && (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
                                <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-none">Internal Review Required</p>
                                    <p className="text-[11px] font-medium text-amber-700 leading-relaxed">Inventory threshold exceeded or budget constraints active. Managerial approval required before proceeding.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/purchase-quotes')}
                            className="px-8 py-4 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-[0.2em]"
                        >
                            Discard
                        </button>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleSave()}
                                disabled={requiresApproval}
                                className={cn(
                                    "px-10 py-4 rounded-2xl text-[12px] font-black transition-all shadow-xl uppercase tracking-[0.2em] flex items-center gap-2",
                                    requiresApproval
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                                )}
                            >
                                <Save size={18} /> {isEditing ? 'Update Enquiry' : 'Create Purchase Enquiry'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditPurchaseQuoteView;
