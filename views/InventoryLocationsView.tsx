import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  ChevronRight, 
  HelpCircle,
  MoreVertical,
  Clipboard,
  Package,
  ArrowRight,
  Settings,
  ChevronLeft
} from 'lucide-react';
import apiService from '../services/apiService';
import { InventoryLocation } from '../types';

const InventoryLocationsView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await apiService.getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
    window.addEventListener('inventory_locations_updated', fetchLocations);
    return () => window.removeEventListener('inventory_locations_updated', fetchLocations);
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <button onClick={() => navigate('/settings')} className="hover:text-primary transition-colors flex items-center gap-1">
          <Settings size={12} /> Settings
        </button>
        <ChevronRight size={10} />
        <span className="text-gray-900 flex items-center gap-1">
          <Package size={12} /> Inventory Locations
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Custom Inventory Locations</h1>
            <p className="text-sm text-gray-500 font-medium">Manage storage areas, warehouses, and sub-locations</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings/inventory-locations/new')}
          className="px-6 py-3 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <Plus size={16} /> New Custom Inventory Location
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>Custom Inventory Locations</span>
            <HelpCircle size={14} className="opacity-50" />
          </div>
          <div className="flex items-center gap-3">
            <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-all flex items-center gap-1">
              Advanced Queries
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
              />
            </div>
            <button className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all">
              Search
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 w-20"></th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLocations.map((loc) => (
                <tr key={loc.id} className="group hover:bg-indigo-50/30 transition-all">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/settings/inventory-locations/edit/${loc.id}`)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{loc.name}</div>
                    {loc.description && <div className="text-xs text-gray-400 font-medium">{loc.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      loc.inactive ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {loc.inactive ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Toolbar */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 border border-gray-200 rounded-lg">
            {filteredLocations.length}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
              Form Defaults
            </button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
              Edit columns
            </button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
              <ArrowRight size={12} className="rotate-[-45deg]" /> Batch Operations
            </button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
              <Clipboard size={12} /> Copy to clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryLocationsView;
