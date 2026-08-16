import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Calendar, Package, ArrowLeft, Settings, Tag, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, History } from 'lucide-react';
import { apiService } from '../services/apiService';
import { InventoryUnitCost, InventoryItem } from '../types';

const InventoryUnitCostsView = () => {
  const navigate = useNavigate();
  const [unitCosts, setUnitCosts] = useState<InventoryUnitCost[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [costsData, itemsData] = await Promise.all([
        apiService.getInventoryUnitCosts(),
        apiService.getItems()
      ]);
      setUnitCosts(costsData);
      setItems(itemsData);
    } catch (err) {
      console.error('Failed to fetch inventory unit costs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupedCosts = React.useMemo(() => {
    const map = new Map<string, any>();
    const sorted = [...unitCosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach(cost => {
      if (!map.has(cost.itemId)) {
        map.set(cost.itemId, { ...cost, history: [cost] });
      } else {
        map.get(cost.itemId).history.push(cost);
      }
    });
    return Array.from(map.values());
  }, [unitCosts]);

  const filteredCosts = groupedCosts.filter(cost => 
    (cost.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cost.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit cost?')) {
      try {
        await apiService.deleteInventoryUnitCost(id);
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete unit cost.');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Helper to trigger template CSV download
  const downloadTemplate = () => {
    const headers = 'Date,Item Code,Unit Cost,Margin %,Min. Selling Price\n';
    const row1 = '2026-06-13,MI0001,2800,20,3360\n';
    const row2 = '2026-06-13,MI0323,35,30,45.5\n';
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + row1 + row2);
    
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'inventory_unit_cost_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV parsing & validation function
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) {
          alert('The file seems to be empty or missing headers.');
          setIsValidating(false);
          return;
        }

        // Parse headers and clean them up
        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        const results: any[] = [];
        const itemMap = new Map<string, InventoryItem>(items.map(item => [item.itemCode.toLowerCase().trim(), item]));

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse values respecting simple comma logic
          const values: string[] = [];
          let currentVal = '';
          let insideQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentVal.trim().replace(/^"|"$/g, ''));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^"|"$/g, ''));

          // Map values to fields dynamically
          const record: any = {};
          normalizedHeaders.forEach((header, idx) => {
            const val = values[idx];
            if (header === 'date') record.date = val;
            else if (header === 'itemcode') record.itemCode = val;
            else if (header === 'unitcost') record.unitCost = Number(val) || 0;
            else if (header === 'margin') record.marginPercent = Number(val) || 0;
            else if (header === 'marginpercent') record.marginPercent = Number(val) || 0;
            else if (header === 'minsellingprice') record.minSellingPrice = Number(val) || 0;
            else if (header === 'division') record.division = val;
          });

          // Validation logic
          const cleanItemCode = (record.itemCode || '').toLowerCase().trim();
          const matchedItem = itemMap.get(cleanItemCode);

          record.errors = [];
          if (!record.date) record.date = new Date().toISOString().split('T')[0];
          if (!record.itemCode) record.errors.push('Missing Item Code');
          if (record.unitCost === undefined || isNaN(record.unitCost)) record.errors.push('Invalid Unit Cost');
          if (!record.division) record.division = 'WAREHOUSE';

          if (record.itemCode && !matchedItem) {
            record.errors.push(`Item Code '${record.itemCode}' not found`);
          } else if (matchedItem) {
            record.itemName = `${matchedItem.itemCode} - ${matchedItem.itemName}`;
            record.category = matchedItem.category || '';
          }

          // Bidirectional auto calculations for preview missing margins or pricing
          if (record.unitCost && record.marginPercent && !record.minSellingPrice) {
            record.minSellingPrice = Number((record.unitCost * (1 + record.marginPercent / 100)).toFixed(2));
          } else if (record.unitCost && record.minSellingPrice && !record.marginPercent) {
            record.marginPercent = record.unitCost > 0 ? Number((((record.minSellingPrice - record.unitCost) / record.unitCost) * 100).toFixed(1)) : 0;
          }

          results.push(record);
        }

        setParsedRecords(results);
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Please verify it is a valid CSV file.');
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const validRecords = parsedRecords.filter(r => r.errors.length === 0);
    if (validRecords.length === 0) {
      alert('There are no valid records to import.');
      return;
    }

    setIsImporting(true);
    try {
      const payload = validRecords.map(r => ({
        date: r.date,
        itemCode: r.itemCode,
        unitCost: r.unitCost,
        marginPercent: r.marginPercent,
        minSellingPrice: r.minSellingPrice,
        division: r.division
      }));

      const response = await apiService.bulkCreateInventoryUnitCosts(payload);
      alert(`Successfully imported ${response.count} records!`);
      setShowImportModal(false);
      setParsedRecords([]);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
              <Settings size={12} />
              <span>Settings</span>
              <span className="text-gray-300">/</span>
              <span>Inventory</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Unit Costs</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-2.5 bg-white text-[11px] font-black text-gray-700 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 uppercase tracking-widest flex items-center gap-2"
          >
            <Upload size={14} /> Import Excel/CSV
          </button>
          <button
            onClick={() => navigate('/settings/inventory-unit-costs/new')}
            className="px-6 py-2.5 bg-blue-600 text-[11px] font-black text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 uppercase tracking-widest border border-blue-500"
          >
            <Plus size={14} /> New Inventory Unit Cost
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search items, categories or divisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Edit</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Item</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Unit cost</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Margin %</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Min. Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCosts.length > 0 ? (
                filteredCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate(`/settings/inventory-unit-costs/edit/${cost.id}`)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-blue-100 transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(cost.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedHistoryItem(cost);
                              setShowHistoryModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg border border-transparent hover:border-emerald-100 transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
                          >
                            <History size={12} /> History
                          </button>
                        </div>
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(cost.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-tight">
                        <Package size={14} className="text-gray-400" />
                        {cost.itemName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                        <Tag size={10} />
                        {cost.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-black text-gray-900">
                        <span className="text-[10px] text-gray-400">ZMW</span>
                        {(Number(cost.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-500">
                        {cost.marginPercent !== null && cost.marginPercent !== undefined ? `${Number(cost.marginPercent).toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-black text-emerald-600">
                        <span className="text-[10px] text-gray-400">ZMW</span>
                        {(Number(cost.minSellingPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    No unit cost records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600" /> Import Inventory Unit Costs
                </h2>
                <p className="text-xs text-slate-500 mt-1">Upload a CSV sheet to perform batch updates of acquisition costs and pricing margins.</p>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setParsedRecords([]);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {parsedRecords.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/10 transition-all">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Upload size={32} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">Choose CSV File</h3>
                    <p className="text-xs text-slate-400 mt-1">Make sure headers match template columns</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={downloadTemplate}
                      className="px-4 py-2 bg-slate-100 text-[10px] font-black text-slate-600 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest border border-slate-200"
                    >
                      Download Excel/CSV Template
                    </button>
                    <label className="px-6 py-2 bg-blue-600 text-[10px] font-black text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 cursor-pointer uppercase tracking-widest border border-blue-500">
                      Select File
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                      <AlertTriangle size={16} />
                      <span>Parsed {parsedRecords.length} records. Please review validations below before importing.</span>
                    </div>
                    <button 
                      onClick={() => setParsedRecords([])}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Clear and upload different file
                    </button>
                  </div>

                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[40vh]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-250 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Item Code</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3 text-right">Unit Cost (ZMW)</th>
                            <th className="px-4 py-3 text-right">Margin %</th>
                            <th className="px-4 py-3 text-right">Min. Price (ZMW)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRecords.map((rec, idx) => (
                            <tr key={idx} className={rec.errors.length > 0 ? 'bg-rose-50/30' : 'hover:bg-slate-50'}>
                              <td className="px-4 py-3">
                                {rec.errors.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                    <CheckCircle size={14} /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold" title={rec.errors.join(', ')}>
                                    <XCircle size={14} /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{rec.date}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">{rec.itemCode}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium max-w-xs truncate">
                                {rec.itemName || <span className="text-rose-500 italic">Code not matched</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                ZMW {rec.unitCost.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500 font-medium">
                                {rec.marginPercent ? `${rec.marginPercent}%` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                ZMW {rec.minSellingPrice.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {parsedRecords.length > 0 && (
                  <span>
                    Valid: <strong className="text-emerald-600">{parsedRecords.filter(r => r.errors.length === 0).length}</strong> / Total: <strong>{parsedRecords.length}</strong>
                  </span>
                )}
              </span>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setShowImportModal(false);
                    setParsedRecords([]);
                  }}
                  className="px-6 py-2.5 bg-white text-[11px] font-black text-gray-500 rounded-xl hover:bg-gray-100 transition-all border border-gray-200 uppercase tracking-widest flex items-center gap-2"
                >
                  Close
                </button>
                {parsedRecords.length > 0 && (
                  <button 
                    disabled={isImporting || parsedRecords.filter(r => r.errors.length === 0).length === 0}
                    onClick={handleImportSubmit}
                    className="px-8 py-2.5 bg-blue-600 text-[11px] font-black text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 uppercase tracking-widest border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? 'Importing...' : `Import ${parsedRecords.filter(r => r.errors.length === 0).length} Records`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Cost History</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Cost change history for {selectedHistoryItem.itemName}</p>
              </div>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryItem(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Unit Cost (ZMW)</th>
                    <th className="px-4 py-3 text-right">Margin %</th>
                    <th className="px-4 py-3 text-right">Min. Price (ZMW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedHistoryItem.history.map((hist: any) => (
                    <tr key={hist.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 font-medium">{formatDate(hist.date)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">ZMW {(Number(hist.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-medium">{hist.marginPercent !== null && hist.marginPercent !== undefined ? `${Number(hist.marginPercent).toFixed(1)}%` : '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">ZMW {(Number(hist.minSellingPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryItem(null);
                }}
                className="px-6 py-2.5 bg-white text-[11px] font-black text-slate-600 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest border border-slate-200 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default InventoryUnitCostsView;
