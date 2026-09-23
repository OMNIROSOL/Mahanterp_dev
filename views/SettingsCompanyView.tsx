import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { getCompanyProfile, saveCompanyProfile } from '../utils/companyProfile';
import Button from '../components/shared/Button';

const SettingsCompanyView = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(getCompanyProfile());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveCompanyProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
              <Building2 size={14} />
              <span>Print identity</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Company Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Name, address and TPIN appear on A4 sales and purchase documents.</p>
          </div>
        </div>
        <Button variant="primary" className="rounded-xl px-6" onClick={handleSave}>
          <Save size={18} className="mr-2" /> {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {([
          ['name', 'Company name'],
          ['tpin', 'TPIN'],
          ['phone', 'Phone'],
          ['email', 'Email'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">{label}</label>
            <input
              value={(form as any)[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800"
            />
          </div>
        ))}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800"
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsCompanyView;
