import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';

const EditBankAccountView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [currency, setCurrency] = useState('ZMW');
    const [division, setDivision] = useState('');
    const [hasIBAN, setHasIBAN] = useState(false);
    const [ibanValue, setIbanValue] = useState('');
    const [canHavePending, setCanHavePending] = useState(false);
    const [hasCreditLimit, setHasCreditLimit] = useState(false);
    const [creditLimit, setCreditLimit] = useState('0');
    const [isInactive, setIsInactive] = useState(false);

    useEffect(() => {
        const fetchAccount = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const account = await apiService.getBankAccounts().then(accounts => accounts.find((a: any) => a.id === id));
                if (account) {
                    setName(account.name);
                    setCode(account.code || '');
                    setCurrency(account.currency || 'ZMW');
                    setDivision(account.division || '');
                    setIsInactive(!account.isPaymentAccount);
                    // Add other fields if available in the model
                }
            } catch (err) {
                console.error('Failed to fetch bank account:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccount();
    }, [id]);

    const handleUpdate = async () => {
        if (!id) return;
        try {
            await apiService.updateBankAccount(id, {
                name: name.toUpperCase(),
                code,
                currency,
                division,
                isPaymentAccount: true,
                inactive: isInactive
            });
            navigate('/account');
        } catch (err) {
            console.error('Failed to update bank account:', err);
            alert('Failed to update bank account in database');
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!window.confirm('Are you sure you want to delete this bank account?')) return;
        try {
            await apiService.deleteBankAccount(id);
            navigate('/account');
        } catch (err: any) {
            console.error('Failed to delete bank account:', err);
            alert(err.response?.data?.error || 'Failed to delete bank account');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading account details...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#f9fafb] min-h-full pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-[#f4f6f8] px-4 py-2 border-b border-gray-200 flex items-center text-[12px] text-[#78909c] space-x-2 select-none">
                <i className="fas fa-university text-[#90a4ae] scale-75"></i>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <Link to="/account" className="hover:text-[#2196f3] text-[#2196f3]">Bank and Cash Accounts</Link>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <span className="text-[#90a4ae]">Edit</span>
            </div>

            <div className="p-6">
                <div className="bg-white border border-[#cfd8dc] shadow-sm rounded-sm max-w-[640px] mx-auto p-10">

                    {/* Title */}
                    <div className="flex items-center space-x-2 mb-8">
                        <h2 className="text-[#90a4ae] text-[18px] font-normal">Bank or Cash Account</h2>
                        <div className="w-4 h-4 rounded bg-[#cfd8dc] text-white flex items-center justify-center text-[10px] font-bold cursor-help">?</div>
                    </div>

                    <div className="space-y-6">
                        {/* Name + Code */}
                        <div className="flex space-x-6">
                            <div className="flex-1 space-y-1.5">
                                <label className="block text-[13px] text-[#455a64]">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border border-[#cfd8dc] px-3 py-1.5 text-[13px] text-[#263238] rounded focus:outline-none focus:border-[#2196f3] bg-white h-[34px]"
                                />
                            </div>
                            <div className="w-36 space-y-1.5">
                                <label className="block text-[13px] text-[#455a64]">Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full border border-[#cfd8dc] px-3 py-1.5 text-[13px] text-[#263238] rounded focus:outline-none focus:border-[#2196f3] bg-white h-[34px] placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Currency */}
                        <div className="space-y-1.5">
                            <label className="block text-[13px] text-[#455a64]">Currency</label>
                            <div className="relative w-52">
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full border border-[#cfd8dc] pl-3 pr-8 py-1.5 text-[13px] text-[#263238] rounded appearance-none focus:outline-none focus:border-[#2196f3] bg-white h-[34px]"
                                >
                                    <option value="ZMW">ZMW - Zambian Kwacha</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                    <option value="ZAR">ZAR - South African Rand</option>
                                </select>
                                <i className="fas fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-[#455a64] text-[10px] pointer-events-none"></i>
                            </div>
                        </div>

                        {/* Division */}
                        <div className="space-y-1.5">
                            <label className="block text-[13px] text-[#455a64]">Division</label>
                            <div className="relative w-40">
                                <select
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                    className="w-full border border-[#cfd8dc] pl-3 pr-8 py-1.5 text-[13px] text-[#263238] rounded appearance-none focus:outline-none focus:border-[#2196f3] bg-white h-[34px]"
                                >
                                    <option value="">Optional</option>
                                    <option value="HQ">HQ</option>
                                    <option value="Branch">Branch</option>
                                    <option value="Finance">Finance</option>
                                </select>
                                <i className="fas fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-[#455a64] text-[10px] pointer-events-none"></i>
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-3 pt-2">
                            {/* IBAN */}
                            <div>
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <div
                                        onClick={() => setHasIBAN(!hasIBAN)}
                                        className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${hasIBAN ? 'bg-[#2196f3] border-[#2196f3]' : 'border-[#cfd8dc] bg-white'}`}
                                    >
                                        {hasIBAN && <i className="fas fa-check text-white text-[8px]"></i>}
                                    </div>
                                    <span onClick={() => setHasIBAN(!hasIBAN)} className="text-[13px] text-[#2196f3] group-hover:text-[#1976d2] transition-colors">
                                        International Bank Account Number (IBAN)
                                    </span>
                                </label>
                                {hasIBAN && (
                                    <div className="ml-5 mt-1.5">
                                        <input
                                            type="text"
                                            value={ibanValue}
                                            onChange={(e) => setIbanValue(e.target.value)}
                                            className="w-64 border border-[#cfd8dc] px-3 py-1.5 text-[13px] text-[#263238] rounded focus:outline-none focus:border-[#2196f3] bg-white h-[34px]"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Can have pending transactions */}
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <div
                                    onClick={() => setCanHavePending(!canHavePending)}
                                    className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${canHavePending ? 'bg-[#2196f3] border-[#2196f3]' : 'border-[#cfd8dc] bg-white'}`}
                                >
                                    {canHavePending && <i className="fas fa-check text-white text-[8px]"></i>}
                                </div>
                                <span onClick={() => setCanHavePending(!canHavePending)} className="text-[13px] text-[#2196f3] group-hover:text-[#1976d2] transition-colors">
                                    Can have pending transactions
                                </span>
                            </label>

                            {/* Credit limit */}
                            <div>
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <div
                                        onClick={() => setHasCreditLimit(!hasCreditLimit)}
                                        className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${hasCreditLimit ? 'bg-[#2196f3] border-[#2196f3]' : 'border-[#cfd8dc] bg-white'}`}
                                    >
                                        {hasCreditLimit && <i className="fas fa-check text-white text-[8px]"></i>}
                                    </div>
                                    <span onClick={() => setHasCreditLimit(!hasCreditLimit)} className="text-[13px] text-[#2196f3] group-hover:text-[#1976d2] transition-colors">
                                        Credit limit
                                    </span>
                                </label>
                                {hasCreditLimit && (
                                    <div className="ml-5 mt-1.5">
                                        <div className="flex items-center h-[34px]">
                                            <input
                                                type="number"
                                                value={creditLimit}
                                                onChange={(e) => setCreditLimit(e.target.value)}
                                                min={0}
                                                className="w-28 border border-[#cfd8dc] px-3 py-1.5 text-[13px] text-[#263238] rounded-l focus:outline-none focus:border-[#2196f3] bg-white h-full text-right"
                                            />
                                            <div className="bg-[#f5f5f5] border border-[#cfd8dc] border-l-0 px-3 py-1.5 text-[13px] text-[#455a64] rounded-r h-full flex items-center">
                                                {currency}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inactive */}
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <div
                                    onClick={() => setIsInactive(!isInactive)}
                                    className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${isInactive ? 'bg-[#2196f3] border-[#2196f3]' : 'border-[#cfd8dc] bg-white'}`}
                                >
                                    {isInactive && <i className="fas fa-check text-white text-[8px]"></i>}
                                </div>
                                <span onClick={() => setIsInactive(!isInactive)} className="text-[13px] text-[#2196f3] group-hover:text-[#1976d2] transition-colors">
                                    Inactive
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#f4f6f8] border-t border-[#cfd8dc] px-8 py-3 flex items-center h-14 z-10 pl-64">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleUpdate}
                        className="bg-[#4caf50] hover:bg-[#43a047] text-white px-6 py-1.5 rounded text-[13px] font-medium transition shadow-sm"
                    >
                        Update
                    </button>
                    <button
                        onClick={handleDelete}
                        className="bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-50 px-6 py-1.5 rounded text-[13px] font-medium transition"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditBankAccountView;
