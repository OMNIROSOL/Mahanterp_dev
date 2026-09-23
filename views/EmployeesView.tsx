import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Landmark } from 'lucide-react';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import RowActions from '../components/shared/RowActions';
import { Employee } from '../types';

const EmployeesView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        setEmployees(await apiService.getEmployees());
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter((e) =>
      [e.name, e.code, e.department, e.jobTitle, e.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  const columns = [
    {
      id: 'actions',
      header: <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</span>,
      accessor: (e: Employee) => (
        <RowActions viewPath={`/employees/view/${e.id}`} editPath={`/employees/edit/${e.id}`} />
      ),
    },
    {
      id: 'code',
      header: 'Code',
      accessor: (e: Employee) => (
        <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">{e.code}</span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessor: (e: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
            <Users size={14} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{e.name}</p>
            <p className="text-[11px] text-slate-400">{e.jobTitle || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessor: (e: Employee) => <span className="text-slate-600 text-sm">{e.department || '—'}</span>,
    },
    {
      id: 'bank',
      header: 'Bank',
      accessor: (e: Employee) => (
        <span className="text-slate-600 text-sm">
          {e.bankName ? `${e.bankName}${e.bankAccount ? ` · ${e.bankAccount}` : ''}` : '—'}
        </span>
      ),
    },
    {
      id: 'payer',
      header: 'Expense payer',
      accessor: (e: Employee) =>
        e.payers?.length ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Linked</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Not a payer</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (e: Employee) => (
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${e.inactive ? 'text-rose-500 bg-rose-50' : 'text-slate-600 bg-slate-100'}`}>
          {e.inactive ? 'Inactive' : 'Active'}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-indigo-600" />
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Master Data</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Employees</h1>
            <p className="text-slate-500 text-sm mt-1">Person records for expense claims. PAYE, NAPSA and NHIMA payroll is a separate module.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/employees/new')} className="h-10 shadow-md shadow-indigo-500/20">
            <Plus size={16} className="mr-2" />
            New Employee
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 flex gap-3 text-sm text-indigo-800">
          <Landmark size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">How expense claims use employees</p>
            <p className="mt-1 text-indigo-700/90">
              1. Create the employee here. 2. Open the record and click <span className="font-bold">Add as expense payer</span>, or go to Accounting → Expense Claim Payers. 3. On a new expense claim, choose that person in <span className="font-bold">Paid by</span>.
            </p>
          </div>
        </div>

        <div className="relative mt-6 max-w-2xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No employees yet. Create one to use on expense claims." />
        </div>
      </div>
    </div>
  );
};

export default EmployeesView;
