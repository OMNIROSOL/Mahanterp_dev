import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
    Building2, Hash, Coins, ChevronDown, MapPin, CreditCard, Landmark, 
    Mail, Layers, Upload, X, ChevronRight, FileText, Check, Plus, Tag, Save, UserX
} from 'lucide-react';
import { Supplier, Division } from '../types';
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

const EditSupplierView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'general' | 'bank' | 'products'>('general');
    const [existingSupplier, setExistingSupplier] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // General state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([
        { code: 'ZMW', name: 'Zambian Kwacha' },
        { code: 'USD', name: 'US Dollar' }
    ]);
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [tpin, setTpin] = useState('');
    const [division, setDivision] = useState('General');
    const [fileName, setFileName] = useState('No file chosen');
    const [emailError, setEmailError] = useState('');
    const [inactive, setInactive] = useState(false);
    const [controlAccount, setControlAccount] = useState('Accounts Payable');
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

    useEffect(() => {
        const loadSupplier = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const suppliers = await apiService.getSuppliers();
                const found = suppliers.find((s: any) => s.id === id || s.code === id);
                if (found) {
                    setExistingSupplier(found);
                    setName(found.name || '');
                    setCode(found.code || '');
                    setCurrency(found.currency || 'ZMW');
                    setAddress(found.billingAddress || found.address || '');
                    setEmail(found.email || '');
                    setTpin(found.tpin || '');
                    setDivision(found.division || 'General');
                    setFileName(found.documentation || 'No file chosen');
                    setInactive(found.inactive || false);
                    setControlAccount(found.controlAccount || 'Accounts Payable');

                    const banks = found.bankDetails || found.bank_details || {};
                    setBankName(banks.bankName || '');
                    setAccountName(banks.accountName || '');
                    setAccountNumber(banks.accountNumber || '');
                    setSwiftCode(banks.swiftCode || '');
                    setBranchName(banks.branchName || '');

                    const categories = found.productCategories || found.product_categories || [];
                    if (Array.isArray(categories)) {
                        setSelectedCategories(categories);
                    }
                }
            } catch (err) {
                console.error('Failed to load supplier:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const loadDivisions = async () => {
            try {
                const divs = await apiService.getDivisions();
                setAvailableDivisions(divs);
            } catch (err) {
                console.error('Failed to fetch divisions:', err);
            }
        };

        const loadCurrencies = () => {
            const saved = localStorage.getItem('erp_currencies');
            if (saved) {
                try {
                    setAvailableCurrencies(JSON.parse(saved));
                } catch (e) {
                    console.error(e);
                }
            }
        };

        loadSupplier();
        loadDivisions();
        loadCurrencies();
    }, [id]);

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

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleUpdate = async () => {
        if (email && !validateEmail(email)) {
            setEmailError('Invalid email format');
            setActiveTab('general');
            return;
        }
        if (!existingSupplier) {
            alert('Supplier not found!');
            return;
        }

        const currencyCode = currency.split(' ')[0];
        const finalName = (currencyCode !== 'ZMW' && !name.includes(`- ${currencyCode}`)) 
            ? `${name} - ${currencyCode}` 
            : name;

        try {
            await apiService.updateSupplier(existingSupplier.id, {
                code: code,
                name: finalName || 'Unnamed Supplier',
                division: division,
                email: email,
                tpin: tpin,
                billingAddress: address,
                currency: currency,
                documentation: fileName !== 'No file chosen' ? fileName : undefined,
                inactive: inactive,
                controlAccount: controlAccount,
                bankDetails: {
                    bankName,
                    accountName,
                    accountNumber,
                    swiftCode,
                    branchName
                },
                productCategories: selectedCategories
            });
            alert('Supplier profile updated successfully!');
            navigate('/suppliers');
        } catch (err: any) {
            console.error('Failed to update supplier:', err);
            alert('Error updating supplier profile: ' + (err.response?.data?.error || err.message));
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading supplier...</p>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/suppliers')}>Suppliers</span>
                        <ChevronRight size={10} className="opacity-50" />
                        <span className="text-slate-400">Edit Profile</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Modify Supplier #{code || existingSupplier?.code}</h1>
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
                                                    <option key={c.code} value={c.code}>
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
                                    <h2 className="text-base font-black text-slate-800 tracking-tight">Financial & Status</h2>
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

                                    <div className="flex items-center space-x-3 pt-6">
                                        <input
                                            type="checkbox"
                                            id="supplier-inactive"
                                            checked={inactive}
                                            onChange={(e) => setInactive(e.target.checked)}
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
                                        />
                                        <label htmlFor="supplier-inactive" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                            <UserX size={14} className="text-rose-500" />
                                            <span>Mark Supplier as Inactive</span>
                                        </label>
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
                                onClick={handleUpdate}
                                className="bg-indigo-600 text-white px-10 py-3.5 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest flex items-center space-x-2"
                            >
                                <Save size={14} />
                                <span>Update Profile</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditSupplierView;
