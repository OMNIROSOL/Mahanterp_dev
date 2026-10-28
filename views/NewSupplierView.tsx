import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Building2, Hash, Coins, ChevronDown, MapPin, CreditCard, Landmark, 
    Mail, Briefcase, Layers, Upload, X, ChevronRight, FileText, Check, Plus, Tag
} from 'lucide-react';
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

const PRESET_CATEGORIES = [
    'Tyres & Tubes',
    'Spare Parts',
    'Batteries',
    'Lubricants & Oils',
    'Filters & Fluids',
    'Brake & Suspension',
    'Hardware & Fasteners',
    'Heavy Machinery',
    'Consumables & Tools',
    'Logistics & Freight',
    'Services'
];

const NewSupplierView = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'general' | 'bank' | 'products'>('general');

    // General state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [currency, setCurrency] = useState('ZMW - Zambian Kwacha');
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([
        { code: 'ZMW', name: 'Zambian Kwacha' },
        { code: 'USD', name: 'US Dollar' }
    ]);
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [tpin, setTpin] = useState('');
    const [division, setDivision] = useState('General');
    const [fileName, setFileName] = useState('No file chosen');
    const [controlAccount, setControlAccount] = useState('Accounts Payable');
    const [emailError, setEmailError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);

    // Bank details state
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [swiftCode, setSwiftCode] = useState('');
    const [branchName, setBranchName] = useState('');

    // Products / Categories state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');

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
                        setTpin(customer.tpin || '');
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

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(selectedCategories.filter(c => c !== cat));
        } else {
            setSelectedCategories([...selectedCategories, cat]);
        }
    };

    const addCustomCategory = () => {
        const trimmed = customTag.trim();
        if (trimmed && !selectedCategories.includes(trimmed)) {
            setSelectedCategories([...selectedCategories, trimmed]);
            setCustomTag('');
        }
    };

    const handleSave = async () => {
        if (email && !validateEmail(email)) {
            setEmailError('Invalid email format');
            setActiveTab('general');
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
            tpin: tpin,
            currency: currencyCode,
            billingAddress: address,
            status: 'Paid',
            division: division,
            controlAccount: controlAccount,
            bankDetails: {
                bankName,
                accountName,
                accountNumber,
                swiftCode,
                branchName
            },
            productCategories: selectedCategories
        };

        try {
            await apiService.createSupplier(supplierData);
            alert('Supplier profile finalized successfully!');
            navigate('/suppliers');
        } catch (err: any) {
            console.error('Failed to create supplier:', err);
            alert('Failed to save supplier: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/suppliers')}>Suppliers</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Register New</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Supplier Registration</h1>
                </div>
                <button
                    onClick={() => navigate('/suppliers')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 bg-slate-200/60 p-1.5 rounded-2xl w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center space-x-2 ${
                        activeTab === 'general'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Building2 size={14} />
                    <span>General Info</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center space-x-2 ${
                        activeTab === 'bank'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Landmark size={14} />
                    <span>Bank Details</span>
                    {(bankName || accountNumber) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center space-x-2 ${
                        activeTab === 'products'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Tag size={14} />
                    <span>Products & Categories</span>
                    {selectedCategories.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-bold">
                            {selectedCategories.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-8">
                    {/* TAB 1: GENERAL INFO */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                        <Building2 size={16} />
                                    </div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Identity & Logistics</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Supplier Name" value={name} onChange={(e: any) => setName(e.target.value)} Icon={Building2} placeholder="e.g. Acme Supplies Ltd" required />
                                    <InputField label="Supplier Code" value={code} onChange={(e: any) => setCode(e.target.value)} Icon={Hash} placeholder="e.g. SUP-001" required />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="ZRA TPIN" value={tpin} onChange={(e: any) => setTpin(e.target.value)} Icon={FileText} placeholder="e.g. 1001849201" />
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

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Address</label>
                                        <textarea
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            rows={3}
                                            placeholder="Enter physical business address..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                                        <CreditCard size={16} />
                                    </div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Financial & Classification</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        </div>
                    )}

                    {/* TAB 2: BANK DETAILS */}
                    {activeTab === 'bank' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Landmark size={16} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Supplier Banking Information</h2>
                                    <p className="text-xs text-slate-400">Used for payments, remittances, and electronic wire transfers</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <InputField 
                                    label="Bank Name" 
                                    value={bankName} 
                                    onChange={(e: any) => setBankName(e.target.value)} 
                                    Icon={Landmark} 
                                    placeholder="e.g. Stanbic Bank Zambia / Standard Chartered" 
                                />
                                <InputField 
                                    label="Account Holder Name" 
                                    value={accountName} 
                                    onChange={(e: any) => setAccountName(e.target.value)} 
                                    Icon={Building2} 
                                    placeholder="e.g. Acme Supplies Limited" 
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputField 
                                    label="Account Number / IBAN" 
                                    value={accountNumber} 
                                    onChange={(e: any) => setAccountNumber(e.target.value)} 
                                    Icon={Hash} 
                                    placeholder="e.g. 0140023456789" 
                                />
                                <InputField 
                                    label="SWIFT / BIC Code" 
                                    value={swiftCode} 
                                    onChange={(e: any) => setSwiftCode(e.target.value)} 
                                    Icon={CreditCard} 
                                    placeholder="e.g. SBICZMLX" 
                                />
                                <InputField 
                                    label="Branch Name / Code" 
                                    value={branchName} 
                                    onChange={(e: any) => setBranchName(e.target.value)} 
                                    Icon={MapPin} 
                                    placeholder="e.g. Lusaka Main (001)" 
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PRODUCTS & CATEGORIES */}
                    {activeTab === 'products' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                                    <Tag size={16} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Supplied Products & Categories</h2>
                                    <p className="text-xs text-slate-400">Tag product categories this supplier provides to Mahant Investments</p>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                                    Select Standard Categories
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {PRESET_CATEGORIES.map(cat => {
                                        const isSelected = selectedCategories.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => toggleCategory(cat)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {isSelected && <Check size={12} strokeWidth={3} />}
                                                <span>{cat}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                                        Add Custom Tag or Specialized Product
                                    </label>
                                    <div className="flex gap-3 max-w-md">
                                        <input
                                            type="text"
                                            value={customTag}
                                            onChange={(e) => setCustomTag(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCustomCategory();
                                                }
                                            }}
                                            placeholder="e.g. Mining Equipment Spares"
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomCategory}
                                            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center space-x-1"
                                        >
                                            <Plus size={14} />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                </div>

                                {selectedCategories.length > 0 && (
                                    <div className="pt-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                            Assigned Tags ({selectedCategories.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCategories.map(cat => (
                                                <span 
                                                    key={cat} 
                                                    className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-3 py-1 rounded-lg text-xs font-semibold"
                                                >
                                                    {cat}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleCategory(cat)}
                                                        className="hover:text-rose-600"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex space-x-2">
                            {activeTab !== 'general' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(activeTab === 'products' ? 'bank' : 'general')}
                                    className="px-6 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                                >
                                    Previous Tab
                                </button>
                            )}
                            {activeTab !== 'products' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(activeTab === 'general' ? 'bank' : 'products')}
                                    className="px-6 py-3 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all"
                                >
                                    Next Tab
                                </button>
                            )}
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={() => navigate('/suppliers')}
                                className="px-8 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-wider"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="bg-indigo-600 text-white px-10 py-3.5 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest flex items-center space-x-2"
                            >
                                <Check size={14} strokeWidth={3} />
                                <span>Save Supplier</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewSupplierView;
