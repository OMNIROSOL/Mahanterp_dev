import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account, InventoryItem, Payment as PaymentType } from '../types';
import {
    Banknote as PaymentIcon, ChevronRight, Calculator, ChevronDown,
    Copy, X, Plus, Calendar, Hash, User, Briefcase,
    Landmark, CreditCard, Trash2, Save, Undo2,
    CheckCircle2, Info, Image as ImageIcon, Download,
    Upload,
    FileText
} from 'lucide-react';
import { SearchableSelect } from '../components/shared/SearchableSelect';
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

const formatMoney = (value: number) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const invoiceDue = (inv: any) => Number(inv.balanceDue ?? inv.grandTotal ?? inv.invoiceAmount ?? 0);

const invoiceTotal = (inv: any) => Number(inv.grandTotal ?? inv.invoiceAmount ?? inv.balanceDue ?? 0);

const isBankLikeAccount = (a: Account) =>
    !!a.isPaymentAccount || /(bank|airtel|cash|wallet|mtn|zamtel)/i.test(a.name || '');

const ledgerAccounts = (accounts: Account[]) => accounts.filter((a) => !isBankLikeAccount(a));

const apAccountName = (accounts: Account[]) => {
    const pool = ledgerAccounts(accounts);
    const match =
        pool.find((a) => (a.code || '').toUpperCase() === 'AP' || (a.code || '') === '2100') ||
        pool.find((a) => /accounts?\s*payable|trade payables/i.test(a.name || ''));
    return match?.name || 'Accounts Payable';
};

const advanceAccountName = (accounts: Account[]) => {
    const pool = ledgerAccounts(accounts);
    const match =
        pool.find((a) => (a.code || '') === '1300') ||
        pool.find((a) => /prepay|prepaid/i.test(a.name || ''));
    return match?.name || 'Supplier prepayments';
};

const paymentAccounts = (accounts: Account[]) => {
    const banks = accounts.filter((a) => isBankLikeAccount(a));
    if (banks.length) return banks;
    return accounts.filter((a) => (a.type || a.accountType) === 'Asset');
};

const isPaymentAccountName = (name: string, accounts: Account[]) =>
    paymentAccounts(accounts).some((a) => a.name === name) || /(bank|airtel|cash|wallet)/i.test(name || '');

const debitAccountOrDefault = (name: string, fallback: string, accounts: Account[]) => {
    if (!name || isPaymentAccountName(name, accounts)) return fallback;
    return name;
};

type PaymentLine = {
    id: number;
    role?: 'settlement' | 'advance' | 'other';
    item: string;
    account: string;
    description: string;
    qty: string;
    discount: string;
    amount: string;
    total: string;
};

