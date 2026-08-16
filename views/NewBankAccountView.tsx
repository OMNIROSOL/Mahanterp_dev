import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';
import { 
    ChevronRight, X, Calendar, Briefcase, Landmark, 
    CreditCard, Info, Save, Undo2, CheckCircle2, ChevronDown
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

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

const CheckboxField = ({ label, checked, onChange, description }: any) => (
    <div 
        onClick={onChange}
        className={cn(
            "flex items-center space-x-4 p-4 rounded-2xl border transition-all cursor-pointer group",
            checked ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200"
        )}
    >
        <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            checked ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white border-slate-300"
        )}>
            {checked && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
        </div>
        <div>
            <p className={cn("text-[13px] font-bold tracking-tight transition-colors", checked ? "text-indigo-900" : "text-slate-600")}>{label}</p>
            {description && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{description}</p>}
        </div>
    </div>
);

const NewBankAccountView = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [division, setDivision] = useState('');
    const [hasIBAN, setHasIBAN] = useState(false);
    const [ibanValue, setIbanValue] = useState('');
    const [canHavePending, setCanHavePending] = useState(false);
    const [hasCreditLimit, setHasCreditLimit] = useState(false);
    const [creditLimitValue, setCreditLimitValue] = useState('0');

    const handleCreate = async () => {
        const newAccount: Partial<Account> = {
            name: name.toUpperCase() || 'NEW ACCOUNT',
            code,
            type: 'Asset' as any,
            isPaymentAccount: true,
            division,
            currency,
            iban: hasIBAN ? ibanValue : undefined,
            canHavePending,
            creditLimit: hasCreditLimit ? parseFloat(creditLimitValue) : undefined
        };

        try {
            await apiService.createBankAccount(newAccount);
            navigate('/account');
        } catch (err) {
            console.error('Failed to create bank account:', err);
            alert('Failed to create bank account in database');
        }
    };

    return (
        <div className="p-10 max-w-[1200px] mx-auto space-y-8 selection:bg-indigo-100 selection:text-indigo-900 font-sans animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/account')}>Bank Accounts</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Add New Account</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">New Bank or Cash Account</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Configure a new financial account for your organization.</p>
                </div>
                <button onClick={() => navigate('/account')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 active:scale-90">
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
                                <Landmark size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Account Information</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <InputField 
                                    label="Account Name" 
                                    placeholder="Enter full account name (e.g. Stanbic Operating Account)" 
                                    value={name} 
                                    onChange={(e: any) => setName(e.target.value)} 
                                    Icon={Landmark}
                                />
                            </div>
                            <InputField 
                                label="Code" 
                                placeholder="Account code (optional)" 
                                value={code} 
                                onChange={(e: any) => setCode(e.target.value)} 
                                Icon={Briefcase}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <SelectField label="Account Currency" value={currency} onChange={(e: any) => setCurrency(e.target.value)} Icon={CreditCard}>
                                <option value="ZMW">ZMW - Zambian Kwacha</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                                <option value="ZAR">ZAR - South African Rand</option>
                            </SelectField>
                            <SelectField label="Division" value={division} onChange={(e: any) => setDivision(e.target.value)} Icon={Briefcase}>
                                <option value="">No Division (Optional)</option>
                                <option value="HQ">HQ - Head Quarters</option>
                                <option value="Branch">Branch - Local Branch</option>
                                <option value="Finance">Finance - Internal Affairs</option>
                            </SelectField>
                        </div>
                    </section>

                    {/* Features & Limits Section */}
                    <section className="space-y-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <Info size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Features & Limits</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <CheckboxField 
                                    label="International Bank Account Number (IBAN)" 
                                    checked={hasIBAN} 
                                    onChange={() => setHasIBAN(!hasIBAN)}
                                    description="Enable for international transfers"
                                />
                                {hasIBAN && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="ml-4 pl-4 border-l-2 border-indigo-100">
                                        <InputField 
                                            label="IBAN Value" 
                                            placeholder="Enter IBAN..." 
                                            value={ibanValue} 
                                            onChange={(e: any) => setIbanValue(e.target.value)}
                                        />
                                    </motion.div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <CheckboxField 
                                    label="Credit Limit" 
                                    checked={hasCreditLimit} 
                                    onChange={() => setHasCreditLimit(!hasCreditLimit)}
                                    description="Specify maximum allowed credit"
                                />
                                {hasCreditLimit && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="ml-4 pl-4 border-l-2 border-indigo-100">
                                        <div className="relative group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Limit Amount ({currency})</label>
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                                <input 
                                                    type="number" 
                                                    value={creditLimitValue} 
                                                    onChange={(e) => setCreditLimitValue(e.target.value)} 
                                                    className="w-full bg-transparent border-none px-5 py-3 text-[13px] font-semibold text-slate-700 outline-none text-right"
                                                />
                                                <div className="bg-slate-100 px-4 py-3 text-[10px] font-black text-slate-500 border-l border-slate-200 uppercase tracking-widest">{currency}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <CheckboxField 
                                label="Can have pending transactions" 
                                checked={canHavePending} 
                                onChange={() => setCanHavePending(!canHavePending)}
                                description="Enable for uncleared deposits and withdrawals"
                            />
                        </div>
                    </section>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-slate-50/50 p-10 border-t border-slate-100 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/account')}
                        className="flex items-center space-x-2 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        <Undo2 size={16} />
                        <span>Discard Changes</span>
                    </button>
                    
                    <button
                        onClick={handleCreate}
                        disabled={!name}
                        className={cn(
                            "group relative flex items-center space-x-3 px-10 py-4 rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:grayscale disabled:opacity-50",
                            name ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save size={18} />
                        <span>Create Account</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewBankAccountView;
