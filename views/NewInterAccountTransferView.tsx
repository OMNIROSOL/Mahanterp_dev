import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import apiService from '../services/apiService';

const NewInterAccountTransferView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        reference: '',
        paidFromAccount: '',
        receivedInAccount: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const accs = await apiService.getAccounts();
            const paymentAccs = accs.filter((a: any) => a.isPaymentAccount);
            setAccounts(paymentAccs);

            if (isEdit && id) {
                const transfer = await apiService.getInterAccountTransfer(id);
                setFormData({
                    date: transfer.date ? transfer.date.split('T')[0] : '',
                    reference: transfer.reference || '',
                    paidFromAccount: transfer.paidFromAccount || '',
                    receivedInAccount: transfer.receivedInAccount || '',
                    amount: transfer.amount || '',
                    description: transfer.description || ''
                });
            } else {
                const res = await fetch('/api/reference/next/inter-account-transfer').then(r => r.json());
                setFormData(prev => ({ ...prev, reference: res.nextRef || '' }));
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.paidFromAccount === formData.receivedInAccount) {
            alert('Source and destination accounts must be different');
            return;
        }
        setIsLoading(true);
        try {
            if (isEdit && id) {
                // Not supported in this simplified version, would require reversing ledger entries etc.
                alert('Editing an inter-account transfer is not supported due to ledger implications. Please delete and recreate.');
            } else {
                await apiService.createInterAccountTransfer(formData);
                navigate('/inter-account-transfers');
            }
        } catch (error) {
            console.error('Failed to save transfer:', error);
            alert('Failed to save transfer');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 shadow-sm">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/inter-account-transfers')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                                {isEdit ? 'Edit Transfer' : 'New Inter Account Transfer'}
                            </h1>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-[13px] font-black tracking-widest uppercase transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={16} /> {isLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto">
                    <form className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8 space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Reference</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.reference}
                                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Paid From</label>
                                <select
                                    required
                                    value={formData.paidFromAccount}
                                    onChange={e => setFormData({ ...formData, paidFromAccount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Received In</label>
                                <select
                                    required
                                    value={formData.receivedInAccount}
                                    onChange={e => setFormData({ ...formData, receivedInAccount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100 max-w-sm">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[16px] font-black text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewInterAccountTransferView;
