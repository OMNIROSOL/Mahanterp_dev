import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertCircle, FileText, Package } from 'lucide-react';
import apiService from '../services/apiService';

const InventoryItemLedgerView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [itemData, transData] = await Promise.all([
          apiService.getItem(id),
          apiService.getItemTransactions(id)
        ]);
        setItem(itemData);
        setTransactions(transData || []);
      } catch (err) {
        console.error('Failed to fetch ledger:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Loading ledger...</div>;

  if (!item) {
    return (
      <div className="p-8 text-center mt-20">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Item Not Found</h2>
        <button 
          onClick={() => navigate('/inventory-items')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  let runningBalance = 0;
  const reversed = [...transactions].reverse();
  const withBalance = reversed.map(t => {
    runningBalance += Number(t.qtyChange);
    return { ...t, balance: runningBalance };
  });
  const displayTransactions = withBalance.reverse();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => navigate('/inventory-items')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-500" />
            Inventory Ledger
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
            {item.itemName} ({item.itemCode})
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty Change</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No transactions found for this item.
                  </td>
                </tr>
              ) : (
                displayTransactions.map((t, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-900">
                        {new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs font-bold text-slate-400">
                        {new Date(t.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                        <FileText size={14} className="text-slate-400" />
                        {t.transactionType}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-slate-600">{t.reference || '-'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{t.location?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-black ${Number(t.qtyChange) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {Number(t.qtyChange) > 0 ? '+' : ''}{Number(t.qtyChange)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {t.balance}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemLedgerView;
