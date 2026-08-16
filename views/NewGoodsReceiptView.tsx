import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { getApiBaseUrl } from '../utils/apiConfig';
import {
    FileText,
    ChevronRight,
    CheckCircle2,
    Plus,
    Trash2,
    Copy,
    User,
    X,
    Search,
    AlertTriangle,
    Package,
    Calendar,
    Save,
    ChevronDown,
    ChevronUp,
    Hash,
    Briefcase,
    Settings,
    MapPin
} from 'lucide-react';
import { cn } from '../utils/cn';

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

const NewGoodsReceiptView = () => {
    const { id } = useParams();
    const isEditing = Boolean(id);
    const navigate = useNavigate();
    const location = useLocation();
    const dateInputRef = useRef<HTMLInputElement>(null);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState('');
    const [inventoryLocation, setInventoryLocation] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [items, setItems] = useState([{ id: Date.now(), item: '', description: '', qty: '1' }]);
    const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
    const [existingGrnStatus, setExistingGrnStatus] = useState<string>('');
    
    const [sourceDocItems, setSourceDocItems] = useState<any[]>([]);
    const [sourceType, setSourceType] = useState<string>('');
    const [selectedContainer, setSelectedContainer] = useState<string>('');

    const [dbSuppliers, setDbSuppliers] = useState<any[]>([]);
    const [dbItems, setDbItems] = useState<any[]>([]);
    const [dbFooters, setDbFooters] = useState<any[]>([]);
    const [dbDivisions, setDbDivisions] = useState<any[]>([]);
    const [showOptionsArea, setShowOptionsArea] = useState(false);

    const [options, setOptions] = useState({
        lineNumber: false,
        customTitle: false,
        customTitleValue: 'Goods Received Note',
        footers: false,
        footerValue: 'Received in good condition.',
        attachments: [] as any[]
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [sups, itemsData, footersData, divisionsData] = await Promise.all([
                    apiService.getSuppliers(),
                    apiService.getItems(),
                    apiService.getFooters().catch(() => []),
                    apiService.getDivisions().catch(() => [])
                ]);
                setDbSuppliers(sups);
                setDbItems(itemsData);
                setDbFooters(footersData);
                setDbDivisions(divisionsData);

                  if (!id) {
                      const nextRef = await apiService.getNextReference('goods-received-note');
                      setReference(nextRef);
                  }
            } catch (err) {
                console.error('Failed to load goods receipt data:', err);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (id) {
            const fetchGrn = async () => {
                try {
                    const grn = await apiService.getGoodsReceivedNote(id);
                    if (grn) {
                        let initialDate = new Date().toISOString().split('T')[0];
                        if (grn.receivedDate) {
                            const dottedPattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
                            if (dottedPattern.test(grn.receivedDate)) {
                                const [day, month, year] = grn.receivedDate.split('.');
                                initialDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                const d = new Date(grn.receivedDate);
                                if (!isNaN(d.getTime())) {
                                    initialDate = d.toISOString().split('T')[0];
                                }
                            }
                        }
                        setDate(initialDate);
                        setExistingGrnStatus(grn.status || '');
                        setSupplier(grn.supplierName || grn.supplier || '');
                        setInventoryLocation(grn.inventoryLocation || 'Default Inventory Location');
                        setDescription(grn.description || '');
                        setReference(grn.reference || '');
                        setPurchaseOrderId(grn.purchaseOrderId || null);
                        setUseManualRef(true);
                        if (grn.items) {
                            setItems(grn.items.map((i: any) => ({
                                id: i.id || (Date.now() + Math.random()),
                                item: i.item?.itemName || i.itemName || i.item || '',
                                description: i.description || '',
                                qty: (i.qty || '1').toString()
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch Goods Received Note:', err);
                }
            };
            fetchGrn();
        }
    }, [id]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const copyFromId = searchParams.get('copyFrom');

        if (copyFromId) {
            const fetchSource = async () => {
                try {
                    let sourceDoc: any = null;
                    try {
                        sourceDoc = await apiService.getPurchaseOrder(copyFromId);
                        setPurchaseOrderId(sourceDoc.id);
                    } catch (e) {
                        try {
                            sourceDoc = await apiService.getPurchaseEnquiry(copyFromId);
                        } catch (e2) {
                            try {
                                sourceDoc = await apiService.getOrder(copyFromId);
                                setSourceType('order');
                            } catch (e3) {
                                try {
                                    sourceDoc = await apiService.getPurchaseInvoice(copyFromId);
                                    setSourceType('invoice');
                                } catch (e4) {
                                    sourceDoc = await apiService.getProcurementShipment(copyFromId);
                                    setSourceType('shipment');
                                }
                            }
                        }
                    }

                    if (sourceDoc) {
                        if (sourceDoc.items && sourceDoc.items.length > 0 && sourceDoc.items[0].purchaseOrderId) {
                            setPurchaseOrderId(sourceDoc.items[0].purchaseOrderId);
                        }
                        
                        setSupplier(sourceDoc.supplier?.name || sourceDoc.supplierName || sourceDoc.supplier || '');
                        setDescription(`Received items for ${sourceDoc.reference}`);
                        
                        if (sourceDoc.items) {
                            let itemsToCopy = sourceDoc.items;
                            try {
                                const allGrns = await apiService.getGoodsReceivedNotes();
                                const relatedGrns = allGrns.filter((g: any) => g.description && g.description.includes(sourceDoc.reference));
                                const receivedItemIds = new Set<string>();
                                relatedGrns.forEach((g: any) => g.items?.forEach((i: any) => {
                                    if (i.itemId) receivedItemIds.add(i.itemId);
                                }));
                                itemsToCopy = sourceDoc.items.filter((i: any) => {
                                    const itemId = i.itemId || i.item?.id;
                                    return !receivedItemIds.has(itemId);
                                });
                            } catch (e) {
                                console.error('Failed to filter received items:', e);
                            }

                            if (itemsToCopy.length === 0) {
                                alert('All items from this shipment have already been received.');
                            }

                            const newItems = itemsToCopy.map((i: any) => ({
                                id: Date.now() + Math.random(),
                                item: i.item?.itemName || i.itemName || i.item || '',
                                description: i.description || i.item?.description || '',
                                qty: (i.qty || '1').toString(),
                                containerNo: i.containerNo || ''
                            }));
                            setItems(newItems);
                            setSourceDocItems(newItems);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load source for goods receipt:', err);
                }
            };
            fetchSource();
        }
    }, [location.search]);

    const availableContainers = useMemo(() => {
        if (sourceType !== 'shipment') return [];
        const containers = new Set<string>();
        sourceDocItems.forEach(item => {
            if (item.containerNo) containers.add(item.containerNo);
        });
        return Array.from(containers);
    }, [sourceDocItems, sourceType]);

    useEffect(() => {
        if (selectedContainer) {
            setItems(sourceDocItems.filter(item => item.containerNo === selectedContainer));
            setDescription(prev => {
                const base = prev.split(' - Container: ')[0];
                return `${base} - Container: ${selectedContainer}`;
            });
        } else if (sourceDocItems.length > 0) {
            setItems(sourceDocItems);
            setDescription(prev => prev.split(' - Container: ')[0]);
        }
    }, [selectedContainer, sourceDocItems]);

    const updateItem = (itemId: number, field: string, value: string) => {
        setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };

    const addLine = () => setItems([...items, { id: Date.now(), item: '', description: '', qty: '1' }]);
    const copyLine = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (item) setItems([...items, { ...item, id: Date.now() + Math.random() }]);
    };
    const deleteLine = (itemId: number) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== itemId));
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async () => {
        if (!supplier) {
            alert('Please select a supplier');
            return;
        }

        const selectedSupplier = dbSuppliers.find(s => s.name === supplier);
        if (!selectedSupplier) {
            alert('Invalid supplier');
            return;
        }

        const grnItems = items.filter(i => i.item).map(i => {
            const dbItem = dbItems.find(di => di.itemName === i.item);
            return {
                itemId: dbItem?.id,
                description: i.description || i.item,
                qty: parseFloat(i.qty) || 0
            };
        });

        if (grnItems.length === 0) {
            alert('Please add at least one item');
            return;
        }

        setIsSubmitting(true);
        try {
            const grnData = {
                supplierId: selectedSupplier.id,
                purchaseOrderId: purchaseOrderId,
                reference: reference,
                receivedDate: date,
                description: description,
                inventoryLocation: inventoryLocation,
                items: grnItems,
                status: isEditing && existingGrnStatus ? existingGrnStatus : 'Draft'
            };

            if (isEditing && id) {
                await apiService.updateGoodsReceivedNote(id, grnData);
            } else {
                await apiService.createGoodsReceivedNote(grnData);
            }
            window.dispatchEvent(new Event('grn_updated'));
            navigate('/goods-received-notes');
        } catch (err: any) {
            console.error('Failed to save GRN:', err);
            alert('Error: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/goods-received-notes')}>Goods Received Notes</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{isEditing ? 'Edit Existing' : 'Configure New'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{isEditing ? 'Modify Goods Receipt' : 'New Goods Receipt'}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/goods-received-notes')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <InputField label="Received Date" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} Icon={Calendar} />
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
                                <SelectField label="Inventory Location" value={inventoryLocation} onChange={(e: any) => setInventoryLocation(e.target.value)} Icon={MapPin}>
                                    <option value="">Select Location...</option>
                                    {dbDivisions.map(div => (
                                        <option key={div.id} value={div.name}>{div.name}</option>
                                    ))}
                                    {inventoryLocation && !dbDivisions.find(d => d.name === inventoryLocation) && (
                                        <option value={inventoryLocation}>{inventoryLocation}</option>
                                    )}
                                </SelectField>
                                <InputField label="Description / Memo" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Memo or remarks..." Icon={Briefcase} />
                                {availableContainers.length > 0 && (
                                    <SelectField label="Filter by Container" value={selectedContainer} onChange={(e: any) => setSelectedContainer(e.target.value)} Icon={Package}>
                                        <option value="">All Containers</option>
                                        {availableContainers.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </SelectField>
                                )}
                            </div>
                        </div>

                        {/* Supplier Selection */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                    <User size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Supplier Selection</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <SelectField label="Selected Supplier" value={supplier} onChange={(e: any) => setSupplier(e.target.value)} Icon={User}>
                                    <option value="">Select Target Supplier...</option>
                                    {dbSuppliers.filter(s => (!s.inactive && s.status !== 'Inactive') || s.name === supplier).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </SelectField>
                            </div>
                        </div>

                        {/* Received Items */}
                        <div className="space-y-6 pt-0 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                        <Package size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Received Line Items</h2>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => {
                                        const ref = prompt("Enter Shipment ID to copy from:");
                                        const API_BASE_URL = getApiBaseUrl();
                                        if (ref) {
                                            fetch(`${API_BASE_URL}/procurement/shipments/${ref}`)
                                                .then(r => r.json())
                                                .then(data => {
                                                    if(data && data.items) {
                                                        const newItems = data.items.map((i: any) => ({
                                                            id: Math.random(),
                                                            item: i.item?.itemName || i.itemName || i.itemId || '',
                                                            description: i.description || i.item?.description || '',
                                                            qty: i.qty?.toString() || '1'
                                                        }));
                                                        setItems(newItems);
                                                        setSupplier(data.supplier || data.supplierId);
                                                    }
                                                }).catch(() => alert('Shipment not found'));
                                        }
                                    }} className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                                        <Copy size={14} /> <span>Copy from Shipment</span>
                                    </button>
                                    <button onClick={addLine} className="flex items-center space-x-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all">
                                        <Plus size={14} /> <span>Add Row</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {options.lineNumber && <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>}
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">ITEM</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-36 text-right">QTY RECEIVED</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                {options.lineNumber && <td className="px-4 py-4 text-xs font-bold text-slate-400 text-center">{index + 1}</td>}
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={item.item}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const selectedDbItem = dbItems.find(it => it.itemName === val);
                                                            const newDesc = selectedDbItem?.description || '';
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, item: val, description: newDesc } : i));
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#2563eb] outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Select Item</option>
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
                                                <td className="px-4 py-4 text-right">
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
                                                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter flex items-center justify-end w-full">
                                                            <span className="text-indigo-500 font-black">{dbItems.find(it => it.itemName === item.item)?.unit || 'PCS'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => copyLine(item.id)}
                                                            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                            title="Duplicate Row"
                                                        >
                                                            <Copy size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteLine(item.id)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                            title="Delete Row"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Collapsible Options Drawer */}
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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showOptionsArea ? 'Hide configuration' : 'Configure layout settings'}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100/50 transition-all">
                                    <ChevronDown size={20} className={cn("transition-transform duration-300", showOptionsArea ? "rotate-180" : "")} />
                                </div>
                            </div>

                            {showOptionsArea && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                                    {([
                                        ['Line Numbers', 'lineNumber'],
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
                                            {key === 'customTitle' && options.customTitle && (
                                                <div className="flex items-center space-x-2 ml-4 animate-in slide-in-from-top-2 duration-300">
                                                    <input
                                                        type="text"
                                                        value={options.customTitleValue}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, customTitleValue: e.target.value }))}
                                                        placeholder="e.g. Goods Received Note"
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
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none animate-in fade-in"
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

                        {/* Drag and Drop Attachments */}
                        <div className="pt-8 border-t border-slate-50">
                            <div className="space-y-3 max-w-md">
                                <div className="flex items-center space-x-2.5 mb-1 opacity-60">
                                    <FileText size={14} className="text-slate-400" />
                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentation Attachments</h3>
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
                                                {(options.attachments || []).length === 0 ? 'Attach Delivery Docket' : `${(options.attachments || []).length} Files Attached`}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
                                                Dockets, images or scans
                                            </p>
                                        </div>
                                    </label>
                                </div>
                                
                                {/* File list */}
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

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-4 pt-8 border-t border-slate-50">
                            <button
                                onClick={() => navigate('/goods-received-notes')}
                                className="bg-white border border-slate-200 rounded-2xl px-8 py-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-12 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={14} />
                                {isSubmitting ? 'Saving...' : isEditing ? 'Update GRN' : 'Save GRN'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewGoodsReceiptView;
