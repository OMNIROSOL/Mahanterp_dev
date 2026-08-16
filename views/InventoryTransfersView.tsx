import React, { useState, useMemo, useEffect } from 'react';
import { 
  Eye, Edit, Search, Plus, ArrowRightLeft, Check, Copy, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ChevronDown, ChevronUp, Printer, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { InventoryTransfer } from '../types';

const InventoryTransfersView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryTransfer | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(apiService.getCurrentUser());

  useEffect(() => {
    const fetchTransfers = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getInventoryTransfers();
        setTransfers(data);
      } catch (err) {
        console.error('Failed to fetch transfers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransfers();
  }, []);

  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUser(apiService.getCurrentUser());
    };
    window.addEventListener('user_sim_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('user_sim_updated', handleUserUpdate);
    };
  }, []);

  const getAvailableStatuses = (currentStatus: string, userRole: string) => {
    const isAdmin = userRole === 'Admin';
    const isManager = userRole === 'Manager' || isAdmin;

    if (currentStatus === 'Draft') {
      return ['Draft', 'Pending Approval'];
    }
    if (currentStatus === 'Pending Approval') {
      if (isManager) {
        return ['Pending Approval', 'Approved', 'Draft'];
      }
      return ['Pending Approval'];
    }
    if (currentStatus === 'Approved') {
      return ['Approved', 'Ready to Dispatch'];
    }
    if (currentStatus === 'Ready to Dispatch') {
      return ['Ready to Dispatch', 'Sent'];
    }
    if (currentStatus === 'Sent') {
      return ['Sent', 'Received'];
    }
    if (currentStatus === 'Received') {
      return ['Received'];
    }
    return [currentStatus];
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiService.updateInventoryTransferStatus(id, newStatus);
      setTransfers(prev => prev.map(tr => tr.id === id ? { ...tr, status: newStatus } : tr));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update inventory transfer status');
    }
  };

  const columns = [
    { id: 'date', label: 'Date', visible: true },
    { id: 'reference', label: 'Reference', visible: true },
    { id: 'fromLocation', label: 'From Location', visible: true },
    { id: 'toLocation', label: 'To Location', visible: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ];

  const handleSort = (key: keyof InventoryTransfer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredTransfers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = transfers.filter(tr => {
      const searchStr = `${tr.reference} ${tr.fromLocation} ${tr.toLocation} ${tr.description}`.toLowerCase();
      return searchStr.includes(query);
    });

    if (sortConfig.key) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key!] ?? '';
        let bVal = b[sortConfig.key!] ?? '';
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [searchQuery, sortConfig, transfers]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const currentSlice = filteredTransfers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <ArrowRightLeft size={14} />
            <span className="text-gray-400">Inventory Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Transfers</h1>
          <p className="text-gray-500 text-sm">Track movement of stock between different locations</p>
        </div>

        <button
          onClick={() => navigate('/inventory-transfers/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center"
        >
          <Plus size={16} className="mr-2" /> NEW INVENTORY TRANSFER
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 group max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search transfers by reference or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(col.id as keyof InventoryTransfer)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {sortConfig.key === col.id && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1 text-blue-500" /> : <ChevronDown size={14} className="ml-1 text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching transfers...</p>
                  </div>
                </td>
              </tr>
            ) : currentSlice.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No transfers found
                </td>
              </tr>
            ) : currentSlice.map((tr) => (
              <tr key={tr.id} className="group hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => navigate(`/inventory-transfers/view/${tr.id}`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/inventory-transfers/edit/${tr.id}`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-[12px] font-semibold text-gray-900">{tr.date}</td>
                <td className="px-6 py-4 text-[12px] font-bold text-blue-600">{tr.reference}</td>
                <td className="px-6 py-4 text-[12px] font-medium text-gray-600">{tr.fromLocation}</td>
                <td className="px-6 py-4 text-[12px] font-medium text-gray-600">{tr.toLocation}</td>
                <td className="px-6 py-4 text-[12px] text-gray-500 truncate max-w-[250px]">{tr.description}</td>
                <td className="px-6 py-4">
                  {(() => {
                    const options = getAvailableStatuses(tr.status || 'Draft', currentUser.role);
                    const isDisabled = options.length <= 1;
                    return (
                      <select
                        value={tr.status || 'Draft'}
                        onChange={(e) => handleStatusChange(tr.id, e.target.value)}
                        disabled={isDisabled}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border outline-none transition-all shadow-sm ${
                          isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                        } ${
                          tr.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          tr.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                          tr.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          tr.status === 'Ready to Dispatch' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-bold' : 
                          tr.status === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                          tr.status === 'Received' ? 'bg-emerald-600 text-white border-emerald-700' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {options.map(opt => (
                          <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>
                        ))}
                      </select>
                    );
                  })()}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronsLeft size={16} /></button>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronRight size={16} /></button>
          <button disabled className="p-1 rounded-md opacity-30 cursor-not-allowed"><ChevronsRight size={16} /></button>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing {currentSlice.length} of {filteredTransfers.length} transfers
        </div>
      </div>
    </div>
  );
};

export default InventoryTransfersView;
