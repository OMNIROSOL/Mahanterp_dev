import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { SalesQuote, ApprovalRequest, Division, InventoryUnitCost } from '../types';
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

const NumericInputField = ({ label, value, onChange, Icon, min = 0 }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <input
                type="number"
                min={min}
                value={value}
                onChange={onChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col -space-y-px">
                <button
                    onClick={() => onChange({ target: { value: (parseInt(value || 0) + 1).toString() } })}
                    className="p-1 hover:text-indigo-600 text-slate-300 transition-colors"
                >
                    <ChevronUp size={12} />
                </button>
                <button
                    onClick={() => onChange({ target: { value: Math.max(min, parseInt(value || 0) - 1).toString() } })}
                    className="p-1 hover:text-indigo-600 text-slate-300 transition-colors"
                >
                    <ChevronDown size={12} />
                </button>
            </div>
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

const EditSalesQuoteView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditing = Boolean(id);


    const customerShortName = (name: string) => name ? name.split(' - ')[0] : '';

    const formatDateForSave = (dateStr: string) => {
        if (!dateStr) return new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
        if (dateStr.includes('.')) return dateStr; // Already formatted
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    };

    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDays, setExpiryDays] = useState('30');
    const [customer, setCustomer] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [exchangeRate, setExchangeRate] = useState(1);
    const [decimalPlaces, setDecimalPlaces] = useState(2);
    const [billingAddress, setBillingAddress] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [fileName, setFileName] = useState('No file chosen');
    const [marginThreshold] = useState(10); // Default 10% - now a constant for this component
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('Active');
    const [division, setDivision] = useState('General');
    const [customers, setCustomers] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [footers, setFooters] = useState<any[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [unitCosts, setUnitCosts] = useState<InventoryUnitCost[]>([]);
    const [dbInvoices, setDbInvoices] = useState<any[]>([]);
    const [dbQuotes, setDbQuotes] = useState<any[]>([]);
    const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);
    const [items, setItems] = useState([{ id: Date.now(), item: 'Select Item', itemId: '', description: '', division: 'General', qty: '1', unitPrice: '0', discount: '', taxCode: '' }]);
    const [options, setOptions] = useState({
        amountsAreTaxInclusive: false,
        rounding: false,
        roundingType: 'Round to nearest',
        columnLineNumber: true,
        columnDiscount: false,
        columnDiscountType: 'Percentage',
        withholdingTax: false,
        withholdingTaxType: 'Rate',
        withholdingTaxValue: '0',
        hideTotalAmount: false,
        customTitle: false,
        customTitleValue: 'Quote',
        footers: false,
        footerValue: 'Terms & Conditions apply.',
        cancelled: false
    });

    const [showOptionsArea, setShowOptionsArea] = useState(false);

    const inventoryMap = useMemo(() => {
        const map: Record<string, any> = {};
        inventoryItems.forEach(item => {
            map[item.itemName] = item;
        });
        return map;
    }, [inventoryItems]);


    const fetchReference = async () => {
        try {
            const nextRef = await apiService.getNextReference('quote');
            setReference(nextRef);
        } catch (err) {
            console.error('Failed to get reference:', err);
        }
    };

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                // Fetch basic master data
                const [custs, itemsData, divs, taxCodesData, unitCostsData, invs, qts] = await Promise.all([
                    apiService.getCustomers().catch(e => { console.error('Customers failed:', e); return []; }),
                    apiService.getItems().catch(e => { console.error('Items failed:', e); return []; }),
                    apiService.getDivisions().catch(e => { console.error('Divisions failed:', e); return []; }),
                    apiService.getTaxCodes().catch(e => { console.error('Tax codes failed:', e); return []; }),
                    apiService.getInventoryUnitCosts().catch(e => { console.error('Unit costs failed:', e); return []; }),
                    apiService.getInvoices().catch(e => { console.error('Invoices failed:', e); return []; }),
                    apiService.getQuotes().catch(e => { console.error('Quotes failed:', e); return []; })
                ]);

                setCustomers(custs);
                setInventoryItems(itemsData);
                setAvailableDivisions(divs);
                setTaxCodes(taxCodesData);
                setUnitCosts(unitCostsData);
                setDbInvoices(invs);
                setDbQuotes(qts);

                // Fetch footers separately as it's a new feature and shouldn't block the form
                apiService.getFooters()
                    .then(setFooters)
                    .catch(err => console.error('Failed to load footers:', err));

            } catch (err) {
                console.error('Critical failure loading master data:', err);
            }
        };
        loadMasterData();
    }, []);


    useEffect(() => {
        const loadQuote = async () => {
            const searchParams = new URLSearchParams(location.search);
            const copyFromId = searchParams.get('copyFrom');
            if (id || copyFromId) {
                const quoteId = id || copyFromId;
                setIsLoading(true);
                try {
                    let quote: any = null;

                    // Try direct lookup first
                    try {
                        quote = await apiService.getQuote(quoteId);
                    } catch (e) {
                        try {
                            quote = await apiService.getOrder(quoteId);
                        } catch (e2) {
                            try {
                                quote = await apiService.getInvoice(quoteId);
                            } catch (e3) {
                                // Fallback to list search
                                const [quotes, orders, invoices] = await Promise.all([
                                    apiService.getQuotes().catch(() => []),
                                    apiService.getOrders().catch(() => []),
                                    apiService.getInvoices().catch(() => [])
                                ]);
                                quote =
                                    quotes.find((q: any) => q.id === quoteId) ||
                                    orders.find((o: any) => o.id === quoteId) ||
                                    invoices.find((i: any) => i.id === quoteId);
                            }
                        }
                    }

                    if (quote) {
                        // Use today's date for 'copyFrom' operations, otherwise use the source document's date
                        const quoteDate = copyFromId ? '' : (quote.issueDate || quote.orderDate || '');
                        let parsedIssueDate = new Date().toISOString().split('T')[0];
                        if (quoteDate) {
                            const dottedPattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
                            if (dottedPattern.test(quoteDate)) {
                                const [day, month, year] = quoteDate.split('.');
                                parsedIssueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                const d = new Date(quoteDate);
                                if (!isNaN(d.getTime())) parsedIssueDate = d.toISOString().split('T')[0];
                            }
                        }
                        setIssueDate(parsedIssueDate);
                        setExpiryDays(quote.expiryDays?.toString() || '30');
                        setCustomer(quote.customer?.name || quote.customer || '');
                        setCurrency(quote.currency || quote.customer?.currency?.split(' - ')[0] || 'ZMW');
                        setBillingAddress(quote.billingAddress || quote.customer?.billingAddress || '');

                        if (copyFromId) {
                            fetchReference();
                            setUseManualRef(false);
                        } else {
                            setReference(quote.reference);
                            setUseManualRef(true);
                        }

                        setDescription(quote.description || quote.docOptions?.description || '');
                        setDivision(quote.division || quote.docOptions?.division || quote.items?.[0]?.division || quote.customer?.division || 'General');
                        setStatus(quote.status || 'Active');

                        if (quote.items && quote.items.length > 0) {
                            setItems(quote.items.map((i: any) => ({
                                id: i.id || Date.now() + Math.random(),
                                itemId: i.itemId || i.item?.id,
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                description: i.description || i.item?.description || '',
                                qty: i.qty ? i.qty.toString() : '1',
                                unitPrice: i.unitPrice ? i.unitPrice.toString() : '0',
                                discount: i.discount ? i.discount.toString() : '',
                                division: i.division || 'General',
                                taxCode: i.taxCode || ''
                            })));
                        }

                        if (quote.docOptions) {
                            setOptions(prev => ({ ...prev, ...quote.docOptions }));
                        }
                    }
                } catch (err) {
                    console.error('Failed to load quote:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIssueDate(new Date().toISOString().split('T')[0]);
                setCustomer('');
                setCurrency('ZMW');
                setBillingAddress('');
                setExpiryDays('30');
                fetchReference();
                setUseManualRef(false);
                setDescription('');
                setStatus('Active');
                setItems([{ id: Date.now(), item: 'Select Item', itemId: '', description: '', division: 'General', qty: '1', unitPrice: '', discount: '', taxCode: '' }]);
            }
        };
        loadQuote();
    }, [id, location.search]);

    // Ensure descriptions are populated from master data if missing (e.g. legacy data or first load)
    useEffect(() => {
        if (Object.keys(inventoryMap).length === 0 || items.length === 0) return;

        let changed = false;
        const newItems = items.map(item => {
            if (item.item && item.item !== 'Select Item' && !item.description) {
                const invItem = inventoryMap[item.item];
                if (invItem && (invItem.description || invItem.itemName)) {
                    changed = true;
                    return { ...item, description: invItem.description || invItem.itemName };
                }
            }
            return item;
        });

        if (changed) {
            setItems(newItems);
        }
    }, [inventoryMap, items]);

    // Automatically sync currency when customer changes
    useEffect(() => {
        if (!customers || customers.length === 0 || !customer) return;
        const selected = customers.find(c =>
            c.name.trim().toLowerCase() === customer.trim().toLowerCase() ||
            c.id === customer
        );
        if (selected) {
            const currencyCode = selected.currency?.split(' - ')[0] || 'ZMW';
            if (currencyCode !== currency) {
                setCurrency(currencyCode);
            }
        }
    }, [customer, customers, currency]);

    // Update exchange rate when currency changes
    useEffect(() => {
        try {
            const savedCurrencies = localStorage.getItem('erp_currencies');
            if (savedCurrencies) {
                const parsed = JSON.parse(savedCurrencies);
                const currentCurrencyObj = parsed.find((c: any) => c.code === currency);
                setExchangeRate(currentCurrencyObj?.exchangeRate || 1);
                setDecimalPlaces(currentCurrencyObj?.decimalPlaces ?? 2);
            } else {
                setExchangeRate(1);
                setDecimalPlaces(2);
            }
        } catch (e) {
            console.error('Failed to load exchange rates:', e);
            setExchangeRate(1);
            setDecimalPlaces(2);
        }
    }, [currency]);

    const itemHistory = useMemo(() => {
        const global: Record<string, any[]> = {};
        const clientSales: Record<string, any[]> = {};
        const clientQuotes: Record<string, any[]> = {};

        dbInvoices.forEach(doc => {
            if (!doc.items) return;
            doc.items.forEach((i: any) => {
                const itemName = i.item?.itemName || i.item;
                if (!itemName || itemName === 'Select Item') return;
                const entry = { date: doc.issueDate, price: parseFloat(i.unitPrice) || 0, qty: parseFloat(i.qty) || 0, customer: doc.customer?.name || doc.customer, ref: doc.reference, type: 'Invoice' };
                if (!global[itemName]) global[itemName] = [];
                global[itemName].push(entry);
                if (customer && (doc.customer?.name === customer || doc.customer === customer)) {
                    if (!clientSales[itemName]) clientSales[itemName] = [];
                    clientSales[itemName].push(entry);
                }
            });
        });

        dbQuotes.forEach(doc => {
            if (!doc.items) return;
            doc.items.forEach((i: any) => {
                const itemName = i.item?.itemName || i.item;
                if (!itemName || itemName === 'Select Item') return;
                const entry = { date: doc.issueDate, price: parseFloat(i.unitPrice) || 0, qty: parseFloat(i.qty) || 0, customer: doc.customer?.name || doc.customer, ref: doc.reference, type: 'Quote' };
                if (customer && (doc.customer?.name === customer || doc.customer === customer)) {
                    if (!clientQuotes[itemName]) clientQuotes[itemName] = [];
                    clientQuotes[itemName].push(entry);
                }
            });
        });

        const sortAndSlice = (history: Record<string, any[]>) => {
            Object.keys(history).forEach(item => {
                history[item].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                history[item] = history[item].slice(0, 3);
            });
        };
        sortAndSlice(global);
        sortAndSlice(clientSales);
        sortAndSlice(clientQuotes);
        return { global, clientSales, clientQuotes };
    }, [customer, dbInvoices, dbQuotes]);


    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        const lineCalcs = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const discountValue = parseFloat(item.discount) || 0;

            let netTotal = qty * price;

            // Apply line discount
            if (options.columnDiscount) {
                if (options.columnDiscountType === 'Percentage') {
                    netTotal = netTotal * (1 - (discountValue / 100));
                } else {
                    netTotal = Math.max(0, netTotal - discountValue);
                }
            }

            let taxAmount = 0;
            const selectedTax = taxCodes.find(tc => tc.name === item.taxCode);
            if (selectedTax) {
                const taxRate = parseFloat(selectedTax.rate) / 100;
                if (options.amountsAreTaxInclusive) {
                    taxAmount = netTotal - (netTotal / (1 + taxRate));
                    netTotal = netTotal - taxAmount;
                } else {
                    taxAmount = netTotal * taxRate;
                }
            }

            const grossTotal = netTotal + taxAmount;
            subtotal += netTotal;
            totalTax += taxAmount;
            return { taxAmount, grossTotal, netTotal };
        });

        let grandTotal = subtotal + totalTax;

        // Apply Rounding
        if (options.rounding) {
            if (options.roundingType === 'Round to nearest') {
                grandTotal = Math.round(grandTotal);
            } else if (options.roundingType === 'Round down') {
                grandTotal = Math.floor(grandTotal);
            }
        }

        // Apply Withholding Tax (Subtraction from total)
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

        return { lineCalcs, subtotal, totalTax, grandTotal, whtAmount };
    }, [items, options, taxCodes]);

    const getMinSellingPrice = useCallback((itemId: string, itemDivision: string, standardSellingPrice: number) => {
        if (!itemId) return standardSellingPrice * (1 - marginThreshold / 100);
        
        // Exact match: itemId and division
        const matchingCosts = unitCosts.filter(c => 
            c.itemId === itemId && 
            (c.division || '').trim().toLowerCase() === (itemDivision || '').trim().toLowerCase()
        );
        
        if (matchingCosts.length > 0) {
            matchingCosts.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            return Number(((Number(matchingCosts[0].minSellingPrice) || 0) / exchangeRate).toFixed(decimalPlaces));
        }
        
        // Fallback: itemId across any division
        const fallbackCosts = unitCosts.filter(c => c.itemId === itemId);
        if (fallbackCosts.length > 0) {
            fallbackCosts.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            return Number(((Number(fallbackCosts[0].minSellingPrice) || 0) / exchangeRate).toFixed(decimalPlaces));
        }
        
        return Number(((standardSellingPrice * (1 - marginThreshold / 100)) / exchangeRate).toFixed(decimalPlaces));
    }, [unitCosts, marginThreshold, exchangeRate, decimalPlaces]);

    const approvalReason = useMemo(() => {
        let reason = '';
        const itemsToValidate = items.filter(i => i.item !== 'Select Item');

        // Check 1: High Value Approval
        if (calculations.grandTotal > 100000) {
            reason += `High value document (Total: ${calculations.grandTotal.toLocaleString()}) requires manager approval. `;
        }

        for (const item of itemsToValidate) {
            const inventoryItem = inventoryMap[item.item];
            if (inventoryItem) {
                const price = parseFloat(item.unitPrice) || 0;
                const sellingPrice = parseFloat(inventoryItem.sellingPrice || 0);
                const purchasePrice = parseFloat(inventoryItem.avgCost || 0);
                const stock = parseFloat(inventoryItem.qtyOnHand || 0);
                const qty = parseFloat(item.qty) || 0;

                if (qty > stock) {
                    reason += `Insufficient stock for ${item.item} (Req: ${qty}, Avail: ${stock}). `;
                }

                const minPrice = getMinSellingPrice(item.itemId, item.division, sellingPrice);
                const convertedPurchasePrice = purchasePrice / exchangeRate;

                if (price < convertedPurchasePrice) {
                    reason += `Price for ${item.item} (${price}) is below purchase price (${convertedPurchasePrice.toFixed(2)}). `;
                } else if (price < minPrice) {
                    reason += `Price for ${item.item} (${price}) is below allowed minimum selling price (min: ${minPrice.toFixed(2)}). `;
                }
            }
        }
        return reason.trim();
    }, [items, inventoryMap, calculations.grandTotal, getMinSellingPrice]);

    const requiresApproval = useMemo(() => {
        return Boolean(approvalReason);
    }, [approvalReason]);

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

    const handleAction = async (newStatus: 'Active' | 'Rejected') => {
        if (!id) return;
        try {
            await apiService.updateQuoteStatus(id, newStatus);
            // Also update approval request if it exists (Optional for now)
            alert(`Quote ${newStatus === 'Active' ? 'Approved' : 'Rejected'} successfully.`);
            navigate('/sales-quotes');
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status in database.');
        }
    };


    const handleSave = async (forceManualApproval = false) => {
        if (!customer || customer === 'Select Customer' || customer === '') {
            alert('Please select a customer.');
            return;
        }

        const validItems = items.filter(i => i.item && i.item !== 'Select Item' && i.item !== '' && i.itemId);
        if (validItems.length === 0) {
            alert('Please select at least one valid item.');
            return;
        }

        const selectedCustomer = customers.find(c => c.name === customer);
        if (!selectedCustomer) {
            alert('Selected customer not found.');
            return;
        }

        const currentUser = apiService.getCurrentUser();
        const updatedOptions = {
            ...options,
            requestedBy: forceManualApproval ? currentUser.name : (options as any).requestedBy,
            approvalReason: forceManualApproval ? approvalReason : (options as any).approvalReason
        };

        const quoteData = {
            customerId: selectedCustomer.id,
            reference: reference,
            amount: calculations.grandTotal,
            currency: currency,
            description: description,
            billingAddress: billingAddress,
            expiryDays: parseInt(expiryDays) || 30,
            issueDate: issueDate, // Pass the date from state
            status: forceManualApproval ? 'Pending Approval' : (isEditing ? status : 'Active'),
            docOptions: { ...updatedOptions, division },
            items: validItems.map(i => ({
                itemId: i.itemId,
                description: i.description,
                qty: parseFloat(i.qty),
                unitPrice: parseFloat(i.unitPrice),
                discount: parseFloat(i.discount) || 0,
                division: i.division,
                taxCode: i.taxCode,
                totalAmount: parseFloat(i.qty) * parseFloat(i.unitPrice)
            }))
        };


        try {
            if (isEditing) {
                await apiService.updateQuote(id!, quoteData);
            } else {
                await apiService.createQuote(quoteData);
            }
            navigate('/sales-quotes');
        } catch (err: any) {
            console.error('Failed to save quote:', err);
            const errMsg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to save quote to database: ${errMsg}`);
        }
    };

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/sales-quotes')}>Quotations</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{isEditing ? 'Edit Existing' : 'Configure New'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{isEditing ? 'Modify Sales Quote' : 'New Sales Quote'}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/sales-quotes')}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-8">
                    <div className="space-y-8 animate-in fade-in duration-700">
                        {/* Primary Info Segment */}
                        <div className="space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Basic Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[0.7fr_0.7fr_1.6fr] gap-8">
                                <InputField label="Issue Date" type="date" value={issueDate} onChange={(e: any) => setIssueDate(e.target.value)} Icon={Calendar} />
                                <div className="space-y-2">
                                    <NumericInputField label="Expiry Days" value={expiryDays} onChange={(e: any) => setExpiryDays(e.target.value)} Icon={Clock} />
                                    {issueDate && expiryDays && (
                                        <p className="text-[10px] font-bold text-slate-400 ml-1 text-right">
                                            Valid until: <span className="text-indigo-500">{new Date(new Date(issueDate).getTime() + (parseInt(expiryDays) || 0) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</span>
                                        </p>
                                    )}
                                </div>
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
                                            placeholder={useManualRef ? "Enter custom ref..." : ""}
                                            className={cn(
                                                "w-full bg-transparent border-none px-4 py-3 text-[13px] font-semibold outline-none transition-colors",
                                                !useManualRef ? "text-indigo-600 font-black" : "text-slate-700"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logistics & Memo Segment */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                    <User size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Logistics & Memo</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <SelectField label="Selected Customer" value={customer} onChange={(e: any) => {
                                        const custName = e.target.value;
                                        setCustomer(custName);
                                        const selected = customers.find(c => c.name === custName);
                                        if (selected) {
                                            const currencyCode = selected.currency?.split(' - ')[0] || 'ZMW';
                                            setCurrency(currencyCode);
                                            setBillingAddress(selected.billingAddress || '');
                                        }
                                    }} Icon={User}>
                                        <option value="">Select Target Customer...</option>
                                        {customers.filter(c => (!c.inactive && c.status !== 'Inactive') || c.name === customer).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </SelectField>
                                    <InputField label="Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Overall scope of work..." Icon={Briefcase} />
                                </div>
                                <TextareaField label="Billing Address" value={billingAddress} onChange={(e: any) => setBillingAddress(e.target.value)} placeholder="Physical address for billing..." rows={5} />
                            </div>
                        </div>

                        {/* Items Section (Simplified Table) */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                        <Package size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Line Items</h2>
                                </div>
                                <button
                                    onClick={() => setItems(prev => [...prev, { id: Date.now(), item: 'Select Item', itemId: '', description: '', division: 'General', qty: '1', unitPrice: '0', discount: '', taxCode: '' }])}
                                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                >
                                    <Plus size={14} /> <span>Add New Row</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {options.columnLineNumber && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">ITEM</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">DIVISION</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">QTY</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">UNIT PRICE</th>
                                            {options.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28 text-right whitespace-nowrap">DISCOUNT {options.columnDiscountType === 'Percentage' ? '(%)' : `(${currency})`}</th>}
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
                                                        <div className="relative group/select">
                                                            <select
                                                                value={item.item}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const invItem = inventoryMap[val];
                                                                    setItems(prev => prev.map(i => i.id === item.id ? {
                                                                        ...i,
                                                                        item: val,
                                                                        itemId: invItem ? invItem.id : '',
                                                                        unitPrice: invItem ? getMinSellingPrice(invItem.id, item.division, invItem.sellingPrice || 0).toString() : i.unitPrice,
                                                                        description: invItem ? (invItem.description || val) : i.description,
                                                                        unit: invItem ? (invItem.unitName || 'Pcs') : i.unit
                                                                    } : i));
                                                                }}
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#2563eb] outline-none appearance-none cursor-pointer"
                                                            >
                                                                <option value="Select Item">Select Item</option>
                                                                {inventoryItems.map(inv => (
                                                                    <option key={inv.id} value={inv.itemName}>{inv.itemName}</option>
                                                                ))}
                                                            </select>
                                                        </div>
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
                                                    <td className="px-4 py-4">
                                                        <select
                                                            value={item.division}
                                                            onChange={(e) => {
                                                                const nextDivision = e.target.value;
                                                                setItems(prev => prev.map(i => {
                                                                    if (i.id === item.id) {
                                                                        const invItem = inventoryMap[i.item];
                                                                        const standardSellingPrice = invItem ? (parseFloat(invItem.sellingPrice) || 0) : 0;
                                                                        return {
                                                                            ...i,
                                                                            division: nextDivision,
                                                                            unitPrice: invItem ? getMinSellingPrice(i.itemId, nextDivision, standardSellingPrice).toString() : i.unitPrice
                                                                        };
                                                                    }
                                                                    return i;
                                                                }));
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value="General">General</option>
                                                            {availableDivisions.map(div => (
                                                                <option key={div.id} value={div.name}>{div.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-4 relative group/qty">
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="text"
                                                                value={item.qty}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i));
                                                                }}
                                                                className={cn(
                                                                    "w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none",
                                                                    (parseFloat(item.qty) || 0) > (parseFloat(inventoryMap[item.item]?.qtyOnHand || 0)) ? "text-amber-600" : "text-slate-700"
                                                                )}
                                                            />
                                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter flex items-center justify-between w-full">
                                                                <span>Stock: {(parseFloat(inventoryMap[item.item]?.qtyOnHand || 0)).toLocaleString()}</span>
                                                                <span className="text-indigo-500 font-black">{item.unit || ''}</span>
                                                            </div>
                                                        </div>
                                                        {(parseFloat(item.qty) || 0) > (parseFloat(inventoryMap[item.item]?.qtyOnHand || 0)) && (
                                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <AlertTriangle size={12} className="text-amber-500" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-amber-50 border-amber-200 text-amber-800 text-[10px] p-2">
                                                                            Insufficient stock: {inventoryMap[item.item]?.qtyOnHand || 0} available. Approval required.
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        )}

                                                    </td>
                                                    <td className="px-4 py-4 relative group/price">
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="text"
                                                                value={item.unitPrice}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: val } : i));
                                                                }}
                                                                className={cn(
                                                                    "w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none",
                                                                    (parseFloat(item.unitPrice) || 0) < parseFloat(inventoryMap[item.item]?.avgCost || 0) ||
                                                                        (parseFloat(item.unitPrice) || 0) < getMinSellingPrice(item.itemId, item.division, parseFloat(inventoryMap[item.item]?.sellingPrice || 0))
                                                                        ? "text-amber-600" : "text-slate-700"
                                                                )}
                                                                placeholder="0.00"
                                                            />
                                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                                                Selling Price: {getMinSellingPrice(item.itemId, item.division, parseFloat(inventoryMap[item.item]?.sellingPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                        {((parseFloat(item.unitPrice) || 0) < parseFloat(inventoryMap[item.item]?.avgCost || 0) ||
                                                            (parseFloat(item.unitPrice) || 0) < getMinSellingPrice(item.itemId, item.division, parseFloat(inventoryMap[item.item]?.sellingPrice || 0))) && (

                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <AlertTriangle size={12} className="text-amber-500" />
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-amber-50 border-amber-200 text-amber-800 text-[10px] p-2">
                                                                                Price is below allowed minimum selling price ({getMinSellingPrice(item.itemId, item.division, parseFloat(inventoryMap[item.item]?.sellingPrice || 0)).toFixed(2)}) or purchase cost. Approval required.
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            )}
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
                                                                    className="w-16 bg-transparent border-none p-0 text-sm font-bold text-slate-700 text-right outline-none"
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
                                                        <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right">
                                                            {calc?.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right tabular-nums">
                                                        <span className="text-[10px] font-black text-slate-400 mr-1.5 opacity-60">{currency}</span>
                                                        {calc?.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                                {/* Summary Details - Moved directly under Line Items */}
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end pr-24">
                                    <div className="w-full max-w-sm space-y-2">
                                        <div className="flex justify-end items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] gap-8">
                                            <span>Subtotal ({currency})</span>
                                            <span className="text-slate-700 font-bold tabular-nums text-[13px] w-32 text-right">
                                                <span className="text-[10px] font-black text-slate-400 mr-1 opacity-50">{currency}</span>
                                                {calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-end items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] gap-8">
                                            <span>Tax Component</span>
                                            <span className="text-slate-700 font-bold tabular-nums text-[13px] w-32 text-right">{calculations.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-end items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mt-4 h-16 gap-x-6">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Total Payable</p>
                                            </div>
                                            <h2 className="text-xl font-medium text-slate-900 tracking-tight tabular-nums flex items-baseline">
                                                <span className="text-xs font-medium text-indigo-400 mr-2 uppercase">{currency}</span>
                                                {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Integrated Price Intelligence Section - Dual View */}
                                {items.some(i => i.item !== 'Select Item') && (
                                    <div className="mt-8 pt-8 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center space-x-3 mb-5">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                                <History size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Insights</h3>
                                                <p className="text-sm font-black text-slate-800 tracking-tight">Price Monitoring ({customer || 'All Customers'})</p>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-slate-50 shadow-inner">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-200/60 transition-colors">
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/6">Item Analysis</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Customer Quotes (Last 3)</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Customer Sales (Last 3)</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Global Sales History (Last 3)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200/40 bg-white/50">
                                                    {Array.from(new Set(items.filter(i => i.item !== 'Select Item').map(i => i.item))).map(itemName => {
                                                        const clientQuotes = itemHistory.clientQuotes[itemName] || [];
                                                        const clientSales = itemHistory.clientSales[itemName] || [];
                                                        const globalHistory = itemHistory.global[itemName] || [];
                                                        return (
                                                            <tr key={itemName} className="hover:bg-indigo-50/30 transition-colors group">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">{itemName}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">Pricing Intelligence</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right tabular-nums align-top">
                                                                    <div className="flex flex-col items-end gap-2">
                                                                        {clientQuotes.length > 0 ? clientQuotes.map((h, i) => (
                                                                            <TooltipProvider key={i}>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger className="flex flex-col items-end">
                                                                                        <span className={cn(
                                                                                            "text-xs font-black",
                                                                                            i === 0 ? "text-indigo-600" : "text-slate-500 opacity-60"
                                                                                        )}>
                                                                                            {(h.price / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-bold text-slate-400 opacity-40">Qty {h.qty} • {h.date}</span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="bg-slate-900 text-white text-[10px] p-2 border-none">
                                                                                        <p className="opacity-70">Ref: {h.ref}</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )) : (
                                                                            <span className="text-[10px] font-bold text-slate-300 italic">No quotes</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right tabular-nums align-top">
                                                                    <div className="flex flex-col items-end gap-2">
                                                                        {clientSales.length > 0 ? clientSales.map((h, i) => (
                                                                            <TooltipProvider key={i}>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger className="flex flex-col items-end">
                                                                                        <span className={cn(
                                                                                            "text-xs font-black",
                                                                                            i === 0 ? "text-emerald-600" : "text-slate-500 opacity-60"
                                                                                        )}>
                                                                                            {(h.price / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-bold text-slate-400 opacity-40">Qty {h.qty} • {h.date}</span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="bg-slate-900 text-white text-[10px] p-2 border-none">
                                                                                        <p className="opacity-70">Ref: {h.ref}</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )) : (
                                                                            <span className="text-[10px] font-bold text-slate-300 italic">No sales</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right tabular-nums align-top">
                                                                    <div className="flex flex-col items-end gap-2">
                                                                        {globalHistory.length > 0 ? globalHistory.map((h, i) => (
                                                                            <TooltipProvider key={i}>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger className="flex flex-col items-end">
                                                                                        <span className={cn(
                                                                                            "text-xs font-black transition-colors",
                                                                                            i === 0 ? "text-slate-600" : "text-slate-500 opacity-60"
                                                                                        )}>
                                                                                            {(h.price / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-bold text-slate-400 opacity-40">Qty {h.qty} • {h.date}</span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="bg-slate-900 text-white text-[10px] p-2 border-none">
                                                                                        <p className="font-black text-indigo-400">{h.customer}</p>
                                                                                        <p className="opacity-70">Ref: {h.ref} • Type: {h.type}</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )) : (
                                                                            <span className="text-[10px] font-bold text-slate-300 italic">No global records</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Options & Configuration */}
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
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Document Options</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showOptionsArea ? 'Hide configuration' : 'Configure document settings'}</p>
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
                                        ['Rounding', 'rounding'],
                                        ['Line Numbers', 'columnLineNumber'],
                                        ['Discount', 'columnDiscount'],
                                        ['Withholding Tax', 'withholdingTax'],
                                        ['Hide Total', 'hideTotalAmount'],
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
                                            {key === 'customTitle' && options.customTitle && (
                                                <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <input
                                                        type="text"
                                                        value={options.customTitleValue}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                        placeholder="e.g. Proforma Invoice"
                                                        className="w-full bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-4 py-2 text-[11px] font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-indigo-300/50"
                                                    />
                                                </div>
                                            )}
                                            {key === 'footers' && options.footers && (
                                                <div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <select
                                                        value={footers.find(f => f.content === options.footerValue)?.id || ''}
                                                        onChange={(e) => {
                                                            const footer = footers.find(f => f.id === e.target.value);
                                                            if (footer) {
                                                                setOptions(prev => ({ ...prev, footerValue: footer.content }));
                                                            }
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none"
                                                    >
                                                        <option value="">-- Choose a template --</option>
                                                        {footers.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Document Attachment */}
                            <div className="mt-6 pt-4 border-t border-slate-50 text-left">
                                <div className="space-y-3 max-w-md">
                                    <div className="flex items-center space-x-2.5 mb-1 opacity-60">
                                        <ImageIcon size={14} className="text-slate-400" />
                                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Supporting Documentation</h3>
                                    </div>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="group relative flex items-center bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-2 cursor-pointer hover:bg-white hover:border-indigo-300 transition-all duration-300"
                                    >
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-3 group-hover:text-indigo-500 transition-colors shadow-sm">
                                            <Plus size={16} className={cn("transition-transform duration-300", fileName !== 'No file chosen' ? "rotate-45" : "")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">
                                                {fileName === 'No file chosen' ? 'Attach Documents' : fileName}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
                                                {fileName === 'No file chosen' ? 'Specs, plans or references' : 'Linked to quote'}
                                            </p>
                                        </div>
                                        {fileName !== 'No file chosen' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFileName('No file chosen');
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="w-7 h-7 flex items-center justify-center bg-rose-50 text-rose-500 rounded-md hover:bg-rose-100 transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setFileName(file.name);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submission Area */}
                        <div className="bg-slate-50 p-10 mt-12 mb-10 mx-[-48px] border-t border-slate-100 rounded-b-3xl">
                            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="flex-1 w-full">
                                    {approvalReason && (
                                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
                                            <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Managerial Review Required</p>
                                                <p className="text-[11px] font-medium text-amber-700 leading-relaxed">{approvalReason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-4 w-full md:w-auto">
                                    <button
                                        onClick={() => navigate('/sales-quotes')}
                                        className="px-8 py-4 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-[0.2em]"
                                    >
                                        Discard
                                    </button>
                                    {status === 'Pending Approval' ? (
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleSave(true)}
                                                className="bg-amber-500 text-white px-8 py-4 rounded-2xl text-[12px] font-black hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 uppercase tracking-[0.2em]"
                                            >
                                                Request Approval
                                            </button>
                                            <button
                                                onClick={() => handleSave(false)}
                                                disabled={requiresApproval}
                                                className={cn(
                                                    "px-10 py-4 rounded-2xl text-[12px] font-black transition-all shadow-xl uppercase tracking-[0.2em]",
                                                    requiresApproval
                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 shadow-xl"
                                                )}
                                            >
                                                Update Quote
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleSave(true)}
                                                disabled={!approvalReason || !requiresApproval}
                                                className={cn(
                                                    "px-8 py-4 rounded-2xl text-[12px] font-black transition-all uppercase tracking-[0.2em]",
                                                    (approvalReason && requiresApproval)
                                                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/20 ring-4 ring-amber-500/10"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                                )}
                                            >
                                                Request Approval
                                            </button>
                                            <button
                                                onClick={() => handleSave(false)}
                                                disabled={requiresApproval}
                                                className={cn(
                                                    "px-10 py-4 rounded-2xl text-[12px] font-black transition-all shadow-xl uppercase tracking-[0.2em] flex items-center gap-2",
                                                    requiresApproval
                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                                                )}
                                            >
                                                <Save size={18} /> {isEditing ? 'Update Quote' : 'Create Quote'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditSalesQuoteView;
