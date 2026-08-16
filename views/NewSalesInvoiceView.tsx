import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Invoice, Division, FooterTemplate, InventoryUnitCost } from '../types';
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
    CreditCard,
    Receipt,
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

const NewSalesInvoiceView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditing = Boolean(id);

    // Form State
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDateType, setDueDateType] = useState('Net');
    const [dueDateDays, setDueDateDays] = useState('0');
    const [customer, setCustomer] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [exchangeRate, setExchangeRate] = useState(1);
    const [decimalPlaces, setDecimalPlaces] = useState(2);
    const [billingAddress, setBillingAddress] = useState('');
    const [description, setDescription] = useState('');
    const [division, setDivision] = useState('General');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [tpin, setTpin] = useState('');
    const [status, setStatus] = useState('Coming due');
    const [customers, setCustomers] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [items, setItems] = useState([{ id: Date.now(), item: 'Select Item', itemId: '', description: '', account: 'Inventory sales', division: 'General', qty: '1', unitPrice: '0', discount: '', taxCode: '' }]);
    const [copyFromId, setCopyFromId] = useState<string | null>(null);

    const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);
    const [dbFooters, setDbFooters] = useState<FooterTemplate[]>([]);
    const [taxCodes, setTaxCodes] = useState<any[]>([]);
    const [unitCosts, setUnitCosts] = useState<InventoryUnitCost[]>([]);
    const [dbInvoices, setDbInvoices] = useState<any[]>([]);
    const [dbQuotes, setDbQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [custs, itemsData, divs, footersData, taxCodesData, unitCostsData, invs, qts] = await Promise.all([
                    apiService.getCustomers().catch(e => { console.error('Customers failed:', e); return []; }),
                    apiService.getItems().catch(e => { console.error('Items failed:', e); return []; }),
                    apiService.getDivisions().catch(e => { console.error('Divisions failed:', e); return []; }),
                    apiService.getFooters().catch(e => { console.error('Footers failed:', e); return []; }),
                    apiService.getTaxCodes().catch(e => { console.error('Tax codes failed:', e); return []; }),
                    apiService.getInventoryUnitCosts().catch(e => { console.error('Unit costs failed:', e); return []; }),
                    apiService.getInvoices().catch(e => { console.error('Invoices failed:', e); return []; }),
                    apiService.getQuotes().catch(e => { console.error('Quotes failed:', e); return []; })
                ]);
                setCustomers(custs);
                setInventoryItems(itemsData);
                setAvailableDivisions(divs);
                setDbFooters(footersData);
                setTaxCodes(taxCodesData);
                setUnitCosts(unitCostsData);
                setDbInvoices(invs);
                setDbQuotes(qts);
            } catch (err) {
                console.error('Failed to load master data:', err);
            }
        };
        loadMasterData();
    }, []);

    // UI State
    const [showOptionsArea, setShowOptionsArea] = useState(false);
    const [showTransactionInsights, setShowTransactionInsights] = useState(true);
    const [fileName, setFileName] = useState('No file chosen');
    const inventoryMap = useMemo(() => {
        const map: Record<string, any> = {};
        inventoryItems.forEach(item => {
            map[item.itemName] = item;
        });
        return map;
    }, [inventoryItems]);

    const marginThreshold = 10;

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
        for (const item of itemsToValidate) {
            const inventoryItem = inventoryMap[item.item];
            if (inventoryItem) {
                const qty = parseFloat(item.qty) || 0;
                const price = parseFloat(item.unitPrice) || 0;
                const stock = parseFloat(inventoryItem.qtyOnHand || 0);
                if (qty > stock) reason += `Insufficient stock for ${item.item} (Req: ${qty}, Avail: ${stock}). `;
                const standardSellingPrice = inventoryItem.sellingPrice || 0;
                const minPrice = getMinSellingPrice(item.itemId, item.division, standardSellingPrice);
                const convertedPurchasePrice = Number(inventoryItem.avgCost || 0) / exchangeRate;
                if (price < convertedPurchasePrice) reason += `Price for ${item.item} (${price}) is below purchase price (${convertedPurchasePrice.toFixed(2)}). `;
                else if (price < minPrice) reason += `Price for ${item.item} (${price}) is below allowed minimum selling price (min: ${minPrice.toFixed(2)}). `;
            }
        }
        return reason.trim();
    }, [items, inventoryMap, getMinSellingPrice]);

    const fetchReference = async () => {
        try {
            const nextRef = await apiService.getNextReference('invoice');
            setReference(nextRef);
        } catch (err) {
            console.error('Failed to get reference:', err);
        }
    };

    const requiresApproval = useMemo(() => approvalReason.length > 0, [approvalReason]);

    // Options (Standardized with Sales Order)
    const [options, setOptions] = useState({
        amountsAreTaxInclusive: false,
        rounding: false,
        roundingType: 'Round to nearest',
        columnLineNumber: true,
        columnDescription: false,
        columnDiscount: false,
        columnDiscountType: 'Percentage',
        withholdingTax: false,
        withholdingTaxType: 'Rate',
        withholdingTaxValue: '0',
        hideTotalAmount: false,
        customTitle: false,
        customTitleValue: 'Sales Invoice',
        footers: false,
        footerValue: 'Thank you for your business.',
        earlyPaymentDiscount: false,
        earlyPaymentType: 'Percentage',
        earlyPaymentValue: '0',
        earlyPaymentDays: '0',
        latePaymentFees: false,
        latePaymentFeePercentage: '0',
        actsAsDeliveryNote: false,
        inventoryLocation: 'Default Inventory Location'
    });

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const searchParams = new URLSearchParams(location.search);
            const copyFromId = searchParams.get('copyFrom');

            if (id || copyFromId) {
                const targetId = id || copyFromId;
                setIsLoading(true);
                setCopyFromId(copyFromId);
                try {
                    // Try direct ID lookups for better performance and reliability
                    let sourceDoc: any = null;

                    try {
                        sourceDoc = await apiService.getInvoice(targetId);
                    } catch (e) {
                        try {
                            sourceDoc = await apiService.getOrder(targetId);
                        } catch (e2) {
                            try {
                                sourceDoc = await apiService.getQuote(targetId);
                            } catch (e3) {
                                // Fallback to list search if direct lookup fails
                                const [invoices, orders, quotes] = await Promise.all([
                                    apiService.getInvoices().catch(() => []),
                                    apiService.getOrders().catch(() => []),
                                    apiService.getQuotes().catch(() => [])
                                ]);
                                sourceDoc =
                                    invoices.find((i: any) => i.id === targetId) ||
                                    orders.find((o: any) => o.id === targetId) ||
                                    quotes.find((q: any) => q.id === targetId);
                            }
                        }
                    }

                    if (sourceDoc) {
                        const docDate = copyFromId ? '' : (sourceDoc.issueDate || sourceDoc.orderDate || '');
                        let parsedIssueDate = new Date().toISOString().split('T')[0];
                        if (docDate) {
                            const dottedPattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
                            if (dottedPattern.test(docDate)) {
                                const [day, month, year] = docDate.split('.');
                                parsedIssueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                const d = new Date(docDate);
                                if (!isNaN(d.getTime())) parsedIssueDate = d.toISOString().split('T')[0];
                            }
                        }
                        setIssueDate(parsedIssueDate);
                        setCustomer(sourceDoc.customer?.name || sourceDoc.customer || '');
                        setCurrency(sourceDoc.currency || sourceDoc.customer?.currency?.split(' - ')[0] || 'ZMW');
                        setBillingAddress(sourceDoc.billingAddress || sourceDoc.customer?.billingAddress || '');

                        if (copyFromId) {
                            fetchReference();
                            setUseManualRef(false);
                        } else {
                            setReference(sourceDoc.reference);
                            setUseManualRef(true);
                        }

                        setDescription(sourceDoc.description || sourceDoc.docOptions?.description || '');
                        setDivision(sourceDoc.division || sourceDoc.docOptions?.division || sourceDoc.items?.[0]?.division || sourceDoc.customer?.division || 'General');
                        setTpin(sourceDoc.customer?.tpin || '');

                        if (sourceDoc.dueDate && sourceDoc.issueDate) {
                            const issue = new Date(sourceDoc.issueDate);
                            const due = new Date(sourceDoc.dueDate);
                            const diffTime = due.getTime() - issue.getTime();
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) {
                                setDueDateDays(diffDays.toString());
                                setDueDateType('Net');
                            } else {
                                setDueDateType('On receipt');
                                setDueDateDays('0');
                            }
                        }

                        if (sourceDoc.items && sourceDoc.items.length > 0) {
                            setItems(sourceDoc.items.map((i: any) => ({
                                id: i.id || (Date.now() + Math.random()),
                                itemId: i.itemId || i.item?.id || '',
                                item: i.item?.itemName || i.itemName || i.item || 'Select Item',
                                description: i.description || i.item?.description || '',
                                account: i.account || 'Inventory sales',
                                division: i.division || 'General',
                                qty: (i.qty || '1').toString(),
                                unitPrice: (i.unitPrice || '0').toString(),
                                discount: (i.discount || '').toString(),
                                taxCode: i.taxCode || i.tax_codes?.name || 'No tax'
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Failed to load source document:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIssueDate(new Date().toISOString().split('T')[0]);
                setCustomer('');
                setCurrency('ZMW');
                setBillingAddress('');
                fetchReference();
                setUseManualRef(false);
                setDescription('');
                setDivision('General');
                setTpin('');
                setItems([{ id: Date.now(), item: 'Select Item', itemId: '', description: '', account: 'Inventory sales', division: 'General', qty: '1', unitPrice: '', discount: '', taxCode: '' }]);
            }
        };
        loadData();
    }, [id, location.search]);

    // Ensure descriptions are populated from master data if missing
    useEffect(() => {
        if (inventoryItems.length === 0 || items.length === 0) return;

        const invMap: Record<string, any> = {};
        inventoryItems.forEach(i => { invMap[i.itemName] = i; });

        let changed = false;
        const newItems = items.map(item => {
            if (item.item && item.item !== 'Select Item' && !item.description) {
                const invItem = invMap[item.item];
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
    }, [inventoryItems, items]);

    // Automatically sync currency and due date when customer changes
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

            // Sync due date days with customer credit terms
            if (selected.creditDays && !id && !copyFromId) {
                setDueDateDays(selected.creditDays.toString());
                setDueDateType('Net');
            }
        }
    }, [customer, customers, currency, id, copyFromId]);

    // Update exchange rate when currency or date changes
    useEffect(() => {
        const fetchRate = async () => {
            try {
                if (!currency || currency === 'ZMW') {
                    setExchangeRate(1);
                    setDecimalPlaces(2);
                    return;
                }
                const rateData = await apiService.getExchangeRateAtDate(issueDate, currency);
                setExchangeRate(rateData.rate || 1);
                
                // Fetch decimal places from currency list
                const currenciesData = await apiService.getCurrencies();
                const currObj = currenciesData.find((c: any) => c.code === currency);
                setDecimalPlaces(currObj?.decimalPlaces ?? 2);
            } catch (e) {
                console.error('Failed to load exchange rate:', e);
                setExchangeRate(1);
                setDecimalPlaces(2);
            }
        };
        fetchRate();
    }, [currency, issueDate]);

    // Insights Logic
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

    const [isDeliveryNoteLinked, setIsDeliveryNoteLinked] = useState(false);
    useEffect(() => {
        const checkDeliveryNote = async () => {
            if (reference) {
                try {
                    const dns = await apiService.getDeliveryNotes();
                    setIsDeliveryNoteLinked(dns.some((dn: any) => dn.reference === reference));
                } catch (err) {
                    console.error('Failed to check delivery notes:', err);
                }
            }
        };
        checkDeliveryNote();
    }, [reference]);

    // Financial Calculations
    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        const lineCalcs = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const discountValue = parseFloat(item.discount) || 0;
            let netTotal = qty * price;

            if (options.columnDiscount) {
                if (options.columnDiscountType === 'Percentage') netTotal = netTotal * (1 - (discountValue / 100));
                else netTotal = Math.max(0, netTotal - discountValue);
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

    const handleDuplicateItem = (item: any) => {
        const newItem = { ...item, id: Date.now() + Math.random() };
        const index = items.findIndex(i => i.id === item.id);
        const newItems = [...items];
        newItems.splice(index + 1, 0, newItem);
        setItems(newItems);
    };

    const handleSave = async () => {
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

        const calculateDueDate = () => {
            if (!issueDate) return null;
            const date = new Date(issueDate);
            if (dueDateType === 'Net') {
                date.setDate(date.getDate() + (parseInt(dueDateDays) || 0));
            }
            return date.toISOString().split('T')[0];
        };

        const invoiceData = {
            customerId: selectedCustomer.id,
            reference: reference,
            grandTotal: calculations.grandTotal,
            balanceDue: calculations.grandTotal,
            description: description,
            billingAddress: billingAddress,
            issueDate: issueDate,
            dueDate: calculateDueDate(),
            docOptions: { ...options, division },
            currency: currency,
            items: validItems.map(i => ({
                itemId: i.itemId,
                description: i.description,
                qty: parseFloat(i.qty),
                unitPrice: parseFloat(i.unitPrice),
                discount: parseFloat(i.discount) || 0,
                division: i.division,
                tax_code_id: taxCodes.find(tc => tc.name === i.taxCode)?.id,
                totalAmount: parseFloat(i.qty) * parseFloat(i.unitPrice)
            }))
        };

        try {
            if (isEditing) {
                // await apiService.updateInvoice(id!, invoiceData);
                alert('Update functionality not fully implemented in API yet.');
            } else {
                await apiService.createInvoice(invoiceData);
            }
            navigate('/sales-invoices');
        } catch (err: any) {
            console.error('Failed to save invoice:', err);
            const errMsg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to save invoice to database: ${errMsg}`);
        }
    };


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] animate-pulse">Initializing Invoice Engine...</p>
                    <p className="text-slate-300 text-[10px] uppercase tracking-tighter">Fetching related document data & master records</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/sales-invoices')}>Sales Invoices</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{isEditing ? 'Modify Existing' : 'Issue New'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{isEditing ? 'Modify Invoice' : 'New Sales Invoice'}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/sales-invoices')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Form Body */}
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-12">
                    {/* section: Basic Info */}
                    <div className="space-y-8 animate-in fade-in duration-700">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Invoice Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <InputField label="Issue Date" type="date" value={issueDate} onChange={(e: any) => setIssueDate(e.target.value)} Icon={Calendar} />

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Due Date</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={dueDateType}
                                        onChange={(e) => setDueDateType(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Net">Net Days</option>
                                        <option value="On receipt">On Receipt</option>
                                    </select>
                                    {dueDateType === 'Net' && (
                                        <input
                                            type="number"
                                            value={dueDateDays}
                                            onChange={(e) => setDueDateDays(e.target.value)}
                                            className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-center"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Invoice Reference</label>
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

                            <InputField label="TPIN" value={tpin} onChange={(e: any) => setTpin(e.target.value)} placeholder="Customer TPIN..." Icon={Hash} />
                        </div>
                    </div>

                    {/* Section: Customer & Billing */}
                    <div className="space-y-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <User size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Customer Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <SelectField label="Selected Customer" value={customer} onChange={(e: any) => {
                                const custName = e.target.value;
                                setCustomer(custName);
                                const selected = customers.find(c => c.name === custName);
                                if (selected) {
                                    setCurrency(selected.currency?.split(' - ')[0] || 'ZMW');
                                    setBillingAddress(selected.billingAddress || '');
                                    setTpin(selected.tpin || '');
                                    if (selected.division) setDivision(selected.division);
                                }
                            }} Icon={User}>
                                <option value="">Select Target Customer...</option>
                                {customers.filter(c => (!c.inactive && c.status !== 'Inactive') || c.name === customer).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </SelectField>
                            <div className="md:col-span-2">
                                <InputField label="Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="General description of the invoice contents..." Icon={Briefcase} />
                            </div>
                            <div className="md:col-span-1"></div>
                        </div>
                        <div className="max-w-2xl">
                            <TextareaField label="Billing Address" value={billingAddress} onChange={(e: any) => setBillingAddress(e.target.value)} placeholder="Physical address for invoice delivery..." rows={2} />
                        </div>
                    </div>

                    {/* Section: Line Items */}
                    <div className="space-y-6 pt-8 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                    <Package size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Invoice Line Items</h2>
                            </div>
                            <button onClick={() => setItems(prev => [...prev, { id: Date.now(), item: 'Select Item', itemId: '', description: '', account: 'Inventory sales', division: 'General', qty: '1', unitPrice: '0', discount: '', taxCode: '' }])} className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all">
                                <Plus size={14} /> <span>Add Row</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto overflow-y-visible pb-4 font-sans">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        {options.columnLineNumber && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>}
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">ITEM</th>
                                        {options.columnDescription && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</th>}
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">ACCOUNT</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">DIVISION</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">QTY</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 text-right">UNIT PRICE</th>
                                        {options.columnDiscount && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28 text-right">DISCOUNT</th>}
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
                                                                const invItem = inventoryItems.find(i => i.itemName === val);
                                                                setItems(prev => prev.map(i => i.id === item.id ? {
                                                                    ...i,
                                                                    item: val,
                                                                    itemId: invItem ? invItem.id : '',
                                                                    unitPrice: invItem ? getMinSellingPrice(invItem.id, item.division, invItem.sellingPrice || 0).toString() : i.unitPrice,
                                                                    description: invItem ? (invItem.description || val) : i.description
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
                                                {options.columnDescription && (
                                                    <td className="px-4 py-4">
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                                                            className="w-full bg-transparent border-none p-0 text-sm text-slate-600 outline-none placeholder:text-slate-300"
                                                            placeholder="Item description..."
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={item.account}
                                                        onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, account: e.target.value } : i))}
                                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="Inventory sales">Inventory sales</option>
                                                        <option value="Other income">Other income</option>
                                                        <option value="Professional fees">Professional fees</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={item.division}
                                                        onChange={(e) => {
                                                            const nextDivision = e.target.value;
                                                            setItems(prev => prev.map(i => {
                                                                if (i.id === item.id) {
                                                                    const invItem = inventoryItems.find(x => x.id === i.itemId);
                                                                    const standardSellingPrice = invItem ? (invItem.sellingPrice || 0) : 0;
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
                                                                (parseFloat(item.qty) || 0) > (inventoryMap[item.item]?.qtyOnHand || 0) ? "text-amber-600" : "text-slate-700"
                                                            )}
                                                            placeholder="0"
                                                        />
                                                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter flex items-center justify-between w-full">
                                                            <span>Stock: {(inventoryMap[item.item]?.qtyOnHand || 0).toLocaleString()}</span>
                                                            <span className="text-indigo-500 font-black">{item.unit || ''}</span>
                                                        </div>
                                                    </div>
                                                    {(parseFloat(item.qty) || 0) > (inventoryMap[item.item]?.qtyOnHand || 0) && (
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <AlertTriangle size={12} className="text-amber-500" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-amber-50 border-amber-200 text-amber-800 text-[10px] p-2">
                                                                        Insufficient stock: {inventoryMap[item.item]?.qtyOnHand || 0} available.
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
                                                            onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: e.target.value } : i))}
                                                            className={cn(
                                                                "w-full bg-transparent border-none p-0 text-sm font-bold text-right outline-none transition-colors",
                                                                (parseFloat(item.unitPrice) || 0) < Number(inventoryMap[item.item]?.avgCost || 0) ||
                                                                    (parseFloat(item.unitPrice) || 0) < getMinSellingPrice(item.itemId, item.division, inventoryMap[item.item]?.sellingPrice || 0)
                                                                    ? "text-amber-600" : "text-slate-700"
                                                            )}
                                                            placeholder="0.00"
                                                        />
                                                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter opacity-60">
                                                            Selling Price: {getMinSellingPrice(item.itemId, item.division, inventoryMap[item.item]?.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    {((parseFloat(item.unitPrice) || 0) < Number(inventoryMap[item.item]?.avgCost || 0) ||
                                                        (parseFloat(item.unitPrice) || 0) < getMinSellingPrice(item.itemId, item.division, inventoryMap[item.item]?.sellingPrice || 0)) && (
                                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <AlertTriangle size={12} className="text-amber-500" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-amber-50 border-amber-200 text-amber-800 text-[10px] p-2">
                                                                            Price is below allowed minimum selling price ({getMinSellingPrice(item.itemId, item.division, inventoryMap[item.item]?.sellingPrice || 0).toFixed(2)}) or purchase cost. Review required.
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
                                                                onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, discount: e.target.value } : i))}
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
                                                        onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, taxCode: e.target.value } : i))}
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
                                                    <td className="px-4 py-4 text-sm font-bold text-slate-500 text-right tabular-nums opacity-60">
                                                        {calc?.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                )}
                                                <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right tabular-nums">
                                                    <span className="text-[10px] font-black text-slate-400 mr-1.5 opacity-60">{currency}</span>
                                                    {calc?.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-4 min-w-[70px]">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => handleDuplicateItem(item)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
                                                            <Copy size={14} />
                                                        </button>
                                                        <button onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
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

                        {/* Summary Section - Integrated directly under Line Items */}
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
                                    <span className="text-slate-700 font-bold tabular-nums text-[13px] w-32 text-right">
                                        {calculations.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {options.withholdingTax && (
                                    <div className="flex justify-end items-center text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] gap-8">
                                        <span>Withholding Tax</span>
                                        <span className="text-rose-600 font-bold tabular-nums text-[13px] w-32 text-right">
                                            -{calculations.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-end items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mt-4 h-16 gap-x-6 shadow-sm shadow-indigo-100/30">
                                    <div className="flex-1 text-left">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Total Payable</p>
                                        {options.rounding && <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-1">Rounding Applied</p>}
                                    </div>
                                    <h2 className="text-xl font-medium text-slate-900 tracking-tight tabular-nums flex items-baseline">
                                        <span className="text-xs font-medium text-indigo-400 mr-2 uppercase">{currency}</span>
                                        {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Document Options Section */}
                        <div className="space-y-6 pt-10 border-t border-slate-50">
                            <div
                                onClick={() => setShowOptionsArea(!showOptionsArea)}
                                className="flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors shadow-sm shadow-amber-100/50">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Document Options</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showOptionsArea ? 'Hide configuration' : 'Configure document settings'}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100/50 transition-all border border-slate-100 group-hover:border-amber-100">
                                    <ChevronDown size={20} className={cn("transition-transform duration-300", showOptionsArea ? "rotate-180" : "")} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {showOptionsArea && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                                    >
                                        {([
                                            ['Tax Inclusive', 'amountsAreTaxInclusive'],
                                            ['Rounding', 'rounding'],
                                            ['Line Numbers', 'columnLineNumber'],
                                            ['Show Description', 'columnDescription'],
                                            ['Discount', 'columnDiscount'],
                                            ['Withholding Tax', 'withholdingTax'],
                                            ['Hide Total', 'hideTotalAmount'],
                                            ['Custom Title', 'customTitle'],
                                            ['Footers', 'footers'],
                                            ['Early Payment Disc', 'earlyPaymentDiscount'],
                                            ['Late Payment Fees', 'latePaymentFees'],
                                            ['Delivery Note', 'actsAsDeliveryNote']
                                        ] as const).map(([label, key]) => (
                                            <div key={key} className="space-y-3">
                                                <label className={cn(
                                                    "flex items-center space-x-3 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-indigo-100 transition-all shadow-sm",
                                                    key === 'actsAsDeliveryNote' && isDeliveryNoteLinked && "opacity-50 cursor-not-allowed grayscale pointer-events-none"
                                                )}>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(options as any)[key]}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                                                            disabled={key === 'actsAsDeliveryNote' && isDeliveryNoteLinked}
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{label}</span>
                                                        {key === 'actsAsDeliveryNote' && isDeliveryNoteLinked && (
                                                            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mt-0.5">Linked to Delivery Note</span>
                                                        )}
                                                    </div>
                                                </label>

                                                {/* Conditional Inputs based on Options */}
                                                {key === 'columnDiscount' && options.columnDiscount && (
                                                    <div className="ml-4 animate-in slide-in-from-top-2">
                                                        <select
                                                            value={options.columnDiscountType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, columnDiscountType: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                                                        >
                                                            <option value="Percentage">Percentage (%)</option>
                                                            <option value="Exact amount">Exact Amount</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {key === 'rounding' && options.rounding && (
                                                    <div className="ml-4 animate-in slide-in-from-top-2">
                                                        <select
                                                            value={options.roundingType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, roundingType: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-emerald-600 uppercase focus:outline-none focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                                                        >
                                                            <option value="Round to nearest">Round to nearest</option>
                                                            <option value="Round down">Round down</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {key === 'withholdingTax' && options.withholdingTax && (
                                                    <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
                                                        <select
                                                            value={options.withholdingTaxType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, withholdingTaxType: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-rose-600 uppercase focus:outline-none focus:ring-4 focus:ring-rose-500/10 cursor-pointer"
                                                        >
                                                            <option value="Percentage">Percentage (%)</option>
                                                            <option value="Exact amount">Exact Amount</option>
                                                        </select>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={options.withholdingTaxValue}
                                                                onChange={(e) => setOptions(prev => ({ ...prev, withholdingTaxValue: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                                                                placeholder="0.00"
                                                            />
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 opacity-50">{options.withholdingTaxType === 'Percentage' ? '%' : currency}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {key === 'customTitle' && options.customTitle && (
                                                    <div className="ml-4 animate-in slide-in-from-top-2">
                                                        <input
                                                            type="text"
                                                            value={options.customTitleValue}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none"
                                                            placeholder="Customer Title (e.g. TAX INVOICE)"
                                                        />
                                                    </div>
                                                )}

                                                {key === 'earlyPaymentDiscount' && options.earlyPaymentDiscount && (
                                                    <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
                                                        <select
                                                            value={options.earlyPaymentType}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, earlyPaymentType: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                                                        >
                                                            <option value="Percentage">Percentage (%)</option>
                                                            <option value="Exact amount">Exact Amount</option>
                                                        </select>
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="text"
                                                                    value={options.earlyPaymentValue}
                                                                    onChange={(e) => setOptions(prev => ({ ...prev, earlyPaymentValue: e.target.value }))}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                                                                    placeholder="Value"
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 opacity-50">{options.earlyPaymentType === 'Percentage' ? '%' : currency}</span>
                                                            </div>
                                                            <div className="relative w-24">
                                                                <input
                                                                    type="text"
                                                                    value={options.earlyPaymentDays}
                                                                    onChange={(e) => setOptions(prev => ({ ...prev, earlyPaymentDays: e.target.value }))}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none text-center"
                                                                    placeholder="Days"
                                                                />
                                                                <span className="text-[8px] font-black text-slate-400 absolute left-1/2 -top-1 -translate-x-1/2 bg-white px-1">DAYS</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {key === 'latePaymentFees' && options.latePaymentFees && (
                                                    <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={options.latePaymentFeePercentage}
                                                                onChange={(e) => setOptions(prev => ({ ...prev, latePaymentFeePercentage: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                                                                placeholder="Monthly fee %"
                                                            />
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-300 opacity-50">%</span>
                                                            <span className="text-[8px] font-black text-slate-400 absolute left-1/2 -top-1 -translate-x-1/2 bg-white px-1 whitespace-nowrap uppercase tracking-tighter">Monthly Fee</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {key === 'actsAsDeliveryNote' && options.actsAsDeliveryNote && (
                                                    <div className="ml-4 space-y-3 animate-in slide-in-from-top-2">
                                                        <select
                                                            value={options.inventoryLocation}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, inventoryLocation: e.target.value }))}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                                                        >
                                                            <option value="Default Inventory Location">Default Location</option>
                                                            <option value="Main Warehouse">Main Warehouse</option>
                                                            <option value="Branch Office">Branch Office</option>
                                                        </select>
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                value={options.deliveryDate || issueDate}
                                                                onChange={(e) => setOptions(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                                                            />
                                                            <span className="text-[8px] font-black text-slate-400 absolute left-1/2 -top-1 -translate-x-1/2 bg-white px-1 whitespace-nowrap uppercase tracking-tighter">Delivery Date</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {options.footers && (
                                            <div className="col-span-full mt-4 space-y-4 animate-in slide-in-from-top-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Footer Template</label>
                                                    <select
                                                        value={dbFooters.find(f => f.content === options.footerValue)?.id || ''}
                                                        onChange={(e) => {
                                                            const footer = dbFooters.find(f => f.id === e.target.value);
                                                            if (footer) {
                                                                setOptions(prev => ({ ...prev, footerValue: footer.content }));
                                                            }
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-3 text-xs font-bold text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                                                    >
                                                        <option value="">-- Choose a template from settings --</option>
                                                        {dbFooters.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Document Attachment Section */}
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
                                                {fileName === 'No file chosen' ? 'Specs, plans or references' : 'Linked to invoice'}
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

                        {/* Insights Table */}
                        {showTransactionInsights && items.some(i => i.item !== 'Select Item') && (
                            <div className="mt-8 pt-8 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center space-x-3 mb-5">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                        <History size={18} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 tracking-tight">Price Monitoring & Insights ({customer || 'Generic'})</h3>
                                </div>
                                <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-slate-50 shadow-inner">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200/60">
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/4">Line Analysis</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Last 3 Client Transactions</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Global Market History</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/40 bg-white/50">
                                            {Array.from(new Set(items.filter(i => i.item !== 'Select Item').map(i => i.item))).map(itemName => {
                                                const clientSales = itemHistory.clientSales[itemName] || [];
                                                const globalHistory = itemHistory.global[itemName] || [];
                                                return (
                                                    <tr key={itemName}>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-black text-slate-700">{itemName}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right tabular-nums">
                                                            <div className="flex flex-col gap-1 items-end">
                                                                {clientSales.length > 0 ? clientSales.map((h, i) => (
                                                                    <span key={i} className="text-[11px] font-black text-emerald-600">
                                                                        {h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 font-bold ml-1 opacity-50">Qty {h.qty}</span>
                                                                    </span>
                                                                )) : <span className="text-[10px] text-slate-300 italic font-bold">No history available</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right tabular-nums">
                                                            <div className="flex flex-col gap-1 items-end">
                                                                {globalHistory.length > 0 ? globalHistory.map((h, i) => (
                                                                    <span key={i} className="text-[11px] font-black text-indigo-600">
                                                                        {h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 font-bold ml-1 opacity-50">{h.customer}</span>
                                                                    </span>
                                                                )) : <span className="text-[10px] text-slate-300 italic font-bold">No data found</span>}
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

                        {/* Submission Area */}
                        <div className="bg-slate-50 p-10 mt-12 mb-10 mx-[-48px] border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 rounded-b-[40px]">
                            <div className="flex-1 w-full text-left">
                                {requiresApproval ? (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3 max-w-2xl">
                                        <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest underline decoration-2 underline-offset-4">Review Needed</p>
                                            <p className="text-[11px] font-medium text-amber-700">{approvalReason}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Status: <span className="text-indigo-600">{status}</span></p>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => navigate('/sales-invoices')} className="px-8 py-4 text-[12px] font-black text-slate-500 hover:bg-slate-200 rounded-2xl transition-all uppercase tracking-widest">Discard</button>
                                <button
                                    onClick={() => handleSave()}
                                    disabled={requiresApproval}
                                    className={cn(
                                        "px-10 py-4 rounded-2xl text-[12px] font-black transition-all shadow-xl uppercase tracking-widest flex items-center gap-2",
                                        requiresApproval ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                                    )}
                                >
                                    <Save size={18} /> {isEditing ? 'Update Invoice' : 'Create Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewSalesInvoiceView;
