import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar,
  ChevronLeft,
  FileText,
  Save,
  Clock,
  ChevronRight,
  X,
  Layers,
  Type,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { cn } from '../utils/cn';

const InputField = ({ label, value, onChange, placeholder, type = "text", Icon }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all`}
            />
        </div>
    </div>
);

const NewAgedReceivableReportView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-GB').split('/').join('.'),
    division: '',
    description: '',
    sortBy: 'Total'
  });

  useEffect(() => {
    if (isEdit) {
      const saved = localStorage.getItem('aged_receivable_reports');
      if (saved) {
        try {
          const reports = JSON.parse(saved);
          const report = reports.find((r: any) => r.id === id);
          if (report) {
            setFormData({
              date: report.date,
              division: report.division,
              description: report.description,
              sortBy: report.sortBy || 'Total'
            });
          }
        } catch (e) {
          console.error('Failed to load report for editing:', e);
        }
      }
    }
  }, [id, isEdit]);

  const handleSave = () => {
    const reportData = {
      id: isEdit ? id : `report-${Date.now()}`,
      date: formData.date,
      division: formData.division,
      description: formData.description,
      sortBy: formData.sortBy
    };

    const saved = localStorage.getItem('aged_receivable_reports');
    let reports = [];
    if (saved) {
      try {
        reports = JSON.parse(saved);
      } catch (e) {
        reports = [];
      }
    }
    
    if (isEdit) {
      const index = reports.findIndex((r: any) => r.id === id);
      if (index !== -1) {
        reports[index] = reportData;
      } else {
        reports.unshift(reportData);
      }
    } else {
      reports.unshift(reportData);
    }

    localStorage.setItem('aged_receivable_reports', JSON.stringify(reports));
    
    console.log(isEdit ? 'Updated Report:' : 'Generated New Report:', reportData);
    navigate('/reports/aged-receivables');
  };

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header Area - Premium Style */}
      <div className="flex justify-between items-center">
          <div>
              <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
                  <span className="cursor-pointer hover:underline" onClick={() => navigate('/reports/aged-receivables')}>Aged Receivables</span>
                  <ChevronRight size={10} className="opacity-50" />
                  <span className="text-slate-400">{isEdit ? 'Modify Existing' : 'Generate New'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Edit Report' : 'Report Configuration'}</h1>
          </div>
          <button
              onClick={() => navigate('/reports/aged-receivables')}
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
          >
              <X size={20} />
          </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-12 space-y-12">
            {/* Report Parameters Segment */}
            <div className="space-y-8">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Clock size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Time & Scope Parameters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField 
                        label="Report Date / Period End" 
                        value={formData.date} 
                        onChange={(e: any) => setFormData({ ...formData, date: e.target.value })} 
                        Icon={Calendar} 
                        placeholder="DD.MM.YYYY" 
                    />
                    <InputField 
                        label="Division (Optional)" 
                        value={formData.division} 
                        onChange={(e: any) => setFormData({ ...formData, division: e.target.value })} 
                        Icon={Layers} 
                        placeholder="e.g. Sales, Marketing..." 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sort By</label>
                        <div className="relative group">
                            <ArrowUpDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                            <select
                                value={(formData as any).sortBy || 'Total'}
                                onChange={(e) => setFormData({ ...formData, sortBy: e.target.value } as any)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="Total">Total</option>
                                <option value="Name">Name</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <InputField 
                        label="Report Description / Label" 
                        value={formData.description} 
                        onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} 
                        Icon={Type} 
                        placeholder="e.g. Q1 2026 Summary for Management" 
                    />
                </div>
            </div>

            <div className="pt-8 flex justify-end space-x-4 border-t border-slate-50">
                <button
                    onClick={() => navigate('/reports/aged-receivables')}
                    className="px-10 py-4 rounded-2xl text-[14px] font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-[0.1em]"
                >
                    Discard
                </button>
                <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-12 py-4 rounded-2xl text-[14px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    <Save size={18} /> {isEdit ? 'UPDATE REPORT' : 'GENERATE REPORT'}
                </button>
            </div>
        </div>
      </div>

      <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
          <Clock size={24} />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-blue-900 mb-1">Operational Note</h4>
          <p className="text-[12px] text-blue-700 leading-relaxed font-medium">
            {isEdit ? 'Updating this report will refresh its parameters but keep its historical ID. Previous data snapshots will be overwritten.' : 'Generating an Aged Receivables report will scan all customer ledgers for outstanding invoices. This process is optimized for performance but may take up to 30 seconds for large datasets.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewAgedReceivableReportView;
