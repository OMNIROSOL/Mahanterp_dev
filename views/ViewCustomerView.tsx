import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Edit, ChevronRight, LayoutGrid, Printer, FileText, Mail, Copy, ChevronLeft, ChevronsLeft, ChevronsRight, FolderOpen } from 'lucide-react';
import { Customer } from '../types';
import apiService from '../services/apiService';

const ViewCustomerView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCopyToOpen, setIsCopyToOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getCustomer(id!);
                setCustomer(data);

                // Also get all for navigation
                const all = await apiService.getCustomers();
                setAllCustomers(all);
            } catch (err) {
                console.error('Failed to fetch customer data:', err);
                // Fallback
                try {
                    const customers = await apiService.getCustomers();
                    setAllCustomers(customers);
                    const cust = customers.find(c => c.id === id || c.code === id);
                    if (cust) setCustomer(cust);
                } catch (e) { }
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

    const customerIndex = allCustomers.findIndex(c => c.id === id || c.code === id);

    const handleNext = () => {
        if (customerIndex >= 0 && customerIndex < allCustomers.length - 1) {
            navigate(`/customers/view/${allCustomers[customerIndex + 1].id}`);
        }
    };

    const handlePrev = () => {
        if (customerIndex > 0) {
            navigate(`/customers/view/${allCustomers[customerIndex - 1].id}`);
        }
    };

    const handleFirst = () => {
        if (allCustomers.length > 0) {
            navigate(`/customers/view/${allCustomers[0].id}`);
        }
    };

    const handleLast = () => {
        if (allCustomers.length > 0) {
            navigate(`/customers/view/${allCustomers[allCustomers.length - 1].id}`);
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
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[12px]">Customer not found.</p>
                <button onClick={() => navigate('/customers')} className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Back to Directory</button>
            </div>
        );
    }

    return (
        <div className="bg-[#f3f4f6] min-h-full flex flex-col">
            <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest space-x-2 select-none no-print">
                <FolderOpen size={14} className="text-slate-400" />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/customers" className="hover:text-blue-600 transition-colors">Customers</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-600">View</span>
            </div>

            <div className="bg-[#f9fafb] px-4 py-3 border-b border-gray-200 flex items-center justify-between no-print">
                <div className="flex items-center space-x-3">
                    <span className="text-[13px] text-gray-400 mr-2">Customer Profile</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm overflow-visible relative">
                        <button onClick={() => navigate(`/customers/edit/${customer.id}`)} className="px-4 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-2">
                            <Edit size={14} /> Edit
                        </button>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCopyToOpen(!isCopyToOpen)}
                                className={`px-4 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center h-full ${isCopyToOpen ? 'bg-gray-50' : ''}`}
                            >
                                <ChevronRight size={14} className={`mr-2 transition-transform duration-200 ${isCopyToOpen ? 'rotate-90' : ''}`} /> Copy to
                            </button>

                            {isCopyToOpen && (
                                <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded py-1 z-50">
                                    <DropdownItem
                                        label="New Supplier"
                                        onClick={() => {
                                            setIsCopyToOpen(false);
                                            navigate(`/suppliers/new?copyFrom=${customer.id}`);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-3"></div>

                    <div className="flex space-x-2">
                        <button onClick={() => navigate(`/customers/print-batch?ids=${customer.id}`)} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                            <Printer size={14} /> Print
                        </button>
                        <button onClick={() => navigate(`/customers/print-batch?ids=${customer.id}`)} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                            <FileText size={14} /> PDF
                        </button>
                        <button
                            onClick={() => {
                                const mailtoLink = document.createElement('a');
                                mailtoLink.href = `mailto:${customer.email || ''}`;
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
                        <button onClick={handleFirst} disabled={customerIndex <= 0} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"><ChevronsLeft size={14} /></button>
                        <button onClick={handlePrev} disabled={customerIndex <= 0} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"><ChevronLeft size={14} /></button>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 mx-2 uppercase tracking-widest">{Math.max(customerIndex + 1, 1)} / {allCustomers.length}</span>
                    <div className="flex bg-white border border-gray-300 rounded shadow-sm">
                        <button onClick={handleNext} disabled={customerIndex === -1 || customerIndex === allCustomers.length - 1} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 border-r border-gray-300 disabled:opacity-30 flex items-center"><ChevronRight size={14} /></button>
                        <button onClick={handleLast} disabled={customerIndex === -1 || customerIndex === allCustomers.length - 1} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center"><ChevronsRight size={14} /></button>
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
                            .status-badge-print { 
                                display: block !important; 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important; 
                            }
                            .summary-box-print { 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important; 
                                background-color: #f8fafc !important; 
                                border: none !important;
                            }
                            .summary-box-print * { 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important; 
                            }
                        }
                    `}</style>

                    {/* Header Section */}
                    <div className="mb-14">
                        <div className="flex justify-between items-center mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase leading-none">{customer.name}</h1>

                            {/* Status Badge */}
                            <div className="flex items-center space-x-2 status-badge-print">
                                {customer.inactive && (
                                    <span className="px-3 py-1 rounded bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest border border-slate-200">
                                        Inactive
                                    </span>
                                )}
                                <span className={`px-4 py-1.5 rounded-md text-[13px] font-black uppercase tracking-widest shadow-sm ${customer.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {customer.status || 'Unpaid'}
                                </span>
                            </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">UCN: {customer.code}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        {/* Company Details */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Company Details</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">TPIN:</span>
                                    <span className="font-medium">{customer.tpin || '-'}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Division:</span>
                                    <span className="font-medium">{customer.division || 'General'}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Sales Person:</span>
                                    <span className="font-medium">{customer.salesPerson || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Info */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Financial Settings</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Currency:</span>
                                    <span className="font-medium">{customer.currency || 'ZMW - Zambian Kwacha'}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Credit Days:</span>
                                    <span className="font-medium">{customer.creditDays || 30} days</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Credit Limit:</span>
                                    <span className="font-medium">
                                        {customer.creditLimit ? `${customer.currency?.split(' ')[0] || 'ZMW'} ${Number(customer.creditLimit).toLocaleString()}` : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-10">
                        {/* Billing Address */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Billing Details</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Email:</span>
                                    <a href={`mailto:${customer.email || ''}`} className="font-medium text-blue-600 lowercase hover:underline">{customer.email || '-'}</a>
                                </div>
                                <div className="flex mt-3">
                                    <span className="w-32 text-gray-500">Billing Address:</span>
                                    <span className="font-medium whitespace-pre-wrap">{customer.billingAddress || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Delivery Details</h3>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-32 text-gray-500">Delivery Address:</span>
                                    <span className="font-medium whitespace-pre-wrap">{customer.deliveryAddress || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Summary Footer */}
                    <div
                        onClick={() => navigate(`/customers/transactions/${customer.id}`)}
                        className="summary-box-print mt-20 bg-slate-50 p-10 rounded-none border border-transparent hover:border-slate-200 hover:bg-slate-100/50 cursor-pointer transition-all group"
                    >
                        <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight mb-8 flex justify-between items-center">
                            Account Summary
                            <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View Transactions →</span>
                        </h3>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[12px]">Total Outstanding Balance</span>
                            <span className="font-black text-3xl text-slate-900 tracking-tighter">
                                <span className="text-[14px] mr-3 text-slate-400 font-bold">{customer.currency?.split(' ')[0] || 'ZMW'}</span>
                                {(Number(customer.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#f3f4f6] px-8 py-4 border-t border-gray-200 flex justify-end no-print">
                <div className="flex space-x-2">
                    <button onClick={() => navigate(`/customers/print-batch?ids=${customer.id}`)} className="bg-white border border-gray-300 px-6 py-2 text-[11px] font-bold text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition uppercase tracking-widest flex items-center gap-2">
                        <Printer size={14} /> Print
                    </button>
                    <button onClick={() => navigate(`/customers/edit/${customer.id}`)} className="bg-blue-600 text-white px-6 py-2 text-[11px] font-bold rounded-md shadow-md hover:bg-blue-700 transition uppercase tracking-widest flex items-center gap-2">
                        <Edit size={14} /> Edit Customer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewCustomerView;

