import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  FileText, 
  Layout, 
  Globe, 
  ShieldCheck, 
  Bell, 
  ChevronRight,
  Database,
  Printer,
  CreditCard,
  Building2,
  Package,
  Percent,
  Users,
  Clock,
  ShieldCheck as Shield,
  Upload,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import Card from '../components/shared/Card';
import { AppUser } from '../types';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../utils/theme';

const SettingsView = () => {
  const navigate = useNavigate();
  const { mode, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<AppUser>({
    id: 'admin', name: 'Admin', role: 'Admin', avatar: 'A', email: 'admin@example.com'
  });

  useEffect(() => {
    // In production, fetch current user from auth service/context
  }, []);

  const isAdmin = currentUser.role === 'Admin';
  const isManager = currentUser.role === 'Manager' || isAdmin;

  const settingsGroups = [
    {
      title: 'Facility Configuration',
      items: [
        { 
          id: 'divisions', 
          label: 'Divisions', 
          description: 'Manage business units, branches and regional departments',
          icon: Building2, 
          path: '/settings/divisions',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50'
        },
        {
          id: 'employees',
          label: 'Employees',
          description: 'Staff records for expense claims. Payroll is a separate module.',
          icon: Users,
          path: '/employees',
          color: 'text-violet-600',
          bgColor: 'bg-violet-50'
        },
        { 
          id: 'inventory-locations', 
          label: 'Inventory Locations', 
          description: 'Manage warehouses, points of sale and storage areas',
          icon: Package, 
          path: '/settings/inventory-locations',
          color: 'text-rose-600',
          bgColor: 'bg-rose-50'
        },
        { 
          id: 'currencies', 
          label: 'Currencies', 
          description: 'Manage display and base currencies for transactions',
          icon: Globe, 
          path: '/settings/currencies',
          color: 'text-teal-600',
          bgColor: 'bg-teal-50'
        },
        ...(isAdmin ? [{ 
          id: 'inventory-unit-costs', 
          label: 'Inventory Unit Costs', 
          description: 'Update and track historical item unit costs (Admin)',
          icon: Database, 
          path: '/settings/inventory-unit-costs',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        }] : []),
      ]
    },
    {
      title: 'Accounting',
      items: [
        {
          id: 'accounts',
          label: 'Chart of Accounts',
          description: 'Create and edit ledger accounts used on the Summary report',
          icon: FileText,
          path: '/accounts',
          color: 'text-slate-700',
          bgColor: 'bg-slate-50'
        },
      ]
    },
    {
      title: 'Tax Configuration',
      items: [
        { 
          id: 'tax-codes', 
          label: 'Tax Codes', 
          description: 'Configure VAT and other shared tax rates',
          icon: Percent, 
          path: '/settings/tax-codes',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50'
        },
        { 
          id: 'withholding-tax', 
          label: 'Withholding Tax', 
          description: 'Manage retention rates for services and rents',
          icon: CreditCard, 
          path: '/settings/withholding-tax',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        },
      ]
    },
    {
      title: 'Document Configuration',
      items: [
        { 
          id: 'document-footers', 
          label: 'Document Footers', 
          description: 'Manage reusable footer templates for sales documents',
          icon: FileText, 
          path: '/settings/footers',
          color: 'text-sky-600',
          bgColor: 'bg-sky-50'
        },
        {
          id: 'company-profile',
          label: 'Company Profile',
          description: 'Name, address and TPIN printed on A4 documents',
          icon: Building2,
          path: '/settings/company',
          color: 'text-slate-700',
          bgColor: 'bg-slate-50'
        },
        {
          id: 'approvals',
          label: 'Approval Settings',
          description: 'Control whether quotes and invoices need manager approval',
          icon: ShieldCheck,
          path: '/settings/approvals',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        },
        {
          id: 'data-import',
          label: 'Data Import',
          description: 'Excel and CSV templates for masters, receipts and payments',
          icon: Upload,
          path: '/settings/data-import',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50'
        },
      ]
    },
    ...(isAdmin ? [{
      title: 'Procurement Configuration',
      items: [
        { 
          id: 'lead-time-master', 
          label: 'Lead Time Master', 
          description: 'Manage supplier delivery schedules and lead times',
          icon: Clock, 
          path: '/purchase/lead-time-master',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        }
      ]
    }] : []),
    {
      title: 'Access Control',
      items: [
        { 
          id: 'permissions', 
          label: 'User Permissions', 
          description: 'Manage staff access levels and simulate login scenarios',
          icon: Users, 
          path: '/settings/user-permissions',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50'
        },
        ...(isAdmin ? [{ 
          id: 'role-management', 
          label: 'Role Management', 
          description: 'Define granular permissions and screen access',
          icon: Shield, 
          path: '/settings/role-management',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }] : []),
      ]
    }
  ];

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header Area */}
      <div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
          <Settings size={14} />
          <span className="text-gray-400">Application Control</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 font-medium mt-1">Configure your ERP system to match your business workflows</p>
      </div>

      <div className="max-w-3xl">
        <div className="space-y-6">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Appearance</h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
              { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
              { id: 'system' as ThemeMode, label: 'System', icon: Monitor },
            ]).map((opt) => {
              const selected = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    selected
                      ? 'border-primary bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <opt.icon size={18} />
                  <span className="text-[12px] font-black uppercase tracking-widest">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-slate-400 px-1">System follows your computer’s light or dark setting.</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="space-y-12">
          {settingsGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{group.title}</h3>
              <div className="grid gap-4">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.path !== '#' && navigate(item.path)}
                    className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 transition-all group text-left w-full"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <item.icon size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{item.label}</h4>
                        <p className="text-sm text-gray-500 font-medium">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
