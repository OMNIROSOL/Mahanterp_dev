import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, ArrowRightLeft, Calendar, MapPin, 
  ClipboardList, AlertCircle, Clock, Check, FileText, Send
} from 'lucide-react';
import apiService from '../services/apiService';

const ViewInventoryTransferView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [transfer, setTransfer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(apiService.getCurrentUser());

  useEffect(() => {
    const fetchTransfer = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await apiService.getInventoryTransfer(id);
        setTransfer(data);
      } catch (err) {
        console.error('Failed to fetch inventory transfer:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransfer();
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
    if (!transfer) return;
    try {
      setIsLoading(true);
      await apiService.updateInventoryTransferStatus(transfer.id, newStatus);
      const updated = await apiService.getInventoryTransfer(transfer.id);
      setTransfer(updated);
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
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading transfer details...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-8 text-center mt-20">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Transfer Not Found</h2>
        <button 
          onClick={() => navigate('/inventory-transfers')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Back to Transfers
        </button>
      </div>
    );
  }

  // Workflow Logic Helper Variables
  const userRole = currentUser.role;
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager' || isAdmin;
  const currentStatus = transfer.status || 'Draft';

  // Dynamic visual timeline setup
  const timelineSteps = [
    { key: 'Draft', label: 'Draft', desc: 'Transfer created in draft mode' },
    { key: 'Pending Approval', label: 'Pending Approval', desc: 'Awaiting manager authorization' },
    { key: 'Approved', label: 'Approved', desc: 'Approved. Warehouse staff preparing shipment' },
    { key: 'Ready to Dispatch', label: 'Ready to Dispatch', desc: 'Internal Delivery Note prepared' },
    { key: 'Sent', label: 'Sent', desc: 'Dispatched. Shipment in transit' },
    { key: 'Received', label: 'Received', desc: 'Received. Internal GRN posted' }
  ];

  const getStepState = (stepKey: string) => {
    const order = ['Draft', 'Pending Approval', 'Approved', 'Ready to Dispatch', 'Sent', 'Received'];
    const stepIdx = order.indexOf(stepKey);
    const currentIdx = order.indexOf(currentStatus);
    
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory-transfers')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
              <ArrowRightLeft size={12} />
              <span>Inventory Transfer Details</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{transfer.reference}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                currentStatus === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                currentStatus === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                currentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                currentStatus === 'Ready to Dispatch' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                currentStatus === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                'bg-emerald-600 text-white border-emerald-700'
              }`}>
                {currentStatus}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-medium mt-0.5">Date: {transfer.date}</p>
          </div>
        </div>

        {/* Dynamic Contextual Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {currentStatus !== 'Received' && (
            <button
              onClick={() => navigate(`/inventory-transfers/edit/${transfer.id}`)}
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
                    <Check size={14} /> Approve Transfer
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                  <Clock size={14} className="animate-spin text-amber-500" /> Awaiting Manager Approval
                </div>
              )}
            </>
          )}

          {/* Approved state -> Prepare Delivery Note */}
          {currentStatus === 'Approved' && (
            <button
              onClick={() => handleStatusChange('Ready to Dispatch')}
              className="px-6 py-2 bg-blue-600 text-[11px] font-black text-white rounded-md hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2 uppercase tracking-widest"
            >
              <FileText size={14} /> Prepare Delivery Note
            </button>
          )}

          {/* Ready to Dispatch state -> Dispatch shipment */}
          {currentStatus === 'Ready to Dispatch' && (
            <button
              onClick={() => handleStatusChange('Sent')}
              className="px-6 py-2 bg-indigo-600 text-[11px] font-black text-white rounded-md hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest"
            >
              <Send size={14} /> Mark as Sent (Ship)
            </button>
          )}

          {/* Sent state -> Receive shipment */}
          {currentStatus === 'Sent' && (
            <button
              onClick={() => handleStatusChange('Received')}
              className="px-6 py-2 bg-emerald-600 text-[11px] font-black text-white rounded-md hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2 uppercase tracking-widest"
            >
              <Check size={14} /> Mark as Received (Post GRN)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">From Location</label>
                    <div className="text-sm font-bold text-slate-700">{transfer.fromLocation}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">To Location</label>
                    <div className="text-sm font-bold text-slate-700">{transfer.toLocation}</div>
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
                    <div className="text-sm font-bold text-slate-700">{transfer.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Status</label>
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">{currentStatus}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-gray-50">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-2">Description</label>
              <div className="text-sm font-medium text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                "{transfer.description || 'No description provided'}"
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4 mb-6">Transferred Items</h2>
            <div className="space-y-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Item</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transfer.items && transfer.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="py-4">
                        <div className="text-sm font-bold text-slate-700">{item.inventoryItem}</div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="text-sm font-black text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-lg border border-blue-100">{item.qty} units</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Timeline & Generated Documents */}
        <div className="space-y-8">
          {/* Timeline */}
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/10 pb-4">Transfer Workflow</h2>
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

          {/* Generated Internal Documents */}
          {(transfer.deliveryNoteId || transfer.goodsReceivedNoteId) && (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100 pb-4">Internal Documents</h2>
              <div className="space-y-3">
                {transfer.deliveryNoteId && (
                  <button
                    onClick={() => navigate(`/delivery-notes/view/${transfer.deliveryNoteId}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      <span>Internal Delivery Note</span>
                    </div>
                    <span className="text-[9px] bg-indigo-100 px-2 py-0.5 rounded text-indigo-800 font-bold">INTDN</span>
                  </button>
                )}
                {transfer.goodsReceivedNoteId && (
                  <button
                    onClick={() => navigate(`/goods-received-notes/view/${transfer.goodsReceivedNoteId}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 text-emerald-700 text-xs font-bold transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-emerald-500" />
                      <span>Internal GRN Posted</span>
                    </div>
                    <span className="text-[9px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">INTGRN</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewInventoryTransferView;
