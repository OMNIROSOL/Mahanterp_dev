import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, ArrowRightLeft } from 'lucide-react';
import apiService from '../services/apiService';

const ViewInterAccountTransferView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [transfer, setTransfer] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (id) {
                    const [tData, accData] = await Promise.all([
                        apiService.getInterAccountTransfer(id),
                        apiService.getAccounts()
                    ]);
                    setTransfer(tData);
                    setAccounts(accData);
                }
            } catch (err) {
                console.error('Error loading transfer:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div className="p-12 text-center text-slate-500 font-bold">Loading...</div>;
    if (!transfer) return <div className="p-12 text-center text-slate-500 font-bold">Transfer not found</div>;

    const fromAcc = accounts.find(a => a.id === transfer.paidFromAccount) || { name: transfer.paidFromAccount };
    const toAcc = accounts.find(a => a.id === transfer.receivedInAccount) || { name: transfer.receivedInAccount };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 shadow-sm print:hidden">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/inter-account-transfers')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">
                                Transfer {transfer.reference}
                            </h1>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-6 py-2.5 rounded-xl text-[13px] font-black tracking-widest uppercase transition-all flex items-center gap-2"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 p-12">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Inter Account Transfer</h2>
                            <p className="text-sm font-bold text-slate-500 mt-2 tracking-widest uppercase">{transfer.reference}</p>
                        </div>
                        <div className="text-right">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 ml-auto">
                                <ArrowRightLeft size={32} strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                            <p className="text-sm font-bold text-slate-800">{new Date(transfer.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-16">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Paid From</p>
                            <p className="text-lg font-black text-slate-800">{fromAcc.name}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Received In</p>
                            <p className="text-lg font-black text-slate-800">{toAcc.name}</p>
                        </div>
                    </div>

                    {transfer.description && (
                        <div className="mb-12">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                            <p className="text-sm font-bold text-slate-700">{transfer.description}</p>
                        </div>
                    )}

                    <div className="border-t-2 border-slate-100 pt-8 flex justify-between items-end">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                                {transfer.status}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Transfer Amount</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                <span className="text-lg text-slate-400 font-bold mr-2">{transfer.currency || 'ZMW'}</span>
                                {parseFloat(String(transfer.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewInterAccountTransferView;
