import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipmentStore } from '../store/shipmentStore';
import DataTable from '../components/shared/DataTable';
import { Ship, Plus, Search, Eye, Edit } from 'lucide-react';

const ShipmentPlannerView = () => {
    const navigate = useNavigate();
    const { shipments, fetchShipments, isLoading } = useShipmentStore();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchShipments();
    }, [fetchShipments]);

    const filteredData = useMemo(() => {
        return shipments.filter((s: any) => 
            s.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [shipments, searchQuery]);

    const columns = [
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (s: any) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/shipment-planner/view/${s.id}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={14} /></button>
                    {s.status !== 'Completed' && (
                        <button onClick={() => navigate(`/shipment-planner/edit/${s.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14} /></button>
                    )}
                </div>
            )
        },
        { id: 'Reference', header: 'Reference', accessor: (s: any) => <span className="font-bold text-slate-900">{s.reference}</span> },
        { id: 'Supplier', header: 'Supplier', accessor: (s: any) => s.supplier?.name || s.supplierId },
        { id: 'ETA', header: 'ETA', accessor: (s: any) => new Date(s.eta).toLocaleDateString() },
        { id: 'Vessel', header: 'Vessel', accessor: (s: any) => s.vesselName || '—' },
        { id: 'Status', header: 'Status', accessor: (s: any) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.status}</span> },
    ];

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 min-w-[1200px] font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        <Ship size={14} />
                        <span className="text-gray-400">Logistics Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Shipment Planner</h1>
                    <p className="text-gray-500 text-sm">Plan and track incoming shipments.</p>
                </div>
                <button
                    onClick={() => navigate('/shipment-planner/new')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 shadow-lg flex items-center"
                >
                    <Plus size={16} className="mr-2" /> PLAN SHIPMENT
                </button>
            </div>

            <div className="mt-8 flex items-center gap-6">
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search shipments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <DataTable
                    data={isLoading ? [] : filteredData}
                    columns={columns as any}
                    emptyMessage={
                        isLoading ? <p className="py-10 text-center">Loading...</p> : <p className="py-10 text-center">No shipments found.</p>
                    }
                />
            </div>
        </div>
    );
};

export default ShipmentPlannerView;
