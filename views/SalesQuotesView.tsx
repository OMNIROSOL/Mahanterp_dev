import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { SalesQuote, ScreenPermission } from '../types';
import { useEffect } from 'react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Card from '../components/shared/Card';
import DataTable from '../components/shared/DataTable';
import {
    Plus, Copy, FileText, Check, X, Eye, Edit, Printer, ChevronRight, ChevronLeft, Search, Share2,
    ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, LayoutGrid, HelpCircle, ArrowUpDown
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatTimestamp } from '../utils/dateUtils';

const SalesQuotesView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [quotes, setQuotes] = useState<SalesQuote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortColumn, setSortColumn] = useState<string>('Issue Date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [showEditColumns, setShowEditColumns] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const batchOpsRef = React.useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>({ role: 'Admin' });
    const [perms, setPerms] = useState<ScreenPermission | null>(null);

    useEffect(() => {
        setPerms({ screenId: 'sales-quotes', canView: true, canAdd: true, canEdit: true, canDelete: true } as ScreenPermission);
    }, []);

    useEffect(() => {
        const fetchQuotes = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getQuotes();
                // Map API data to match view expectations
                const mappedQuotes = data.map((q: any) => ({
                    ...q,
                    customer: q.customer?.name || q.customer || 'Unknown',
                    currency: q.currency || q.customer?.currency?.split(' - ')[0] || 'ZMW',
                    issueDate: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    timestamp: formatTimestamp(q.createdAt),
                    Division: q.items?.[0]?.division || q.docOptions?.division || q.division || q.customer?.division || 'General',
                    tpin: q.tpin || q.customer?.tpin || '',
                    // Ensure numeric fields are correctly handled
                    amount: parseFloat(q.amount || 0)
                }));
                setQuotes(mappedQuotes);
            } catch (err) {
                console.error('Failed to fetch quotes:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuotes();
    }, [refreshTrigger]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaultVisible: Record<string, boolean> = {
            'Actions': true,
            'Issue Date': true,
            'Expiry Date': true,
            'Reference': true,
            'Customer': true,
            'Description': false,
            'Amount': true,
            'Division': true,
            'Status': true,
            'TPIN': false,
            'Days until Expiry': false,
            'Timestamp': false
        };

        const saved = localStorage.getItem('quote_column_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            const record: Record<string, boolean> = { 'Actions': true };

            parsed.forEach((col: any) => {
                const mapping: Record<string, string> = {
                    'issuedate': 'Issue Date',
                    'expirydate': 'Expiry Date',
                    'reference': 'Reference',
                    'customer': 'Customer',
                    'description': 'Description',
                    'amount': 'Amount',
                    'division': 'Division',
                    'status': 'Status',
                    'tpin': 'TPIN',
                    'days until expiry': 'Days until Expiry',
                    'timestamp': 'Timestamp'
                };

                const normalizedId = mapping[col.id.toLowerCase()] || col.id;
                record[normalizedId] = col.visible;
            });
            return { ...defaultVisible, ...record };
        }
        return defaultVisible;
    });

    const toggleColumnVisibility = (id: string) => {
        const newVisible = { ...visibleColumns, [id]: !visibleColumns[id] };
        setVisibleColumns(newVisible);

        const columnsToSave = [
            { id: 'Issue Date', label: 'Issue date', visible: newVisible['Issue Date'] ?? true },
            { id: 'Expiry Date', label: 'Expiry date', visible: newVisible['Expiry Date'] ?? false },
            { id: 'Reference', label: 'Reference', visible: newVisible['Reference'] ?? true },
            { id: 'Customer', label: 'Customer', visible: newVisible['Customer'] ?? true },
            { id: 'Description', label: 'Description', visible: newVisible['Description'] ?? false },
            { id: 'Amount', label: 'Amount', visible: newVisible['Amount'] ?? true },
            { id: 'Division', label: 'Division', visible: newVisible['Division'] ?? true },
            { id: 'Status', label: 'Status', visible: newVisible['Status'] ?? true },
            { id: 'Timestamp', label: 'Timestamp', visible: newVisible['Timestamp'] ?? false },
        ];
        localStorage.setItem('quote_column_settings', JSON.stringify(columnsToSave));
        window.dispatchEvent(new Event('storage'));
    };

    const handleStatusChange = async (id: string, newStatus: SalesQuote['status']) => {
        try {
            if (newStatus === 'Accepted') {
                await apiService.convertQuoteToOrder(id);
                setRefreshTrigger(prev => prev + 1);
                navigate('/sales-orders');
                return;
            }
            await apiService.updateQuoteStatus(id, newStatus);
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error('Failed to update status:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to update status: ${errorMessage}`);
        }
    };

    const copyToClipboard = (data: SalesQuote[]) => {
        const header = "Issue Date\tReference\tCustomer\tDescription\tAmount\tStatus\tTimestamp";
        const rows = data.map(q =>
            `${q.issueDate}\t${q.reference}\t${q.customer}\t${q.description || ''}\t${q.amount}\t${q.status}\t${q.timestamp || ''}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        const fallbackCopy = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        };

        if (!navigator.clipboard) {
            fallbackCopy(fullText);
            return;
        }

        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedNotification(true);
            setTimeout(() => setCopiedNotification(false), 2000);
        }).catch(() => {
            fallbackCopy(fullText);
        });
    };

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

    const handleCopyToClipboard = () => copyToClipboard(filteredData);

    const handleBatchCopy = () => {
        const selectedQuotes = quotes.filter(q => selectedIds.includes(q.id));
        copyToClipboard(selectedQuotes);
    };

    const filteredData = useMemo(() => {
        let result = [...quotes].filter(q => {
            // Filter out Expired quotes if status is Active
            if (q.status === 'Active' && q.issueDate && q.expiryDays) {
                try {
                    const [d, m, y] = q.issueDate.split('.');
                    if (d && m && y) {
                        const expDate = new Date(`${y}-${m}-${d}`);
                        expDate.setHours(23, 59, 59, 999);
                        expDate.setDate(expDate.getDate() + parseInt(q.expiryDays));
                        if (new Date() > expDate) return false;
                    }
                } catch (e) {
                    console.error('Date parsing failed for quote:', q.reference, e);
                }
            }
            return true;
        });
        if (customerName) {
            result = result.filter(q => q.customer.toLowerCase() === customerName.toLowerCase());
        }
        if (statusFilter !== 'All') {
            result = result.filter(q => q.status === statusFilter);
        } else {
            // Exclude Accepted and Rejected from the default "All" view
            result = result.filter(q => q.status !== 'Accepted' && q.status !== 'Rejected');
        }
        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(q =>
                q.customer.toLowerCase().includes(query) ||
                q.reference.toLowerCase().includes(query) ||
                q.status.toLowerCase().includes(query) ||
                (q as any).Division?.toLowerCase().includes(query) ||
                q.issueDate.toLowerCase().includes(query)
            );
        }
        return result.sort((a, b) => {
            let valA: any = a[sortColumn as keyof SalesQuote] || '';
            let valB: any = b[sortColumn as keyof SalesQuote] || '';
            if (sortColumn === 'Issue Date') {
                valA = (a.issueDate || '').split('.').reverse().join('-');
                valB = (b.issueDate || '').split('.').reverse().join('-');
            } else if (sortColumn === 'Amount') {
                valA = parseFloat(a.amount as any || 0);
                valB = parseFloat(b.amount as any || 0);
            } else if (sortColumn === 'Status') {
                valA = a.status;
                valB = b.status;
            } else if (sortColumn === 'Reference') {
                valA = a.reference;
                valB = b.reference;
            } else if (sortColumn === 'Customer') {
                valA = a.customer;
                valB = b.customer;
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [searchQuery, refreshTrigger, customerName, statusFilter, sortColumn, sortDirection, quotes]);

    const currencyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredData.forEach(q => {
            const curr = q.currency || 'ZMW';
            totals[curr] = (totals[curr] || 0) + (parseFloat(q.amount as any) || 0);
        });
        return totals;
    }, [filteredData]);

    const paginatedData = useMemo(() => {
        return filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredData, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

    const allColumns = [
        {
            id: 'Selection',
            header: (
                <div className="flex items-center justify-center -ml-1">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedIds(paginatedData.map((o: any) => o.id));
                                } else {
                                    setSelectedIds([]);
                                }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.length === paginatedData.length && paginatedData.length > 0 && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            ),
            accessor: (o: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(o.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(o.id)
                                        ? prev.filter(id => id !== o.id)
                                        : [...prev, o.id]
                                );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.includes(o.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            )
        },
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (o: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/sales-quotes/view/${o.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {perms?.edit !== false && (
                        <button
                            onClick={() => navigate(`/sales-quotes/edit/${o.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                            title="Edit Quote"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            id: 'Issue Date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Issue Date')}>Issue Date <SortIcon column="Issue Date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="font-medium text-[13px] text-slate-800 tracking-normal">{o.issueDate}</span>
            ),
            sortable: false
        },
        {
            id: 'Expiry Date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Expiry Date')}>Expiry Date <SortIcon column="Expiry Date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => {
                if (!o.issueDate || !o.expiryDays) return <span className="text-slate-400">—</span>;
                const [d, m, y] = o.issueDate.split('.');
                const date = new Date(`${y}-${m}-${d}`);
                date.setDate(date.getDate() + parseInt(o.expiryDays));
                const expiryStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
                return <span className="font-medium text-[13px] text-slate-800 tracking-normal">{expiryStr}</span>;
            },
            sortable: false
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            className: 'whitespace-nowrap min-w-[140px]',
            accessor: (o: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-medium text-slate-900 tracking-tight">{o.reference}</span>
                </div>
            ),
            sortable: false
        },

        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="font-medium text-slate-600">{typeof o.customer === 'string' ? o.customer : o.customer?.name || 'Unknown'}</span>
            ),
            sortable: false
        },
        {
            id: 'Description',
            header: 'Description',
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="text-slate-400 font-medium tracking-tight truncate max-w-[200px]" title={o.description}>{o.description || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Division',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Division')}>Division <SortIcon column="Division" /></div>,
            accessor: (o: any) => <span className="text-slate-600 font-medium text-[13px]">{o.Division}</span>,
            sortable: false
        },
        {
            id: 'Amount',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Amount')}>Amount <SortIcon column="Amount" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (o: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">{o.currency}</span>
                    <span className="font-black text-slate-900">
                        {parseFloat(o.amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Status',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Status')}>Status <SortIcon column="Status" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => {
                let displayStatus = o.status || 'Draft';
                let isExpired = false;

                if (displayStatus === 'Active' && o.issueDate && o.expiryDays) {
                    const [d, m, y] = o.issueDate.split('.');
                    const expDate = new Date(`${y}-${m}-${d}`);
                    expDate.setHours(23, 59, 59, 999); // End of the day
                    expDate.setDate(expDate.getDate() + parseInt(o.expiryDays));
                    if (new Date() > expDate) {
                        displayStatus = 'Expired';
                        isExpired = true;
                    }
                }

                return (
                    <div className="flex items-center gap-4">
                        <Badge variant={
                            isExpired ? 'danger' :
                                displayStatus === 'Active' || displayStatus === 'Accepted' ? 'success' :
                                    displayStatus === 'Pending Approval' ? 'warning' :
                                        displayStatus === 'Rejected' ? 'error' :
                                            displayStatus === 'Inactive' ? 'default' :
                                                'default'
                        } className="text-[10px]">
                            {displayStatus.toUpperCase()}
                        </Badge>
                        {displayStatus === 'Active' && perms?.edit !== false && !isExpired && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleStatusChange(o.id, 'Accepted')}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
                                    title="Accept Quote"
                                >
                                    <Check size={13} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => handleStatusChange(o.id, 'Rejected')}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-500 transition-all shadow-sm"
                                    title="Reject Quote"
                                >
                                    <X size={13} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            },
            sortable: false
        },
        {
            id: 'Timestamp',
            header: 'Timestamp',
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="text-[10px] text-slate-400 font-medium">{o.timestamp || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'TPIN',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('TPIN')}>TPIN <SortIcon column="TPIN" /></div>,
            accessor: (o: any) => <span className="text-slate-400 text-[11px] tabular-nums font-medium uppercase tracking-tight">{o.tpin || ''}</span>,
            sortable: false
        },
        {
            id: 'Days until Expiry',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Days until Expiry')}>Days to Expiry <SortIcon column="Days until Expiry" /></div>,
            accessor: (o: any) => {
                if (!o.issueDate || !o.expiryDays) return <span className="text-slate-400">—</span>;
                const [d, m, y] = o.issueDate.split('.');
                const expDate = new Date(`${y}-${m}-${d}`);
                expDate.setDate(expDate.getDate() + parseInt(o.expiryDays));
                const diffTime = expDate.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) return <span className="text-rose-500 font-bold uppercase text-[10px]">Expired</span>;
                if (diffDays === 0) return <span className="text-orange-500 font-bold uppercase text-[10px]">Today</span>;
                return <span className={`font-bold text-[11px] ${diffDays <= 3 ? 'text-amber-500' : 'text-slate-600'}`}>{diffDays} Days</span>;
            },
            sortable: false
        }
    ];

    const columns = useMemo(() => {
        let cols = allColumns.filter(col => visibleColumns[col.id]);

        if (isSelectionMode) {
            const selectionCol = allColumns.find(c => c.id === 'Selection');
            if (selectionCol && !cols.some(c => c.id === 'Selection')) {
                cols = [selectionCol, ...cols];
            }
        } else {
            cols = cols.filter(c => c.id !== 'Selection');
        }

        return cols;
    }, [visibleColumns, isSelectionMode, selectedIds, paginatedData]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 font-sans">
            {copiedNotification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-2xl z-[9999] animate-in slide-in-from-top-4 duration-500">
                    <p className="font-black uppercase tracking-widest text-[11px]">Data Copied to Clipboard</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">
                        <FileText size={14} />
                        <span className="text-gray-400">Commercial Operations</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Quotations</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and track your proposals</p>
                </div>

                <div className="flex items-center gap-3">
                    {perms?.add !== false && (
                        <button
                            onClick={() => navigate('/sales-quotes/new')}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center uppercase tracking-widest"
                        >
                            <Plus size={16} className="mr-2" /> CREATE NEW QUOTE
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters - Invoice Style */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, reference, or status..."
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
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Pending Approval">Pending</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Quotes</span>
                        <span className="text-[18px] font-black text-gray-900 leading-none">
                            {filteredData.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isSelectionMode && (
                <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8 max-w-[1200px]">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                            <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(`/sales-quotes/print-batch?ids=${selectedIds.join(',')}`)}
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Quotes</span>
                            </button>
                            <button
                                onClick={handleBatchCopy}
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Copy size={14} /> <span>Copy Details</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                        className="bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                    >
                        Reset Mode
                    </button>
                </div>
            )}

            {/* Table Container - Invoice Style */}
            <div className="w-fit min-w-full overflow-x-auto mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50 bg-white min-h-[400px] flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading quotations...</p>
                    </div>
                ) : paginatedData.length > 0 ? (
                    <DataTable
                        data={paginatedData}
                        columns={columns as any}
                        tableClassName="min-w-[1400px]"
                        className="border-none shadow-none bg-transparent"
                        hideDefaultPagination={true}
                        disableInternalScroll={true}
                        tableFooter={
                            <tr className="bg-slate-50/50">
                                {columns.map((col: any) => {
                                    if (col.id === 'Customer') {
                                        return (
                                            <td key={`total-label-${col.id}`} className="px-6 py-4 text-left">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Totals:</span>
                                            </td>
                                        );
                                    }
                                    if (col.id === 'Amount') {
                                        const activeCurs = Object.keys(currencyTotals).filter(cur => currencyTotals[cur] !== 0);
                                        return (
                                            <td key={col.id} className="px-6 py-4 text-right">
                                                <div className="flex flex-col gap-1">
                                                    {activeCurs.map(cur => (
                                                        <div key={cur} className="flex items-center justify-end gap-1.5">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">{cur}</span>
                                                            <span className="text-[12px] font-black text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                                                {currencyTotals[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    }
                                    return <td key={col.id} className="px-6 py-4"></td>;
                                })}
                            </tr>
                        }
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                            <FileText size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-900 font-black uppercase tracking-widest text-[13px]">No Quotations Found</p>
                            <p className="text-slate-400 text-xs font-medium mt-1">Try adjusting your filters or create a new proposal</p>
                        </div>
                        <button
                            onClick={() => navigate('/sales-quotes/new')}
                            className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all uppercase tracking-widest"
                        >
                            Create First Quote
                        </button>
                    </div>
                )}
            </div>

            {/* Management Card - Sales Order Style */}
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
                                    onClick={() => { navigate('/sales-quotes/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
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

export default SalesQuotesView;
