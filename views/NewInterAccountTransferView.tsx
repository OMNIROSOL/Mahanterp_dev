import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, RefreshCw, ArrowRight } from 'lucide-react';
import apiService from '../services/apiService';
import { currencyCode, isBaseCurrency, BASE_CURRENCY } from '../utils/currency';

const NewInterAccountTransferView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        reference: '',
        paidFromAccount: '',
        receivedInAccount: '',
        paidAmount: '',
        receivedAmount: '',
        division: 'General',
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [accs, divs] = await Promise.all([
                apiService.getAccounts(),
                apiService.getDivisions().catch(() => [])
            ]);
            const paymentAccs = accs.filter((a: any) => a.isPaymentAccount || /(bank|cash|airtel|wallet)/i.test(a.name));
            setAccounts(paymentAccs.length ? paymentAccs : accs);
            setDivisions(divs || []);

            if (isEdit && id) {
                const transfer = await apiService.getInterAccountTransfer(id);
                setFormData({
                    date: transfer.date ? transfer.date.split('T')[0] : '',
                    reference: transfer.reference || '',
                    paidFromAccount: transfer.paidFromAccount || '',
                    receivedInAccount: transfer.receivedInAccount || '',
                    paidAmount: String(transfer.paidAmount ?? transfer.amount ?? ''),
                    receivedAmount: String(transfer.receivedAmount ?? transfer.amount ?? transfer.paidAmount ?? ''),
                    division: transfer.division || 'General',
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

    const fromAccount = useMemo(() => {
        return accounts.find(a => a.id === formData.paidFromAccount || a.name === formData.paidFromAccount);
    }, [accounts, formData.paidFromAccount]);

    const toAccount = useMemo(() => {
        return accounts.find(a => a.id === formData.receivedInAccount || a.name === formData.receivedInAccount);
    }, [accounts, formData.receivedInAccount]);

    const paidCurrency = currencyCode(fromAccount?.currency || 'ZMW');
    const receivedCurrency = currencyCode(toAccount?.currency || 'ZMW');

    const isCrossCurrency = paidCurrency !== receivedCurrency;

    // Compute implicit exchange rate
    const fxInfo = useMemo(() => {
        if (!isCrossCurrency) return null;
        const pAmt = parseFloat(formData.paidAmount) || 0;
        const rAmt = parseFloat(formData.receivedAmount) || 0;
        if (pAmt <= 0 || rAmt <= 0) return null;

        if (paidCurrency === BASE_CURRENCY && receivedCurrency !== BASE_CURRENCY) {
            const rate = pAmt / rAmt;
            return `1 ${receivedCurrency} = ${rate.toFixed(4)} ${BASE_CURRENCY}`;
        } else if (paidCurrency !== BASE_CURRENCY && receivedCurrency === BASE_CURRENCY) {
            const rate = rAmt / pAmt;
            return `1 ${paidCurrency} = ${rate.toFixed(4)} ${BASE_CURRENCY}`;
        } else {
            const rate = pAmt / rAmt;
            return `1 ${receivedCurrency} = ${rate.toFixed(4)} ${paidCurrency}`;
        }
    }, [isCrossCurrency, paidCurrency, receivedCurrency, formData.paidAmount, formData.receivedAmount]);

    const handlePaidAmountChange = (val: string) => {
        setFormData(prev => ({
            ...prev,
            paidAmount: val,
            receivedAmount: (!isCrossCurrency || !prev.receivedAmount) ? val : prev.receivedAmount
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.paidFromAccount || !formData.receivedInAccount) {
            alert('Please select both Paid From and Received In accounts');
            return;
        }
        if (formData.paidFromAccount === formData.receivedInAccount) {
            alert('Source and destination accounts must be different');
            return;
        }
        const pAmt = parseFloat(formData.paidAmount) || 0;
        const rAmt = parseFloat(formData.receivedAmount) || pAmt;
        if (pAmt <= 0) {
            alert('Please enter a valid transfer amount');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                date: formData.date,
                reference: formData.reference,
                paidFromAccount: fromAccount?.name || formData.paidFromAccount,
                receivedInAccount: toAccount?.name || formData.receivedInAccount,
                paidAmount: pAmt,
                paidCurrency,
                receivedAmount: rAmt,
                receivedCurrency,
                amount: pAmt,
                currency: paidCurrency,
                division: formData.division || 'General',
                description: formData.description
            };

            if (isEdit && id) {
                await apiService.updateInterAccountTransfer(id, payload);
            } else {
                await apiService.createInterAccountTransfer(payload);
            }
            navigate('/inter-account-transfers');
        } catch (error: any) {
            console.error('Failed to save transfer:', error);
            alert(error?.response?.data?.error || 'Failed to save transfer');
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
                            <p className="text-xs text-slate-400 font-bold">Move money between internal bank and cash accounts</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-[13px] font-black tracking-widest uppercase transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={16} /> {isLoading ? 'Saving...' : 'Save Transfer'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Transfer Date</label>
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
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Division / Branch</label>
                                <select
                                    value={formData.division}
                                    onChange={e => setFormData({ ...formData, division: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                                >
                                    <option value="General">General / Head Office</option>
                                    {divisions.map((d: any) => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Account Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Paid From (Source Account)</label>
                                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                        {paidCurrency}
                                    </span>
                                </div>
                                <select
                                    required
                                    value={formData.paidFromAccount}
                                    onChange={e => setFormData({ ...formData, paidFromAccount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">Select source account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.name}>
                                            {a.name} ({a.currency || 'ZMW'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Received In (Destination Account)</label>
                                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                        {receivedCurrency}
                                    </span>
                                </div>
                                <select
                                    required
                                    value={formData.receivedInAccount}
                                    onChange={e => setFormData({ ...formData, receivedInAccount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">Select destination account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.name}>
                                            {a.name} ({a.currency || 'ZMW'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Amounts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Paid Amount ({paidCurrency})
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                        {paidCurrency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        value={formData.paidAmount}
                                        onChange={e => handlePaidAmountChange(e.target.value)}
                                        className="w-full pl-14 pr-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[16px] font-black text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Received Amount ({receivedCurrency})
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                        {receivedCurrency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        value={formData.receivedAmount}
                                        onChange={e => setFormData({ ...formData, receivedAmount: e.target.value })}
                                        className="w-full pl-14 pr-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[16px] font-black text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Implicit FX Rate Indicator */}
                        {isCrossCurrency && fxInfo && (
                            <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                        <RefreshCw size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Implicit Exchange Rate</p>
                                        <p className="text-sm font-bold text-indigo-700">{fxInfo}</p>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-indigo-500 font-semibold">
                                    Calculated automatically from paid and received amounts
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description / Memo</label>
                            <input
                                type="text"
                                placeholder="Reason for transfer (optional)..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewInterAccountTransferView;
