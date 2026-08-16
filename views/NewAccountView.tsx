import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';
import { 
    ChevronRight, X, LayoutGrid, Hash, Layers, 
    FileText, Save, Undo2, ChevronDown 
} from 'lucide-react';
import { cn } from '../utils/cn';

const InputField = ({ label, value, onChange, placeholder, type = "text", Icon, error, readOnly }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-200'} rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} transition-all ${readOnly ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
            />
        </div>
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-300">{error}</p>}
    </div>
);

const SelectField = ({ label, value, onChange, Icon, children }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <select
                value={value}
                onChange={onChange}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

const TextareaField = ({ label, value, onChange, placeholder, rows = 3 }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none font-medium"
        ></textarea>
    </div>
);

const NewAccountView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('Asset');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (id) {
            const fetchAccount = async () => {
                setIsLoading(true);
                try {
                    const account = await apiService.getAccount(id);
                    if (account) {
                        setName(account.name || '');
                        setCode(account.code || '');
                        setType(account.type || 'Asset');
                        setDescription(account.description || '');
                    }
                } catch (err) {
                    console.error('Failed to fetch account:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAccount();
        }
    }, [id]);

    const handleSave = async () => {
        const accountData: Partial<Account> = {
            name,
            code,
            type: type as any,
            description
        };

        try {
            if (id) {
                await apiService.updateAccount(id, accountData);
            } else {
                await apiService.createAccount(accountData);
            }
            navigate('/accounts');
        } catch (err) {
            console.error('Failed to save account:', err);
            alert('Failed to save account to database');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading account details...</p>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-[1200px] mx-auto space-y-8 selection:bg-indigo-100 selection:text-indigo-900 font-sans animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/accounts')}>Chart of Accounts</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">{id ? 'Edit Account' : 'New Account'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">{id ? 'Modify Account' : 'New General Account'}</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Configure an account for your financial reporting and bookkeeping.</p>
                </div>
                <button onClick={() => navigate('/accounts')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 active:scale-90">
                    <X size={20} />
                </button>
            </div>

            {/* Main Configuration Card */}
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-12">
                    {/* Basic Info Section */}
                    <section className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <LayoutGrid size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Account Definition</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr] gap-8">
                            <InputField 
                                label="Account Name" 
                                placeholder="Enter full account name (e.g. Sales Income)" 
                                value={name} 
                                onChange={(e: any) => setName(e.target.value)} 
                                Icon={FileText}
                            />
                            <InputField 
                                label="Code" 
                                placeholder="Account code (optional)" 
                                value={code} 
                                onChange={(e: any) => setCode(e.target.value)} 
                                Icon={Hash}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <SelectField label="Account Type" value={type} onChange={(e: any) => setType(e.target.value)} Icon={Layers}>
                                <option value="Asset">Asset</option>
                                <option value="Liability">Liability</option>
                                <option value="Equity">Equity</option>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                            </SelectField>
                        </div>

                        <TextareaField 
                            label="Account Description" 
                            value={description} 
                            onChange={(e: any) => setDescription(e.target.value)} 
                            placeholder="Detailed purpose of this account..." 
                            rows={4}
                        />
                    </section>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-slate-50/50 p-10 border-t border-slate-100 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/accounts')}
                        className="flex items-center space-x-2 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        <Undo2 size={16} />
                        <span>Discard Changes</span>
                    </button>
                    
                    <button
                        onClick={handleSave}
                        disabled={!name}
                        className={cn(
                            "group relative flex items-center space-x-3 px-10 py-4 rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:grayscale disabled:opacity-50",
                            name ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save size={18} />
                        <span>{id ? 'Update Account' : 'Create Account'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewAccountView;
