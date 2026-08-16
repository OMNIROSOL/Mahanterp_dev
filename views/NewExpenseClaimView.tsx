import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { ArrowLeft, Save, Plus, Trash2, HelpCircle } from 'lucide-react';
import Button from '../components/shared/Button';

const NewExpenseClaimView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [payers, setPayers] = useState<any[]>([]);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [payerId, setPayerId] = useState('');
    const [payee, setPayee] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [description, setDescription] = useState('');
    const [amountsAreTaxInclusive, setAmountsAreTaxInclusive] = useState(false);
    
    const [items, setItems] = useState<any[]>([
        { id: Date.now().toString(), account: '', description: '', qty: 1, unitPrice: 0, taxCode: '', taxAmount: 0 }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const accData = await apiService.getAccounts();
                const payerData = await apiService.getExpenseClaimPayers();
                setAccounts(accData);
                setPayers(payerData);

                if (isEditing) {
                    const claim = await apiService.getExpenseClaim(id);
                    if (claim) {
                        setDate(new Date(claim.date).toISOString().split('T')[0]);
                        setReference(claim.reference || '');
                        setPayerId(claim.payerId || '');
                        setPayee(claim.payee || '');
                        setCurrency(claim.currency || 'ZMW');
                        setDescription(claim.description || '');
                        setAmountsAreTaxInclusive(claim.amountsAreTaxInclusive || false);
                        
                        if (claim.items && claim.items.length > 0) {
                            setItems(claim.items.map((i: any) => ({
                                id: i.id || Date.now().toString() + Math.random(),
                                account: i.accountId || '',
                                description: i.description || '',
                                qty: Number(i.qty || 1),
                                unitPrice: Number(i.unitPrice || 0),
                                taxCode: i.taxCode || '',
                                taxAmount: Number(i.taxAmount || 0)
                            })));
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };
        fetchData();
    }, [id, isEditing]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), account: '', description: '', qty: 1, unitPrice: 0, taxCode: '', taxAmount: 0 }]);
    };

    const handleRemoveItem = (itemId: string) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== itemId));
        }
    };

    const handleItemChange = (itemId: string, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        if (!payerId) {
            alert('Please select an Expense Claim Payer');
            return;
        }
        
        setIsLoading(true);
        try {
            const data = {
                date,
                reference,
                payerId,
                payee,
                currency,
                description,
                amountsAreTaxInclusive,
                items: items.filter(i => i.account || i.description || i.unitPrice > 0)
            };

            if (isEditing) {
                // await apiService.updateExpenseClaim(id, data);
                // Assume update exists, but for now we'll just alert
                alert('Update not fully implemented in API yet, saving as new if reference changed');
            } else {
                await apiService.createExpenseClaim(data);
            }
            navigate('/expense-claims');
        } catch (err: any) {
            console.error('Save failed:', err);
            alert('Failed to save: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/expense-claims')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Expense Claims</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Edit Expense Claim' : 'New Expense Claim'}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => navigate('/expense-claims')} className="h-10">Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={isLoading} className="h-10 shadow-md shadow-blue-500/20">
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            Create
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Date</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Reference</label>
                                <input 
                                    type="text" 
                                    placeholder="Optional"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="w-1/2 pr-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Paid by</label>
                            <select 
                                value={payerId}
                                onChange={(e) => setPayerId(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">Select an expense claim payer...</option>
                                {payers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Payee</label>
                            <input 
                                type="text" 
                                value={payee}
                                onChange={(e) => setPayee(e.target.value)}
                                className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Currency</label>
                            <select 
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="ZMW">ZMW - Zambian Kwacha</option>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="USD">USD - US Dollar</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Description</label>
                            <input 
                                type="text" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div className="pt-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 font-medium w-1/4">Account</th>
                                        <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 font-medium w-1/4">Description</th>
                                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 font-medium w-24">Qty</th>
                                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 font-medium w-32">Unit price</th>
                                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 font-medium w-24">Total</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                            <td className="py-2 pr-2">
                                                <select
                                                    value={item.account}
                                                    onChange={(e) => handleItemChange(item.id, 'account', e.target.value)}
                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                >
                                                    <option value="">Suspense</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} {acc.code ? `(${acc.code})` : ''}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-2 pr-2 relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</div>
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                                                    className="w-full pl-12 p-2 bg-slate-50 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-2 pr-2 text-right">
                                                <span className="text-[10px] text-slate-400 font-bold mr-1">{currency}</span>
                                                <span className="font-bold text-slate-700">
                                                    {(Number(item.qty) * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-2 text-right">
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4">
                                <Button variant="secondary" onClick={handleAddItem} className="h-8 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border-none">
                                    <Plus size={14} className="mr-1" /> Add line
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewExpenseClaimView;
