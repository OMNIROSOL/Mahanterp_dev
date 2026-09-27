import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Settings } from 'lucide-react';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';
import DataTable from '../components/shared/DataTable';
import RowActions from '../components/shared/RowActions';

const money = (value: number | string) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayslipsView = () => {
  const navigate = useNavigate();
  const [slips, setSlips] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getPayslips()
      .then(setSlips)
      .catch(() => setSlips([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slips;
    return slips.filter((s) =>
      [s.reference, s.description, s.employee?.name, s.employee?.code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [slips, search]);

  const columns = [
    {
      id: 'actions',
      header: 'Edit',
      accessor: (s: any) => (
        <RowActions viewPath={`/payslips/view/${s.id}`} editPath={`/payslips/edit/${s.id}`} />
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (s: any) => new Date(s.date).toLocaleDateString(),
    },
    {
      id: 'reference',
      header: 'Reference',
      accessor: (s: any) => s.reference || '—',
    },
    {
      id: 'employee',
      header: 'Employee',
      accessor: (s: any) => <span className="font-bold text-slate-700">{s.employee?.name || '—'}</span>,
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (s: any) => s.description || '—',
    },
    {
      id: 'gross',
      header: 'Gross pay',
      className: 'text-right',
      accessor: (s: any) => <span className="block text-right">{money(s.grossPay)}</span>,
    },
    {
      id: 'deduction',
      header: 'Deduction',
      className: 'text-right',
      accessor: (s: any) => <span className="block text-right">{money(s.deduction)}</span>,
    },
    {
      id: 'net',
      header: 'Net pay',
      className: 'text-right',
      accessor: (s: any) => (
        <span className="block text-right font-black text-slate-800">
          <span className="text-[10px] text-slate-400 font-bold mr-1">ZMW</span>
          {money(s.netPay)}
        </span>
      ),
    },
    {
      id: 'contribution',
      header: 'Contribution',
      className: 'text-right',
      accessor: (s: any) => <span className="block text-right">{money(s.contribution)}</span>,
    },
    {
      id: 'timestamp',
      header: 'Timestamp',
      accessor: (s: any) => (s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-indigo-600" />
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Accounting</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payslips</h1>
            <p className="text-slate-500 text-sm mt-1">One payslip per employee. Paying the employee is a separate payment.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/settings/payslip-items')} className="h-10">
              <Settings size={16} className="mr-2" />
              Payslip items
            </Button>
            <Button variant="primary" onClick={() => navigate('/payslips/new')} className="h-10">
              <Plus size={16} className="mr-2" />
              New Payslip
            </Button>
          </div>
        </div>
        <div className="relative max-w-2xl mt-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee, reference or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>
      <div className="flex-1 p-6 min-h-0">
        <DataTable
          columns={columns}
          data={loading ? [] : rows}
          title={loading ? 'Loading payslips…' : `${rows.length} payslip${rows.length === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  );
};

export default PayslipsView;
