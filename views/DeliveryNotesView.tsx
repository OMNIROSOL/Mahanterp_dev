import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { DeliveryNote } from '../types';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import DataTable from '../components/shared/DataTable';
import {
    Plus, Eye, Edit, FileText, Check, X, ChevronRight, ChevronLeft, Printer, Search,
    Copy, Share2, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import { cn } from '../utils/cn';

const DeliveryNotesView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [invoiceFilter, setInvoiceFilter] = useState('All'); // 'All', 'Invoiced', 'Uninvoiced'
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortColumn, setSortColumn] = useState<string>('Delivery date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const managementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getDeliveryNotes();
                const mappedData = data.map((dn: any) => ({
                    ...dn,
                    customer: dn.customer?.name || dn.customerName || 'Unknown',
                    deliveryDate: dn.deliveryDate ? new Date(dn.deliveryDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    orderNumber: dn.reference || '-',
                    deliveryAddress: dn.deliveryAddress || dn.customer?.deliveryAddress || dn.customer?.billingAddress || '-',
                    timestamp: dn.timestamp ? new Date(dn.timestamp).toLocaleString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true 
                    }).replace(/\//g, '.').replace(',', '') : '-',
                    status: dn.status || 'Pending'
                }));
                setDeliveryNotes(mappedData);
            } catch (err) {
                console.error('Failed to fetch delivery notes:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
        
        const handleRefresh = () => fetchNotes();
        window.addEventListener('delivery_notes_updated', handleRefresh);
        
        function handleClickOutside(event: MouseEvent) {
            if (managementRef.current && !managementRef.current.contains(event.target as Node)) {
                setIsManagementOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('delivery_notes_updated', handleRefresh);
        };
    }, [refreshTrigger]);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaultVisible: Record<string, boolean> = {
            'Actions': true,
            'Delivery date': true,
            'Reference': true,
            'Order number': true,
            'Invoice number': true,
            'Customer': true,
            'Inventory Location': false,
            'Description': false,
            'Qty delivered': true,
            'Delivery address': true,
            'Timestamp': false,
            'Status': true,
            'Copy To': true
        };

        const saved = localStorage.getItem('delivery_note_columns');
        if (saved) {
            const parsed = JSON.parse(saved);
            const record: Record<string, boolean> = { 'Actions': true };

            parsed.forEach((col: any) => {
                const mapping: Record<string, string> = {
                    'delivery date': 'Delivery date',
                    'reference': 'Reference',
                    'order number': 'Order number',
                    'invoice number': 'Invoice number',
                    'customer': 'Customer',
                    'inventory location': 'Inventory Location',
                    'description': 'Description',
                    'qty delivered': 'Qty delivered',
                    'delivery address': 'Delivery address',
                    'timestamp': 'Timestamp',
                    'status': 'Status',
                    'copy to': 'Copy To'
                };
                const normalizedId = mapping[col.id.toLowerCase()] || col.id;
                record[normalizedId] = col.visible;
            });
            return { ...defaultVisible, ...record };
        }
        return defaultVisible;
    });

    React.useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('delivery_note_columns');
            if (saved) {
                const parsed = JSON.parse(saved);
                const record: Record<string, boolean> = { 'Actions': true };

                parsed.forEach((col: any) => {
                    const mapping: Record<string, string> = {
                        'delivery date': 'Delivery date',
                        'reference': 'Reference',
                        'order number': 'Order number',
                        'invoice number': 'Invoice number',
                        'customer': 'Customer',
                        'inventory location': 'Inventory Location',
                        'description': 'Description',
                        'qty delivered': 'Qty delivered',
                        'timestamp': 'Timestamp',
                        'status': 'Status',
                        'copy to': 'Copy To'
                    };
                    const normalizedId = mapping[col.id.toLowerCase()] || col.id;
                    record[normalizedId] = col.visible;
                });
                setVisibleColumns(prev => ({ ...prev, ...record }));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleColumnVisibility = (id: string) => {
        const newVisible = { ...visibleColumns, [id]: !visibleColumns[id] };
        setVisibleColumns(newVisible);

        const columnsToSave = [
            { id: 'Delivery date', label: 'Delivery date', visible: newVisible['Delivery date'] ?? true },
            { id: 'Reference', label: 'Reference', visible: newVisible['Reference'] ?? true },
            { id: 'Order number', label: 'Order number', visible: newVisible['Order number'] ?? true },
            { id: 'Invoice number', label: 'Invoice number', visible: newVisible['Invoice number'] ?? false },
            { id: 'Customer', label: 'Customer', visible: newVisible['Customer'] ?? true },
            { id: 'Inventory Location', label: 'Inventory Location', visible: newVisible['Inventory Location'] ?? false },
            { id: 'Description', label: 'Description', visible: newVisible['Description'] ?? false },
            { id: 'Qty delivered', label: 'Qty delivered', visible: newVisible['Qty delivered'] ?? true },
            { id: 'Timestamp', label: 'Timestamp', visible: newVisible['Timestamp'] ?? false },
            { id: 'Status', label: 'Status', visible: newVisible['Status'] ?? true }
        ];
        localStorage.setItem('delivery_note_columns', JSON.stringify(columnsToSave));
        window.dispatchEvent(new Event('storage'));
    };

    const [visibleLineColumns, setVisibleLineColumns] = useState<Record<string, boolean>>({
        'Item': false,
        'Qty': false,
        'Item Description': false
    });

    const copyToClipboard = (data: DeliveryNote[]) => {
        const header = "Delivery Date\tReference\tOrder Number\tInvoice Number\tCustomer\tLocation\tDescription\tStatus\tQty Delivered";
        const rows = data.map(note => {
            const qty = note.items?.reduce((sum: number, it: any) => sum + parseFloat(it.qty || '0'), 0) || 0;
            return `${note.deliveryDate}\t${note.reference}\t${note.orderNumber || note.salesOrder || ''}\t${note.invoiceNumber || ''}\t${note.customer}\t${note.inventoryLocation || ''}\t${note.description || ''}\t${note.status || 'Pending'}\t${qty}`;
        }).join('\n');

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

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiService.updateDeliveryNoteStatus(id, newStatus);
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error('Failed to update status:', err);
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to update status: ${msg}`);
        }
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

    const handleBatchCopy = () => {
        const selectedNotes = deliveryNotes.filter(n => selectedIds.includes(n.id));
        copyToClipboard(selectedNotes);
    };

    const filteredData = useMemo(() => {
        let result = [...deliveryNotes];

        if (customerName) {
            result = result.filter(note => note.customer.toLowerCase() === customerName.toLowerCase());
        }

        if (statusFilter !== 'All') {
            result = result.filter(note => (note.status || 'Pending') === statusFilter);
        } else {
            // "once delivered it will remove from delivery note"
            // By default (All), we only show non-delivered notes.
            result = result.filter(note => (note.status || 'Pending') !== 'Delivered');
        }

        if (invoiceFilter !== 'All') {
            if (invoiceFilter === 'Invoiced') {
                result = result.filter(note => note.invoiceNumber && note.invoiceNumber.trim() !== '');
            } else if (invoiceFilter === 'Uninvoiced') {
                result = result.filter(note => !note.invoiceNumber || note.invoiceNumber.trim() === '');
            }
        }

        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(note =>
                note.customer.toLowerCase().includes(query) ||
                note.reference.toLowerCase().includes(query) ||
                (note.description && note.description.toLowerCase().includes(query)) ||
                (note.orderNumber && note.orderNumber.toLowerCase().includes(query)) ||
                (note.invoiceNumber && note.invoiceNumber.toLowerCase().includes(query))
            );
        }

        return result.sort((a, b) => {
            let valA: any = a[sortColumn as keyof DeliveryNote] || '';
            let valB: any = b[sortColumn as keyof DeliveryNote] || '';

            if (sortColumn === 'Delivery date') {
                valA = (a.deliveryDate || '').split('.').reverse().join('-');
                valB = (b.deliveryDate || '').split('.').reverse().join('-');
            } else if (sortColumn === 'Qty delivered') {
                valA = a.items?.reduce((sum: number, it: any) => sum + parseFloat(it.qty || '0'), 0) || 0;
                valB = b.items?.reduce((sum: number, it: any) => sum + parseFloat(it.qty || '0'), 0) || 0;
            } else if (sortColumn === 'Status') {
                valA = a.status || 'Pending';
                valB = b.status || 'Pending';
            } else if (sortColumn === 'Order number') {
                valA = a.orderNumber || a.salesOrder || '';
                valB = b.orderNumber || b.salesOrder || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [searchQuery, deliveryNotes, customerName, statusFilter, sortColumn, sortDirection, invoiceFilter]);

    const isLineLevel = useMemo(() => Object.values(visibleLineColumns).some(v => v), [visibleLineColumns]);

    const displayData = useMemo(() => {
        let base = filteredData;
        if (isLineLevel) {
            base = filteredData.flatMap(note => {
                if (!note.items || note.items.length === 0) {
                    return [{ ...note, _isLine: true, _itemData: null }];
                }
                return note.items.map(item => ({
                    ...note,
                    _isLine: true,
                    _itemData: item
                }));
            });
        }
        return base;
    }, [filteredData, isLineLevel]);

    const paginatedData = useMemo(() => {
        return displayData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [displayData, currentPage, pageSize]);

    const totalPages = Math.ceil(displayData.length / pageSize) || 1;

    const currentTotalQty = useMemo(() => {
        return paginatedData.reduce((total, row: any) => {
            if (row._isLine) {
                return total + parseFloat(row._itemData?.qty || '0');
            } else {
                return total + (row.items?.reduce((sum: number, it: any) => sum + parseFloat(it.qty || '0'), 0) || 0);
            }
        }, 0);
    }, [paginatedData]);

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
            accessor: (note: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(note.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(note.id)
                                        ? prev.filter(id => id !== note.id)
                                        : [...prev, note.id]
                                );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.includes(note.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            )
        },
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (note: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/delivery-notes/view/${note.id}`)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => navigate(`/delivery-notes/edit/${note.id}`)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                        title="Edit Note"
                    >
                        <Edit size={16} />
                    </button>
                </div>
            )
        },
        {
            id: 'Delivery date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Delivery date')}>Delivery Date <SortIcon column="Delivery date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (note: any) => (
                <div className="flex flex-col">
                    <span className="font-medium text-[13px] text-slate-800 tracking-normal">{note.deliveryDate || (note.timestamp ? new Date(note.timestamp).toLocaleDateString('en-GB').replace(/\//g, '.') : '-')}</span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            className: 'whitespace-nowrap min-w-[140px]',
            accessor: (note: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-medium text-slate-900 tracking-tight">{note.reference}</span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Order number',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Order number')}>Order Number <SortIcon column="Order number" /></div>,
            className: 'whitespace-nowrap',
            accessor: (note: any) => (
                <span className="text-slate-600 font-medium">{note.orderNumber || note.salesOrder || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Invoice number',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Invoice number')}>Invoice Number <SortIcon column="Invoice number" /></div>,
            className: 'whitespace-nowrap',
            accessor: (note: any) => (
                <span className="text-slate-600 font-medium">{note.invoiceNumber || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Delivery address',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Delivery address')}>Delivery Address <SortIcon column="Delivery address" /></div>,
            className: 'min-w-[200px]',
            accessor: (note: any) => (
                <span className="text-slate-500 font-medium tracking-tight truncate max-w-[200px]" title={note.deliveryAddress}>{note.deliveryAddress || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            className: 'min-w-[200px]',
            accessor: (note: any) => (
                <span className="font-medium text-slate-600">{note.customer}</span>
            ),
            sortable: false
        },
        {
            id: 'Inventory Location',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Inventory Location')}>Location <SortIcon column="Inventory Location" /></div>,
            accessor: (note: any) => (
                <span className="text-slate-500 font-medium">{note.inventoryLocation || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Description',
            header: 'Description',
            className: 'min-w-[200px]',
            accessor: (note: any) => (
                <span className="text-slate-400 font-medium tracking-tight truncate max-w-[200px]" title={note.description}>{note.description || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Qty delivered',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Qty delivered')}>Qty Delivered <SortIcon column="Qty delivered" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (note: any) => {
                const qty = note.items?.reduce((sum: number, it: any) => sum + parseFloat(it.qty || '0'), 0) || 0;
                return (
                    <div className="text-right">
                        <span className="font-black text-slate-900 tabular-nums">
                            {qty.toLocaleString()}
                        </span>
                    </div>
                );
            },
            sortable: false
        },
        {
            id: 'Status',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Status')}>Status <SortIcon column="Status" /></div>,
            className: 'whitespace-nowrap',
            accessor: (note: any) => {
                const statusStr = note.status || 'Pending';
                const statusStyles: Record<string, string> = {
                    'Delivered': 'bg-blue-50 text-blue-600 border-blue-100',
                    'Pending': 'bg-amber-50 text-amber-600 border-amber-100',
                    'Cancelled': 'bg-rose-50 text-rose-600 border-rose-100'
                };
                return (
                    <div className="relative group/status">
                        <select
                            value={statusStr}
                            onChange={(e) => handleStatusChange(note.id, e.target.value)}
                            className={cn(
                                "appearance-none font-black uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all",
                                statusStyles[statusStr] || statusStyles['Pending']
                            )}
                        >
                            <option value="Pending" className="bg-white text-slate-800">Pending</option>
                            <option value="Delivered" className="bg-white text-slate-800">Delivered</option>
                            <option value="Cancelled" className="bg-white text-slate-800">Cancelled</option>
                        </select>
                        <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/status:opacity-50 transition-opacity" />
                    </div>
                );
            },
            sortable: false
        },
        {
            id: 'Copy To',
            header: 'Copy To',
            accessor: (note: any) => (
                <div className="relative group/copyto">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                        <Copy size={12} />
                        <span className="hidden group-hover/copyto:inline">Copy</span>
                    </button>
                    <div className="absolute left-0 bottom-full mb-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-[100] opacity-0 invisible group-hover/copyto:opacity-100 group-hover/copyto:visible transition-all">
                        {[
                            { label: 'Sales Invoice', path: '/sales-invoices/new' },
                            { label: 'Credit Note', path: '/credit-notes/new' },
                            { label: 'Sales Order', path: '/sales-orders/new' }
                        ].map(item => (
                            <button
                                key={item.label}
                                onClick={() => navigate(`${item.path}?copyFrom=${note.id}`)}
                                className="w-full text-left px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >
                                New {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'Timestamp',
            header: 'Timestamp',
            className: 'whitespace-nowrap',
            accessor: (note: any) => (
                <span className="text-[10px] text-slate-400 font-medium">{note.timestamp || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Item',
            header: 'Item',
            accessor: (note: any) => (
                <span className="font-bold text-slate-900">{note._itemData?.item?.itemName || note._itemData?.item || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Qty',
            header: 'Qty',
            accessor: (note: any) => (
                <span className="font-medium text-slate-600 tabular-nums">{note._itemData?.qty || '—'}</span>
            ),
            sortable: false
        },
        {
            id: 'Item Description',
            header: 'Item Description',
            accessor: (note: any) => (
                <span className="text-slate-400 font-medium truncate max-w-[200px]">{note._itemData?.description || '—'}</span>
            ),
            sortable: false
        }
    ];

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
    }, [visibleColumns, visibleLineColumns, isSelectionMode, selectedIds, displayData]);

    return (
        <div className="p-8 space-y-8 w-full animate-in fade-in duration-700 relative">
            {copiedNotification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] animate-in slide-in-from-top-4 fade-in duration-500 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-[0.2em] text-[11px] text-white">Export Successful</p>
                            <p className="text-[10px] text-slate-400 font-bold">Delivery data copied to system clipboard</p>
                        </div>
                    </div>
                </div>
            )}

            {customerName && (
                <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span
                        onClick={() => navigate('/customers')}
                        className="text-blue-500 hover:underline cursor-pointer"
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
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-1">
                        <FileText size={14} strokeWidth={2.5} />
                        <ChevronRight size={10} className="opacity-30" />
                        <span className="text-gray-400">Logistics & Fulfillment</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Delivery Notes</h1>
                    <p className="text-gray-500 text-sm">Manage and track your customer shipments</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/delivery-notes/new')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={16} className="mr-2" /> NEW DELIVERY NOTE
                    </button>
                </div>
            </div>

            {/* Filtration Row */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by customer, reference, order number..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
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
                        <option value="Delivered">Delivered</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    <select
                        value={invoiceFilter}
                        onChange={(e) => {
                            setInvoiceFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300"
                    >
                        <option value="All">All Invoices</option>
                        <option value="Invoiced">Invoiced</option>
                        <option value="Uninvoiced">Uninvoiced</option>
                    </select>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Volumes</span>
                        <span className="text-[18px] font-bold text-gray-900 leading-none">
                            {displayData.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isSelectionMode && (
                <div className="bg-blue-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-blue-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                            <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(`/delivery-notes/print-batch?ids=${selectedIds.join(',')}`)}
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Notes</span>
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
                        className="bg-white text-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                    >
                        Reset Mode
                    </button>
                </div>
            )}

            {/* Main Content Card */}
            <div className="w-fit min-w-full overflow-x-auto mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                <DataTable
                    data={isLoading ? [] : paginatedData}
                    columns={columns as any}
                    tableClassName="min-w-[2000px]"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    emptyState={
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching delivery notes...</p>
                            </div>
                        ) : undefined
                    }
                    tableFooter={
                        <tr>
                            {columns.map((col: any) => {
                                if (col.id === 'Selection' || col.id === 'Actions') {
                                    return <td key={`footer-${col.id}`} className="px-6 py-4"></td>;
                                }

                                if (col.id === 'Qty delivered') {
                                    return (
                                        <td key={`total-${col.id}`} className="px-6 py-3 whitespace-nowrap text-right bg-slate-50/50">
                                            <div className="flex flex-col gap-1 items-end">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">TTL QTY</span>
                                                    <span className="text-[12px] font-black tracking-tight text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 tabular-nums">
                                                        {currentTotalQty.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    );
                                }

                                if (col.id === 'Customer') {
                                    return (
                                        <td key={`total-label-${col.id}`} className="px-6 py-4 text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Totals:</span>
                                        </td>
                                    );
                                }

                                return <td key={`total-spacer-${col.id}`} className="px-6 py-4"></td>;
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
                        <span className="mx-2 text-slate-700 font-bold uppercase tracking-widest text-[10px]">Page {currentPage} of {totalPages || 1}</span>
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
                        onClick={handleBatchCopy}
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={13} /> Export Data
                    </button>

                    <div className="relative" ref={managementRef}>
                        <button
                            onClick={() => setIsManagementOpen(!isManagementOpen)}
                            className="px-4 py-2 bg-blue-600 text-[11px] font-bold text-white rounded-md hover:bg-blue-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                        >
                            Management {isManagementOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                        </button>

                        {isManagementOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left">
                                <button
                                    onClick={() => { navigate('/delivery-notes/edit-columns'); setIsManagementOpen(false); }}
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
                                        setIsManagementOpen(false);
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

export default DeliveryNotesView;
