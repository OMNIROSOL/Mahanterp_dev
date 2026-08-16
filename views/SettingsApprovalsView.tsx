import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Settings, 
  ArrowLeft, 
  Save, 
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';

const SettingsApprovalsView = () => {
  const navigate = useNavigate();
  const [marginThreshold, setMarginThreshold] = useState('10');
  const [enableStockApproval, setEnableStockApproval] = useState(true);
  const [enablePriceApproval, setEnablePriceApproval] = useState(true);
  const [enableCreditLimitApproval, setEnableCreditLimitApproval] = useState(false);
  const [minAmountForApproval, setMinAmountForApproval] = useState('1000');

  const handleSave = () => {
    // In a real app, this would save to a database or global state
    alert('Approval settings saved successfully!');
    navigate('/settings');
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
              <ShieldCheck size={14} />
              <span>Workflow Configuration</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Approval Settings</h1>
          </div>
        </div>
        <Button 
          variant="primary" 
          className="rounded-xl px-6"
          onClick={handleSave}
        >
          <Save size={18} className="mr-2" /> Save Changes
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Margin Threshold */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Percent size={24} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Profit Margin Threshold</h3>
                <p className="text-sm text-slate-500">Quotes with a margin below this percentage will require manager approval.</p>
              </div>
              <div className="flex items-center gap-4 max-w-xs">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={marginThreshold}
                    onChange={(e) => setMarginThreshold(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
                <Info size={16} className="text-indigo-500 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Current logic: (Selling Price - Unit Cost) / Selling Price. If the result is less than the threshold, approval is triggered.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Global Triggers */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Settings size={24} />
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Approval Triggers</h3>
                <p className="text-sm text-slate-500">Enable or disable automatic approval requirements based on document content.</p>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Insufficient Stock</p>
                      <p className="text-[10px] text-slate-500 font-medium">Require approval if quantity exceeds available stock</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={enableStockApproval} 
                    onChange={(e) => setEnableStockApproval(e.target.checked)}
                    className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <DollarSign size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Price Below Purchase Cost</p>
                      <p className="text-[10px] text-slate-500 font-medium">Require approval if unit price is less than item's purchase price</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={enablePriceApproval} 
                    onChange={(e) => setEnablePriceApproval(e.target.checked)}
                    className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <Clock size={16} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Large Transaction Value</p>
                      <p className="text-[10px] text-slate-500 font-medium">Require approval for documents exceeding a specific amount</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {enableCreditLimitApproval && (
                      <input
                        type="number"
                        value={minAmountForApproval}
                        onChange={(e) => setMinAmountForApproval(e.target.value)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    )}
                    <input 
                      type="checkbox" 
                      checked={enableCreditLimitApproval} 
                      onChange={(e) => setEnableCreditLimitApproval(e.target.checked)}
                      className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsApprovalsView;
