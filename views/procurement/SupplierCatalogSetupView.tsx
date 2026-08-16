import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

const SupplierCatalogSetupView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingType, setAddingType] = useState<'ITEM' | 'CATEGORY' | 'SUBCATEGORY'>('ITEM');
  const [addingValue, setAddingValue] = useState('');
  const [addingMinStock, setAddingMinStock] = useState<number>(4.0);
  const [addingMaxStock, setAddingMaxStock] = useState<number>(8.0);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [supps, itms] = await Promise.all([
        apiService.getSuppliers(),
        apiService.getItems()
      ]);
      setSuppliers(supps || []);
      setItems(itms || []);
    } catch (err) {
      console.error('Failed to load base data:', err);
    }
  };

  useEffect(() => {
    if (selectedSupplier) {
      loadMappings(selectedSupplier);
    } else {
      setMappings([]);
    }
  }, [selectedSupplier]);

  const loadMappings = async (supplierId: string) => {
    setLoading(true);
    try {
      const res = await apiService.getSupplierMappings(supplierId);
      setMappings(res || []);
    } catch (err) {
      console.error('Failed to load mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!selectedSupplier || !addingValue) return;
    try {
      await apiService.addSupplierMapping(selectedSupplier, addingType, addingValue, addingMinStock, addingMaxStock);
      setAddingValue('');
      loadMappings(selectedSupplier);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add mapping');
    }
  };

  const handleRemoveMapping = async (type: string, value: string) => {
    if (!selectedSupplier) return;
    try {
      await apiService.removeSupplierMapping(selectedSupplier, type, value);
      loadMappings(selectedSupplier);
    } catch (err) {
      console.error('Failed to remove mapping:', err);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const subCategories = Array.from(new Set(items.map(i => i.subCategory).filter(Boolean)));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            Supplier Catalog Setup
          </h1>
          <p className="text-gray-500 text-sm mt-1">Map specific items, categories, or subcategories to suppliers for accurate purchase planning.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier to Manage</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full sm:w-1/2 p-2.5 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">-- Select a Supplier --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.brand ? `(${s.brand})` : ''}</option>
            ))}
          </select>
        </div>

        {selectedSupplier && (
          <div className="p-6">
            <div className="flex gap-4 items-end mb-8 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mapping Type</label>
                <select
                  value={addingType}
                  onChange={(e: any) => { setAddingType(e.target.value); setAddingValue(''); }}
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ITEM">Specific Item</option>
                  <option value="CATEGORY">Item Category</option>
                  <option value="SUBCATEGORY">Item Sub-Category</option>
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Value</label>
                {addingType === 'ITEM' && (
                  <select
                    value={addingValue}
                    onChange={(e) => setAddingValue(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Item --</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.itemCode} - {i.itemName}</option>
                    ))}
                  </select>
                )}
                {addingType === 'CATEGORY' && (
                  <select
                    value={addingValue}
                    onChange={(e) => setAddingValue(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c: any) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                {addingType === 'SUBCATEGORY' && (
                  <select
                    value={addingValue}
                    onChange={(e) => setAddingValue(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Sub-Category --</option>
                    {subCategories.map((c: any) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="w-1/6">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Min (Months)</label>
                <input
                  type="number"
                  step="0.1"
                  value={addingMinStock}
                  onChange={(e) => setAddingMinStock(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-1/6">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Max (Months)</label>
                <input
                  type="number"
                  step="0.1"
                  value={addingMaxStock}
                  onChange={(e) => setAddingMaxStock(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <button
                  onClick={handleAddMapping}
                  disabled={!addingValue}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  Add Mapping
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading mappings...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Items */}
                <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 flex justify-between">
                    <span>Mapped Items</span>
                    <span className="bg-blue-100 text-blue-800 text-xs py-1 px-2 rounded-full">{mappings.filter(m => m.type === 'ITEM').length}</span>
                  </div>
                  <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {mappings.filter(m => m.type === 'ITEM').map(m => {
                      const itemObj = items.find(i => i.id === m.value);
                      return (
                        <li key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50 group">
                          <div className="text-sm flex-1">
                            <span className="font-medium text-gray-800">{itemObj?.itemCode || 'Unknown'}</span>
                            <div className="text-gray-500 text-xs truncate max-w-[200px]">{itemObj?.itemName || m.value}</div>
                            <div className="text-[10px] font-bold text-indigo-500 mt-0.5">Min: {m.minStockMonths ?? 4.0} | Max: {m.maxStockMonths ?? 8.0}</div>
                          </div>
                          <button onClick={() => handleRemoveMapping(m.type, m.value)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        </li>
                      );
                    })}
                    {mappings.filter(m => m.type === 'ITEM').length === 0 && (
                      <li className="p-4 text-center text-gray-400 text-sm italic">No specific items mapped</li>
                    )}
                  </ul>
                </div>

                {/* Categories */}
                <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 flex justify-between">
                    <span>Mapped Categories</span>
                    <span className="bg-purple-100 text-purple-800 text-xs py-1 px-2 rounded-full">{mappings.filter(m => m.type === 'CATEGORY').length}</span>
                  </div>
                  <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {mappings.filter(m => m.type === 'CATEGORY').map(m => (
                      <li key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50 group">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{m.value}</div>
                          <div className="text-[10px] font-bold text-purple-500 mt-0.5">Min: {m.minStockMonths ?? 4.0} | Max: {m.maxStockMonths ?? 8.0}</div>
                        </div>
                        <button onClick={() => handleRemoveMapping(m.type, m.value)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </li>
                    ))}
                    {mappings.filter(m => m.type === 'CATEGORY').length === 0 && (
                      <li className="p-4 text-center text-gray-400 text-sm italic">No categories mapped</li>
                    )}
                  </ul>
                </div>

                {/* SubCategories */}
                <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 flex justify-between">
                    <span>Mapped Sub-Categories</span>
                    <span className="bg-orange-100 text-orange-800 text-xs py-1 px-2 rounded-full">{mappings.filter(m => m.type === 'SUBCATEGORY').length}</span>
                  </div>
                  <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {mappings.filter(m => m.type === 'SUBCATEGORY').map(m => (
                      <li key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50 group">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{m.value}</div>
                          <div className="text-[10px] font-bold text-orange-500 mt-0.5">Min: {m.minStockMonths ?? 4.0} | Max: {m.maxStockMonths ?? 8.0}</div>
                        </div>
                        <button onClick={() => handleRemoveMapping(m.type, m.value)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </li>
                    ))}
                    {mappings.filter(m => m.type === 'SUBCATEGORY').length === 0 && (
                      <li className="p-4 text-center text-gray-400 text-sm italic">No sub-categories mapped</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!selectedSupplier && (
          <div className="p-12 text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>Select a supplier from the dropdown above to manage their catalog mapping.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierCatalogSetupView;
