import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, Users } from 'lucide-react';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';
import { Employee } from '../types';

const empty: Partial<Employee> = {
  code: '',
  name: '',
  department: '',
  jobTitle: '',
  email: '',
  phone: '',
  bankName: '',
  bankAccount: '',
  bankBranch: '',
  tpin: '',
  napsaNumber: '',
  nhimaNumber: '',
  nrc: '',
  inactive: false,
};

const Field = ({ label, value, onChange, readOnly, placeholder }: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">{label}</label>
    <input
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 ${readOnly ? 'bg-slate-100' : 'bg-slate-50'}`}
    />
  </div>
);

const NewEmployeeView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isView = location.pathname.includes('/view/');
  const isEditing = !!id;
  const [form, setForm] = useState<Partial<Employee>>(empty);
  const [payers, setPayers] = useState<Employee['payers']>([]);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Employee, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const load = async () => {
      if (!id) {
        try {
          const next = await apiService.getNextReference('employee');
          setForm({ ...empty, code: next });
        } catch {
          setForm({ ...empty, code: 'EMP-0001' });
        }
        return;
      }
      const employee = await apiService.getEmployee(id);
      setForm(employee);
      setPayers(employee.payers || []);
    };
    load().catch((err) => {
      console.error(err);
      alert('Failed to load employee');
    });
  }, [id]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      alert('Employee name is required.');
      return;
    }
    setSaving(true);
    try {
      if (isEditing) await apiService.updateEmployee(id!, form);
      else {
        const created = await apiService.createEmployee(form);
        navigate(`/employees/edit/${created.id}`);
        return;
      }
      navigate('/employees');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleMakePayer = async () => {
    if (!id) {
      alert('Save the employee first, then add them as a payer.');
      return;
    }
    try {
      const payer = await apiService.makeEmployeePayer(id);
      setPayers([payer]);
      alert(`${form.name} can now be selected as Paid by on expense claims.`);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to create payer');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/employees')} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
              <Users size={14} />
              <span>Master Data</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isView ? 'View Employee' : isEditing ? 'Edit Employee' : 'New Employee'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Bank and ID numbers are stored for claims. Payroll is not calculated here.</p>
          </div>
        </div>
        {!isView && (
          <Button variant="primary" className="rounded-xl px-6" onClick={handleSave} disabled={saving}>
            <Save size={18} className="mr-2" /> {saving ? 'Saving…' : isEditing ? 'Update' : 'Create'}
          </Button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Employee code" value={form.code || ''} onChange={(v) => set('code', v)} readOnly={isView} />
          <Field label="Full name" value={form.name || ''} onChange={(v) => set('name', v)} readOnly={isView} placeholder="e.g. Jane Banda" />
          <Field label="Department" value={form.department || ''} onChange={(v) => set('department', v)} readOnly={isView} placeholder="e.g. Finance" />
          <Field label="Job title" value={form.jobTitle || ''} onChange={(v) => set('jobTitle', v)} readOnly={isView} />
          <Field label="Email" value={form.email || ''} onChange={(v) => set('email', v)} readOnly={isView} />
          <Field label="Phone" value={form.phone || ''} onChange={(v) => set('phone', v)} readOnly={isView} />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Bank details (for reimbursements)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Bank name" value={form.bankName || ''} onChange={(v) => set('bankName', v)} readOnly={isView} />
            <Field label="Account number" value={form.bankAccount || ''} onChange={(v) => set('bankAccount', v)} readOnly={isView} />
            <Field label="Branch" value={form.bankBranch || ''} onChange={(v) => set('bankBranch', v)} readOnly={isView} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Statutory IDs (stored only — no PAYE/NAPSA/NHIMA run)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="TPIN" value={form.tpin || ''} onChange={(v) => set('tpin', v)} readOnly={isView} />
            <Field label="NRC" value={form.nrc || ''} onChange={(v) => set('nrc', v)} readOnly={isView} />
            <Field label="NAPSA number" value={form.napsaNumber || ''} onChange={(v) => set('napsaNumber', v)} readOnly={isView} />
            <Field label="NHIMA number" value={form.nhimaNumber || ''} onChange={(v) => set('nhimaNumber', v)} readOnly={isView} />
          </div>
        </div>

        {!isView && (
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={Boolean(form.inactive)} onChange={(e) => set('inactive', e.target.checked)} />
            Inactive
          </label>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-800">Expense claim payer</p>
          <p className="text-sm text-slate-500 mt-1">
            {payers?.length
              ? `${form.name} is already a payer and can be selected as Paid by on claims.`
              : 'Add this person as a payer so they appear on New Expense Claim → Paid by.'}
          </p>
        </div>
        {payers?.length ? (
          <Button variant="secondary" onClick={() => navigate('/expense-claim-payers')}>Open Payers</Button>
        ) : (
          <Button variant="primary" onClick={handleMakePayer} disabled={!id}>
            <UserPlus size={16} className="mr-2" /> Add as expense payer
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewEmployeeView;
