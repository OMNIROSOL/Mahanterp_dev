import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const InvoiceFormDefaultsView = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([{ id: 1, account: '', qty: '', unitPrice: '', taxCode: 'No tax' }]);
    const [dueDateType, setDueDateType] = useState('Net');
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [showDescription, setShowDescription] = useState(true);
    const [showDiscount, setShowDiscount] = useState(true);
    const [discountType, setDiscountType] = useState('Percentage');
    const [isTaxInclusive, setIsTaxInclusive] = useState(false);
    const [showRounding, setShowRounding] = useState(false);
    const [roundingType, setRoundingType] = useState('None');
    const [showWithholding, setShowWithholding] = useState(false);
    const [withholdingType, setWithholdingType] = useState('Rate (%)');
    const [showEarlyPaymentDiscount, setShowEarlyPaymentDiscount] = useState(false);
    const [earlyPaymentType, setEarlyPaymentType] = useState('Percentage');
    const [earlyPaymentValue, setEarlyPaymentValue] = useState('0');
    const [earlyPaymentDays, setEarlyPaymentDays] = useState('');
    const [showLatePaymentFees, setShowLatePaymentFees] = useState(false);
    const [latePaymentFeePercentage, setLatePaymentFeePercentage] = useState('0');
    const [customTitle, setCustomTitle] = useState('');
    const [inventoryLocation, setInventoryLocation] = useState('Default Inventory Location');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [footerText, setFooterText] = useState('');
    const [extraOptions, setExtraOptions] = useState({
        'Total amount in words': true,
        'Total amount in base currency': false,
        'Custom title': false,
        'Hide — Due date': false,
        'Hide — Balance due': false,
        'Closed invoice': false,
        'Show item images': false,
        'Show tax amount column': false,
        'Also acts as delivery note': false,
        'Footers': false
    });

    const addLine = () => {
        setItems([...items, { id: Date.now(), account: '', qty: '', unitPrice: '', taxCode: 'No tax' }]);
    };

    const removeLine = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    return (
        <div className="invoice-screen-container bg-[#f3f4f6]">
            <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-[11px] text-gray-500 space-x-1.5 select-none">
                <i className="fas fa-folder-open text-[#90a4ae]"></i>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <Link to="/invoices" className="hover:text-[#2196f3]">Sales Invoices</Link>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <span className="text-gray-400">Edit</span>
            </div>

            <div className="p-8 max-w-[1200px]">
                <div className="flex items-center space-x-2 mb-6">
                    <h1 className="text-[18px] text-[#455a64]">Sales Invoice</h1>
                    <i className="far fa-question-circle text-[#90a4ae] text-[14px]"></i>
                </div>

                <div className="space-y-6 bg-white p-8 border border-gray-200 rounded-sm shadow-sm">
                    <div className="grid grid-cols-4 gap-6">
                        <div className="flex flex-col">
                            <label className="text-[12px] text-gray-600 mb-1">Issue date</label>
                            <input type="date" className="border border-gray-300 px-2 py-1 text-[13px] rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue="2026-02-25" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[12px] text-gray-600 mb-1">Due date</label>
                            <div className="flex items-center space-x-2">
                                <select
                                    value={dueDateType}
                                    onChange={(e) => setDueDateType(e.target.value)}
                                    className="border border-gray-300 px-2 py-1 text-[13px] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Net">Net</option>
                                    <option value="By">By</option>
                                </select>
                                {dueDateType === 'Net' ? (
                                    <>
                                        <input type="text" className="border border-gray-300 px-2 py-1 text-[13px] w-16 rounded-sm text-center" defaultValue="0" />
                                        <span className="text-[12px] text-gray-500">days</span>
                                    </>
                                ) : (
                                    <div className="relative flex-1 min-w-[120px]">
                                        <input type="date" className="w-full border border-gray-300 px-2 py-1 text-[13px] rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue="2026-02-25" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[12px] text-gray-600 mb-1">Reference</label>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" className="w-3.5 h-3.5" />
                                <input type="text" placeholder="Optional" className="border border-gray-300 px-2 py-1 text-[13px] flex-1 rounded-sm italic" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col max-w-md">
                        <label className="text-[12px] text-gray-600 mb-1">Customer</label>
                        <select className="border border-gray-300 px-2 py-1 text-[13px] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option></option>
                        </select>
                    </div>

                    <div className="flex flex-col max-w-md">
                        <label className="text-[12px] text-gray-600 mb-1">Billing address</label>
                        <textarea className="border border-gray-300 px-2 py-1 text-[13px] rounded-sm h-24 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"></textarea>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[12px] text-gray-600 mb-1">Description</label>
                        <input type="text" placeholder="Optional" className="border border-gray-300 px-2 py-1 text-[13px] rounded-sm italic focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>

                    <div className="mt-8 overflow-x-scroll">
                        <table className="w-full text-[12px] border-collapse border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                    {showLineNumbers && <th className="border border-gray-200 p-2 text-left w-8">#</th>}
                                    <th className="border border-gray-200 p-2 text-left">Item</th>
                                    {showDescription && <th className="border border-gray-200 p-2 text-left">Description</th>}
                                    <th className="border border-gray-200 p-2 text-left">Account</th>
                                    <th className="border border-gray-200 p-2 text-center w-20">Qty</th>
                                    <th className="border border-gray-200 p-2 text-right w-24">Unit price</th>
                                    {showDiscount && <th className="border border-gray-200 p-2 text-right w-24">Discount</th>}
                                    <th className="border border-gray-200 p-2 text-right w-24">Total</th>
                                    <th className="border border-gray-200 p-2 text-left w-24">Tax Code</th>
                                    {isTaxInclusive && <th className="border border-gray-200 p-2 text-right w-24">Tax Amount</th>}
                                    <th className="border border-gray-200 p-2 text-right w-24">Total</th>
                                    <th className="border border-gray-200 p-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        {showLineNumbers && <td className="border border-gray-200 p-2 text-center text-gray-400">{index + 1}</td>}
                                        <td className="border border-gray-200 p-2"><select className="w-full border-none focus:ring-0 bg-transparent text-[13px]"><option></option></select></td>
                                        {showDescription && (
                                            <td className="border border-gray-200 p-2">
                                                <textarea className="w-full border border-gray-200 rounded-sm p-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[40px]"></textarea>
                                            </td>
                                        )}
                                        <td className="border border-gray-200 p-2"><select className="w-full border-none focus:ring-0 bg-transparent text-[13px]"><option></option></select></td>
                                        <td className="border border-gray-200 p-2"><input type="text" className="w-full border-none text-center focus:ring-0 bg-transparent text-[13px]" /></td>
                                        <td className="border border-gray-200 p-2"><input type="text" className="w-full border-none text-right focus:ring-0 bg-transparent text-[13px]" /></td>
                                        {showDiscount && (
                                            <td className="border border-gray-200 p-2">
                                                <div className="flex items-center">
                                                    <input type="text" className="w-full border-none text-right focus:ring-0 bg-transparent text-[13px]" />
                                                    <span className="text-[11px] text-gray-400 ml-1">{discountType === 'Percentage' ? '%' : 'ZMW'}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="border border-gray-200 p-2 text-right text-gray-400">ZMW 0</td>
                                        <td className="border border-gray-200 p-2"><select className="w-full border-none focus:ring-0 bg-transparent text-[13px]"><option>No tax</option></select></td>
                                        {isTaxInclusive && (
                                            <td className="border border-gray-200 p-2 text-right">
                                                <div className="bg-gray-50 border border-gray-200 rounded-sm px-2 py-1 text-[13px] text-gray-400 inline-block min-w-[60px]">0</div>
                                            </td>
                                        )}
                                        <td className="border border-gray-200 p-2 text-right text-gray-400 font-bold">ZMW 0</td>
                                        <td className="border border-gray-200 p-2 text-center">
                                            <button onClick={() => removeLine(item.id)} className="text-gray-400 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            onClick={addLine}
                            className="mt-4 bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-medium text-gray-700 rounded shadow-sm hover:bg-gray-50 flex items-center"
                        >
                            <i className="fas fa-caret-right mr-2 text-[10px]"></i> Add line
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-8">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={showLineNumbers}
                                onChange={(e) => setShowLineNumbers(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Column — Line number</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={showDescription}
                                onChange={(e) => setShowDescription(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Column — Description</span>
                        </label>
                        <div className="flex items-center space-x-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showDiscount}
                                    onChange={(e) => setShowDiscount(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Column — Discount</span>
                            </label>
                            {showDiscount && (
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value)}
                                    className="border border-gray-300 px-2 py-0.5 text-[11px] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ml-2"
                                >
                                    <option value="Percentage">Percentage</option>
                                    <option value="Exact amount">Exact amount</option>
                                </select>
                            )}
                        </div>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isTaxInclusive}
                                onChange={(e) => setIsTaxInclusive(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Amounts are tax inclusive</span>
                        </label>
                        <div className="flex items-center space-x-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showRounding}
                                    onChange={(e) => setShowRounding(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Rounding</span>
                            </label>
                            {showRounding && (
                                <select
                                    value={roundingType}
                                    onChange={(e) => setRoundingType(e.target.value)}
                                    className="border border-gray-300 px-2 py-0.5 text-[11px] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ml-2"
                                >
                                    <option value="None">None</option>
                                    <option value="Round to nearest">Round to nearest</option>
                                    <option value="Round down">Round down</option>
                                </select>
                            )}
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showWithholding}
                                    onChange={(e) => setShowWithholding(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Withholding tax</span>
                            </label>
                            {showWithholding && (
                                <div className="flex items-center space-x-2 ml-5">
                                    <div className="relative">
                                        <select
                                            value={withholdingType}
                                            onChange={(e) => setWithholdingType(e.target.value)}
                                            className="border border-blue-300 px-3 py-1.5 text-[13px] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[120px] appearance-none pr-8"
                                        >
                                            <option value="Rate (%)">Rate</option>
                                            <option value="Amount (currency)">Amount</option>
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]"></i>
                                    </div>
                                    <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white">
                                        <input
                                            type="text"
                                            className="w-20 px-3 py-1.5 text-[13px] text-right focus:outline-none"
                                            defaultValue="0"
                                        />
                                        <div className="bg-gray-50 px-2 py-1.5 border-l border-gray-200 text-[12px] text-gray-500 min-w-[32px] text-center">
                                            {withholdingType === 'Rate (%)' ? '%' : 'ZMW'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showEarlyPaymentDiscount}
                                    onChange={(e) => setShowEarlyPaymentDiscount(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Early payment discount</span>
                            </label>
                            {showEarlyPaymentDiscount && (
                                <div className="ml-5 mt-2 flex items-center space-x-2">
                                    <div className="relative">
                                        <select
                                            value={earlyPaymentType}
                                            onChange={(e) => setEarlyPaymentType(e.target.value)}
                                            className="w-32 border border-blue-300 px-2 py-1 text-[11px] text-[#263238] rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white h-[28px] appearance-none pr-6"
                                        >
                                            <option value="Percentage">Percentage</option>
                                            <option value="Exact amount">Exact amount</option>
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                                    </div>

                                    <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden h-[28px] bg-white">
                                        <input
                                            type="text"
                                            value={earlyPaymentValue}
                                            onChange={(e) => setEarlyPaymentValue(e.target.value)}
                                            className="w-16 px-2 py-1 text-[11px] text-[#263238] focus:outline-none text-right"
                                        />
                                        <div className="bg-gray-50 border-l border-gray-100 px-2 py-1 text-[11px] text-gray-400 h-full flex items-center">
                                            {earlyPaymentType === 'Percentage' ? '%' : 'ZMW'}
                                        </div>
                                    </div>

                                    <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden h-[28px] bg-white">
                                        <div className="bg-gray-50 px-2 py-1 text-[11px] text-gray-500 h-full flex items-center border-r border-gray-100">
                                            If paid within
                                        </div>
                                        <input
                                            type="text"
                                            value={earlyPaymentDays}
                                            onChange={(e) => setEarlyPaymentDays(e.target.value)}
                                            className="w-12 px-2 py-1 text-[11px] text-[#263238] focus:outline-none text-center"
                                        />
                                        <div className="bg-gray-50 border-l border-gray-100 px-2 py-1 text-[11px] text-gray-400 h-full flex items-center">
                                            days
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showLatePaymentFees}
                                    onChange={(e) => setShowLatePaymentFees(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">Late payment fees</span>
                            </label>
                            {showLatePaymentFees && (
                                <div className="ml-5 mt-2 flex items-center border border-gray-200 rounded-sm overflow-hidden h-[28px] bg-white w-fit">
                                    <div className="bg-gray-50 px-3 py-1 text-[11px] text-gray-500 h-full flex items-center border-r border-gray-100">
                                        Charge monthly
                                    </div>
                                    <input
                                        type="text"
                                        value={latePaymentFeePercentage}
                                        onChange={(e) => setLatePaymentFeePercentage(e.target.value)}
                                        className="w-20 px-3 py-1 text-[11px] text-[#263238] focus:outline-none text-right"
                                    />
                                    <div className="bg-gray-50 border-l border-gray-100 px-3 py-1 text-[11px] text-gray-400 h-full flex items-center">
                                        %
                                    </div>
                                </div>
                            )}
                        </div>
                        {Object.entries(extraOptions).map(([label, checked]) => (
                            <div key={label} className="flex flex-col space-y-2">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => setExtraOptions(prev => ({ ...prev, [label]: !prev[label] }))}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-[12px] text-gray-700 group-hover:text-blue-600 transition-colors">{label}</span>
                                </label>
                                {label === 'Custom title' && checked && (
                                    <div className="ml-5">
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={(e) => setCustomTitle(e.target.value)}
                                            placeholder="Invoice"
                                            className="w-full max-w-md border border-gray-200 rounded-md px-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                )}
                                {label === 'Footers' && checked && (
                                    <div className="ml-5">
                                        <textarea
                                            value={footerText}
                                            onChange={(e) => setFooterText(e.target.value)}
                                            className="w-full max-w-md border border-gray-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                                        />
                                    </div>
                                )}
                                {label === 'Also acts as delivery note' && checked && (
                                    <div className="ml-5 flex items-center space-x-2">
                                        <span className="text-[12px] text-gray-500">Inventory Location</span>
                                        <div className="relative">
                                            <div
                                                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                                                className="min-w-[200px] border border-blue-300 px-3 py-1 text-[12px] text-[#263238] rounded-sm bg-white h-[28px] flex items-center justify-between cursor-pointer select-none"
                                            >
                                                <span>{inventoryLocation}</span>
                                                <i className={`fas fa-caret-down text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}></i>
                                            </div>

                                            {showLocationDropdown && (
                                                <div className="absolute top-full left-0 mt-1 w-[250px] bg-white border border-blue-400 rounded-sm shadow-lg z-50 overflow-hidden">
                                                    <div className="p-2 border-b border-gray-100">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={locationSearch}
                                                            onChange={(e) => setLocationSearch(e.target.value)}
                                                            className="w-full border border-blue-300 rounded-sm px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        {[
                                                            'Copperbelt Upcountry',
                                                            'KITWE',
                                                            'NDOLA - SPARES',
                                                            'Solwezi',
                                                            'UDDIT SHOP - CAIRO',
                                                            'UPCOUNTRY',
                                                            'WAREHOUSE',
                                                            'Z-SUPENSE'
                                                        ].filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase())).map((loc) => (
                                                            <div
                                                                key={loc}
                                                                onClick={() => {
                                                                    setInventoryLocation(loc);
                                                                    setShowLocationDropdown(false);
                                                                    setLocationSearch('');
                                                                }}
                                                                className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-blue-600 hover:text-white transition-colors ${inventoryLocation === loc ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                                                            >
                                                                {loc}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8">
                        <div className="border border-gray-200 rounded-sm p-4 max-w-xs">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Custom Fields</span>
                            <label className="text-[12px] text-gray-600 block mb-1">TPIN</label>
                            <input type="text" className="w-full border border-gray-300 px-2 py-1 text-[13px] rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="mt-8 border-t border-gray-100 pt-8">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Image</span>
                        <div className="flex items-center space-x-4">
                            <button className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-medium text-gray-700 rounded shadow-sm hover:bg-gray-50">Choose File</button>
                            <span className="text-[12px] text-gray-400">No file chosen</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center space-x-4">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded text-[13px] font-bold hover:bg-blue-700 transition-colors shadow-md">Update</button>
                    <span className="text-[12px] text-gray-400 italic">Administrator has disabled "Update" and "Delete" buttons</span>
                </div>
            </div>
        </div>
    );
};

export default InvoiceFormDefaultsView;
