import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, UserCircle, Briefcase, TrendingUp, CheckCircle, Clock, 
    AlertCircle, FileText, ShoppingCart, Package, DollarSign, Building2, 
    Users, Plus, Truck
} from 'lucide-react';
import { cn } from '../utils/cn';

interface UserData {
    name: string;
    role: string;
    avatar: string;
}

const DashboardView = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData>({ name: 'Guest', role: 'Administrator', avatar: 'G' });
    const [activeRole, setActiveRole] = useState<string>('Administrator');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                if (parsed.role) {
                    setActiveRole(parsed.role);
                }
            } catch (e) {
                console.error('Failed to parse user data');
            }
        }

        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Helper to change role for demo purposes
    const roles = ['Administrator', 'Sales Manager', 'Procurement', 'Warehouse', 'Finance'];

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const renderRoleSwitcher = () => (
        <div className="flex flex-wrap items-center gap-2 mt-4 no-print bg-slate-100 p-2 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Demo Role:</span>
            {roles.map(r => (
                <button
                    key={r}
                    onClick={() => setActiveRole(r)}
                    className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                        activeRole === r 
                            ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" 
                            : "text-slate-500 hover:bg-slate-200"
                    )}
                >
                    {r}
                </button>
            ))}
        </div>
    );

    // -- Role Specific Content --

    const renderSalesDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Sales This Month" value="$45,230" icon={TrendingUp} color="indigo" trend="+12.5% vs last month" />
                <MetricCard title="Quotes Pending" value="14" icon={FileText} color="amber" trend="4 need follow-up" />
                <MetricCard title="Win Rate" value="68%" icon={CheckCircle} color="emerald" trend="+2.4% vs last month" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ActionButton icon={Plus} label="New Quote" onClick={() => navigate('/sales-quotes/new')} />
                        <ActionButton icon={ShoppingCart} label="New Order" onClick={() => navigate('/sales-orders/new')} />
                        <ActionButton icon={Users} label="Customers" onClick={() => navigate('/customers')} />
                        <ActionButton icon={FileText} label="View Quotes" onClick={() => navigate('/sales-quotes')} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mt-8">Recent Quotes</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-1">
                        <TableMock type="quotes" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                        <AttentionItem title="Quote Q-0042 Expiring" desc="Expires tomorrow. Client: TechCorp" type="warning" />
                        <AttentionItem title="Order SO-102 Delayed" desc="Awaiting stock allocation" type="danger" />
                        <AttentionItem title="New Lead Assigned" desc="Follow up with MegaBuild LLC" type="info" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProcurementDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Open Purchase Orders" value="28" icon={ShoppingCart} color="indigo" trend="5 awaiting approval" />
                <MetricCard title="Pending GRNs" value="12" icon={Package} color="amber" trend="Requires receiving" />
                <MetricCard title="Low Stock Alerts" value="8" icon={AlertCircle} color="rose" trend="Action required" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ActionButton icon={Plus} label="New PO" onClick={() => navigate('/purchase-orders/new')} />
                        <ActionButton icon={Package} label="Receive Goods" onClick={() => navigate('/goods-received-notes/new')} />
                        <ActionButton icon={Building2} label="Suppliers" onClick={() => navigate('/suppliers')} />
                        <ActionButton icon={FileText} label="View POs" onClick={() => navigate('/purchase-orders')} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mt-8">Recent Purchase Orders</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-1">
                        <TableMock type="pos" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                        <AttentionItem title="Low Stock: Widget A" desc="Only 15 left (Min: 50)" type="danger" />
                        <AttentionItem title="PO-0982 Approved" desc="Ready to be sent to supplier" type="success" />
                        <AttentionItem title="Delivery Overdue" desc="Supplier: ABC Corp (PO-0975)" type="warning" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderWarehouseDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Items to Dispatch" value="45" icon={Truck} color="indigo" trend="Today's workload" />
                <MetricCard title="Pending Receipts" value="12" icon={Package} color="amber" trend="Expected deliveries" />
                <MetricCard title="Active Transfers" value="3" icon={TrendingUp} color="emerald" trend="Between warehouses" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ActionButton icon={Truck} label="Delivery Note" onClick={() => navigate('/delivery-notes/new')} />
                        <ActionButton icon={Package} label="Receive GRN" onClick={() => navigate('/goods-received-notes/new')} />
                        <ActionButton icon={TrendingUp} label="Transfer" onClick={() => navigate('/inventory-transfers/new')} />
                        <ActionButton icon={FileText} label="Write-off" onClick={() => navigate('/inventory-write-offs/new')} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mt-8">Today's Dispatch Schedule</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-1">
                        <TableMock type="dispatch" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                        <AttentionItem title="Pending Transfer" desc="Warehouse A to B pending receipt" type="warning" />
                        <AttentionItem title="Damaged Goods Logged" desc="Awaiting write-off approval" type="danger" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFinanceDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Accounts Receivable" value="$124,500" icon={DollarSign} color="emerald" trend="15% overdue" />
                <MetricCard title="Accounts Payable" value="$42,800" icon={FileText} color="rose" trend="Due within 30 days" />
                <MetricCard title="Pending Invoices" value="18" icon={Clock} color="amber" trend="Awaiting posting" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ActionButton icon={DollarSign} label="Record Payment" onClick={() => navigate('/payments/new')} />
                        <ActionButton icon={DollarSign} label="Record Receipt" onClick={() => navigate('/receipts/new')} />
                        <ActionButton icon={FileText} label="New Invoice" onClick={() => navigate('/sales-invoices/new')} />
                        <ActionButton icon={Building2} label="View Accounts" onClick={() => navigate('/accounts')} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mt-8">Recent Transactions</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-1">
                        <TableMock type="finance" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                        <AttentionItem title="Overdue Invoice" desc="INV-0089 (TechCorp) - 45 days late" type="danger" />
                        <AttentionItem title="Payment to Approve" desc="Supplier: ABC Logistics" type="warning" />
                        <AttentionItem title="Bank Reconciliation" desc="Pending for Main Account" type="info" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAdminDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Active Users" value="42" icon={Users} color="indigo" trend="3 online now" />
                <MetricCard title="System Health" value="100%" icon={CheckCircle} color="emerald" trend="All systems operational" />
                <MetricCard title="Pending Approvals" value="5" icon={AlertCircle} color="amber" trend="Requires review" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ActionButton icon={Users} label="Manage Users" onClick={() => {}} />
                        <ActionButton icon={Briefcase} label="Manage Roles" onClick={() => {}} />
                        <ActionButton icon={AlertCircle} label="View Approvals" onClick={() => navigate('/approvals')} />
                        <ActionButton icon={LayoutDashboard} label="System Settings" onClick={() => {}} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mt-8">Recent System Activity</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-1">
                        <TableMock type="admin" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                        <AttentionItem title="User Role Request" desc="John Doe requested 'Sales Manager'" type="warning" />
                        <AttentionItem title="Failed Backup" desc="Database backup failed at 2AM" type="danger" />
                        <AttentionItem title="System Update" desc="Version 2.4.1 available" type="info" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-teal-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
                        {user.avatar}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-indigo-600 mb-1">{getGreeting()},</p>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{user.name}</h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <Briefcase size={14} />
                            {activeRole}
                        </p>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p className="text-slate-800 font-medium text-sm mt-1">Ready for a great day?</p>
                    </div>
                    {renderRoleSwitcher()}
                </div>
            </div>

            {/* Role Specific Content */}
            {activeRole.includes('Sales') && renderSalesDashboard()}
            {activeRole.includes('Procurement') && renderProcurementDashboard()}
            {activeRole.includes('Warehouse') && renderWarehouseDashboard()}
            {activeRole.includes('Finance') && renderFinanceDashboard()}
            {(activeRole.includes('Admin') || (!activeRole.includes('Sales') && !activeRole.includes('Procurement') && !activeRole.includes('Warehouse') && !activeRole.includes('Finance'))) && renderAdminDashboard()}

        </div>
    );
};

