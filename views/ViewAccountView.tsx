import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';

const ViewAccountView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [account, setAccount] = React.useState<Account | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAccount = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getAccount(id!);
                setAccount(data);
            } catch (err) {
                console.error('Failed to fetch account:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchAccount();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing account view...</p>
            </div>
        );
    }

    if (!account) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest">Account not found.</div>;

    return (
        <div className="bg-[#f3f4f6] min-h-full flex flex-col">
            <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-[11px] text-gray-500 space-x-1.5 select-none no-print">
                <i className="fas fa-folder-open text-[#90a4ae]"></i>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <Link to="/accounts" className="hover:text-[#2196f3]">Accounts</Link>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <span className="text-gray-400">View</span>
            </div>

            <div className="bg-[#f9fafb] px-4 py-3 border-b border-gray-200 flex items-center justify-between no-print">
                <div className="flex items-center space-x-3">
                    <span className="text-[13px] text-gray-400 mr-2">Account Details</span>
                    <button onClick={() => navigate(`/accounts/edit/${account.id}`)} className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-medium text-gray-700 rounded shadow-sm hover:bg-gray-50">Edit</button>
                    <button className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-medium text-gray-700 rounded shadow-sm hover:bg-gray-50">Print</button>
                </div>
            </div>

            <div className="flex-1 p-6 flex justify-center overflow-auto bg-[#f3f4f6]">
                <div className="bg-white shadow-xl p-12 w-full max-w-[850px] min-h-[600px] relative font-sans text-gray-900 border border-gray-200">
                    <div className="flex justify-between items-start mb-10">
                        <h1 className="text-4xl font-bold text-gray-900">Account</h1>
                        <div className="text-right">
                            <h2 className="text-xl font-bold uppercase">{account.name}</h2>
                            <p className="text-gray-500 text-sm">Code: {account.code || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-10 text-[14px]">
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold block text-gray-400 uppercase text-[10px]">Account Name</span>
                                <span className="text-lg">{account.name}</span>
                            </div>
                            <div>
                                <span className="font-bold block text-gray-400 uppercase text-[10px]">Account Code</span>
                                <span className="text-lg">{account.code || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold block text-gray-400 uppercase text-[10px]">Type</span>
                                <span className="text-lg">{account.type}</span>
                            </div>
                            <div>
                                <span className="font-bold block text-gray-400 uppercase text-[10px]">Balance</span>
                                <span className="text-lg font-bold text-[#2196f3]">ZMW {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-8 mt-8">
                        <span className="font-bold block text-gray-400 uppercase text-[10px] mb-4">Summary</span>
                        <p className="text-gray-600">
                            This is a {account.type.toLowerCase()} account.
                            {account.isPaymentAccount ? " It is configured as a payment account and will appear in receipt and payment screens." : " It is a standard ledger account."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewAccountView;