const NewPaymentView = () => {
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
    const [paidTo, setPaidTo] = useState('Contact');
    const [paidToContact, setPaidToContact] = useState('Supplier');
    const [paidToOptional, setPaidToOptional] = useState('');
    const [paidToSupplierId, setPaidToSupplierId] = useState('');
    const [paidFrom, setPaidFrom] = useState('Account');
    const [paidFromAccount, setPaidFromAccount] = useState('');
    const [description, setDescription] = useState('');
    const [saveError, setSaveError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [items, setItems] = useState<PaymentLine[]>([{ id: Date.now(), role: 'settlement', item: '', account: 'Accounts Payable', description: '', qty: '1', discount: '', amount: '', total: '0' }]);
    const [settlementAccount, setSettlementAccount] = useState('Accounts Payable');
    const [advanceAccount, setAdvanceAccount] = useState('Supplier prepayments');
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
    const [expenseItems, setExpenseItems] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
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
                setExpenseItems(txItems.filter((i: any) => i.type === 'Expense'));
                setCustomers(custs);
                setSuppliers(supps);

                const banks = paymentAccounts(accs);
                const arName = apAccountName(accs);
                const advName = advanceAccountName(accs);
                setSettlementAccount(arName);
                setAdvanceAccount(advName);
                
                if (id) {
                    const payment = await apiService.getPayment(id);
                    if (payment) {
                        setDate(payment.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                        setReference(payment.reference || '');
                        setUseManualRef(true);
                        if (payment.paidToContact) {
                            const matchedSupplier = supps.find((s: any) => s.name === payment.paidToContact);
                            const matchedCustomer = custs.find((c: any) => c.name === payment.paidToContact);
                            if (matchedSupplier) {
                                setPaidToContact('Supplier');
                                setPaidToSupplierId(matchedSupplier.id);
                            } else if (matchedCustomer) {
                                setPaidToContact('Customer');
                            } else {
                                setPaidToContact('Other');
                            }
                            setPaidToOptional(payment.paidToContact);
                        } else {
                            setPaidToContact('Supplier');
                            setPaidToOptional('');
                        }
                        setPaidFromAccount(payment.paidFromAccount || banks[0]?.name || '');
                        setDescription(payment.description || '');
                        if (payment.items) {
                            setItems(payment.items.map((it: any) => {
                                let accName = it.account || arName;
                                const matchedAcc = accs.find((a: any) => a.id === accName);
                                if (matchedAcc) accName = matchedAcc.name;
                                const role = it.role || (/advance|prepay|prepaid/i.test(String(accName)) ? 'advance' : (String(accName).toLowerCase().includes('payable') ? 'settlement' : 'other'));
                                return {
                                    id: it.id || Date.now() + Math.random(),
                                    role,
                                    item: it.item || '',
                                    account: debitAccountOrDefault(accName, role === 'advance' ? advName : arName, accs),
                                    description: it.description || '',
                                    qty: (it.qty || 1).toString(),
                                    discount: it.discount || '',
                                    amount: (it.amount || 0).toString(),
                                    total: (it.total || 0).toString()
                                };
                            }));
                        }
                        if (payment.allocations?.length) {
                            const map: Record<string, string> = {};
                            payment.allocations.forEach((a: any) => {
                                map[a.invoiceId] = String(a.amount);
                            });
                            setAllocations(map);
                        }
                    }
                } else {
                    const nextRef = await apiService.getNextReference('payment');
                    setReference(nextRef);
                    if (banks[0]?.name) setPaidFromAccount(banks[0].name);
                    setItems([{
                        id: Date.now(),
                        role: 'settlement',
                        item: '',
                        account: arName,
                        description: '',
                        qty: '1',
                        discount: '',
                        amount: '',
                        total: '0'
                    }]);
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
        const loadCustomerInvoices = async () => {
            if (paidToContact !== 'Supplier' || !paidToSupplierId) {
                setSupplierInvoices([]);
                setUnpaidInvoices([]);
                if (!id) setAllocations({});
                return;
            }
            try {
                const invs = await apiService.getSupplierInvoices(paidToSupplierId);
                const list = Array.isArray(invs) ? invs : [];
                setSupplierInvoices(list);
                const outstanding = list.filter((inv: any) => invoiceDue(inv) > 0.01);
                setUnpaidInvoices(outstanding);

                if (id) return;

                const queryParams = new URLSearchParams(location.search);
                const presetAmount = queryParams.get('amount');
                const presetRef = queryParams.get('reference');

                const map: Record<string, string> = {};
                if (presetRef && presetAmount) {
                    const match = outstanding.find((inv: any) => String(inv.reference) === presetRef);
                    if (match) {
                        const due = invoiceDue(match);
                        const apply = Math.min(due, parseFloat(presetAmount) || due);
                        map[match.id] = apply.toFixed(2);
                    }
                } else if (!presetAmount) {
                    outstanding.forEach((inv: any) => {
                        map[inv.id] = invoiceDue(inv).toFixed(2);
                    });
                }
                setAllocations(map);
                syncLineFromAllocations(map, outstanding, apAccountName(accounts), paidToOptional);
            } catch (err) {
                console.error('Failed to load supplier invoices:', err);
                setSupplierInvoices([]);
                setUnpaidInvoices([]);
            }
        };
        loadCustomerInvoices();
    }, [paidToContact, paidToSupplierId, id]);

    const updateItem = (itemId: number, field: string, value: string) => {
        setItems(items.map(item => {
            if (item.id !== itemId) return item;
            const newItem = { ...item, [field]: value };
            if (field === 'item' && value && item.role === 'other') {
                const selectedItem = expenseItems.find(i => i.name === value);
                if (selectedItem && selectedItem.defaultAccountId) {
                    const acc = accounts.find(a => a.id === selectedItem.defaultAccountId);
                    if (acc && !acc.isPaymentAccount) newItem.account = acc.name;
                }
                if (selectedItem && selectedItem.description) newItem.description = selectedItem.description;
            }
            if (field === 'account' && isPaymentAccountName(value, accounts)) {
                newItem.account = item.role === 'advance' ? advanceAccount : settlementAccount;
            }
            if (field === 'total') {
                const q = parseFloat(newItem.qty) || 1;
                newItem.qty = String(q);
                newItem.amount = (parseFloat(value) / q || 0).toFixed(2);
                newItem.total = value;
            } else if (field === 'qty' || field === 'amount' || field === 'discount') {
                const q = parseFloat(newItem.qty) || 0;
                const a = parseFloat(newItem.amount) || 0;
                const d = parseFloat(newItem.discount) || 0;
                newItem.total = ((q * a) * (1 - d / 100)).toFixed(2);
            }

            if (item.role === 'settlement' && (field === 'total' || field === 'amount')) {
                const applied = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                const typed = parseFloat(newItem.total) || 0;
                if (typed > applied + 0.009) {
                    const extra = (typed - applied).toFixed(2);
                    newItem.amount = applied.toFixed(2);
                    newItem.total = applied.toFixed(2);
                    setTimeout(() => {
                        setItems(prev => {
                            const without = prev.map(p => p.id === itemId ? newItem : p);
                            const existing = without.find(p => p.role === 'advance');
                            const advLine: PaymentLine = {
                                id: existing?.id || Date.now() + 1,
                                role: 'advance',
                                item: existing?.item || '',
                                account: existing?.account || advanceAccount,
                                description: existing?.description || `Advance to ${paidToOptional || 'supplier'}`,
                                qty: '1',
                                discount: '',
                                amount: extra,
                                total: extra
                            };
                            if (existing) return without.map(p => p.role === 'advance' ? advLine : p);
                            return [...without, advLine];
                        });
                    }, 0);
                }
            }
            return newItem;
        }));
    };

    const syncLineFromAllocations = (
        nextAlloc: Record<string, string>,
        invoices = unpaidInvoices,
        accountName = settlementAccount || apAccountName(accounts),
        payer = paidToOptional
    ) => {
        const appliedInvoices = invoices.filter((inv: any) => (parseFloat(nextAlloc[inv.id]) || 0) > 0);
        const applied = appliedInvoices.reduce((sum, inv) => sum + (parseFloat(nextAlloc[inv.id]) || 0), 0);
        const amt = applied > 0 ? applied.toFixed(2) : '';
        const desc = appliedInvoices.length === 1
            ? `Payment for Invoice ${appliedInvoices[0].reference}`
            : appliedInvoices.length > 1
                ? `Payment for ${appliedInvoices.map((inv: any) => inv.reference).join(', ')}`
                : (payer ? `Payment to ${payer}` : '');

        setItems(prev => {
            const others = prev.filter((it) => it.role === 'other');
            const existingSettlement = prev.find((it) => it.role === 'settlement') || prev.find((it) => !it.role);
            const existingAdvance = prev.find((it) => it.role === 'advance');
            const settlement: PaymentLine = {
                id: existingSettlement?.id || Date.now(),
                role: 'settlement',
                item: existingSettlement?.item || '',
                account: debitAccountOrDefault(existingSettlement?.account || '', accountName, accounts),
                description: desc || existingSettlement?.description || '',
                qty: '1',
                discount: '',
                amount: amt,
                total: amt || '0'
            };
            const lines: PaymentLine[] = [settlement, ...others];
            if (existingAdvance && (parseFloat(existingAdvance.total) || 0) > 0) {
                lines.push({
                    ...existingAdvance,
                    role: 'advance',
                    account: debitAccountOrDefault(existingAdvance.account, advanceAccount, accounts)
                });
            }
            return lines;
        });
        if (appliedInvoices.length === 1 && !description) {
            setDescription(`Payment for Invoice ${appliedInvoices[0].reference}`);
        } else if (appliedInvoices.length > 1 && payer && !description) {
            setDescription(`Payment to ${payer}`);
        }
    };

    const addLine = () => setItems([...items, { id: Date.now(), role: 'other', item: '', account: settlementAccount, description: '', qty: '1', discount: '', amount: '', total: '0' }]);
    const addAdvanceLine = () => {
        if (items.some((it) => it.role === 'advance')) return;
        setItems([...items, {
            id: Date.now(),
            role: 'advance',
            item: '',
            account: advanceAccount,
            description: paidToOptional ? `Advance to ${paidToOptional}` : 'Supplier prepayment',
            qty: '1',
            discount: '',
            amount: '',
            total: '0'
        }]);
    };
    const copyLine = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (item) setItems([...items, { ...item, id: Date.now() + Math.random() }]);
    };
    const deleteLine = (itemId: number) => items.length > 1 && setItems(items.filter(item => item.id !== itemId));
    const toggleOption = (key: keyof typeof options) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const customer = queryParams.get('supplier') || queryParams.get('customer');
        const amount = queryParams.get('amount');
        const invRef = queryParams.get('reference');

        if (customer && (suppliers.length || customers.length)) {
            const supplierMatch = suppliers.find((s: any) => s.name === customer || s.id === customer);
            const customerMatch = customers.find((c: any) => c.name === customer || c.id === customer);
            if (supplierMatch) {
                setPaidToOptional(supplierMatch.name);
                setPaidToSupplierId(supplierMatch.id);
                setPaidToContact('Supplier');
            } else if (customerMatch) {
                setPaidToOptional(customerMatch.name);
                setPaidToContact('Customer');
            } else {
                setPaidToOptional(customer);
                setPaidToContact(queryParams.get('supplier') ? 'Supplier' : 'Customer');
            }
        }
        if (amount && !paidToSupplierId) {
            const arName = apAccountName(accounts);
            setItems([{
                id: Date.now(),
                item: '',
                account: arName,
                description: invRef ? `Payment for Invoice ${invRef}` : '',
                qty: '1',
                discount: '',
                amount: amount,
                total: amount
            }]);
        }
    }, [location.search, customers, suppliers, accounts]);

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
        const outstanding = unpaidInvoices.reduce((sum, inv) => sum + invoiceDue(inv), 0);
        const applied = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        const advanceAmt = items.filter((it) => it.role === 'advance').reduce((sum, it) => sum + (parseFloat(it.total) || 0), 0);
        const selectedSupplier = suppliers.find((s: any) => s.id === paidToSupplierId);
        return {
            total,
            finalTotal,
            whtAmount,
            outstanding,
            applied,
            unallocated: Math.max(0, total - applied),
            remainingDebit: Math.max(0, outstanding - applied),
            advanceAmt,
            supplierDebit: Number(selectedSupplier?.debit || selectedSupplier?.accountsPayable || 0),
            supplierAdvance: Number(selectedSupplier?.advance || 0),
        };
    }, [items, options, withholdingTaxRate, withholdingTaxMethod, unpaidInvoices, allocations, suppliers, paidToSupplierId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileName(file ? file.name : 'No file chosen');
    };

    const handleSave = async () => {
        setSaveError('');
        const payer = paidToOptional || paidToContact;
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const appliedTotal = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

        if (paidToContact === 'Supplier' && !paidToSupplierId) {
            setSaveError('Select who is being paid.');
            return;
        }
        if (paidToContact !== 'Supplier' && !paidToOptional.trim()) {
            setSaveError('Enter who is being paid.');
            return;
        }
        if (!paidFromAccount) {
            setSaveError('Select the bank or cash account this payment is made from.');
            return;
        }
        if (totalAmount <= 0 && !(parseFloat(fixedTotalValue) > 0)) {
            setSaveError('Add at least one payment line with an amount.');
            return;
        }
        for (const inv of unpaidInvoices) {
            const applied = parseFloat(allocations[inv.id]) || 0;
            const due = invoiceDue(inv);
            if (applied > due + 0.009) {
                setSaveError(`Applied amount for ${inv.reference} cannot exceed the balance due.`);
                return;
            }
        }
        if (appliedTotal > totalAmount + 0.009) {
            setSaveError('Bill allocations are higher than the payment total. Increase the Accounts Payable line or reduce Apply amounts.');
            return;
        }
        if (items.some((it) => isPaymentAccountName(it.account, accounts))) {
            setSaveError('Payment item accounts cannot be a bank or cash account. Paid From is the bank; item accounts are debit (AP) or a prepayment.');
            return;
        }

        const arName = settlementAccount || apAccountName(accounts);
        const advName = advanceAccount || advanceAccountName(accounts);
        let saveItems = items.map(it => ({
            item: it.item,
            role: it.role || 'other',
            account: it.account,
            description: it.description,
            qty: parseFloat(it.qty) || 0,
            amount: parseFloat(it.amount) || 0,
            total: parseFloat(it.total) || 0
        }));
        const extra = Math.round((totalAmount - appliedTotal) * 100) / 100;
        if (paidToContact === 'Supplier' && extra > 0.009 && !saveItems.some((it) => it.role === 'advance' && it.total > 0)) {
            if (appliedTotal > 0) {
                const settlement = saveItems.find((it) => it.role === 'settlement');
                if (settlement && settlement.total > appliedTotal) {
                    settlement.total = appliedTotal;
                    settlement.amount = appliedTotal;
                }
                saveItems = [...saveItems, {
                    item: '',
                    role: 'advance',
                    account: advName,
                    description: `Advance to ${payer}`,
                    qty: 1,
                    amount: extra,
                    total: extra
                }];
            } else {
                saveItems = saveItems.map((it) => {
                    if (it.role !== 'settlement') return it;
                    const acc = !it.account || it.account === 'Suspense' || it.account === arName ? advName : it.account;
                    return { ...it, role: 'advance', account: acc };
                });
                if (!saveItems.some((it) => it.role === 'advance' && it.total > 0)) {
                    saveItems = [...saveItems, {
                        item: '',
                        role: 'advance',
                        account: advName,
                        description: `Advance to ${payer}`,
                        qty: 1,
                        amount: extra,
                        total: extra
                    }];
                }
            }
        }

        const paymentData = {
            reference: reference,
            date: date,
            paidToContact: payer,
            paidFromAccount: paidFromAccount,
            description,
            amount: saveItems.reduce((sum, it) => sum + (it.total || 0), 0) || (parseFloat(fixedTotalValue) || 0),
            currency: 'ZMW',
            status: options.cancelled ? 'Cancelled' : 'Completed',
            items: saveItems.map((it) => ({
                ...it,
                account: it.account === 'Suspense'
                    ? (it.role === 'advance' ? advName : arName)
                    : it.account,
            })),
            allocations: Object.entries(allocations)
                .filter(([, amt]) => parseFloat(amt) > 0)
                .map(([invoiceId, amt]) => ({ invoiceId, amount: parseFloat(amt) }))
        };

        try {
            setIsSaving(true);
            if (id) {
                await apiService.updatePayment(id, paymentData);
            } else {
                await apiService.createPayment(paymentData);
            }
            navigate('/payments');
        } catch (err: any) {
            console.error('Failed to save payment:', err);
            setSaveError(err?.response?.data?.error || err?.message || 'Failed to save payment.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing payment details...</p>
            </div>
        );
    }


    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-8 selection:bg-indigo-100 selection:text-indigo-900 font-sans animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/payments')}>Payments</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{id ? 'Edit Payment' : 'New Payment'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">{id ? 'Modify Payment' : 'New Payment'}</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Record a payment from your bank or cash accounts.</p>
                </div>
                <button onClick={() => navigate('/payments')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 active:scale-90">
                    <X size={20} />
                </button>
            </div>

            {/* Main Config Card */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                <div className="p-8 md:p-10 space-y-8">
                    {/* Basic Info */}
                    <section className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <PaymentIcon size={20} />
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
                                    <InputField label="Custom Title" value={customTitleText} onChange={(e: any) => setCustomTitleText(e.target.value)} placeholder="e.g. Official Payment" Icon={Calculator} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <InputField label="Payment Date" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} Icon={Calendar} />

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Paid To</label>
                                <div className="flex h-[50px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all group">
                                    <div className="relative w-32 shrink-0 border-r border-slate-200">
                                        <select
                                            value={paidToContact}
                                            onChange={(e) => {
                                                setPaidToContact(e.target.value);
                                                setPaidToOptional('');
                                                setPaidToSupplierId('');
                                                setSupplierInvoices([]);
                                                setUnpaidInvoices([]);
                                                setAllocations({});
                                            }}
                                            className="w-full h-full bg-transparent pl-4 pr-8 text-[13px] font-semibold text-slate-700 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="Supplier">Supplier</option>
                                            <option value="Customer">Customer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {paidToContact === 'Supplier' ? (
                                        <select
                                            value={paidToSupplierId}
                                            onChange={(e) => {
                                                const nextId = e.target.value;
                                                const supplier = suppliers.find((s: any) => s.id === nextId);
                                                setPaidToSupplierId(nextId);
                                                setPaidToOptional(supplier?.name || '');
                                            }}
                                            className="flex-1 min-w-0 bg-transparent px-5 text-[13px] font-semibold text-slate-700 outline-none appearance-none"
                                        >
                                            <option value="">Select supplier...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    ) : paidToContact === 'Customer' ? (
                                        <select
                                            value={paidToOptional}
                                            onChange={(e) => setPaidToOptional(e.target.value)}
                                            className="flex-1 min-w-0 bg-transparent px-5 text-[13px] font-semibold text-slate-700 outline-none appearance-none"
                                        >
                                            <option value="">Select customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={paidToOptional}
                                            onChange={(e) => setPaidToOptional(e.target.value)}
                                            placeholder="Name or contact..."
                                            className="flex-1 min-w-0 bg-transparent px-5 text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Paid From</label>
                                <div className="flex h-[50px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all group">
                                    <div className="relative w-32 shrink-0 border-r border-slate-200 bg-slate-50">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500 pointer-events-none">Bank</span>
                                    </div>
                                    <div className="relative flex-1 min-w-0">
                                        <select
                                            value={paidFromAccount}
                                            onChange={(e) => setPaidFromAccount(e.target.value)}
                                            className="w-full h-full bg-transparent pl-5 pr-8 text-[13px] font-semibold text-slate-700 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Select bank or cash...</option>
                                            {paymentAccounts(accounts).map(acc => (
                                                <option key={acc.id} value={acc.name}>{acc.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {paidToContact === 'Supplier' && !paidToSupplierId && (
                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                                <User size={18} />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-800">Select a supplier to allocate this payment</p>
                                <p className="text-[12px] text-slate-500 mt-0.5">Unpaid bills will appear here. Extra cash is kept as advance money.</p>
                            </div>
                        </div>
                    )}

                    {paidToContact === 'Supplier' && paidToSupplierId && (
                        <section className="space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Supplier bills</h2>
                                    <p className="text-[12px] text-slate-500 mt-1">
                                        {paidToOptional} · {unpaidInvoices.length} unpaid of {supplierInvoices.length}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Debit</p>
                                        <p className="text-[13px] font-black text-indigo-700 tabular-nums">ZMW {formatMoney(calculations.supplierDebit)}</p>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Advance</p>
                                        <p className="text-[13px] font-black text-amber-700 tabular-nums">ZMW {formatMoney(calculations.supplierAdvance)}</p>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net</p>
                                        <p className="text-[13px] font-black text-slate-800 tabular-nums">ZMW {formatMoney(calculations.supplierDebit - calculations.supplierAdvance)}</p>
                                    </div>
                                    {unpaidInvoices.length > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next: Record<string, string> = {};
                                                    unpaidInvoices.forEach((inv: any) => { next[inv.id] = invoiceDue(inv).toFixed(2); });
                                                    setAllocations(next);
                                                    syncLineFromAllocations(next);
                                                }}
                                                className="h-[50px] px-4 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-100"
                                            >
                                                Apply all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAllocations({});
                                                    syncLineFromAllocations({});
                                                }}
                                                className="h-[50px] px-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50"
                                            >
                                                Clear
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {supplierInvoices.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-[13px] text-slate-500">
                                    No purchase invoices for this supplier. You can still enter an Accounts Payable line as a prepayment.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-100">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Due</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Invoice amount</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Balance due</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Apply</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {supplierInvoices.map((inv: any) => {
                                                const due = invoiceDue(inv);
                                                const paid = due <= 0.01;
                                                return (
                                                    <tr key={inv.id} className={cn("border-t border-slate-50", paid && "opacity-50")}>
                                                        <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{inv.reference}</td>
                                                        <td className="px-4 py-3 text-[13px] text-slate-500">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : ''}</td>
                                                        <td className="px-4 py-3 text-[13px] text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                                                        <td className="px-4 py-3 text-[12px] font-semibold text-slate-600">{inv.status || '—'}</td>
                                                        <td className="px-4 py-3 text-[13px] text-right tabular-nums">{formatMoney(invoiceTotal(inv))}</td>
                                                        <td className="px-4 py-3 text-[13px] font-bold text-right tabular-nums">{formatMoney(due)}</td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={due}
                                                                step="0.01"
                                                                disabled={paid}
                                                                value={allocations[inv.id] || ''}
                                                                onChange={(e) => {
                                                                    const next = { ...allocations, [inv.id]: e.target.value };
                                                                    setAllocations(next);
                                                                    syncLineFromAllocations(next);
                                                                }}
                                                                className="w-32 ml-auto block bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-right disabled:bg-slate-100"
                                                                placeholder={paid ? 'Paid' : '0.00'}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-end gap-8 px-4 py-3 bg-slate-50 text-[12px] font-semibold text-slate-600">
                                        <span>Applying ZMW {formatMoney(calculations.applied)}</span>
                                        <span>Unallocated ZMW {formatMoney(calculations.unallocated)}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Line Items */}
                    <section className="space-y-5 pt-2 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                    <Undo2 size={20} className="rotate-90" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Payment items</h2>
                                    <p className="text-[12px] text-slate-500">Debit settles bills. Extra cash is a supplier prepayment.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={addAdvanceLine} className="h-[42px] flex items-center space-x-2 px-4 bg-amber-50 text-amber-700 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-100">
                                    <Plus size={14} /> <span>Advance</span>
                                </button>
                                <button type="button" onClick={addLine} className="h-[42px] flex items-center space-x-2 px-4 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100">
                                    <Plus size={14} /> <span>Add row</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Debit account</label>
                                <p className="text-[11px] text-indigo-600/80">Used when you apply this payment to unpaid bills.</p>
                                <select
                                    value={settlementAccount}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setSettlementAccount(next);
                                        setItems((prev) => prev.map((it) => it.role === 'settlement' ? { ...it, account: next } : it));
                                    }}
                                    className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-800"
                                >
                                    {ledgerAccounts(accounts).map((acc) => (
                                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Advance account</label>
                                <p className="text-[11px] text-amber-700/80">Used for extra cash paid before a bill exists.</p>
                                <select
                                    value={advanceAccount}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setAdvanceAccount(next);
                                        setItems((prev) => prev.map((it) => it.role === 'advance' ? { ...it, account: next } : it));
                                    }}
                                    className="w-full bg-white border border-amber-100 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-800"
                                >
                                    {ledgerAccounts(accounts).map((acc) => (
                                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-2 px-2 overflow-visible">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-28">TYPE</th>
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
                                            <td className="px-4 py-4">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                                    item.role === 'advance' ? "bg-amber-50 text-amber-700" : item.role === 'other' ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600"
                                                )}>
                                                    {item.role === 'advance' ? 'Advance' : item.role === 'other' ? 'Other' : 'Debit'}
                                                </span>
                                            </td>
                                            {options.lineNumber && <td className="px-4 py-4 text-xs font-black text-slate-400 text-center">{index + 1}</td>}
                                            <td className="px-4 py-4">
                                                <div className="relative">
                                                    <SearchableSelect
                                                        value={item.item}
                                                        onChange={(val) => updateItem(item.id, 'item', val)}
                                                        options={[
                                                            { label: 'Select Item...', value: '' },
                                                            ...expenseItems.map(inc => ({ label: inc.name, value: inc.name }))
                                                        ]}
                                                    />
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
                                                        {ledgerAccounts(accounts).map(acc => (
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
                        <div className="flex justify-end pt-2">
                            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-slate-50/70 p-5 space-y-3">
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                                    <span>Subtotal</span>
                                    <span className="tabular-nums text-slate-800">ZMW {formatMoney(calculations.total)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold text-indigo-600">
                                    <span>Debit settled</span>
                                    <span className="tabular-nums">ZMW {formatMoney(calculations.applied)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold text-amber-600">
                                    <span>Advance money</span>
                                    <span className="tabular-nums">ZMW {formatMoney(calculations.advanceAmt || calculations.unallocated)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                                    <span>Bills remaining</span>
                                    <span className="tabular-nums text-slate-800">ZMW {formatMoney(calculations.remainingDebit)}</span>
                                </div>
                                {options.withholdingTax && (
                                    <div className="flex justify-between items-center text-[11px] font-bold text-rose-500">
                                        <span>Withholding tax ({withholdingTaxMethod === 'Rate' ? `${withholdingTaxRate}%` : 'Fixed'})</span>
                                        <span className="tabular-nums">-{formatMoney(calculations.whtAmount)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between bg-indigo-600 px-5 py-4 rounded-2xl mt-2">
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.25em]">Amount paid</p>
                                    <h2 className="text-xl font-black text-white tracking-tight tabular-nums">
                                        <span className="text-[10px] font-black text-indigo-200 mr-2 uppercase tracking-widest">ZMW</span>
                                        {formatMoney(calculations.finalTotal)}
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
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Footer</p>
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
                                <p className="text-[14px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{fileName === 'No file chosen' ? 'Upload Payment Proof' : fileName}</p>
                                <p className="text-[10px] font-medium text-slate-400">PDF, PNG or JPG max 10MB</p>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                            </div>
                            <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">Select</button>
                        </div>
                    </section>
                </div>

                {/* Bottom Footer Actions */}
                <div className="bg-slate-50/50 p-10 border-t border-slate-100 flex items-center justify-between gap-6">
                    <button
                        onClick={() => navigate('/payments')}
                        className="flex items-center space-x-2 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        <Undo2 size={16} />
                        <span>Discard Payment</span>
                    </button>

                    <div className="flex items-center gap-6">
                        {saveError && (
                            <p className="text-[12px] font-semibold text-rose-600 max-w-md text-right">{saveError}</p>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="group relative flex items-center space-x-4 px-12 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95 disabled:opacity-60"
                        >
                            <Save size={18} />
                            <span>{isSaving ? 'Saving...' : (id ? 'Update Payment' : 'Complete Payment')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewPaymentView;
