import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  CheckCircle2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flower2,
  Sprout,
  BarChart3,
  Search,
  Users,
  Building2,
  FileSpreadsheet,
  Receipt,
  History,
  CheckCircle,
  Package,
  ArrowRightLeft,
  FileX,
  ShieldCheck,
  Shield,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { AppUser } from '../../types';
import { apiService } from '../../services/apiService';

// TODO: Replace with real auth service
const getCurrentUserFallback = (): AppUser => ({
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@omnirosol.com',
  role: 'Admin',
  avatar: 'A'
});

interface SubmenuItem {
  label: string;
  path: string;
  id?: string;
  count?: number;
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isCollapsed: boolean;
  count?: number;
  submenu?: SubmenuItem[];
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, path, isCollapsed, count, submenu }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-3 py-1">
      <NavLink
        to={path}
        end={path === '/'}
        className={({ isActive }) => cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary/20 text-white"
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
        )}
        onClick={() => submenu && setIsOpen(!isOpen)}
      >
        <Icon size={20} className={cn("shrink-0", !isCollapsed && "group-hover:scale-110 transition-transform")} />
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden">
            <span className="font-medium whitespace-nowrap">{label}</span>
            <div className="flex items-center gap-1.5">
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors",
                  path === '/approvals' ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-300 group-hover:bg-primary/20 group-hover:text-primary border border-slate-700/60"
                )}>
                  {count}
                </span>
              )}
              {submenu && (
                <ChevronRight size={14} className={cn("transition-transform opacity-50", isOpen && "rotate-90")} />
              )}
            </div>
          </div>
        )}
      </NavLink>

      {!isCollapsed && submenu && isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="ml-9 mt-1 flex flex-col gap-1 overflow-hidden"
        >
          {submenu.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => cn(
                "text-sm py-1.5 px-3 rounded-md transition-colors flex items-center justify-between group/sub",
                isActive ? "text-white font-medium bg-primary/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-800/80 text-slate-300 group-hover/sub:bg-primary/20 group-hover/sub:text-primary transition-colors border border-slate-700/40">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </motion.div>
      )}
    </div>
  );
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [currentUser, setCurrentUser] = useState<AppUser>(getCurrentUserFallback());
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const data = await apiService.getCounts();
        if (isMounted && data) setCounts(data);
      } catch (err) {
        // Silently tolerate count load failures
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Keep for potential future storage-based auth updates
    const handleUpdate = () => setCurrentUser(getCurrentUserFallback());
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, []);

  const isAdmin = currentUser.role === 'Admin';
  const isManager = currentUser.role === 'Manager' || isAdmin;

  const [roleDef, setRoleDef] = useState<any>(null);

  useEffect(() => {
    // For now, allow all views for the hardcoded admin
    setRoleDef({ permissions: [] });
  }, [currentUser]);

  const hasViewRight = (screenId: string) => {
    if (!roleDef) return true; // Default to visible while loading or for initial simulation
    const perm = roleDef.permissions.find((p: any) => p.screenId === screenId);
    return perm ? perm.view : true;
  };

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', id: 'dashboard' },
    {
      label: 'Accounting',
      icon: Receipt,
      path: '/summary',
      id: 'summary',
      count: counts.accounting,
      submenu: [
        { label: 'Summary', path: '/summary', id: 'summary' },
        { label: 'Bank and Cash Accounts', path: '/account', id: 'bank-accounts', count: counts.bankAccounts },
        { label: 'Bank Reconciliation', path: '/bank-reconciliation', id: 'bank-reconciliation' },
        { label: 'Receipts', path: '/receipts', id: 'receipts', count: counts.receipts },
        { label: 'Payments', path: '/payments', id: 'payments', count: counts.payments },
        { label: 'Inter Account Transfers', path: '/inter-account-transfers', id: 'inter-account-transfers', count: counts.interAccountTransfers },
        { label: 'Expense Claims', path: '/expense-claims', id: 'expense-claims', count: counts.expenseClaims },
        { label: 'Expense Claim Payers', path: '/expense-claim-payers', id: 'expense-claim-payers', count: counts.expenseClaimPayers },
        { label: 'Payslips', path: '/payslips', id: 'payslips', count: counts.payslips },
        { label: 'Journal Entries', path: '/journal-entries', id: 'journal-entries', count: counts.journalEntries },
        { label: 'Fixed Assets', path: '/fixed-assets', id: 'fixed-assets', count: counts.fixedAssets },
        { label: 'Depreciation Entries', path: '/depreciation-entries', id: 'depreciation-entries' },
      ]
    },
    {
      label: 'Master Data',
      icon: Database,
      path: '/master/income-items',
      id: 'master',
      count: counts.master,
      submenu: [
        { label: 'Income Items', path: '/master/income-items', id: 'income-items' },
        { label: 'Expense Items', path: '/master/expense-items', id: 'expense-items' },
        { label: 'Employees', path: '/employees', id: 'employees', count: counts.employees },
        { label: 'Units of Measure', path: '/master/units', id: 'units' },
        { label: 'Item Categories', path: '/master/categories', id: 'categories' },
      ]
    },

    {
      label: 'Sales',
      icon: ShoppingCart,
      path: '/sales-history',
      id: 'sales-invoices',
      count: counts.sales,
      submenu: [
        { label: 'Sales Dashboard', path: '/sales-dashboard', id: 'sales-dashboard' },
        { label: 'Customers', path: '/customers', id: 'customers', count: counts.customers },
        { label: 'Customer Statements', path: '/customers/statement', id: 'customers' },
        { label: 'Sales History', path: '/sales-history', id: 'sales-invoices' },
        { label: 'Sales Quotes', path: '/sales-quotes', id: 'sales-quotes', count: counts.salesQuotes },
        { label: 'Sales Orders', path: '/sales-orders', id: 'sales-orders', count: counts.salesOrders },
        { label: 'Sales Invoices', path: '/sales-invoices', id: 'sales-invoices', count: counts.salesInvoices },
        { label: 'Delivery Notes', path: '/delivery-notes', id: 'delivery-notes', count: counts.deliveryNotes },
        { label: 'Credit Notes', path: '/credit-notes', id: 'credit-notes', count: counts.creditNotes },
      ]
    },
    {
      label: 'Purchase',
      icon: ShoppingCart,
      path: '/purchase-history',
      id: 'purchase-history',
      count: counts.purchase,
      submenu: [
        { label: 'Purchase Dashboard', path: '/purchase/analytics', id: 'purchase-history' },
        { label: 'Purchase History', path: '/purchase-history', id: 'purchase-history' },
        { label: 'Suppliers', path: '/suppliers', id: 'suppliers', count: counts.suppliers },
        { label: 'Supplier Statements', path: '/suppliers/statement', id: 'suppliers' },
        { label: 'Supplier Catalog Setup', path: '/purchase/supplier-catalog', id: 'supplier-catalog-setup' },
        { label: 'Purchase Planning', path: '/purchase/planning', id: 'purchase-planning' },
        { label: 'Purchase Enquiry', path: '/purchase-quotes', id: 'purchase-quotes', count: counts.purchaseQuotes },
        { label: 'Quote Analysis', path: '/purchase/quote-analysis', id: 'quote-analysis' },
        { label: 'Purchase Orders', path: '/purchase-orders', id: 'purchase-orders', count: counts.purchaseOrders },
        { label: 'Incoming Shipments', path: '/purchase/incoming-shipments', id: 'purchase-history' },
        { label: 'Shipment Planner', path: '/shipment-planner', id: 'purchase-history' },
        { label: 'Landed Cost Calculator', path: '/purchase/costing-reports', id: 'purchase-orders' },
        { label: 'Purchase Invoices', path: '/purchase-invoices', id: 'purchase-invoices', count: counts.purchaseInvoices },
        { label: 'Goods Received Notes', path: '/goods-received-notes', id: 'goods-received-notes', count: counts.goodsReceivedNotes },
        { label: 'Debit Notes', path: '/debit-notes', id: 'debit-notes', count: counts.debitNotes },
      ]
    },
    {
      label: 'Inventory',
      icon: Package,
      path: '/inventory-items',
      id: 'inventory-items',
      count: counts.inventory,
      submenu: [
        { label: 'Inventory Dashboard', path: '/purchase/consumption', id: 'inventory-items' },
        { label: 'Inventory Items', path: '/inventory-items', id: 'inventory-items', count: counts.inventoryItems },
        { label: 'Inventory Transfers', path: '/inventory-transfers', id: 'inventory-transfers', count: counts.inventoryTransfers },
        { label: 'Inventory Write-offs', path: '/inventory-write-offs', id: 'inventory-write-offs', count: counts.inventoryWriteOffs },
        ...(isAdmin ? [{ label: 'Inventory Unit Costs', path: '/settings/inventory-unit-costs', id: 'inventory-unit-costs' }] : []),
      ].filter(sub => !sub.id || hasViewRight(sub.id))
    },
    { label: 'Approvals', icon: CheckCircle, path: '/approvals', id: 'approvals' },
    { label: 'Reports', icon: FileSpreadsheet, path: '/reports', id: 'reports' },
    {
      label: 'Admin',
      icon: Shield,
      path: '/admin/activity-log',
      id: 'admin',
      submenu: [
        { label: 'Activity Log', path: '/admin/activity-log', id: 'admin-activity' },
        { label: 'Database Backup', path: '/admin/backup', id: 'admin-backup' },
      ]
    },
    { label: 'Settings', icon: Settings, path: '/settings', id: 'user-permissions' },
  ];

  // Filtering or modifying based on role
  const visibleMenuItems = menuItems.filter(item => {
    if (!hasViewRight(item.id)) return false;
    if (item.label === 'Approvals' && !isManager) return false;
    if (item.label === 'Settings' && !isManager) return false;
    return true;
  });

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="h-full bg-slate-900 border-r border-slate-800 flex flex-col z-20 relative"
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
              E
            </div>
            <span className="font-bold text-xl tracking-tight text-white">ERP <span className="text-primary">Pro</span></span>
          </motion.div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-primary/20">
            E
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors absolute -right-4 top-14 bg-slate-900 border border-slate-800 shadow-sm z-30"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {visibleMenuItems.map((item, index) => (
          <SidebarItem
            key={index}
            {...item}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className={cn(
          "bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-800",
          isCollapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shadow-sm">
            {currentUser.avatar}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">{currentUser.role}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
