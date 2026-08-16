import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Hash, Coins, ChevronDown, MapPin, CreditCard, Landmark, Mail, Briefcase, Layers, Upload, X, ChevronRight, IdCard, TrendingUp, ChevronUp } from 'lucide-react';
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

const NewCustomerView = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [currency, setCurrency] = useState('ZMW - Zambian Kwacha');
    const [billingAddress, setBillingAddress] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [email, setEmail] = useState('');
    const [division, setDivision] = useState('General');
    const [tpin, setTpin] = useState('');
    const [creditDays, setCreditDays] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [fileName, setFileName] = useState('No file chosen');
    const [emailError, setEmailError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const copyFromSupplierId = queryParams.get('copyFrom');

    useEffect(() => {
        apiService.getDivisions().then(setAvailableDivisions).catch(err => console.error('Failed to fetch divisions:', err));
        apiService.getNextReference('customer')
            .then(setCode)
            .catch(err => {
                console.error('Failed to fetch next customer code:', err);
                // Fallback to a formatted code if API fails
                setCode(`CUST-`);
            });

        if (copyFromSupplierId) {
            apiService.getSupplier(copyFromSupplierId)
                .then(supplier => {
                    if (supplier) {
                        setName(supplier.name || '');
                        setEmail(supplier.email || '');
                        setDivision(supplier.division || 'General');
                        setBillingAddress(supplier.billingAddress || '');
                        setDeliveryAddress(supplier.billingAddress || '');
                        if (supplier.tpin) setTpin(supplier.tpin);
                        
                        if (supplier.currency) {
                            const fullCurrency = supplier.currency === 'USD' ? 'USD - US Dollar' : 'ZMW - Zambian Kwacha';
                            setCurrency(fullCurrency);
                        }
                    }
                })
                .catch(err => console.error('Failed to fetch supplier for copy:', err));
        }
    }, [copyFromSupplierId]);

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
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/customers')}>Customers</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Register New</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Registration</h1>
                </div>
                <button
                    onClick={() => navigate('/customers')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-12 space-y-12">
                    {/* Primary Info Segment */}
                    <div className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <IdCard size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Identity & Logistics</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InputField label="Customer Name" value={name} onChange={(e: any) => setName(e.target.value)} Icon={User} placeholder="e.g. Acme Corp" required />
                            <InputField label="Customer Code" value={code} onChange={(e: any) => setCode(e.target.value)} Icon={Hash} placeholder="e.g. CUST-0001" required />
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
                                        <option>ZMW - Zambian Kwacha</option>
                                        <option>USD - US Dollar</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Billing Address</label>
                                <textarea
                                    value={billingAddress}
                                    onChange={(e) => setBillingAddress(e.target.value)}
                                    rows={4}
                                    placeholder="Enter complete billing details..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                ></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Delivery Destination</label>
                                <textarea
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    rows={4}
                                    placeholder="Physical delivery location..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-5 py-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Financial Parameters */}
                    <div className="space-y-8 pt-12 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <TrendingUp size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Financial Parameters</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <InputField label="Credit Limit" value={creditLimit} onChange={(e: any) => setCreditLimit(e.target.value)} Icon={CreditCard} placeholder="Maximum balance" />
                            <InputField label="Tax Identification (TPIN)" value={tpin} onChange={(e: any) => setTpin(e.target.value)} Icon={Landmark} placeholder="TPIN Number" />
                            <InputField
                                label="Contact Email"
                                type="email"
                                value={email}
                                onChange={(e: any) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }}
                                Icon={Mail}
                                placeholder="finance@company.com"
                                error={emailError}
                            />
                        </div>
                    </div>

                    {/* Sales & Assignment */}
                    <div className="space-y-8 pt-12 border-t border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                <Briefcase size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Sales & CRM</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <NumericInputField
                                label="Credit Days"
                                value={creditDays}
                                onChange={(e: any) => setCreditDays(e.target.value)}
                                onIncrement={() => setCreditDays(prev => (parseInt(prev) || 0) + 1 + "")}
                                onDecrement={() => setCreditDays(prev => Math.max(0, (parseInt(prev) || 0) - 1) + "")}
                                Icon={IdCard}
                                placeholder="e.g. 30"
                            />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assigned Sales Agent</label>
                                <div className="relative group">
                                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <select
                                        value={salesPerson}
                                        onChange={(e) => setSalesPerson(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="">Search agents...</option>
                                        <option>John Doe</option>
                                        <option>Jane Smith</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Documentation</label>
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
                            onClick={() => navigate('/customers')}
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

                                const customerData = {
                                    code: code,
                                    name: finalName || 'Unnamed Customer',
                                    email: email,
                                    currency: currency,
                                    billingAddress: billingAddress,
                                    deliveryAddress: deliveryAddress,
                                    tpin: tpin,
                                    division: division,
                                    salesPerson: salesPerson,
                                    creditDays: creditDays,
                                    creditLimit: creditLimit,
                                    documentation: fileName !== 'No file chosen' ? fileName : undefined,
                                    status: 'Paid'
                                };

                                try {
                                    await apiService.createCustomer(customerData);
                                    alert('Customer profile finalized successfully!');
                                    navigate('/customers');
                                } catch (err: any) {
                                    console.error('Failed to create customer:', err);
                                    alert('Failed to save customer to database: ' + (err.response?.data?.error || err.message));
                                }
                            }}
                            className="bg-blue-600 text-white px-12 py-4 rounded-2xl text-[14px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 uppercase tracking-[0.2em]"
                        >
                            Finalize Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewCustomerView;
