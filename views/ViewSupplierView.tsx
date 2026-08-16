import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Edit, ChevronRight, LayoutGrid, Printer, FileText, Mail, Copy, ChevronLeft, ChevronsLeft, ChevronsRight, FolderOpen, Building2, ChevronDown } from 'lucide-react';
import apiService from '../services/apiService';
import { Supplier } from '../types';

const ViewSupplierView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [suppliers, currentSupplier] = await Promise.all([
                    apiService.getSuppliers(),
                    id ? apiService.getSupplier(id) : Promise.resolve(null)
                ]);
                setAllSuppliers(suppliers);
                setSupplier(currentSupplier);
            } catch (err) {
                console.error('Failed to fetch supplier details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCopyToOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const supplierIndex = useMemo(() => {
        return allSuppliers.findIndex(s => s.id === id);
    }, [id, allSuppliers]);

    const handleNext = () => {
        if (supplierIndex >= 0 && supplierIndex < allSuppliers.length - 1) {
            navigate(`/suppliers/view/${allSuppliers[supplierIndex + 1].id}`);
        }
    };

    const handlePrev = () => {
        if (supplierIndex > 0) {
            navigate(`/suppliers/view/${allSuppliers[supplierIndex - 1].id}`);
        }
    };

    const handleFirst = () => {
        if (allSuppliers.length > 0) {
            navigate(`/suppliers/view/${allSuppliers[0].id}`);
        }
    };

    const handleLast = () => {
        if (allSuppliers.length > 0) {
            navigate(`/suppliers/view/${allSuppliers[allSuppliers.length - 1].id}`);
        }
    };

    const DropdownItem = ({ label, onClick }: { label: string; onClick?: () => void }) => (
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
            {label}
        </button>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading supplier profile...</p>
            </div>
        );
    }

    if (!supplier) {
        return <div className="p-8 text-center text-gray-500">Supplier not found.</div>;
    }

    return (
        <div className="bg-[#f3f4f6] min-h-full flex flex-col">

            <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest space-x-2 select-none no-print">
                <Building2 size={14} className="text-slate-400" />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/suppliers" className="hover:text-blue-600 transition-colors">Suppliers</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-600">View Details</span>
            </div>

            <div className="bg-[#f9fafb] px-4 py-3 border-b border-gray-200 flex items-center justify-between no-print">
                <div className="flex items-center space-x-3">
                    <span className="text-[13px] text-gray-400 mr-2">Supplier Profile</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm overflow-visible relative">
                        <button onClick={() => navigate(`/suppliers/edit/${supplier.id}`)} className="px-4 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-2">
                            <Edit size={14} /> Edit
                        </button>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                                className={`px-4 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center h-full ${isCopyToOpen ? 'bg-gray-50' : ''}`}
                            >
                                <ChevronDown size={14} className={`mr-2 transition-transform duration-200 ${isCopyToOpen ? 'rotate-180' : ''}`} /> Copy to
                            </button>

                            {isCopyToOpen && (
                                <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded py-1 z-50">
                                    <DropdownItem
                                        label="New Customer"
                                        onClick={() => {
                                            setIsCopyToOpen(false);
                                            navigate(`/customers/new?copyFrom=${supplier.id}`);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-3"></div>

                    <div className="flex space-x-2">
                        <button onClick={() => navigate(`/suppliers/print-batch?ids=${supplier.id}`)} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                            <Printer size={14} /> Print
                        </button>
                        <button
                            onClick={() => {
                                const mailtoLink = document.createElement('a');
                                mailtoLink.href = `mailto:${supplier.email || ''}`;
                                mailtoLink.click();
                            }}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Mail size={14} /> Email
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button onClick={handleFirst} disabled={supplierIndex <= 0} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"><ChevronsLeft size={14} /></button>
                        <button onClick={handlePrev} disabled={supplierIndex <= 0} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"><ChevronLeft size={14} /></button>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{Math.max(supplierIndex + 1, 1)} / {allSuppliers.length}</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button onClick={handleNext} disabled={supplierIndex === -1 || supplierIndex === allSuppliers.length - 1} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"><ChevronRight size={14} /></button>
                        <button onClick={handleLast} disabled={supplierIndex === -1 || supplierIndex === allSuppliers.length - 1} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"><ChevronsRight size={14} /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 flex justify-center overflow-auto print:p-0">
                <div className="print-container bg-white shadow-xl p-12 w-[850px] max-w-full text-[13px] text-gray-800 relative">
                    <style>{`
                        @media print {
                            @page { margin: 15mm; size: auto; }
                            html, body, #root, #root > div, main { 
                                background: white !important; 
                                padding: 0 !important; 
                                -webkit-print-color-adjust: exact; 
                                font-family: sans-serif !important; 
                                height: auto !important; 
                                min-height: none !important; 
                                overflow: visible !important; 
                                display: block !important; 
                            }
                            .no-print, nav, aside, header, .nav-bar, .side-bar, button, .breadcrumb-bar { display: none !important; }
                            .print-container { 
                                border: none !important; 
                                box-shadow: none !important; 
                                max-width: none !important; 
                                width: 100% !important; 
                                position: static !important;
                                padding: 48px !important;
                                background: white !important;
                            }
                        }
                    `}</style>

                    <div className="mb-14">
                        <div className="flex justify-between items-center mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase leading-none">{supplier.name}</h1>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">SUN: {supplier.code}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Business Details</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Division:</span>
                                    <span className="font-medium">{supplier.division || 'General'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Financial Settings</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Currency:</span>
                                    <span className="font-medium">{supplier.currency || 'ZMW'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-12 mb-10">
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Contact & Address</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Email:</span>
                                    <a href={`mailto:${supplier.email || ''}`} className="font-medium text-blue-600 lowercase hover:underline">{supplier.email || '-'}</a>
                                </div>
                                <div className="flex mt-3">
                                    <span className="w-32 text-gray-500">Address:</span>
                                    <span className="font-medium whitespace-pre-wrap">{supplier.billingAddress || (supplier as any).address || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => navigate(`/purchase-history/supplier/${encodeURIComponent(supplier.name)}`)}
                        className="mt-20 bg-slate-50 p-10 rounded-none border border-transparent hover:border-slate-200 hover:bg-slate-100/50 cursor-pointer transition-all group"
                    >
                        <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight mb-8 flex justify-between items-center">
                            Accounts Payable Summary
                            <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View Transactions →</span>
                        </h3>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[12px]">Outstanding Balance</span>
                            <span className="font-black text-3xl text-slate-900 tracking-tighter">
                                <span className="text-[14px] mr-3 text-slate-400 font-bold">{supplier.currency || 'ZMW'}</span>
                                {(supplier.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#f3f4f6] px-8 py-4 border-t border-gray-200 flex justify-end no-print">
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/suppliers/print-batch?ids=${supplier.id}`)} className="bg-white border border-gray-300 px-6 py-2 text-[11px] font-bold text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition uppercase tracking-widest flex items-center gap-2">
                        <Printer size={14} /> Print
                    </button>
                    <button onClick={() => navigate(`/suppliers/edit/${supplier.id}`)} className="bg-blue-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-blue-700 transition uppercase tracking-widest flex items-center gap-2">
                        <Edit size={14} /> Edit Supplier
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewSupplierView;
