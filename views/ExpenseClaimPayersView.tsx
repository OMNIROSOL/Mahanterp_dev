import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import { Plus, Search, Users, ChevronRight, HelpCircle, X } from 'lucide-react';

const ExpenseClaimPayersView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [payers, setPayers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchPayers = async () => {
        setIsLoading(true);
        try {
            const [payerData, employeeData] = await Promise.all([
                apiService.getExpenseClaimPayers(),
                apiService.getEmployees().catch(() => []),
            ]);
            setPayers(payerData);
            setEmployees(employeeData.filter((e: any) => !e.inactive));
        } catch (err) {
            console.error('Failed to fetch expense claim payers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPayers();
    }, []);

    const filteredPayers = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return [...payers]
            .filter((p) =>
                (p.name || '').toLowerCase().includes(query) ||
                (p.code || '').toLowerCase().includes(query) ||
                (p.employee?.name || '').toLowerCase().includes(query)
            )
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }, [payers, searchQuery]);

    const openNew = () => {
        setEditing(null);
        setName('');
        setEmployeeId('');
        setShowForm(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setName(p.name || '');
        setEmployeeId(p.employeeId || p.employee?.id || '');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!name.trim() && !employeeId) {
            alert('Enter a payer name or pick an employee.');
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await apiService.updateExpenseClaimPayer(editing.id, { name: name.trim(), employeeId: employeeId || '' });
            } else {
                await apiService.createExpenseClaimPayer({ name: name.trim(), employeeId: employeeId || undefined });
            }
            setShowForm(false);
            await fetchPayers();
        } catch (err: any) {
            alert('Failed to save: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            id: 'code',
            header: 'Code',
            accessor: (p: any) => <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">{p.code}</span>
        },
        {
            id: 'name',
            header: 'Name',
            accessor: (p: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
                        <Users size={14} />
                    </div>
                    <span className="font-bold text-slate-700">{p.name}</span>
                </div>
            )
        },
        {
            id: 'employee',
            header: 'Linked employee',
            accessor: (p: any) => p.employee ? (
                <button onClick={() => navigate(`/employees/view/${p.employee.id}`)} className="text-indigo-600 text-sm font-bold hover:underline">
                    {p.employee.code} · {p.employee.name}
                </button>
            ) : <span className="text-slate-400 text-sm">—</span>
        },
        {
            id: 'actions',
            header: '',
            accessor: (p: any) => (
                <button onClick={() => openEdit(p)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                    Edit
                </button>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 hover:text-blue-600 cursor-pointer text-xs font-bold uppercase tracking-widest transition-colors" onClick={() => navigate('/expense-claims')}>Expense Claims</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Payers</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expense Claim Payers</h1>
                        <p className="text-slate-500 text-sm mt-1">People who appear in Paid by when you create an expense claim</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => navigate('/employees')} className="h-10">Employees</Button>
                        <Button variant="primary" onClick={openNew} className="h-10 shadow-md shadow-blue-500/20">
                            <Plus size={16} className="mr-2" />
                            New Payer
                        </Button>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-4 flex gap-3 text-sm text-sky-900">
                    <HelpCircle size={18} className="shrink-0 mt-0.5" />
                    <ol className="list-decimal ml-4 space-y-1">
                        <li>Create the person under Master Data → Employees (optional but recommended).</li>
                        <li>Click <span className="font-bold">New Payer</span> here, or open the employee and choose <span className="font-bold">Add as expense payer</span>.</li>
                        <li>Accounting → Expense Claims → New Expense Claim → select them in <span className="font-bold">Paid by</span>.</li>
                        <li>Enter the vendor as Payee, add lines, and save. Reimburse later with a Payment if needed.</li>
                    </ol>
                </div>

                <div className="relative mt-6 max-w-2xl">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <DataTable
                        columns={columns}
                        data={filteredPayers}
                        isLoading={isLoading}
                        emptyMessage="No expense claim payers found. Add one with New Payer."
                    />
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900">{editing ? 'Edit Payer' : 'New Payer'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Link employee (optional)</label>
                            <select
                                value={employeeId}
                                onChange={(e) => {
                                    setEmployeeId(e.target.value);
                                    const emp = employees.find((x: any) => x.id === e.target.value);
                                    if (emp && !name) setName(emp.name);
                                    if (emp) setName((prev) => prev || emp.name);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800"
                            >
                                <option value="">No linked employee</option>
                                {employees.map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.code} · {e.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Payer name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name shown on claims"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Payer'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseClaimPayersView;
