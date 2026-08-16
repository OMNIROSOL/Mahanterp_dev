import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Eye, Edit, FileText, Check, X, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Printer, Search, ArrowUpDown, ChevronUp, ChevronDown, Copy, Calendar, Clock, Package } from 'lucide-react';
import { cn } from '../utils/cn';
import { ScreenPermission } from '../types';
import { formatTimestamp } from '../utils/dateUtils';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import BatchActionBar from '../components/shared/BatchActionBar';

const InvoicesView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>('Issue date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [showEditColumns, setShowEditColumns] = useState(false);
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const batchOpsRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>({ role: 'Admin' });
    const [perms, setPerms] = useState<ScreenPermission | null>(null);

    useEffect(() => {
        const handleInvoicesUpdate = () => setRefreshTrigger(prev => prev + 1);
        const handleDNUpdate = () => setRefreshTrigger(prev => prev + 1);

        window.addEventListener('invoices_updated', handleInvoicesUpdate);
        window.addEventListener('delivery_notes_updated', handleDNUpdate);

        setPerms({ screenId: 'sales-invoices', canView: true, canAdd: true, canEdit: true, canDelete: true } as ScreenPermission);

        return () => {
            window.removeEventListener('invoices_updated', handleInvoicesUpdate);
            window.removeEventListener('delivery_notes_updated', handleDNUpdate);
        };
    }, []);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [dbDeliveryNotes, setDbDeliveryNotes] = useState<any[]>([]);
    const [dbItems, setDbItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            setIsLoading(true);
            try {
                const [invData, dnData, itemData] = await Promise.all([
                    apiService.getInvoices(),
                    apiService.getDeliveryNotes(),
                    apiService.getItems()
                ]);

                if (!Array.isArray(invData)) {
                    setInvoices([]);
                    return;
                }

                const mappedInvoices = invData.map((inv: any) => ({
                    ...inv,
                    customer: inv.customer?.name || (typeof inv.customer === 'string' ? inv.customer : 'Unknown'),
                    invoiceAmount: parseFloat(String(inv.grandTotal || 0)) || 0,
                    balanceDue: parseFloat(String(inv.balanceDue || inv.grandTotal || 0)) || 0,
                    currency: inv.currency || inv.customer?.currency?.split(' - ')[0] || 'ZMW',
                    issueDate: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : ''),
                    dueDate: (() => {
                        if (inv.dueDate) return new Date(inv.dueDate).toLocaleDateString('en-GB').replace(/\//g, '.');
                        if (inv.issueDate) {
                            const d = new Date(inv.issueDate);
                            d.setDate(d.getDate() + 30);
                            return d.toLocaleDateString('en-GB').replace(/\//g, '.');
                        }
                        return '';
                    })(),
                    timestamp: formatTimestamp(inv.createdAt),
                    tpin: inv.tpin || inv.customer?.tpin || '',
                    description: inv.description || inv.docOptions?.description || inv.items?.[0]?.description || '',
                    Division: inv.items?.[0]?.division || inv.docOptions?.division || inv.division || inv.customer?.division || 'General',
                    // Dynamic Status Calculation
                    status: (() => {
                        const grandTotal = parseFloat(String(inv.grandTotal || 0));
                        const balanceDue = parseFloat(String(inv.balanceDue || inv.grandTotal || 0));
                        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        if (balanceDue <= 0) return 'Paid';
                        if (dueDate && dueDate < today) return 'Overdue';
                        if (balanceDue < grandTotal) return 'Partially Paid';
                        return 'Unpaid';
                    })()
                }));
                setInvoices(mappedInvoices);
                setDbDeliveryNotes(dnData);
                setDbItems(itemData);
            } catch (err) {
                console.error('Failed to fetch invoices:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, [refreshTrigger]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const defaultVisibility = {
        'Selection': false,
        'Actions': true,
        'Issue date': true,
        'Due date': true,
        'Reference': true,
        'Customer': true,
        'Description': false,
        'Division': true,
        'Invoice Amount': true,
        'Balance due': true,
        'Days to Due Date': false,
        'Days overdue': false,
        'Status': true,
        'Withholding tax': false,
        'TPIN': false,
        'Closed invoice': false,
        'Discount': false,
        'Timestamp': true,
        'Cost of sales': false,
        'Create Delivery Note': true
    };

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('invoice_column_visibility_settings');
        const current = saved ? JSON.parse(saved) : defaultVisibility;
        return { ...defaultVisibility, ...current };
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('invoice_column_visibility_settings');
            if (saved) {
                setVisibleColumns({ ...defaultVisibility, ...JSON.parse(saved) });
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleColumnVisibility = (id: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [id]: !prev[id] };
            localStorage.setItem('invoice_column_visibility_settings', JSON.stringify(next));
            return next;
        });
    };

    const [visibleLineColumns, setVisibleLineColumns] = useState<Record<string, boolean>>({
        'Item': false,
        'Qty': false,
        'Unit Price': false,
        'Line Total': false
    });

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-50" />;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDown size={12} className="ml-1 text-blue-500" />;
    };

    const handleCopyToClipboard = () => {
        const rows = filteredData.map(inv =>
            `${inv.issueDate}\t${inv.dueDate || ''}\t${inv.reference}\t${inv.salesOrder || ''}\t${inv.customer}\t${inv.description || ''}\t${inv.invoiceAmount}\t${inv.balanceDue}\t${inv.status}`
        ).join('\n');
        navigator.clipboard.writeText(rows).then(() => {
            alert('Copied to clipboard');
        });
    };

    const calculateDays = (dueDateStr: string | undefined) => {
        if (!dueDateStr) return { remaining: '', overdue: '' };
        const parts = dueDateStr.split('.');
        if (parts.length !== 3) return { remaining: '', overdue: '' };
        const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const today = new Date(); today.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
        return {
            remaining: diff > 0 ? `${diff} days` : (diff === 0 ? 'Due today' : ''),
            overdue: diff < 0 ? `${Math.abs(diff)} days` : ''
        };
    };

    const deliveryNotes = dbDeliveryNotes;

    const filteredData = useMemo(() => {
        let result = [...invoices];
        
        // 1. Exact Customer Filter from URL Path
        if (customerName) {
            result = result.filter(inv => inv.customer.toLowerCase() === customerName.toLowerCase());
        }

        if (statusFilter !== 'All') {
            result = result.filter(inv => inv.status === statusFilter);
        } else {
            // "when status is paid in sales invoice then only it should removed in sales invoice list"
            result = result.filter(inv => inv.status !== 'Paid');
        }

        const query = searchQuery.toLowerCase();
        result = result.filter(inv => {
            return (
                inv.customer.toLowerCase().includes(query) ||
                inv.reference.toLowerCase().includes(query) ||
                (inv.status && inv.status.toLowerCase().includes(query)) ||
                (inv.description && inv.description.toLowerCase().includes(query)) ||
                (inv.salesOrder && inv.salesOrder.toLowerCase().includes(query)) ||
                (inv.tpin && inv.tpin.toLowerCase().includes(query)) ||
                (inv.Division && inv.Division.toLowerCase().includes(query)) ||
                (inv.timestamp && inv.timestamp.toLowerCase().includes(query)) ||
                (inv.items && inv.items.some((item: any) => {
                    const itemName = item.item?.itemName || (typeof item.item === 'string' ? item.item : '');
                    const itemCode = item.item?.itemCode || '';
                    const itemDesc = item.description || '';
                    return (
                        itemName.toLowerCase().includes(query) ||
                        itemCode.toLowerCase().includes(query) ||
                        itemDesc.toLowerCase().includes(query)
                    );
                }))
            );
        });

        // 3. Implement Sorting for ALL columns
        return result.sort((a, b) => {
            let valA: any;
            let valB: any;

            const getCost = (inv: any) => {
                let total = 0;
                if (inv.items) {
                    inv.items.forEach((item: any) => {
                        const itemRef = item.item;
                        const inventoryItem = dbItems.find(i => i.itemName === itemRef || i.itemCode === itemRef || i.id === itemRef);
                        if (inventoryItem) total += (parseFloat(item.qty) || 0) * (parseFloat(inventoryItem.purchasePrice) || 0);
                    });
                }
                return total;
            };

            const getDays = (dueDateStr: string | undefined) => {
                if (!dueDateStr) return 0;
                const parts = dueDateStr.split('.');
                if (parts.length !== 3) return 0;
                const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                const today = new Date(); today.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
                return Math.round((due.getTime() - today.getTime()) / 86400000);
            };

            switch (sortColumn) {
                case 'Issue date':
                    valA = (a.issueDate || '').split('.').reverse().join('-');
                    valB = (b.issueDate || '').split('.').reverse().join('-');
                    break;
                case 'Due date':
                    valA = (a.dueDate || '').split('.').reverse().join('-');
                    valB = (b.dueDate || '').split('.').reverse().join('-');
                    break;
                case 'Invoice Amount':
                    valA = parseFloat(String(a.invoiceAmount || 0));
                    valB = parseFloat(String(b.invoiceAmount || 0));
                    break;
                case 'Balance due':
                    valA = parseFloat(String(a.balanceDue || 0));
                    valB = parseFloat(String(b.balanceDue || 0));
                    break;
                case 'Days to Due Date':
                    valA = getDays(a.dueDate);
                    valB = getDays(b.dueDate);
                    break;
                case 'Days overdue':
                    valA = -getDays(a.dueDate);
                    valB = -getDays(b.dueDate);
                    break;
                case 'Cost of sales':
                    valA = getCost(a);
                    valB = getCost(b);
                    break;
                case 'Reference':
                    valA = a.reference;
                    valB = b.reference;
                    break;
                case 'Customer':
                    valA = a.customer;
                    valB = b.customer;
                    break;
                case 'Status':
                    valA = a.status;
                    valB = b.status;
                    break;
                case 'Sales Order':
                    valA = a.salesOrder || '';
                    valB = b.salesOrder || '';
                    break;
                case 'Description':
                    valA = a.description || '';
                    valB = b.description || '';
                    break;
                case 'TPIN':
                    valA = a.tpin || '';
                    valB = b.tpin || '';
                    break;
                case 'Timestamp':
                    valA = a.timestamp || '';
                    valB = b.timestamp || '';
                    break;
                default:
                    valA = (a as any)[sortColumn] || '';
                    valB = (b as any)[sortColumn] || '';
            }

            if (valA === valB) return 0;
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            return sortDirection === 'asc' ? 1 : -1;
        });
    }, [invoices, searchQuery, refreshTrigger, customerName, sortColumn, sortDirection]);



    const totalPages = Math.ceil(filteredData.length / pageSize);

    const displayData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    const allColumns = [
        {
            id: 'Selection',
            header: (
                <div className="flex items-center justify-center -ml-1">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === displayData.length && displayData.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedIds(displayData.map((o: any) => o.id));
                                } else {
                                    setSelectedIds([]);
                                }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.length === displayData.length && displayData.length > 0 && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            ),
            accessor: (inv: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(inv.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(inv.id)
                                        ? prev.filter(id => id !== inv.id)
                                        : [...prev, inv.id]
                                );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.includes(inv.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            )
        },
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (inv: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/sales-invoices/view/${inv.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {perms?.edit !== false && (
                        <button
                            onClick={() => navigate(`/sales-invoices/edit/${inv.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 font-bold"
                            title="Edit Invoice"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            id: 'Issue date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Issue date')}>Issue Date <SortIcon column="Issue date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (inv: any) => (
                <span className="font-medium text-[13px] text-slate-800 tracking-normal">{inv.issueDate}</span>
            ),
            sortable: false
        },
        {
            id: 'Due date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Due date')}>Due Date <SortIcon column="Due date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (inv: any) => {
                let dueDisplay = inv.dueDate || '';
                if (dueDisplay.includes(' Days') && inv.issueDate) {
                    const days = parseInt(dueDisplay.split(' ')[0]);
                    const issueParts = inv.issueDate.split('.');
                    if (issueParts.length === 3) {
                        const date = new Date(Number(issueParts[2]), Number(issueParts[1]) - 1, Number(issueParts[0]));
                        date.setDate(date.getDate() + days);
                        dueDisplay = date.toLocaleDateString('en-GB').replace(/\//g, '.');
                    }
                }
                return (
                    <span className="font-medium text-[13px] text-slate-800 tracking-normal">{dueDisplay}</span>
                );
            },
            sortable: false
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            className: 'whitespace-nowrap min-w-[140px]',
            accessor: (inv: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-medium text-slate-900 tracking-tight">{inv.reference}</span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            className: 'min-w-[200px]',
            accessor: (inv: any) => (
                <span className="font-medium text-slate-600">{typeof inv.customer === 'string' ? inv.customer : inv.customer?.name || 'Unknown'}</span>
            ),
            sortable: false
        },
        {
            id: 'Description',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Description')}>Description <SortIcon column="Description" /></div>,
            className: 'min-w-[200px]',
            accessor: (inv: any) => (
                <span className="text-slate-400 font-medium tracking-tight truncate max-w-[200px]" title={inv.description}>{inv.description || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Division',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Division')}>Division <SortIcon column="Division" /></div>,
            accessor: (inv: any) => <span className="text-slate-600 font-medium text-[13px]">{inv.Division || 'General'}</span>,
            sortable: false
        },
        {
            id: 'Invoice Amount',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Invoice Amount')}>Invoice Amount <SortIcon column="Invoice Amount" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (inv: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">{inv.currency || 'ZMW'}</span>
                    <span className="font-black text-slate-900">
                        {parseFloat(String(inv.invoiceAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Balance due',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Balance due')}>Balance due <SortIcon column="Balance due" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (inv: any) => {
                return (
                    <div className="text-right">
                        <Link
                            to={`/sales-invoices/transactions/${inv.id}`}
                            className={cn(
                                "font-medium hover:underline transition-all text-slate-900 flex items-center justify-end"
                            )}
                        >
                            <span className="text-[10px] text-slate-400 font-bold mr-1">{inv.currency || 'ZMW'}</span>
                            <span>{parseFloat(String(inv.balanceDue || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </Link>
                    </div>
                );
            },
            sortable: false
        },
        {
            id: 'Days to Due Date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Days to Due Date')}>Days to Due Date <SortIcon column="Days to Due Date" /></div>,
            accessor: (inv: any) => {
                const { remaining } = calculateDays(inv.dueDate);
                return <span className="text-slate-900 font-medium text-[13px] tracking-normal">{remaining}</span>;
            },
            sortable: false
        },
        {
            id: 'Days overdue',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Days overdue')}>Days overdue <SortIcon column="Days overdue" /></div>,
            accessor: (inv: any) => {
                const { overdue } = calculateDays(inv.dueDate);
                return <span className="text-slate-900 font-medium text-[13px] tracking-normal">{overdue}</span>;
            },
            sortable: false
        },
        {
            id: 'Status',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Status')}>Status <SortIcon column="Status" /></div>,
            className: 'whitespace-nowrap',
            accessor: (inv: any) => {
                const variantMap: Record<string, any> = {
                    'Paid': 'success',
                    'Partially Paid': 'info',
                    'Overdue': 'error',
                    'Unpaid': 'warning'
                };
                return (
                    <Badge variant={variantMap[inv.status] || 'warning'} className="text-[10px]">
                        {inv.status?.toUpperCase()}
                    </Badge>
                );
            },
            sortable: false
        },
        {
            id: 'Withholding tax',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Withholding tax')}>Withholding tax <SortIcon column="Withholding tax" /></div>,
            accessor: () => <span className="text-slate-400 text-xs">0.00</span>,
            sortable: false
        },
        {
            id: 'TPIN',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('TPIN')}>TPIN <SortIcon column="TPIN" /></div>,
            accessor: (inv: any) => <span className="text-slate-400 text-xs tabular-nums">{inv.tpin || ''}</span>,
            sortable: false
        },
        {
            id: 'Closed invoice',
            header: <div className="flex items-center justify-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Closed invoice')}>Closed invoice <SortIcon column="Closed invoice" /></div>,
            accessor: (inv: any) => (
                <div className="flex justify-center">
                    {inv.status === 'Paid in full' ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-slate-200" />}
                </div>
            ),
            sortable: false
        },
        {
            id: 'Discount',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Discount')}>Discount <SortIcon column="Discount" /></div>,
            accessor: () => <span className="text-slate-400 text-xs">0.00</span>,
            sortable: false
        },
        {
            id: 'Timestamp',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Timestamp')}>Timestamp <SortIcon column="Timestamp" /></div>,
            className: 'whitespace-nowrap min-w-[120px]',
            accessor: (inv: any) => (
                <span className="text-[10px] text-slate-400 font-medium">{inv.timestamp || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Cost of sales',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Cost of sales')}>Cost of sales <SortIcon column="Cost of sales" /></div>,
            className: 'text-right',
            accessor: (inv: any) => {
                let totalCost = 0;
                if (inv.items) {
                    inv.items.forEach((item: any) => {
                        const inventoryItem = dbItems.find((i: any) => i.itemName === item.item || i.itemCode === item.item || i.id === item.item);
                        if (inventoryItem) {
                            totalCost += (parseFloat(item.qty) || 0) * (parseFloat(inventoryItem.purchasePrice) || 0);
                        }
                    });
                }
                return (
                    <div className="text-right">
                        <Link
                            to={`/sales-invoices/cost-of-sales/${inv.id}`}
                            className="text-slate-600 font-bold hover:underline transition-all"
                        >
                            {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Link>
                    </div>
                );
            },
            sortable: false
        },
        {
            id: 'Item',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Item')}>Item <SortIcon column="Item" /></div>,
            accessor: (inv: any) => (
                <span className="font-bold text-slate-900">{inv._itemData?.item || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Qty',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Qty')}>Qty <SortIcon column="Qty" /></div>,
            accessor: (inv: any) => (
                <span className="font-medium text-slate-600">{inv._itemData?.qty || ''}</span>
            ),
            className: 'text-right',
            sortable: false
        },
        {
            id: 'Unit Price',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Unit Price')}>Unit Price <SortIcon column="Unit Price" /></div>,
            accessor: (inv: any) => (
                <span className="font-medium text-slate-600">{inv._itemData?.unitPrice || ''}</span>
            ),
            className: 'text-right',
            sortable: false
        },
        {
            id: 'Line Total',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Line Total')}>Line Total <SortIcon column="Line Total" /></div>,
            accessor: (inv: any) => (
                <span className="font-bold text-slate-900">
                    {inv._itemData ? (parseFloat(inv._itemData.qty) * parseFloat(inv._itemData.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                </span>
            ),
            className: 'text-right',
            sortable: false
        },
        {
            id: 'Create Delivery Note',
            header: <div className="flex items-center justify-center text-center">Create<br />Delivery Note</div>,
            className: 'whitespace-nowrap',
            accessor: (inv: any) => {
                const isLinked = deliveryNotes.some((dn: any) => dn.reference === inv.reference);
                return (
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => !isLinked && handleMoveToDeliveryNote(inv)}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm border",
                                isLinked
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-not-allowed"
                                    : "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200"
                            )}
                            title={isLinked ? "Delivery Note already exists" : "Create Delivery Note"}
                            disabled={isLinked}
                        >
                            {isLinked ? <Check size={14} strokeWidth={3} /> : <Package size={14} strokeWidth={3} />}
                        </button>
                    </div>
                );
            },
            sortable: false
        }
    ];

    const handleMoveToDeliveryNote = async (inv: any) => {
        // Could fetch customer if needed, but for now we just use the name if ID is missing
        const customerId = inv.customerId;

        const newNote = {
            customerId: customerId,
            reference: inv.reference,
            description: `Shipment for Invoice ${inv.reference}`,
            inventoryLocation: 'Default Warehouse', // Could be made dynamic
            items: (inv.items || []).map((it: any) => ({
                itemId: it.itemId || it.item?.id,
                qty: parseFloat(it.qty)
            }))
        };

        try {
            // 1. Create Delivery Note in DB
            await apiService.createDeliveryNote(newNote);

            // 2. Mark invoice as delivered in DB
            await apiService.updateInvoiceStatus(inv.id, 'Delivered');

            // 3. Refresh and navigate
            setRefreshTrigger(prev => prev + 1);
            navigate(`/delivery-notes`);
        } catch (err) {
            console.error('Failed to create delivery note:', err);
            alert('Failed to create delivery note in database.');
        }
    };

    const columns = useMemo(() => {
        let cols = allColumns.filter(col => visibleColumns[col.id] || visibleLineColumns[col.id]);
        if (isSelectionMode) {
            const selectionCol = allColumns.find(c => c.id === 'Selection');
            if (selectionCol && !cols.some(c => c.id === 'Selection')) {
                cols = [selectionCol, ...cols];
            }
        } else {
            cols = cols.filter(c => c.id !== 'Selection');
        }
        return cols;
    }, [visibleColumns, visibleLineColumns, isSelectionMode, selectedIds, displayData, filteredData]);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
            {customerName && (
                <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span
                        onClick={() => navigate('/customers')}
                        className="text-indigo-500 hover:underline cursor-pointer"
                    >
                        Customers
                    </span>
                    <ChevronRight size={10} className="opacity-30" />
                    <span className="text-slate-600 italic">“{customerName}”</span>
                </div>
            )}

            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                        <FileText size={14} />
                        <span className="text-gray-400">Financial Operations</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">Sales Invoices</h1>
                    <p className="text-gray-500 text-sm">Manage and track your customer invoices.</p>
                </div>

                <div className="flex items-center gap-3">
                    {perms?.add !== false && (
                        <button
                            onClick={() => navigate('/sales-invoices/new')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={16} className="mr-2" /> CREATE NEW INVOICE
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, reference, or description..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300"
                    >
                        <option value="All">All Active</option>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Invoices</span>
                        <span className="text-[18px] font-bold text-gray-900 leading-none">
                            {filteredData.length}
                        </span>
                    </div>
                </div>
            </div>


            <BatchActionBar
                isVisible={isSelectionMode}
                selectedCount={selectedIds.length}
                onReset={() => {
                    setIsSelectionMode(false);
                    setSelectedIds([]);
                }}
                actions={[
                    {
                        icon: <Printer size={16} strokeWidth={3} />,
                        label: 'Print Invoices',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No invoices selected'); return; }
                            navigate(`/sales-invoices/print-batch?ids=${selectedIds.join(',')}`);
                        }
                    },
                    {
                        icon: <Printer size={16} strokeWidth={3} />,
                        label: 'Cost of Sales',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No invoices selected'); return; }
                            navigate(`/sales-invoices/print-batch?ids=${selectedIds.join(',')}&reportType=cogs`);
                        }
                    },
                    {
                        icon: <Printer size={16} strokeWidth={3} />,
                        label: 'Balance Due',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No invoices selected'); return; }
                            navigate(`/sales-invoices/print-batch?ids=${selectedIds.join(',')}&reportType=transactions`);
                        }
                    },
                    {
                        icon: <Copy size={16} strokeWidth={3} />,
                        label: 'Copy Details',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No invoices selected'); return; }
                            const selectedInvoices = filteredData.filter((inv: any) => selectedIds.includes(inv.id));
                            const text = selectedInvoices.map((inv: any) => `${inv.reference}\t${inv.customer}\t${inv.invoiceAmount}`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Copied to clipboard');
                        }
                    }
                ]}
            />
            <div className="w-fit min-w-full overflow-visible mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                <DataTable
                    data={isLoading ? [] : displayData}
                    columns={columns as any}
                    tableClassName="min-w-[1440px]"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    stickyHeader={true}
                    disableInternalScroll={true}
                    emptyMessage={
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing invoices...</p>
                            </div>
                        ) : "No invoices found."
                    }

                    tableFooter={
                        <tr>
                            {columns.map((col: any) => {
                                if (col.id === 'Customer') {
                                    return (
                                        <td key={`total-label-${col.id}`} className="px-6 py-4 text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Totals:</span>
                                        </td>
                                    );
                                }

                                if (col.id === 'Invoice Amount' || col.id === 'Balance due') {
                                    const field = col.id === 'Invoice Amount' ? 'invoiceAmount' : 'balanceDue';
                                    const totalsByCurrency: Record<string, number> = {};
                                    filteredData.forEach(o => {
                                        const cur = o.currency || 'ZMW';
                                        totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + parseFloat(o[field] as any || 0);
                                    });
                                    const activeCurs = Object.keys(totalsByCurrency);

                                    return (
                                        <td key={`total-${col.id}`} className="px-6 py-3 whitespace-nowrap text-right bg-slate-50/50">
                                            <div className="flex flex-col items-end gap-1">
                                                {activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center gap-1.5 justify-end">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{cur}</span>
                                                        <span className="text-[12px] font-black tracking-tight text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                                            {totalsByCurrency[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                }

                                return <td key={`total-empty-${col.id}`} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    }
                />
            </div>

            {/* Management Card */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4 ml-0 mr-auto max-w-[1200px]">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="mx-2 text-slate-700">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Show per page:</span>
                        <div className="flex items-center gap-4">
                            {[50, 100, 250, 500].map(size => (
                                <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                    className={`text-[10px] font-black transition-all ${pageSize === size ? 'text-indigo-600 underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyToClipboard}
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={12} /> Export Data
                    </button>

                    <div className="relative" ref={batchOpsRef}>
                        <button
                            onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                            className="px-4 py-2 bg-blue-600 text-[11px] font-bold text-white rounded-md hover:bg-blue-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                        >
                            Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                        </button>

                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left">
                                <button
                                    onClick={() => { navigate('/sales-invoices/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors capitalize"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isSelectionMode) {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                        setIsSelectionMode(!isSelectionMode);
                                        setIsBatchOpsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100 capitalize"
                                >
                                    {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default InvoicesView;
