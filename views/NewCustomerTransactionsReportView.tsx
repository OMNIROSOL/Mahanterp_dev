import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar,
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

const NewCustomerTransactionsReportView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    fromDate: '01.04.2026',
    toDate: '30.04.2026',
    division: '',
    description: '',
    sortBy: 'Date'
  });

  useEffect(() => {
    if (isEdit) {
      const saved = localStorage.getItem('customer_transaction_reports');
      if (saved) {
        try {
          const reports = JSON.parse(saved);
          const report = reports.find((r: any) => r.id === id);
          if (report) {
            setFormData({
              fromDate: report.fromDate || '01.04.2026',
              toDate: report.toDate || '30.04.2026',
              division: report.division,
              description: report.description,
              sortBy: report.sortBy || 'Date'
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
      id: isEdit ? id : `tx-report-${Date.now()}`,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      date: new Date().toLocaleDateString('en-GB').split('/').join('.'),
      division: formData.division,
      description: formData.description,
      sortBy: formData.sortBy,
      transactionCount: 0
    };

    const saved = localStorage.getItem('customer_transaction_reports');
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

    localStorage.setItem('customer_transaction_reports', JSON.stringify(reports));
    navigate('/reports/customer-transactions');
  };

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 font-sans">
      <div className="flex justify-between items-center">
          <div>
              <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 font-sans">
                  <span className="cursor-pointer hover:underline" onClick={() => navigate('/reports/customer-transactions')}>Customer Transactions</span>
                  <ChevronRight size={10} className="opacity-50" />
                  <span className="text-slate-400">{isEdit ? 'Modify Existing' : 'Generate New'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">{isEdit ? 'Edit Transaction Report' : 'Ledger Configuration'}</h1>
          </div>
          <button
              onClick={() => navigate('/reports/customer-transactions')}
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
          >
              <X size={20} />
          </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-12 space-y-12">
            <div className="space-y-8 font-sans">
                <div className="flex items-center space-x-4 border-b border-slate-50 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Analytical Bounds</h2>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Specify date range and scope</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField 
                        label="From Date" 
                        value={formData.fromDate} 
                        onChange={(e: any) => setFormData({ ...formData, fromDate: e.target.value })} 
                        Icon={Calendar} 
                        placeholder="DD.MM.YYYY" 
                    />
                    <InputField 
                        label="To Date" 
                        value={formData.toDate} 
                        onChange={(e: any) => setFormData({ ...formData, toDate: e.target.value })} 
                        Icon={Calendar} 
                        placeholder="DD.MM.YYYY" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField 
                        label="Division" 
                        value={formData.division} 
                        onChange={(e: any) => setFormData({ ...formData, division: e.target.value })} 
                        Icon={Layers} 
                        placeholder="Leave blank for All" 
                    />
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sort By</label>
                        <div className="relative group">
                            <ArrowUpDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                            <select
                                value={formData.sortBy}
                                onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="Date">Transaction Date</option>
                                <option value="Type">Transaction Type</option>
                                <option value="Amount">Transaction Amount</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <InputField 
                        label="Report Description" 
                        value={formData.description} 
                        onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} 
                        Icon={Type} 
                        placeholder="e.g. Audit trail for Zambia divisions" 
                    />
                </div>
            </div>

            <div className="pt-8 flex justify-end space-x-4 border-t border-slate-50">
                <button
                    onClick={() => navigate('/reports/customer-transactions')}
                    className="px-10 py-4 rounded-2xl text-[14px] font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-[0.1em]"
                >
                    Discard
                </button>
                <button
                    onClick={handleSave}
                    className="bg-indigo-600 text-white px-12 py-4 rounded-2xl text-[14px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    <Save size={18} /> {isEdit ? 'UPDATE REPORT' : 'GENERATE REPORT'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NewCustomerTransactionsReportView;
