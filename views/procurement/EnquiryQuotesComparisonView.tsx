import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSearch, ArrowRight, TrendingDown, Clock, CheckCircle2, ChevronDown, ChevronRight, ShoppingCart,
  Check, X
} from 'lucide-react';
import apiService from '../../services/apiService';

const EnquiryQuotesComparisonView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [convertingQuote, setConvertingQuote] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await apiService.getQuoteAnalysis();
        setEnquiries(data || []);
      } catch (err) {
        console.error('Failed to load quote analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const groupedQuotes = useMemo(() => {
    const map: Record<string, any> = {};
    
    enquiries.forEach(enq => {
      const supplier = enq.supplier;
      const totalLeadTimeDays = (Number(supplier?.leadTimeProcessing) || 0) +
                                (Number(supplier?.leadTimeProduction) || 0) +
                                (Number(supplier?.leadTimeShipping) || 0) +
                                (Number(supplier?.leadTimeRoad) || 0) +
                                (Number(supplier?.leadTimeExtra) || 0);

      enq.items?.forEach((ei: any) => {
        const itemName = ei.item?.itemName || ei.description || 'Unknown Item';
        if (!map[itemName]) {
          map[itemName] = {
            itemName,
            quotes: []
          };
        }
        map[itemName].quotes.push({
          enquiryId: enq.id,
          reference: enq.reference,
          date: enq.issueDate,
          supplierName: supplier?.name || 'Unknown',
          itemId: ei.itemId,
          itemName: itemName,
          qty: Number(ei.qty),
          unitPrice: Number(ei.unitPrice),
          totalPrice: Number(ei.totalAmount),
          leadTimeDays: totalLeadTimeDays
        });
      });
    });

    // Calculate best metrics for each item to drive the Smart Badges
    Object.values(map).forEach((group: any) => {
      let minPrice = Infinity;
      let minLeadTime = Infinity;
      
      group.quotes.forEach((q: any) => {
        if (q.unitPrice < minPrice && q.unitPrice > 0) minPrice = q.unitPrice;
        if (q.leadTimeDays < minLeadTime && q.leadTimeDays > 0) minLeadTime = q.leadTimeDays;
      });
      
      group.quotes.forEach((q: any) => {
        q.isBestPrice = (q.unitPrice === minPrice && minPrice !== Infinity);
        q.isFastest = (q.leadTimeDays === minLeadTime && minLeadTime !== Infinity);
      });
    });

    return Object.values(map);
  }, [enquiries]);

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  const convertToPO = (quote: any) => {
    setConvertingQuote(quote);
  };

  const confirmConversion = async (type: 'item' | 'supplier') => {
    if (!convertingQuote) return;
    try {
      if (type === 'item') {
        await apiService.updatePurchaseEnquiryStatus(convertingQuote.enquiryId, 'Partially Accepted', [convertingQuote.itemId]);
      } else {
        await apiService.updatePurchaseEnquiryStatus(convertingQuote.enquiryId, 'Accepted');
      }
      navigate('/purchase-orders');
    } catch (err) {
      console.error('Failed to convert to PO:', err);
      alert('Failed to convert. Please try again.');
    } finally {
      setConvertingQuote(null);
    }
  };

  const rejectQuote = async (quote: any) => {
    try {
      await apiService.updatePurchaseEnquiryStatus(quote.enquiryId, 'Rejected');
      // Reload the data so the rejected quote disappears or updates
      setLoading(true);
      const data = await apiService.getQuoteAnalysis();
      setEnquiries(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex items-center space-x-2 text-slate-400">
          <FileSearch size={24} className="animate-bounce" />
          <span className="font-black tracking-widest uppercase text-sm">Aggregating Quotes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans min-h-screen bg-slate-50/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
            <FileSearch size={14} />
            <span className="text-slate-400">Strategic Sourcing</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quote Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">Compare active purchase enquiries and identify the best supplier for each item.</p>
        </div>
      </div>

      {groupedQuotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <FileSearch size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">No Active Enquiries Found</h3>
          <p className="text-slate-500 text-sm">Create new Purchase Enquiries and mark them as active to see quote comparisons here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedQuotes.map((group: any, idx) => {
            const isExpanded = expandedItems[group.itemName] !== false; // Default expanded
            
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* Group Header */}
                <div 
                  className="p-4 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(group.itemName)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{group.itemName}</h3>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {group.quotes.length} Competing Quotes
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Body (Quotes Table) */}
                {isExpanded && (
                  <div className="p-0 border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="p-4 whitespace-nowrap">Enquiry Ref</th>
                          <th className="p-4 whitespace-nowrap">Date</th>
                          <th className="p-4 whitespace-nowrap">Supplier</th>
                          <th className="p-4 text-right whitespace-nowrap">Qty</th>
                          <th className="p-4 text-right whitespace-nowrap">Unit Price</th>
                          <th className="p-4 text-right whitespace-nowrap">Total Price</th>
                          <th className="p-4 text-center whitespace-nowrap">Lead Time</th>
                          <th className="p-4 whitespace-nowrap">Suggestion</th>
                          <th className="p-4 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {group.quotes.map((q: any, qIdx: number) => (
                          <tr key={qIdx} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${q.isBestPrice ? 'bg-emerald-50/30' : ''}`}>
                            <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{q.reference}</td>
                            <td className="p-4 text-slate-500 text-xs whitespace-nowrap">{new Date(q.date).toLocaleDateString('en-GB')}</td>
                            <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{q.supplierName}</td>
                            <td className="p-4 text-right font-semibold text-slate-700 whitespace-nowrap">{q.qty}</td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <span className={`font-black ${q.isBestPrice ? 'text-emerald-600' : 'text-slate-900'}`}>
                                ${q.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-900 whitespace-nowrap">
                              ${q.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${q.isFastest ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                <Clock size={12} /> {q.leadTimeDays > 0 ? `${q.leadTimeDays}d` : 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {q.isBestPrice && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
                                    <TrendingDown size={10} /> Lowest Price
                                  </span>
                                )}
                                {q.isFastest && q.leadTimeDays > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full w-fit">
                                    <ArrowRight size={10} /> Fastest Delivery
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => convertToPO(q)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
                                  title="Convert to Purchase Order"
                                >
                                  <Check size={13} strokeWidth={3} />
                                </button>
                                <button
                                  onClick={() => rejectQuote(q)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-500 transition-all shadow-sm"
                                  title="Reject Quote"
                                >
                                  <X size={13} strokeWidth={3} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {convertingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Convert to Purchase Order</h3>
              <button onClick={() => setConvertingQuote(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">How would you like to convert this quote from <strong>{convertingQuote.supplierName}</strong>?</p>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => confirmConversion('item')}
                  className="flex flex-col text-left p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
                >
                  <span className="font-bold text-indigo-700">Convert ONLY this item</span>
                  <span className="text-xs text-indigo-500 mt-1">Create a PO just for <strong>{convertingQuote.itemName}</strong>.</span>
                </button>
                
                <button 
                  onClick={() => confirmConversion('supplier')}
                  className="flex flex-col text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                  <span className="font-bold text-slate-700">Convert ENTIRE Enquiry</span>
                  <span className="text-xs text-slate-500 mt-1">Accept the full quote for all items in Enquiry {convertingQuote.reference}.</span>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setConvertingQuote(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnquiryQuotesComparisonView;
