import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  CheckCircle,
  Settings,
  ChevronDown,
  Package,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { AppUser } from '../../types';

// TODO: Replace with real auth service
import apiService from '../../services/apiService';

const TopMenu: React.FC<TopMenuProps> = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => apiService.getCurrentUser());
  const location = useLocation();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [roleDef, setRoleDef] = useState<any>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const u = apiService.getCurrentUser();
      setCurrentUser(u);
    };
    handleUpdate();
    window.addEventListener('user_sim_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('user_sim_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchRoleDef = async () => {
      if (!currentUser) return;
      if (currentUser.role === 'Admin') {
        setRoleDef(null);
        return;
      }
      try {
        const roles = await apiService.getRoles();
        const userRole = roles.find((r: any) =>
          (currentUser.roleId && r.id === currentUser.roleId) ||
          (r.name && currentUser.role && r.name.toLowerCase() === currentUser.role.toLowerCase())
        );
        if (userRole) {
          setRoleDef(userRole);
        } else {
          setRoleDef({ permissions: [] });
        }
      } catch (err) {
        console.error('Failed to fetch role permissions:', err);
        setRoleDef({ permissions: [] });
      }
    };

    fetchRoleDef();
    window.addEventListener('roles_updated', fetchRoleDef);
    return () => window.removeEventListener('roles_updated', fetchRoleDef);
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager' || isAdmin;

  const hasViewRight = (screenId: string) => {
    if (!currentUser) return true;
    if (currentUser.role === 'Admin') return true;
    if (!roleDef || !roleDef.permissions || roleDef.permissions.length === 0) return true;

    const perm = roleDef.permissions.find((p: any) => p.screenId === screenId || p.screen_id === screenId);
    if (!perm) return true;
    return Boolean(perm.view ?? perm.canView ?? perm.can_view);
  };

  const rawMenuItems = [
    {
      label: 'Accounting',
      icon: LayoutDashboard,
      path: '/summary',
      id: 'summary',
      submenu: [
        { label: 'Summary', path: '/summary', id: 'summary' },
        { label: 'Trial Balance', path: '/trial-balance', id: 'trial-balance' },
        { label: 'Chart of Accounts', path: '/accounts', id: 'accounts' },
        { label: 'Bank Accounts', path: '/account', id: 'bank-accounts' },
        { label: 'Receipts', path: '/receipts', id: 'receipts' },
        { label: 'Payments', path: '/payments', id: 'payments' },
        { label: 'Inter Account Transfers', path: '/inter-account-transfers', id: 'inter-account-transfers' },
        { label: 'Expense Claims', path: '/expense-claims', id: 'expense-claims' },
      ]
    },
    { label: 'Sales Dashboard', icon: BarChart3, path: '/sales-dashboard', id: 'dashboard' },
    {
      label: 'Master Data',
      icon: Database,
      path: '/master/income-items',
      id: 'master',
      submenu: [
        { label: 'Income Items', path: '/master/income-items', id: 'units' },
        { label: 'Expense Items', path: '/master/expense-items', id: 'categories' },
        { label: 'Units of Measure', path: '/master/units', id: 'units' },
        { label: 'Item Categories', path: '/master/categories', id: 'categories' },
      ]
    },
    {
      label: 'Sales',
      icon: ShoppingCart,
      path: '/sales-history',
      id: 'sales-invoices',
      submenu: [
        { label: 'Customers', path: '/customers', id: 'customers' },
        { label: 'Sales History', path: '/sales-history', id: 'sales-invoices' },
        { label: 'Sales Quotes', path: '/sales-quotes', id: 'sales-quotes' },
        { label: 'Sales Orders', path: '/sales-orders', id: 'sales-orders' },
        { label: 'Sales Invoices', path: '/sales-invoices', id: 'sales-invoices' },
        { label: 'Delivery Notes', path: '/delivery-notes', id: 'delivery-notes' },
        { label: 'Credit Notes', path: '/credit-notes', id: 'credit-notes' },
      ]
    },
    {
      label: 'Purchase',
      icon: ShoppingCart,
      path: '/purchase-history',
      id: 'purchase-history',
      submenu: [
        { label: 'Purchase Dashboard', path: '/purchase/analytics', id: 'purchase-history' },
        { label: 'Purchase History', path: '/purchase-history', id: 'purchase-history' },
        { label: 'Suppliers', path: '/suppliers', id: 'suppliers' },
        { label: 'Supplier Catalog Setup', path: '/purchase/supplier-catalog', id: 'suppliers' },
        { label: 'Purchase Planning', path: '/purchase/planning', id: 'purchase-planning' },
        { label: 'Purchase Enquiry', path: '/purchase-quotes', id: 'purchase-quotes' },
        { label: 'Quote Analysis', path: '/purchase/quote-analysis', id: 'quote-analysis' },
        { label: 'Purchase Orders', path: '/purchase-orders', id: 'purchase-orders' },
        { label: 'Incoming Shipments', path: '/purchase/incoming-shipments', id: 'shipments' },
        { label: 'Shipment Planner', path: '/shipment-planner', id: 'shipments' },
        { label: 'Landed Cost Calculator', path: '/purchase/costing-reports', id: 'costing-report' },
        { label: 'Purchase Invoices', path: '/purchase-invoices', id: 'purchase-invoices' },
        { label: 'Goods Received Notes', path: '/goods-received-notes', id: 'goods-received-notes' },
        { label: 'Debit Notes', path: '/debit-notes', id: 'debit-notes' },
      ]
    },
    {
      label: 'Inventory',
      icon: Package,
      path: '/inventory-items',
      id: 'inventory-items',
      submenu: [
        { label: 'Inventory Dashboard', path: '/purchase/consumption', id: 'inventory-items' },
        { label: 'Inventory Items', path: '/inventory-items', id: 'inventory-items' },
        { label: 'Inventory Locations', path: '/inventory/locations', id: 'inventory-locations' },
        { label: 'Inventory Transfers', path: '/inventory-transfers', id: 'inventory-transfers' },
        { label: 'Inventory Write-offs', path: '/inventory-write-offs', id: 'inventory-write-offs' },
        { label: 'Inventory Unit Costs', path: '/settings/inventory-unit-costs', id: 'inventory-unit-costs' },
      ]
    },
    { label: 'Approvals', icon: CheckCircle, path: '/approvals', id: 'approvals' },
    { label: 'Reports', icon: FileSpreadsheet, path: '/reports', id: 'reports' },
    { label: 'Settings', icon: Settings, path: '/settings', id: 'user-permissions' },
  ];

  const menuItems = rawMenuItems.map(item => {
    if (item.submenu) {
      const filteredSub = item.submenu.filter(sub => hasViewRight(sub.id));
      return { ...item, submenu: filteredSub };
    }
    return item;
  });

  const visibleMenuItems = menuItems.filter(item => {
    if (isAdmin) return true;
    if (item.submenu) {
      return item.submenu.length > 0;
    }
    return hasViewRight(item.id);
  });

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300 relative z-40 shadow-md flex items-center px-6 whitespace-nowrap flex-wrap">
      {visibleMenuItems.map((item, idx) => {
        const Icon = item.icon;
        // Check if any submenu is active or if the item's path is active
        const isChildActive = item.submenu?.some(sub => location.pathname.startsWith(sub.path));
        const isActive = location.pathname.startsWith(item.path) || isChildActive;

        return (
          <div 
            key={idx} 
            className="relative"
            onMouseEnter={() => setHoveredMenu(item.id)}
            onMouseLeave={() => setHoveredMenu(null)}
          >
            <NavLink
              to={item.submenu ? item.submenu[0].path : item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2",
                isActive 
                  ? "text-white border-primary" 
                  : hoveredMenu === item.id 
                    ? "text-white border-slate-500" 
                    : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              <Icon size={16} />
              {item.label}
              {item.submenu && (
                <ChevronDown 
                  size={14} 
                  className={cn(
                    "ml-1 transition-transform", 
                    hoveredMenu === item.id ? "opacity-100 rotate-180" : "opacity-50"
                  )} 
                />
              )}
            </NavLink>
            
            {item.submenu && hoveredMenu === item.id && (
              <div className="absolute left-0 top-full mt-0 w-56 bg-white rounded-b-xl shadow-xl border border-slate-200 overflow-hidden py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                {item.submenu.map((sub, sIdx) => {
                  const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
                  return (
                    <NavLink
                      key={sIdx}
                      to={sub.path}
                      className={cn(
                        "block px-5 py-2.5 text-sm transition-colors whitespace-normal",
                        isSubActive 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                      )}
                    >
                      {sub.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TopMenu;
