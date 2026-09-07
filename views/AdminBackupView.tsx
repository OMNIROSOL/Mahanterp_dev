import React, { useState, useEffect, useCallback } from 'react';
import { Database, Play, Trash2, RefreshCw, CheckCircle2, AlertCircle, Clock, Download, HardDrive } from 'lucide-react';
import apiService from '../services/apiService';
import { getApiBaseUrl } from '../utils/apiConfig';

const API = getApiBaseUrl();

const AdminBackupView = () => {
    const [backups, setBackups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [notes, setNotes] = useState('');

    const token = localStorage.getItem('token') || '';

    const loadBackups = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/admin/backups`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setBackups(Array.isArray(data) ? data : []);
        } catch {
            setBackups([]);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => { loadBackups(); }, [loadBackups]);

    // Poll for running backups
    useEffect(() => {
        const hasRunning = backups.some(b => b.status === 'Running');
        if (!hasRunning) return;
        const timer = setTimeout(loadBackups, 3000);
        return () => clearTimeout(timer);
    }, [backups, loadBackups]);

    const handleRunBackup = async () => {
        setIsRunning(true);
        setMessage(null);
        try {
            const res = await fetch(`${API}/admin/backups`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Backup started: ${data.filename}`, type: 'success' });
                setNotes('');
                setTimeout(loadBackups, 1500);
            } else {
                setMessage({ text: data.error || 'Backup failed', type: 'error' });
            }
        } catch (e: any) {
            setMessage({ text: e.message, type: 'error' });
        } finally {
            setIsRunning(false);
        }
    };

    const handleDelete = async (id: string, filename: string) => {
        if (!window.confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;
        try {
            await fetch(`${API}/admin/backups/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            loadBackups();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDownload = async (id: string, filename: string) => {
        try {
            const res = await fetch(`${API}/admin/backups/${id}/download`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Download failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const formatBytes = (bytes: number | null) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            Completed: 'bg-emerald-100 text-emerald-700',
            Failed: 'bg-rose-100 text-rose-700',
            Running: 'bg-amber-100 text-amber-700 animate-pulse',
        };
        const icons: Record<string, React.ReactNode> = {
            Completed: <CheckCircle2 size={12} />,
            Failed: <AlertCircle size={12} />,
            Running: <RefreshCw size={12} className="animate-spin" />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
                {icons[status]} {status}
            </span>
        );
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Database size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Database Backup</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Create and manage PostgreSQL database backups</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <HardDrive size={16} className="text-slate-400" />
                    <span className="text-slate-500 font-medium">{backups.filter(b => b.status === 'Completed').length} backup(s) stored</span>
                </div>
            </div>

            {/* Create Backup Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Create New Backup</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optional notes (e.g. 'Before migration')"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                    <button
                        onClick={handleRunBackup}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200"
                    >
                        {isRunning ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                        {isRunning ? 'Starting...' : 'Run Backup Now'}
                    </button>
                    <button
                        onClick={loadBackups}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {message.text}
                    </div>
                )}
            </div>

            {/* Backup List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Backup History</h2>
                    <span className="text-xs text-slate-400 font-medium">{backups.length} record(s)</span>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : backups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Database size={36} className="mb-3 opacity-30" />
                        <p className="font-semibold">No backups yet</p>
                        <p className="text-sm mt-1">Click "Run Backup Now" to create your first backup</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {['Filename', 'Size', 'Status', 'Triggered By', 'Notes', 'Date', 'Actions'].map(h => (
                                        <th key={h} className="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map(b => (
                                    <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 px-5 text-sm font-mono font-semibold text-slate-700">{b.filename}</td>
                                        <td className="py-3.5 px-5 text-sm font-medium text-slate-500">{formatBytes(b.sizeBytes)}</td>
                                        <td className="py-3.5 px-5">{statusBadge(b.status)}</td>
                                        <td className="py-3.5 px-5 text-sm font-medium text-slate-600">{b.triggeredBy || '—'}</td>
                                        <td className="py-3.5 px-5 text-sm text-slate-400">{b.notes || '—'}</td>
                                        <td className="py-3.5 px-5 text-sm text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownload(b.id, b.filename)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Download backup"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(b.id, b.filename)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete backup"
                                                >
                                                    <Trash2 size={15} />
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
        </div>
    );
};

export default AdminBackupView;
