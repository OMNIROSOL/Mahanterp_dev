import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account, InventoryItem, Receipt as ReceiptType } from '../types';
import {
    Receipt, ChevronRight, Calculator, ChevronDown,
    Copy, X, Plus, Calendar, Hash, User, Briefcase,
    Landmark, CreditCard, Trash2, Save, Undo2,
    CheckCircle2, Info, Image as ImageIcon, Download,
    ChevronUp, Settings
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

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

const SelectField = ({ label, value, onChange, Icon, children, className }: any) => (
    <div className={cn("space-y-2", className)}>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <select
                value={value}
                onChange={onChange}
                className={cn(
                    "w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pr-11 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer",
                    Icon ? "pl-11" : "px-5"
                )}
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

const CheckboxField = ({ label, checked, onChange, description }: any) => (
    <div
        onClick={onChange}
        className={cn(
            "flex items-center space-x-4 p-4 rounded-2xl border transition-all cursor-pointer group",
            checked ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200"
        )}
    >
        <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            checked ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white border-slate-300"
        )}>
            {checked && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
        </div>
        <div>
            <p className={cn("text-[12px] font-bold tracking-tight transition-colors", checked ? "text-indigo-900" : "text-slate-600")}>{label}</p>
            {description && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{description}</p>}
        </div>
    </div>
);

const NewReceiptView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customTitleText, setCustomTitleText] = useState('');
    const [fixedTotalValue, setFixedTotalValue] = useState('');
    const [footerText, setFooterText] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [paidBy, setPaidBy] = useState('Contact');
    const [paidByContact, setPaidByContact] = useState('Customer');
    const [paidByOptional, setPaidByOptional] = useState('');
    const [receivedIn, setReceivedIn] = useState('Account');
    const [receivedInAccount, setReceivedInAccount] = useState('');
    const [description, setDescription] = useState('');

    const [items, setItems] = useState([{ id: Date.now(), item: '', account: 'Accounts Receivable', description: '', qty: '1', discount: '', amount: '', total: '0' }]);
    const [fileName, setFileName] = useState('No file chosen');

    const [options, setOptions] = useState({
        taxInclusive: false,
        lineNumber: false,
        discount: false,
        withholdingTax: false,
        customTitle: false,
        footers: false,
        cancelled: false,
        descriptionCol: false,
        qty: false,
        taxExclusive: false,
        fixedTotal: false,
    });

    const [withholdingTaxRate, setWithholdingTaxRate] = useState('10');
    const [withholdingTaxMethod, setWithholdingTaxMethod] = useState('Rate');

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [incomeItems, setIncomeItems] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [accs, txItems, custs, supps] = await Promise.all([
                    apiService.getAccounts(),
                    apiService.getTransactionItems(),
                    apiService.getCustomers(),
                    apiService.getSuppliers()
                ]);
                setAccounts(accs);
                setIncomeItems(txItems.filter((i: any) => i.type === 'Income'));
                setCustomers(custs);
                setSuppliers(supps);
                
                if (id) {
                    const receipt = await apiService.getReceipt(id);
                    if (receipt) {
                        setDate(receipt.date ? new Date(receipt.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                        setReference(receipt.reference || '');
                        setUseManualRef(true);
                        if (receipt.paidByContact) {
                            if (custs.some((c: any) => c.name === receipt.paidByContact)) {
                                setPaidByContact('Customer');
                            } else if (supps.some((s: any) => s.name === receipt.paidByContact)) {
                                setPaidByContact('Supplier');
                            } else {
                                setPaidByContact('Other');
                            }
                            setPaidByOptional(receipt.paidByContact);
                        } else {
                            setPaidByContact('Customer');
                            setPaidByOptional('');
                        }
                        setReceivedInAccount(receipt.receivedInAccount || '');
                        setDescription(receipt.description || '');
                        if (receipt.items) {
                            setItems(receipt.items.map((it: any) => {
                                let accName = it.account || 'Suspense';
                                const matchedAcc = accs.find((a: any) => a.id === accName);
                                if (matchedAcc) accName = matchedAcc.name;

                                return {
                                    id: it.id || Date.now() + Math.random(),
                                    item: it.item || '',
                                    account: accName,
                                    description: it.description || '',
                                    qty: (it.qty || 1).toString(),
                                    discount: it.discount || '',
                                    amount: (it.amount || 0).toString(),
                                    total: (it.total || 0).toString()
                                };
                            }));
                        }
                        if (receipt.allocations?.length) {
                            const map: Record<string, string> = {};
                            receipt.allocations.forEach((a: any) => {
                                map[a.invoiceId] = String(a.amount);
                            });
                            setAllocations(map);
                        }
                    }
                } else {
                    const nextRef = await apiService.getNextReference('receipt');
                    setReference(nextRef);
                }
            } catch (err) {
                console.error('Failed to fetch initial data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        const loadUnpaid = async () => {
            if (paidByContact !== 'Customer' || !paidByOptional) {
                setUnpaidInvoices([]);
                return;
            }
            try {
                const invs = await apiService.getInvoices();
                const unpaid = (invs || []).filter((inv: any) => {
                    const name = typeof inv.customer === 'string' ? inv.customer : (inv.customer?.name || '');
                    const due = Number(inv.balanceDue ?? inv.grandTotal ?? inv.invoiceAmount ?? 0);
                    return name === paidByOptional && due > 0.01 && String(inv.status || '').toLowerCase() !== 'paid';
                });
                setUnpaidInvoices(unpaid);

                if (id || unpaid.length === 0) return;
                if (new URLSearchParams(location.search).get('amount')) return;

                const map: Record<string, string> = {};
                let outstanding = 0;
                unpaid.forEach((inv: any) => {
                    const due = Number(inv.balanceDue ?? inv.grandTotal ?? inv.invoiceAmount ?? 0);
                    map[inv.id] = due.toFixed(2);
                    outstanding += due;
                });
                setAllocations(map);

                const amt = outstanding.toFixed(2);
                const desc = unpaid.length === 1
                    ? `Payment for Invoice ${unpaid[0].reference}`
                    : `Receipt from ${paidByOptional}`;
                setItems([{
                    id: Date.now(),
                    item: '',
                    account: 'Accounts Receivable',
                    description: desc,
                    qty: '1',
                    discount: '',
                    amount: amt,
                    total: amt
                }]);
            } catch (err) {
                console.error('Failed to load unpaid invoices:', err);
            }
        };
        loadUnpaid();
    }, [paidByContact, paidByOptional, id]);

    const updateItem = (itemId: number, field: string, value: string) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const newItem = { ...item, [field]: value };
                if (field === 'item' && value) {
                    const selectedItem = incomeItems.find(i => i.name === value);
                    if (selectedItem && selectedItem.defaultAccountId) {
                        const acc = accounts.find(a => a.id === selectedItem.defaultAccountId);
                        if (acc) {
                            newItem.account = acc.name;
                        }
                    }
                    if (selectedItem && selectedItem.description) {
                        newItem.description = selectedItem.description;
                    }
                }
                if (field === 'total') {
                    const q = parseFloat(newItem.qty) || 1;
                    newItem.qty = String(q);
                    newItem.amount = (parseFloat(value) / q || 0).toFixed(2);
                    newItem.total = value;
                    return newItem;
                }
                const q = parseFloat(newItem.qty) || 0;
                const a = parseFloat(newItem.amount) || 0;
                const d = parseFloat(newItem.discount) || 0;
                const total = (q * a) * (1 - d / 100);
                newItem.total = total.toFixed(2);
                return newItem;
            }
            return item;
        }));
    };

    const syncLineFromAllocations = (nextAlloc: Record<string, string>) => {
        const applied = Object.values(nextAlloc).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        const amt = applied.toFixed(2);
        setItems(prev => {
            const idx = prev.findIndex(i => (i.account || '').toLowerCase().includes('receivable'));
            const line = {
                id: idx >= 0 ? prev[idx].id : Date.now(),
                item: idx >= 0 ? prev[idx].item : '',
                account: 'Accounts Receivable',
                description: idx >= 0 ? prev[idx].description : (paidByOptional ? `Receipt from ${paidByOptional}` : ''),
                qty: '1',
                discount: '',
                amount: amt,
                total: amt
            };
            if (idx >= 0) return prev.map((it, i) => (i === idx ? line : it));
            return [line, ...prev.filter(it => (parseFloat(it.total) || 0) > 0)];
        });
    };

    const addLine = () => setItems([...items, { id: Date.now(), item: '', account: 'Accounts Receivable', description: '', qty: '1', discount: '', amount: '', total: '0' }]);
    const copyLine = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (item) setItems([...items, { ...item, id: Date.now() + Math.random() }]);
    };
    const deleteLine = (itemId: number) => items.length > 1 && setItems(items.filter(item => item.id !== itemId));
    const toggleOption = (key: keyof typeof options) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const customer = queryParams.get('customer');
        const amount = queryParams.get('amount');
        const invRef = queryParams.get('reference');

        if (customer) {
            setPaidByOptional(customer);
            setPaidByContact('Customer');
        }
        if (amount) {
            setItems([{ id: Date.now(), item: '', account: 'Accounts Receivable', description: invRef ? `Payment for Invoice ${invRef}` : '', qty: '1', discount: '', amount: amount, total: amount }]);
        }
    }, [location.search]);

    const calculations = useMemo(() => {
        const total = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        let finalTotal = total;
        let whtAmount = 0;
        if (options.withholdingTax) {
            const rate = parseFloat(withholdingTaxRate) || 0;
            if (withholdingTaxMethod === 'Rate') whtAmount = total * (rate / 100);
            else whtAmount = rate;
            finalTotal -= whtAmount;
        }
        return { total, finalTotal, whtAmount };
    }, [items, options, withholdingTaxRate, withholdingTaxMethod]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileName(file ? file.name : 'No file chosen');
    };

    const handleSave = async () => {
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const receiptData = {
            reference: reference,
            date: date,
            paidByContact: paidByOptional || paidByContact,
            receivedInAccount: receivedInAccount || 'Suspense',
            description,
            amount: totalAmount || (parseFloat(fixedTotalValue) || 0),
            currency: 'ZMW',
            status: 'Completed',
            items: items.map(it => ({
                item: it.item,
                account: Object.values(allocations).some(v => parseFloat(v) > 0) && it.account === 'Suspense' ? 'Accounts Receivable' : it.account,
                description: it.description,
                qty: parseFloat(it.qty) || 0,
                amount: parseFloat(it.amount) || 0,
                total: parseFloat(it.total) || 0
            })),
            allocations: Object.entries(allocations)
                .filter(([, amt]) => parseFloat(amt) > 0)
                .map(([invoiceId, amt]) => ({ invoiceId, amount: parseFloat(amt) }))
        };

        try {
            if (id) {
                await apiService.updateReceipt(id, receiptData);
            } else {
                await apiService.createReceipt(receiptData);
            }
            navigate('/receipts');
        } catch (err) {
            console.error('Failed to save receipt:', err);
            alert('Failed to save receipt to database.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing receipt details...</p>
            </div>
        );
    }


    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-8 selection:bg-indigo-100 selection:text-indigo-900 font-sans animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/receipts')}>Receipts</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{id ? 'Edit Receipt' : 'New Receipt'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">{id ? 'Modify Receipt' : 'New Receipt'}</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Record a payment received into your accounts.</p>
                </div>
                <button onClick={() => navigate('/receipts')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 active:scale-90">
                    <X size={20} />
                </button>
            </div>

            {/* Main Config Card */}
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-12">
                    {/* Basic Info */}
                    <section className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <Receipt size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Basic Information</h2>
                        </div>

                        <AnimatePresence>
                            {options.customTitle && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <InputField label="Custom Title" value={customTitleText} onChange={(e: any) => setCustomTitleText(e.target.value)} placeholder="e.g. Official Receipt" Icon={Calculator} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <InputField label="Receipt Date" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} Icon={Calendar} />

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference</label>
                                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                    <div className="h-full px-4 border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => { setUseManualRef(!useManualRef); if (!useManualRef) setReference(''); }}>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${!useManualRef ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'border-slate-300 border-2'}`}>
                                            {!useManualRef && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                    </div>
                                    <input type="text" value={reference} onChange={(e) => useManualRef && setReference(e.target.value)} readOnly={!useManualRef} placeholder={useManualRef ? "Enter custom ref..." : ""} className={cn("w-full bg-transparent border-none px-4 py-3 text-[13px] font-semibold outline-none transition-colors", !useManualRef ? "text-indigo-600 font-black" : "text-slate-700")} />
                                </div>
                            </div>

                            <InputField label="Overall Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What was this payment for?" Icon={Briefcase} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Paid By</label>
                                <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all group">
                                    <div className="relative w-32 border-r border-slate-200">
                                        <select
                                            value={paidByContact}
                                            onChange={(e) => setPaidByContact(e.target.value)}
                                            className="w-full h-full bg-transparent pl-4 pr-8 py-3 text-[13px] font-semibold text-slate-700 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="Customer">Customer</option>
                                            <option value="Supplier">Supplier</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-indigo-500" />
                                    </div>
                                    {paidByContact === 'Customer' ? (
                                        <select
                                            value={paidByOptional}
                                            onChange={(e) => setPaidByOptional(e.target.value)}
                                            className="flex-1 bg-transparent px-5 py-3 text-[13px] font-semibold text-slate-700 outline-none appearance-none"
                                        >
                                            <option value="">Select Customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    ) : paidByContact === 'Supplier' ? (
                                        <select
                                            value={paidByOptional}
                                            onChange={(e) => setPaidByOptional(e.target.value)}
                                            className="flex-1 bg-transparent px-5 py-3 text-[13px] font-semibold text-slate-700 outline-none appearance-none"
                                        >
                                            <option value="">Select Supplier...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={paidByOptional}
                                            onChange={(e) => setPaidByOptional(e.target.value)}
                                            placeholder="Name or Contact..."
                                            className="flex-1 bg-transparent px-5 py-3 text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Received In</label>
                                <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all group">
                                    <div className="bg-slate-100 flex items-center px-4 border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">{receivedIn}</div>
                                    <div className="relative flex-1">
                                        <select
                                            value={receivedInAccount}
                                            onChange={(e) => setReceivedInAccount(e.target.value)}
                                            className="w-full h-full bg-transparent pl-4 pr-8 py-3 text-[13px] font-semibold text-slate-700 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Account...</option>
                                            {accounts.filter(a => a.isPaymentAccount).map(acc => (
                                                <option key={acc.id} value={acc.name}>{acc.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-indigo-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {paidByContact === 'Customer' && unpaidInvoices.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Allocate to Invoices</h2>
                            </div>
                            <p className="text-[12px] text-slate-500">Apply this receipt against unpaid sales invoices. Leave blank to auto-allocate oldest first.</p>
                            <div className="overflow-hidden rounded-2xl border border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Balance Due</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Apply</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unpaidInvoices.map((inv: any) => (
                                            <tr key={inv.id} className="border-t border-slate-50">
                                                <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{inv.reference}</td>
                                                <td className="px-4 py-3 text-[13px] text-slate-500">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : ''}</td>
                                                <td className="px-4 py-3 text-[13px] font-bold text-right">{Number(inv.balanceDue || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={allocations[inv.id] || ''}
                                                        onChange={(e) => {
                                                            const next = { ...allocations, [inv.id]: e.target.value };
                                                            setAllocations(next);
                                                            syncLineFromAllocations(next);
                                                        }}
                                                        className="w-32 ml-auto block bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-right"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Line Items */}
                    <section className="space-y-6 pt-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                    <Undo2 size={20} className="rotate-90" />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Receipt Items</h2>
                            </div>
                            <button onClick={addLine} className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm">
                                <Plus size={14} /> <span>Add Row</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto -mx-2 px-2 overflow-visible">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        {options.lineNumber && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-10 text-center">#</th>}
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[160px]">ITEM</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[180px]">ACCOUNT</th>
                                        {(options.descriptionCol || true) && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">DESCRIPTION</th>}
                                        {(options.qty || true) && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-24 text-right">QTY</th>}
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32 text-right whitespace-nowrap">UNIT PRICE</th>
                                        {options.discount && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-24 text-right">DISC (%)</th>}
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-36 text-right whitespace-nowrap">TOTAL AMOUNT</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors bg-white rounded-2xl shadow-sm border border-slate-100">
                                            {options.lineNumber && <td className="px-4 py-4 text-xs font-black text-slate-400 text-center">{index + 1}</td>}
                                            <td className="px-4 py-4">
                                                <div className="relative">
                                                    <select
                                                        value={item.item}
                                                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-indigo-600 outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Select Item...</option>
                                                        {incomeItems.map(inc => (
                                                            <option key={inc.id} value={inc.name}>{inc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="relative">
                                                    <select
                                                        value={item.account}
                                                        onChange={(e) => updateItem(item.id, 'account', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="Suspense">Suspense</option>
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.name}>{acc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-[13px] text-slate-600 outline-none placeholder:text-slate-300 font-medium"
                                                    placeholder="Add line description..."
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-slate-700 text-right outline-none"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={item.amount}
                                                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-slate-700 text-right outline-none"
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            {options.discount && (
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.discount}
                                                        onChange={(e) => updateItem(item.id, 'discount', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-indigo-600 text-right outline-none"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">ZMW</span>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={item.total}
                                                        onChange={(e) => updateItem(item.id, 'total', e.target.value)}
                                                        className="w-28 bg-transparent border-none p-0 text-[13px] font-black text-slate-800 text-right outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => copyLine(item.id)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="Duplicate"><Copy size={13} /></button>
                                                    <button onClick={() => deleteLine(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all" title="Delete"><X size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Totals */}
                        <div className="flex justify-end pt-4 pr-14">
                            <div className="w-full max-w-sm space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <span>Subtotal (ZMW)</span>
                                    <span className="text-slate-700 font-bold tabular-nums text-[13px]">
                                        {calculations.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {options.withholdingTax && (
                                    <div className="flex justify-between items-center text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-4">
                                        <span>Withholding Tax ({withholdingTaxMethod === 'Rate' ? `${withholdingTaxRate}%` : 'Fixed'})</span>
                                        <span className="font-bold tabular-nums text-[13px]">
                                            -{calculations.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-end items-center bg-indigo-600 p-5 rounded-3xl border border-indigo-700 shadow-xl shadow-indigo-200 mt-6 h-20 gap-x-8">
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.4em] leading-none mb-1 text-center">Final Amount Received</p>
                                        <div className="h-px bg-white/10 w-full mt-2"></div>
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight tabular-nums flex items-baseline">
                                        <span className="text-[10px] font-black text-indigo-200 mr-2 uppercase tracking-widest">ZMW</span>
                                        {calculations.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Features & Options */}
                    <section className="space-y-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <Settings size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Document Options</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <CheckboxField label="Amounts are tax inclusive" checked={options.taxInclusive} onChange={() => toggleOption('taxInclusive')} />
                            <CheckboxField label="Column — Line number" checked={options.lineNumber} onChange={() => toggleOption('lineNumber')} />
                            <CheckboxField label="Column — Discount" checked={options.discount} onChange={() => toggleOption('discount')} />
                            <CheckboxField label="Withholding tax" checked={options.withholdingTax} onChange={() => toggleOption('withholdingTax')} description="Apply income tax deductions" />
                            <CheckboxField label="Custom title" checked={options.customTitle} onChange={() => toggleOption('customTitle')} />
                            <CheckboxField label="Footers" checked={options.footers} onChange={() => toggleOption('footers')} />
                            <CheckboxField label="Cancelled" checked={options.cancelled} onChange={() => toggleOption('cancelled')} />
                        </div>

                        <AnimatePresence>
                            {(options.withholdingTax || options.footers) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 mt-4"
                                >
                                    {options.withholdingTax && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500"><Info size={12} /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Deduction Mode</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <SelectField label="Method" value={withholdingTaxMethod} onChange={(e: any) => setWithholdingTaxMethod(e.target.value)} className="w-40">
                                                    <option value="Rate">Rate (%)</option>
                                                    <option value="Amount">Amount (Fixed)</option>
                                                </SelectField>
                                                <div className="flex-1">
                                                    <InputField
                                                        label={withholdingTaxMethod === 'Rate' ? 'Rate (%)' : 'Fixed Amount (ZMW)'}
                                                        value={withholdingTaxRate}
                                                        onChange={(e: any) => setWithholdingTaxRate(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {options.footers && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Plus size={12} /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Footer</p>
                                            </div>
                                            <textarea
                                                value={footerText}
                                                onChange={(e) => setFooterText(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[100px] resize-none"
                                                placeholder="Terms, conditions, or bank details..."
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {/* Attachment Section */}
                    <section className="space-y-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                <ImageIcon size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Attachment / Proof</h2>
                        </div>
                        <div className="max-w-[600px] p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30 flex items-center gap-6 hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors">
                                <Download size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[14px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{fileName === 'No file chosen' ? 'Upload Receipt Proof' : fileName}</p>
                                <p className="text-[10px] font-medium text-slate-400">PDF, PNG or JPG max 10MB</p>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                            </div>
                            <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">Select</button>
                        </div>
                    </section>
                </div>

                {/* Bottom Footer Actions */}
                <div className="bg-slate-50/50 p-10 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/receipts')}
                        className="flex items-center space-x-2 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        <Undo2 size={16} />
                        <span>Discard Receipt</span>
                    </button>

                    <button
                        onClick={handleSave}
                        className="group relative flex items-center space-x-4 px-12 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95"
                    >
                        <Save size={18} />
                        <span>{id ? 'Update Receipt' : 'Complete Receipt'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewReceiptView;
