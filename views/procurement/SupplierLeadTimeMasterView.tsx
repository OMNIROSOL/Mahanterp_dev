import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Save, ArrowLeft, ShieldAlert, CheckCircle2, Building2, Globe2, ShieldCheck, ChevronRight
} from 'lucide-react';
import apiService from '../../services/apiService';
import Card from '../../components/shared/Card';

const SupplierLeadTimeMasterView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // User details for admin check
  const currentUser = apiService.getCurrentUser();
  const isAdmin = currentUser.role === 'Admin';

  // Lead time inputs state
  const [leadTimes, setLeadTimes] = useState({
    country: '',
    brand: '',
    moq: '0',
    containerCapacity: '',
    leadTimeProcessing: '0',
    leadTimeProduction: '0',
    leadTimeShipping: '0',
    leadTimeRoad: '0',
    leadTimeExtra: '0'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const allSuppliers = await apiService.getSuppliers();
      setSuppliers(allSuppliers || []);
      if (allSuppliers?.length > 0) {
        setSelectedSupplierId(allSuppliers[0].id);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSupplier = useMemo(() => {
    if (!suppliers || !selectedSupplierId) return null;
    return suppliers.find((s: any) => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Sync state when supplier changes
  useEffect(() => {
    if (selectedSupplier) {
      setLeadTimes({
        country: selectedSupplier.country || '',
        brand: selectedSupplier.brand || '',
        moq: String(selectedSupplier.moq || 0),
        containerCapacity: selectedSupplier.containerCapacity || '',
        leadTimeProcessing: String(selectedSupplier.leadTimeProcessing || 0),
        leadTimeProduction: String(selectedSupplier.leadTimeProduction || 0),
        leadTimeShipping: String(selectedSupplier.leadTimeShipping || 0),
        leadTimeRoad: String(selectedSupplier.leadTimeRoad || 0),
        leadTimeExtra: String(selectedSupplier.leadTimeExtra || 0)
      });
      setSuccessMessage('');
    }
  }, [selectedSupplier]);

  const totalLeadTimeDays = useMemo(() => {
    return (Number(leadTimes.leadTimeProcessing) || 0) +
           (Number(leadTimes.leadTimeProduction) || 0) +
           (Number(leadTimes.leadTimeShipping) || 0) +
           (Number(leadTimes.leadTimeRoad) || 0) +
           (Number(leadTimes.leadTimeExtra) || 0);
  }, [leadTimes]);

  const totalLeadTimeMonths = useMemo(() => {
    return parseFloat((totalLeadTimeDays / 30).toFixed(2));
  }, [totalLeadTimeDays]);

  const handleSaveSettings = async () => {
    if (!selectedSupplierId) return;
    setSaving(true);
    setSuccessMessage('');
    try {
      await apiService.updateSupplierLeadTime(selectedSupplierId, {
        leadTimeProcessing: Number(leadTimes.leadTimeProcessing) || 0,
        leadTimeProduction: Number(leadTimes.leadTimeProduction) || 0,
        leadTimeShipping: Number(leadTimes.leadTimeShipping) || 0,
        leadTimeRoad: Number(leadTimes.leadTimeRoad) || 0,
        leadTimeExtra: Number(leadTimes.leadTimeExtra) || 0,
        moq: Number(leadTimes.moq) || 0,
        containerCapacity: leadTimes.containerCapacity,
        brand: leadTimes.brand,
        country: leadTimes.country
      });
      setSuccessMessage('Lead time settings successfully updated!');
      // Update local supplier details
      setSuppliers(prev => prev.map(s => {
        if (s.id === selectedSupplierId) {
          return {
            ...s,
            country: leadTimes.country,
            brand: leadTimes.brand,
            moq: Number(leadTimes.moq) || 0,
            containerCapacity: leadTimes.containerCapacity,
            leadTimeProcessing: Number(leadTimes.leadTimeProcessing) || 0,
            leadTimeProduction: Number(leadTimes.leadTimeProduction) || 0,
            leadTimeShipping: Number(leadTimes.leadTimeShipping) || 0,
            leadTimeRoad: Number(leadTimes.leadTimeRoad) || 0,
            leadTimeExtra: Number(leadTimes.leadTimeExtra) || 0
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('Failed to update lead times:', err);
      alert('Error updating lead times.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center font-sans mt-20">
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 shadow-xl shadow-rose-100/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-black text-rose-950 uppercase tracking-wider">Access Restrained</h1>
          <p className="text-rose-700 text-sm max-w-md font-medium leading-relaxed">
            The Lead Time Planner Master controls core supply chain planning variables and is restricted to administrator accounts.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[11px] px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Supplier Lead Times...</p>
      </div>
    );
  }

  return (
    <div className="p-0 bg-slate-50 min-h-screen">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
        <Building2 size={12} />
        <ChevronRight size={10} className="opacity-30" />
        <span className="text-slate-600">Procurement Planning</span>
        <ChevronRight size={10} className="opacity-30" />
        <span className="text-slate-600">Lead Time Planner Master</span>
      </div>

      <div className="p-8 space-y-8 max-w-4xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/60 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
              <ShieldCheck size={14} />
              <span>Admin Module</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supplier Lead Time Planner Master</h1>
            <p className="text-slate-500 text-sm">Configure reorder calculations and shipping logistics constants per supplier</p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center space-x-3 text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wide">{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Controls Card */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Target Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {suppliers.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>{sup.name} ({sup.code})</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                <Globe2 size={16} /> Supplier Logistics & MOQ
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Supplier Country</label>
                  <input
                    type="text"
                    value={leadTimes.country}
                    onChange={(e) => setLeadTimes({ ...leadTimes, country: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="e.g. South Africa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Brand Name</label>
                  <input
                    type="text"
                    value={leadTimes.brand}
                    onChange={(e) => setLeadTimes({ ...leadTimes, brand: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="e.g. VOLVO"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minimum Order Qty (MOQ)</label>
                  <input
                    type="number"
                    value={leadTimes.moq}
                    onChange={(e) => setLeadTimes({ ...leadTimes, moq: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Container Capacity</label>
                  <input
                    type="text"
                    value={leadTimes.containerCapacity}
                    onChange={(e) => setLeadTimes({ ...leadTimes, containerCapacity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="e.g. 20ft container"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                <Clock size={16} /> Lead Time Breakdown (Days)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Processing Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimes.leadTimeProcessing}
                    onChange={(e) => setLeadTimes({ ...leadTimes, leadTimeProcessing: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Production Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimes.leadTimeProduction}
                    onChange={(e) => setLeadTimes({ ...leadTimes, leadTimeProduction: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Shipping Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimes.leadTimeShipping}
                    onChange={(e) => setLeadTimes({ ...leadTimes, leadTimeShipping: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Road Transport Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimes.leadTimeRoad}
                    onChange={(e) => setLeadTimes({ ...leadTimes, leadTimeRoad: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Extra Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimes.leadTimeExtra}
                    onChange={(e) => setLeadTimes({ ...leadTimes, leadTimeExtra: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* System Calculation Summary Card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-6 flex flex-col justify-between shadow-xl shadow-slate-900/10">
            <div className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                <Clock size={16} /> Lead Time Calculations
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col border-b border-white/10 pb-4">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Lead Time</span>
                  <span className="text-3xl font-black text-white tracking-tight">{totalLeadTimeDays} Days</span>
                </div>
                
                <div className="flex flex-col border-b border-white/10 pb-4">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lead Time in Months</span>
                  <span className="text-3xl font-black text-blue-400 tracking-tight">{totalLeadTimeMonths} Months</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Projected Delivery ETA</span>
                  <span className="text-lg font-black text-slate-200">
                    {new Date(Date.now() + totalLeadTimeDays * 86400000).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
            >
              <Save size={14} /> {saving ? 'Saving Specs...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierLeadTimeMasterView;
