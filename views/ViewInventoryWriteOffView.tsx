import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, FileX, Calendar, Package, Trash2, 
  AlertCircle, TrendingDown, Clock, Check, Send
} from 'lucide-react';
import apiService from '../services/apiService';

const ViewInventoryWriteOffView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [writeOff, setWriteOff] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(apiService.getCurrentUser());

  useEffect(() => {
    const fetchWriteOff = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await apiService.getInventoryWriteOff(id);
        setWriteOff(data);
      } catch (err) {
        console.error('Failed to fetch inventory write-off:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWriteOff();
  }, [id]);

  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUser(apiService.getCurrentUser());
    };
    window.addEventListener('user_sim_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('user_sim_updated', handleUserUpdate);
    };
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (!writeOff) return;
    try {
      setIsLoading(true);
      await apiService.updateInventoryWriteOffStatus(writeOff.id, newStatus);
      const updated = await apiService.getInventoryWriteOff(writeOff.id);
      setWriteOff(updated);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Failed to update status: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading write-off details...</p>
      </div>
    );
  }

  if (!writeOff) {
    return (
      <div className="p-8 text-center mt-20">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Write-off Not Found</h2>
        <button 
          onClick={() => navigate('/inventory-write-offs')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Back to Write-offs
        </button>
      </div>
    );
  }

  const userRole = currentUser.role;
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager' || isAdmin;
  const currentStatus = writeOff.status || 'Draft';

  const timelineSteps = [
    { key: 'Draft', label: 'Draft', desc: 'Adjustment details compiled' },
    { key: 'Pending Approval', label: 'Pending Approval', desc: 'Awaiting manager authorization' },
    { key: 'Approved', label: 'Approved', desc: 'Approved & posted. Stock decremented.' }
  ];

  const getStepState = (stepKey: string) => {
    const order = ['Draft', 'Pending Approval', 'Approved'];
    const stepIdx = order.indexOf(stepKey);
    const currentIdx = order.indexOf(currentStatus);
    
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory-write-offs')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">
              <FileX size={12} />
              <span>Inventory Write-off Details</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{writeOff.reference}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                currentStatus === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                currentStatus === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                'bg-emerald-600 text-white border-emerald-700'
              }`}>
                {currentStatus}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-medium mt-0.5">Date: {writeOff.date}</p>
          </div>
        </div>

        {/* Dynamic Contextual Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {currentStatus !== 'Approved' && (
            <button
              onClick={() => navigate(`/inventory-write-offs/edit/${writeOff.id}`)}
              className="px-6 py-2 bg-white text-[11px] font-black text-gray-700 rounded-md hover:bg-gray-50 border border-gray-200 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
            >
              <Edit size={14} /> Edit
            </button>
          )}

          {/* Draft state -> Submit for Approval */}
          {currentStatus === 'Draft' && (
            <button
              onClick={() => handleStatusChange('Pending Approval')}
              className="px-6 py-2 bg-indigo-600 text-[11px] font-black text-white rounded-md hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest"
            >
              <Send size={14} /> Submit for Approval
            </button>
          )}

          {/* Pending Approval state -> Manager Action */}
          {currentStatus === 'Pending Approval' && (
            <>
              {isManager ? (
                <>
                  <button
                    onClick={() => handleStatusChange('Draft')}
                    className="px-6 py-2 bg-rose-600 text-[11px] font-black text-white rounded-md hover:bg-rose-700 transition-all shadow-md shadow-rose-100 flex items-center gap-2 uppercase tracking-widest"
                  >
                    Reject to Draft
                  </button>
                  <button
                    onClick={() => handleStatusChange('Approved')}
                    className="px-6 py-2 bg-emerald-600 text-[11px] font-black text-white rounded-md hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Check size={14} /> Approve Write-off
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                  <Clock size={14} className="animate-spin text-amber-500" /> Awaiting Manager Approval
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Inventory Item</label>
                    <div className="text-sm font-bold text-slate-700">{writeOff.inventoryItem}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Quantity Adjusted</label>
                    <div className="text-sm font-bold text-rose-600">-{writeOff.qty} units</div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Date Created</label>
                    <div className="text-sm font-bold text-slate-700">{writeOff.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <span className="font-black text-xs">$$</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Write-off Value</label>
                    <div className="text-sm font-black text-rose-600">ZMW {(writeOff.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-2">Expense Account</label>
                <div className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 inline-block">
                  {writeOff.account}
                </div>
              </div>
              <div className="flex flex-col justify-center items-end">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-2 text-right">Transaction Status</label>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  currentStatus === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                  currentStatus === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-emerald-600 text-white border-emerald-700'
                }`}>
                  {currentStatus}
                </span>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-50">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-2">Reason for Adjustment</label>
              <div className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-4 border-rose-200 pl-4 py-2">
                "{writeOff.description || 'No description provided'}"
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Timeline sidebar */}
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/10 pb-4">Write-off Workflow</h2>
            <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
              {timelineSteps.map((step) => {
                const state = getStepState(step.key);
                return (
                  <div key={step.key} className="relative pl-10">
                    {state === 'completed' && (
                      <div className="absolute left-[9px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    {state === 'active' && (
                      <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-ping"></div>
                    )}
                    {state === 'active' && (
                      <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                    )}
                    {state === 'pending' && (
                      <div className="absolute left-[12px] top-2 w-2 h-2 rounded-full bg-slate-700"></div>
                    )}

                    <div className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                      state === 'active' ? 'text-blue-400 font-bold' : 
                      state === 'completed' ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-xs ${state === 'pending' ? 'text-slate-500' : 'text-slate-200 font-semibold'}`}>
                      {step.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-rose-900 p-8 rounded-3xl shadow-2xl text-white space-y-6 font-sans">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/50 border-b border-white/10 pb-4">Accounting Impact</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-200">Asset Decrease</div>
                <div className="text-sm font-black">ZMW {(writeOff.amount || 0).toLocaleString()}</div>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-200">Expense Increase</div>
                <div className="text-sm font-black">ZMW {(writeOff.amount || 0).toLocaleString()}</div>
              </div>
              <p className="text-[10px] text-rose-200/60 leading-relaxed text-center px-4">
                This transaction marks the inventory as unusable and shifts the cost to the specified expense account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInventoryWriteOffView;