// --- Helper Components ---

const MetricCard = ({ title, value, icon: Icon, color, trend }: any) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
    };
    
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500">{trend}</p>
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, label, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm transition-all group"
    >
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <Icon size={20} />
        </div>
        <span className="text-xs font-bold text-slate-700">{label}</span>
    </button>
);

const AttentionItem = ({ title, desc, type }: any) => {
    const styles = {
        danger: 'border-l-rose-500 bg-rose-50/50',
        warning: 'border-l-amber-500 bg-amber-50/50',
        info: 'border-l-indigo-500 bg-indigo-50/50',
        success: 'border-l-emerald-500 bg-emerald-50/50'
    };
    
    return (
        <div className={`p-3 rounded-xl border-l-4 border-y border-r border-y-slate-100 border-r-slate-100 ${styles[type as keyof typeof styles]}`}>
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            <p className="text-xs font-medium text-slate-500 mt-1">{desc}</p>
        </div>
    );
};

const TableMock = ({ type }: { type: string }) => {
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Reference</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Date</th>
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3].map((i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-semibold text-slate-700 border-b border-slate-50">DOC-00{i}</td>
                        <td className="py-3 px-4 border-b border-slate-50">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">Pending</span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-500 border-b border-slate-50 text-right">Today</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default DashboardView;
