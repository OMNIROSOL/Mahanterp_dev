import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useShipmentStore } from '../store/shipmentStore';
import { useERPStore } from '../store/useERPStore';
import { ArrowLeft, Save, Ship, Plus, Trash2, CheckCircle } from 'lucide-react';
import apiService from '../services/apiService';

const NewShipmentView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { createShipment, updateShipment, shipments, isLoading } = useShipmentStore();
    const { orders, fetchAllData } = useERPStore();

    const initialState = (location.state as any) || {};

    const initialItems = initialState.po?.items ? initialState.po.items.map((item: any) => ({
        id: Math.random().toString(),
        purchaseOrderId: initialState.po.id,
        poReference: initialState.po.reference,
        itemId: item.item?.id || item.itemId || item.item,
        itemName: item.item?.itemName || item.itemName || (typeof item.item === 'string' ? item.item : ''),
        quantity: item.quantity,
        unitCost: item.unitPrice || item.unitCost || 0
    })) : [];

    const [formData, setFormData] = useState({
        reference: '',
        supplierId: initialState.supplierId || '',
        supplier: initialState.supplierName || '',
        status: 'Planned',
        eta: new Date().toISOString().split('T')[0],
        vesselName: '',
        description: '',
        countryOfOrigin: '',
        portOfArrival: '',
        finalDestination: '',
        delayDays: 0,
        expectedEta: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        blNumber: '',
        ctrNo: '',
        containers: [''],
        freight: 'Sea Freight',
        truckNumber: '',
        trucks: [''],
        items: initialItems
    });

    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [dbItems, setDbItems] = useState<any[]>([]);

    useEffect(() => {
        apiService.getSuppliers().then(setSuppliers).catch(console.error);
        apiService.getItems().then(setDbItems).catch(console.error);
    }, []);

    useEffect(() => {
        if (formData.supplier) {
            apiService.getPurchaseOrders().then(pos => {
                const openPOs = pos.filter((po: any) => po.supplier === formData.supplier || po.supplier?.name === formData.supplier);
                setPurchaseOrders(openPOs);
            }).catch(console.error);
        } else {
            setPurchaseOrders([]);
        }
    }, [formData.supplier]);

    const handleAddItem = (po: any, item: any) => {
        const qtyToAdd = item._qtyBalance !== undefined ? item._qtyBalance : (Number(item.qty) || 0);
        const itemId = item.item?.id || item.itemId || item.item;
        const resolvedName = item.item?.itemName || dbItems.find(it => it.id === itemId)?.itemName || item.itemName || (typeof item.item === 'string' ? item.item : '');
        const newItem = {
            id: Math.random().toString(),
            purchaseOrderId: po.id,
            poReference: po.reference,
            itemId: itemId,
            itemName: resolvedName,
            description: item.description,
            unitPrice: Number(item.unitPrice) || 0,
            qty: qtyToAdd,
            totalAmount: qtyToAdd * (Number(item.unitPrice) || 0),
            containerNo: formData.containers[0] || ''
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
    };

    const handleRemoveItem = (id: string) => {
        setFormData({ ...formData, items: formData.items.filter(i => i.id !== id) });
    };

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        if (id) {
            const existing = shipments.find(s => s.id === id);
            if (existing) {
                setFormData({
                    ...existing,
                    eta: existing.eta ? new Date(existing.eta).toISOString().split('T')[0] : '',
                    expectedEta: existing.expectedEta ? new Date(existing.expectedEta).toISOString().split('T')[0] : '',
                    containers: existing.ctrNo ? existing.ctrNo.split(',').map((c: string) => c.trim()).filter(Boolean) : [''],
                    trucks: existing.truckNumber ? existing.truckNumber.split(',').map((t: string) => t.trim()).filter(Boolean) : ['']
                } as any);
            }
        } else if (!formData.reference && !isLoading) {
            const maxRef = shipments.reduce((max, s) => {
                const match = s.reference?.match(/^SHP-(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    return num > max ? num : max;
                }
                return max;
            }, 0);
            setFormData(prev => ({
                ...prev,
                reference: `SHP-${String(maxRef + 1).padStart(4, '0')}`
            }));
        }
    }, [id, shipments, formData.reference, isLoading]);

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                ctrNo: formData.containers.filter(Boolean).join(', '),
                truckNumber: formData.trucks.filter(Boolean).join(', '),
                supplier: undefined,
                items: formData.items.map(i => ({
                    purchaseOrderId: i.purchaseOrderId,
                    itemId: i.itemId || i.item?.id,
                    description: i.description,
                    qty: i.qty,
                    unitPrice: i.unitPrice,
                    totalAmount: i.totalAmount,
                    containerNo: i.containerNo
                }))
            };
            delete payload.supplier;
            
            if (id) {
                await updateShipment(id, payload);
            } else {
                await createShipment(payload);
            }
            navigate('/shipment-planner');
        } catch (error) {
            alert('Failed to save shipment');
        }
    };

    const availablePOs = React.useMemo(() => {
        return purchaseOrders.map(po => {
            const availableItems = (po.items || []).map((item: any) => {
                const itemId = item.item?.id || item.itemId || item.item;
                const qtyOrdered = Number(item.qty) || 0;
                
                // Sum from other saved shipments
                const qtyPlannedSaved = (po.shipmentItems || []).reduce((s: number, i: any) => {
                    if (i.shipmentId === id || i.shipment?.id === id) return s; // exclude current shipment being edited
                    if (i.itemId === itemId || i.itemId === item.item) {
                        return s + (Number(i.qty) || 0);
                    }
                    return s;
                }, 0);

                // Sum from current formData
                const qtyPlannedCurrent = formData.items
                    .filter(i => i.purchaseOrderId === po.id && (i.itemId === itemId || i.itemId === item.item))
                    .reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

                const qtyPlannedTotal = qtyPlannedSaved + qtyPlannedCurrent;
                const qtyBalance = Math.max(0, qtyOrdered - qtyPlannedTotal);

                return {
                    ...item,
                    _qtyOrdered: qtyOrdered,
                    _qtyPlanned: qtyPlannedTotal,
                    _qtyBalance: qtyBalance
                };
            }).filter((item: any) => item._qtyBalance > 0);

            return {
                ...po,
                items: availableItems
            };
        }).filter(po => po.items.length > 0);
    }, [purchaseOrders, shipments, id, formData.items]);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans max-w-5xl mx-auto">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/shipment-planner')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                            <Ship size={14} />
                            <span>{id ? 'Edit Shipment' : 'New Shipment'}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{formData.reference}</h1>
                    </div>
                </div>
                <button
                    onClick={formData.status === 'Completed' ? undefined : handleSave}
                    disabled={formData.status === 'Completed'}
                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                        formData.status === 'Completed'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                >
                    <Save size={16} /> Save Shipment
                </button>
            </div>

            {formData.status === 'Completed' && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100 flex items-center gap-3 text-sm font-medium animate-in fade-in">
                    <CheckCircle size={20} />
                    This shipment has been fully received (Completed). Modifications are no longer allowed.
                </div>
            )}

            <fieldset disabled={formData.status === 'Completed'} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 block m-0 min-w-0">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b pb-4">Shipment Details</h2>
                <div className="space-y-8">
                    {/* General Information */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">General Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supplier</label>
                                <select
                                    value={formData.supplierId}
                                    onChange={e => {
                                        const sup = suppliers.find((s: any) => s.id === e.target.value);
                                        setFormData({ ...formData, supplierId: e.target.value, supplier: sup?.name || '' });
                                    }}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="">Select a supplier...</option>
                                    {suppliers?.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vessel Name</label>
                                <input
                                    type="text"
                                    value={formData.vesselName}
                                    onChange={e => setFormData({ ...formData, vesselName: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="e.g. MSC MAERSK"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Customs">Customs</option>
                                    <option value="Arrived">Arrived</option>
                                    <option value="Received">Received</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Planned ETA</label>
                                <input
                                    type="date"
                                    value={formData.eta}
                                    disabled={!!id}
                                    onChange={e => {
                                        const newEta = e.target.value;
                                        const dateObj = new Date(newEta);
                                        dateObj.setDate(dateObj.getDate() + (Number(formData.delayDays) || 0));
                                        setFormData({ ...formData, eta: newEta, expectedEta: dateObj.toISOString().split('T')[0] });
                                    }}
                                    className={`w-full border border-slate-200 rounded-lg p-2.5 text-sm ${id ? 'bg-slate-50 text-slate-500' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delay in ETA (Days)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.delayDays}
                                    onChange={e => {
                                        const days = parseInt(e.target.value) || 0;
                                        const dateObj = new Date(formData.eta);
                                        dateObj.setDate(dateObj.getDate() + days);
                                        setFormData({ ...formData, delayDays: days, expectedEta: dateObj.toISOString().split('T')[0] });
                                    }}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expected ETA</label>
                                <input
                                    type="date"
                                    value={formData.expectedEta}
                                    disabled
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 text-slate-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Route */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Route</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Country of Origin</label>
                                <select
                                    value={formData.countryOfOrigin || ''}
                                    onChange={e => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="">Select Country...</option>
                                    <option value="China">China</option>
                                    <option value="India">India</option>
                                    <option value="South Africa">South Africa</option>
                                    <option value="United Arab Emirates">United Arab Emirates</option>
                                    <option value="United Kingdom">United Kingdom</option>
                                    <option value="United States">United States</option>
                                    <option value="Germany">Germany</option>
                                    <option value="Kenya">Kenya</option>
                                    <option value="Tanzania">Tanzania</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Port of Arrival</label>
                                <select
                                    value={formData.portOfArrival || ''}
                                    onChange={e => setFormData({ ...formData, portOfArrival: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="">Select Port...</option>
                                    <option value="Dar es Salaam (Tanzania)">Dar es Salaam (Tanzania)</option>
                                    <option value="Beira (Mozambique)">Beira (Mozambique)</option>
                                    <option value="Durban (South Africa)">Durban (South Africa)</option>
                                    <option value="Walvis Bay (Namibia)">Walvis Bay (Namibia)</option>
                                    <option value="Mombasa (Kenya)">Mombasa (Kenya)</option>
                                    <option value="Air Freight (Airport)">Air Freight (Airport)</option>
                                    <option value="Road Freight (Border)">Road Freight (Border)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Final Destination</label>
                                <select
                                    value={formData.finalDestination || ''}
                                    onChange={e => setFormData({ ...formData, finalDestination: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="">Select Destination...</option>
                                    <option value="Lusaka">Lusaka</option>
                                    <option value="Ndola">Ndola</option>
                                    <option value="Kitwe">Kitwe</option>
                                    <option value="Chingola">Chingola</option>
                                    <option value="Solwezi">Solwezi</option>
                                    <option value="Livingstone">Livingstone</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Logistics */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Logistics Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex flex-col justify-end">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Number (INV)</label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber || ''}
                                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="e.g. INV-2024-001"
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bill of Lading (BL)</label>
                                <input
                                    type="text"
                                    value={formData.blNumber || ''}
                                    onChange={e => setFormData({ ...formData, blNumber: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                                    placeholder="e.g. BL-98765"
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transport Method (TPT)</label>
                                <select
                                    value={formData.freight || 'Sea Freight'}
                                    onChange={e => setFormData({ ...formData, freight: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                >
                                    <option value="Sea Freight">Sea Freight</option>
                                    <option value="Air Freight">Air Freight</option>
                                    <option value="Rail Freight">Rail Freight</option>
                                    <option value="Road Transport">Road Transport</option>
                                </select>
                            </div>
                            <div className="flex flex-col justify-end">
                                
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Container Numbers (CONT)</label>
                                <div className="space-y-3">
                                    {formData.containers.map((container, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={container}
                                                onChange={e => {
                                                    const newContainers = [...formData.containers];
                                                    newContainers[idx] = e.target.value;
                                                    // also update items that use this container name? Might be complex, keep simple for now
                                                    setFormData({ ...formData, containers: newContainers });
                                                }}
                                                className="w-full sm:w-1/3 border border-slate-200 rounded-lg p-2.5 text-sm"
                                                placeholder={`e.g. MSKU1234567 (Container ${idx + 1})`}
                                            />
                                            {idx === formData.containers.length - 1 ? (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({ ...formData, containers: [...formData.containers, ''] })}
                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    title="Add Container"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const newContainers = formData.containers.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, containers: newContainers.length ? newContainers : [''] });
                                                    }}
                                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Remove Container"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Truck Numbers</label>
                                <div className="space-y-3">
                                    {formData.trucks.map((truck, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={truck}
                                                onChange={e => {
                                                    const newTrucks = [...formData.trucks];
                                                    newTrucks[idx] = e.target.value;
                                                    setFormData({ ...formData, trucks: newTrucks });
                                                }}
                                                className="w-full sm:w-1/3 border border-slate-200 rounded-lg p-2.5 text-sm"
                                                placeholder={`e.g. ALB-1234-ZM (Truck ${idx + 1})`}
                                            />
                                            {idx === formData.trucks.length - 1 ? (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({ ...formData, trucks: [...formData.trucks, ''] })}
                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    title="Add Truck"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const newTrucks = formData.trucks.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, trucks: newTrucks.length ? newTrucks : [''] });
                                                    }}
                                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Remove Truck"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Add Items from POs</h2>
                    <p className="text-xs text-slate-500 mb-4">Select items from open purchase orders for this supplier to include in this shipment.</p>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Available PO Items</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {availablePOs.length === 0 ? (
                                    <p className="text-sm text-slate-400 p-4 border border-dashed rounded-lg text-center">No un-planned PO items found for this supplier.</p>
                                ) : (
                                    availablePOs.map(po => (
                                        <div key={po.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-2 font-bold text-sm text-slate-700 flex justify-between">
                                                <span>{po.reference}</span>
                                                <span className="text-slate-500 font-normal">{new Date(po.orderDate || po.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {po.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-800 mb-1">
                                                                {item.item?.itemName || dbItems.find(it => it.id === (item.item?.id || item.itemId || item.item))?.itemName || (typeof item.item === 'string' && item.item.length !== 36 ? item.item : 'Item')} - {item.unitPrice}
                                                            </p>
                                                            <div className="flex gap-3 text-[10px] font-medium text-slate-500">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] text-slate-400 uppercase">Ordered</span>
                                                                    <span>{item._qtyOrdered}</span>
                                                                </div>
                                                                <div className="flex flex-col border-l border-slate-200 pl-3">
                                                                    <span className="text-[8px] text-slate-400 uppercase">Planned</span>
                                                                    <span>{item._qtyPlanned}</span>
                                                                </div>
                                                                <div className="flex flex-col border-l border-slate-200 pl-3">
                                                                    <span className="text-[8px] text-slate-400 uppercase">Balance</span>
                                                                    <span className="text-indigo-600 font-bold">{item._qtyBalance}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleAddItem(po, item)}
                                                            className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors"
                                                            title="Add to Shipment"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Items in Shipment</h3>
                            <div className="bg-slate-50 rounded-xl p-4 min-h-[200px]">
                                {formData.items.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-10">No items added to shipment yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {formData.items.map(item => (
                                            <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-indigo-600 mb-1">{item.poReference || item.purchaseOrder?.reference}</p>
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {item.item?.itemName || dbItems.find(it => it.id === item.itemId)?.itemName || item.itemName || item.itemId}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Container:</span>
                                                        <select
                                                            value={item.containerNo || ''}
                                                            onChange={e => {
                                                                const newItems = formData.items.map(i => i.id === item.id ? { ...i, containerNo: e.target.value } : i);
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                            className="text-xs border border-slate-200 rounded py-1 px-2 max-w-[150px]"
                                                        >
                                                            <option value="">Unassigned</option>
                                                            {formData.containers.filter(Boolean).map((c, idx) => (
                                                                <option key={idx} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <input 
                                                            type="number" 
                                                            value={item.qty}
                                                            onChange={e => {
                                                                const newQty = Number(e.target.value);
                                                                const newItems = formData.items.map(i => i.id === item.id ? { ...i, qty: newQty, totalAmount: newQty * i.unitPrice } : i);
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                            className="w-20 text-right border border-slate-200 rounded p-1 text-sm"
                                                        />
                                                    </div>
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>
    );
};

export default NewShipmentView;
