import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Lock,
  Eye,
  PlusSquare,
  Edit,
  Trash,
  Info,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';
import { RoleDefinition, ScreenPermission } from '../types';
import { cn } from '../utils/cn';

const RoleManagementView = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleDefinition> | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await apiService.getRoles();
        setRoles(data);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };
    fetchRoles();
    
    window.addEventListener('roles_updated', fetchRoles);
    return () => window.removeEventListener('roles_updated', fetchRoles);
  }, []);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [modalSearch, setModalSearch] = useState('');

  const startNewRole = async () => {
    const screens = await apiService.getScreens();
    const newRole: Partial<RoleDefinition> = {
      name: '',
      permissions: screens.map(s => ({
        screenId: s.id,
        screenName: s.name,
        category: (s as any).category || 'General',
        view: false, add: false, edit: false, delete: false, full: false
      }))
    };
    setEditingRole(newRole);
    setModalSearch('');
    setShowModal(true);
  };

  const openEditRole = async (role: RoleDefinition) => {
    const screens = await apiService.getScreens();
    const existingPermsMap = new Map((role.permissions || []).map(p => [p.screenId, p]));

    const mergedPermissions = screens.map(s => {
      const existing = existingPermsMap.get(s.id);
      if (existing) {
        return {
          ...existing,
          screenName: s.name,
          category: (s as any).category || 'General'
        };
      }
      return {
        screenId: s.id,
        screenName: s.name,
        category: (s as any).category || 'General',
        view: false, add: false, edit: false, delete: false, full: false
      };
    });

    setEditingRole({
      ...role,
      permissions: mergedPermissions
    });
    setModalSearch('');
    setShowModal(true);
  };

  const setAllPermissions = (mode: 'full' | 'view' | 'none') => {
    if (!editingRole?.permissions) return;
    const updated = editingRole.permissions.map(p => {
      if (mode === 'full') {
        return { ...p, view: true, add: true, edit: true, delete: true, full: true };
      } else if (mode === 'view') {
        return { ...p, view: true, add: false, edit: false, delete: false, full: false };
      } else {
        return { ...p, view: false, add: false, edit: false, delete: false, full: false };
      }
    });
    setEditingRole({ ...editingRole, permissions: updated });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole?.name || !editingRole.permissions) return;

    const roleData = {
      name: editingRole.name,
      permissions: editingRole.permissions
    };

    try {
      if (editingRole.id) {
        await apiService.updateRole(editingRole.id, roleData);
      } else {
        await apiService.createRole(roleData);
      }
      
      const updatedRoles = await apiService.getRoles();
      setRoles(updatedRoles);
      setShowModal(false);
      setEditingRole(null);
    } catch (err) {
      console.error('Failed to save role:', err);
      alert('Error saving role definition');
    }
  };

  const updatePermission = (screenId: string, field: keyof Omit<ScreenPermission, 'screenId' | 'screenName'>) => {
    if (!editingRole?.permissions) return;

    const updatedPerms = editingRole.permissions.map(p => {
      if (p.screenId === screenId) {
        const newVal = !p[field];
        // If 'full' is toggled, toggle all others
        if (field === 'full') {
          return { ...p, view: newVal, add: newVal, edit: newVal, delete: newVal, full: newVal };
        }
        // If any granular is untoggled, 'full' must be false
        const nextPerm = { ...p, [field]: newVal };
        if (!newVal) nextPerm.full = false;
        // If all granular are toggled, 'full' becomes true
        if (nextPerm.view && nextPerm.add && nextPerm.edit && nextPerm.delete) nextPerm.full = true;
        
        return nextPerm;
      }
      return p;
    });

    setEditingRole({ ...editingRole, permissions: updatedPerms });
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-2 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Settings
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Role Management</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Define granular permissions and screen access for user roles</p>
            </div>
          </div>
        </div>

        <button 
          onClick={startNewRole}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          Create New Role
        </button>
      </div>

      {/* Main List Card */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Assigned Rights</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{role.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.filter(p => p.view).slice(0, 4).map(p => (
                        <span key={p.screenId} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight">
                          {p.screenName}
                        </span>
                      ))}
                      {role.permissions.filter(p => p.view).length > 4 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold uppercase tracking-tight">
                          +{role.permissions.filter(p => p.view).length - 4} MORE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditRole(role)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-error hover:bg-error/5 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Role Modal (Full Screen with Matrix) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingRole?.id ? 'Edit Role Rights' : 'Create New Role Definition'}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col h-full max-h-[80vh]">
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Role Name */}
                <div className="max-w-md space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Identifier</label>
                  <input 
                    required
                    type="text" 
                    value={editingRole?.name || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    placeholder="e.g. Sales Manager, Inventory Clerk"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none"
                  />
                </div>

                {/* Permissions Matrix */}
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search screens..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllPermissions('full')}
                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Grant All Full Access
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllPermissions('view')}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Grant All View Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllPermissions('none')}
                        className="px-3 py-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg text-xs font-bold transition-all"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-3">Screen Name</th>
                          <th className="px-4 py-3 text-center">View</th>
                          <th className="px-4 py-3 text-center">Add</th>
                          <th className="px-4 py-3 text-center">Edit</th>
                          <th className="px-4 py-3 text-center">Delete</th>
                          <th className="px-6 py-3 text-center text-primary bg-primary/5">Full Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {editingRole?.permissions
                          ?.filter(p => p.screenName.toLowerCase().includes(modalSearch.toLowerCase()) || ((p as any).category || '').toLowerCase().includes(modalSearch.toLowerCase()))
                          .map((perm) => (
                          <tr key={perm.screenId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{perm.screenName}</span>
                                {(perm as any).category && (
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                    {(perm as any).category}
                                  </span>
                                )}
                              </div>
                            </td>
                            {[
                              { key: 'view', icon: Eye, color: 'emerald' },
                              { key: 'add', icon: PlusSquare, color: 'blue' },
                              { key: 'edit', icon: Edit, color: 'amber' },
                              { key: 'delete', icon: Trash, color: 'rose' }
                            ].map((right) => (
                              <td key={right.key} className="px-4 py-3 text-center">
                                <button 
                                  type="button"
                                  onClick={() => updatePermission(perm.screenId, right.key as any)}
                                  className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center transition-all mx-auto",
                                    perm[right.key as keyof ScreenPermission] 
                                      ? `bg-${right.color}-100 text-${right.color}-600` 
                                      : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                                  )}
                                >
                                  {perm[right.key as keyof ScreenPermission] ? <CheckCircle2 size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />}
                                </button>
                              </td>
                            ))}
                            <td className="px-6 py-3 text-center bg-primary/5">
                              <button 
                                type="button"
                                onClick={() => updatePermission(perm.screenId, 'full')}
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto shadow-sm",
                                  perm.full 
                                    ? "bg-primary text-white scale-110" 
                                    : "bg-white text-slate-300 hover:text-primary hover:bg-primary/10 border border-slate-100"
                                )}
                              >
                                {perm.full ? <Shield size={16} /> : <Shield size={16} className="opacity-40" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4 shadow-inner">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:bg-white hover:text-slate-700 transition-all active:scale-95"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit"
                  className="px-10 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Save Role Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-8 border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Shield size={160} />
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
          <Info className="text-blue-400" size={32} />
        </div>
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h2 className="text-xl font-black tracking-tight uppercase tracking-widest text-blue-400">Permissions Logic</h2>
          <p className="text-slate-400 text-sm max-w-2xl font-medium">
            Granular rights defined here affect the visibility of menu items, buttons, and individual actions across the ERP. 
            Giving "Full Access" automatically enables View, Add, Edit, and Delete for that specific module.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleManagementView;
