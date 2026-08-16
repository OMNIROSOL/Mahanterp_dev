import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Hash, Coins, ChevronDown, MapPin, CreditCard, Landmark, Mail, Briefcase, Layers, Upload, X, ChevronRight, IdCard, TrendingUp, ChevronUp } from 'lucide-react';
import { Division } from '../types';
import apiService from '../services/apiService';

const InputField = ({ label, value, onChange, placeholder, type = "text", Icon, error, required }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative group">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-200'} rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} transition-all`}
            />
        </div>
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-300">{error}</p>}
    </div>
);

const NumericInputField = ({ label, value, onChange, placeholder, onIncrement, onDecrement, Icon, error }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        <div className="relative group flex items-center">
            {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />}
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-200'} rounded-2xl ${Icon ? 'pl-11' : 'px-5'} pr-16 py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} transition-all`}
            />
            <div className="absolute right-2 flex flex-col gap-0.5">
                <button 
                  type="button"
                  onClick={onIncrement}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors outline-none"
                >
                  <ChevronUp size={12} strokeWidth={3} />
                </button>
                <div className="h-[1px] bg-slate-200 mx-1"></div>
                <button 
                  type="button"
                  onClick={onDecrement}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors outline-none"
                >
                  <ChevronDown size={12} strokeWidth={3} />
                </button>
            </div>
        </div>
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-300">{error}</p>}
    </div>
);

const NewSupplierView = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [currency, setCurrency] = useState('ZMW - Zambian Kwacha');
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([
        { code: 'ZMW', name: 'Zambian Kwacha' },
        { code: 'USD', name: 'US Dollar' }
    ]);
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [division, setDivision] = useState('General');
    const [fileName, setFileName] = useState('No file chosen');
    const [controlAccount, setControlAccount] = useState('Accounts Payable');
    const [emailError, setEmailError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const copyFromCustomerId = queryParams.get('copyFrom');

    useEffect(() => {
        const savedCurs = localStorage.getItem('erp_currencies');
        if (savedCurs) {
            try {
                setAvailableCurrencies(JSON.parse(savedCurs));
            } catch (err) {
                console.error(err);
            }
        }
        apiService.getDivisions().then(setAvailableDivisions).catch(err => console.error('Failed to fetch divisions:', err));
        apiService.getNextReference('supplier')
            .then(setCode)
            .catch(err => {
                console.error('Failed to fetch next supplier code:', err);
                // Fallback to timestamp based code if API fails
                setCode(`SUP-${Date.now().toString().slice(-4)}`);
            });

        if (copyFromCustomerId) {
            apiService.getCustomer(copyFromCustomerId)
                .then(customer => {
                    if (customer) {
                        setName(customer.name || '');
                        setEmail(customer.email || '');
                        setDivision(customer.division || 'General');
                        setAddress(customer.billingAddress || '');
                        setCurrency(customer.currency || 'ZMW - Zambian Kwacha');
                    }
                })
                .catch(err => console.error('Failed to fetch customer for copy:', err));
        }
    }, [copyFromCustomerId]);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setFileName(file.name);
        else setFileName('No file chosen');
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-10">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/suppliers')}>Suppliers</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Register New</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Registration</h1>
                </div>
                <button
                    onClick={() => navigate('/suppliers')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-12 space-y-12">
                    {/* Identity Segment */}
                    <div className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <Building2 size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Identity & Logistics</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InputField label="Supplier Name" value={name} onChange={(e: any) => setName(e.target.value)} Icon={Building2} placeholder="e.g. Acme Supplies" required />
                            <InputField label="Supplier Code" value={code} onChange={(e: any) => setCode(e.target.value)} Icon={Hash} placeholder="e.g. SUP-001" required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Preferred Currency</label>
                                <div className="relative group">
                                    <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        {availableCurrencies.map(c => (
                                            <option key={c.code} value={`${c.code} - ${c.name}`}>
                                                {c.code} - {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Address</label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    rows={4}
                                    placeholder="Enter physical business address..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Financial Parameters */}
                    <div className="space-y-8 pt-12 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <CreditCard size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Financial Parameters</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InputField 
                                label="Contact Email" 
                                type="email" 
                                value={email} 
                                onChange={(e: any) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }} 
                                Icon={Mail} 
                                placeholder="finance@supplier.com" 
                                error={emailError}
                            />
                            <InputField 
                                label="Control Account" 
                                value={controlAccount} 
                                onChange={(e: any) => setControlAccount(e.target.value)} 
                                Icon={Landmark} 
                                placeholder="e.g. Accounts Payable" 
                            />
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="space-y-8 pt-12 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                <Layers size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Classification</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Company Division</label>
                                <div className="relative group">
                                    <Layers size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <select
                                        value={division}
                                        onChange={(e) => setDivision(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="General">General</option>
                                        {availableDivisions.map(div => (
                                            <option key={div.id} value={div.name}>{div.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supporting Documentation</label>
                                <div className="relative group cursor-pointer" onClick={triggerFileSelect}>
                                    <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-2xl px-5 py-3 text-[13px] font-semibold text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-between">
                                        <span className="truncate max-w-[150px]">{fileName}</span>
                                        <Upload size={14} className="ml-2" />
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end space-x-4">
                        <button
                            onClick={() => navigate('/suppliers')}
                            className="px-10 py-4 rounded-2xl text-[14px] font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-[0.1em]"
                        >
                            Discard
                        </button>
                        <button
                            onClick={async () => {
                                if (email && !validateEmail(email)) {
                                    setEmailError('Invalid email format');
                                    return;
                                }

                                const currencyCode = currency.split(' ')[0];
                                const finalName = (currencyCode !== 'ZMW' && !name.includes(`- ${currencyCode}`)) 
                                    ? `${name} - ${currencyCode}` 
                                    : name;

                                const supplierData = {
                                    code: code,
                                    name: finalName || 'Unnamed Supplier',
                                    email: email,
                                    currency: currencyCode,
                                    billingAddress: address,
                                    status: 'Paid',
                                    division: division,
                                    controlAccount: controlAccount
                                };

                                try {
                                    await apiService.createSupplier(supplierData);
                                    alert('Supplier profile finalized successfully!');
                                    navigate('/suppliers');
                                } catch (err: any) {
                                    console.error('Failed to create supplier:', err);
                                    alert('Failed to save supplier to database: ' + (err.response?.data?.error || err.message));
                                }
                            }}
                            className="bg-indigo-600 text-white px-12 py-4 rounded-2xl text-[14px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em]"
                        >
                            Finalize Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewSupplierView;
