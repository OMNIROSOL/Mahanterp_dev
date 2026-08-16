import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DeliveryNoteFormDefaultsView = () => {
    const navigate = useNavigate();
    const [extraOptions, setExtraOptions] = useState({
        lineNumber: false,
        customTitle: false,
        footers: false
    });
    const [customTitleText, setCustomTitleText] = useState('Delivery Note');
    const [footersText, setFootersText] = useState('');
    const [inventoryLocation, setInventoryLocation] = useState('Default Inventory Location');

    // Load existing defaults on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('delivery_note_form_defaults');
        if (saved) {
            const defaults = JSON.parse(saved);
            setExtraOptions({
                lineNumber: !!defaults.lineNumber,
                customTitle: !!defaults.customTitle,
                footers: !!defaults.footers
            });
            if (defaults.customTitleText) setCustomTitleText(defaults.customTitleText);
            if (defaults.footersText) setFootersText(defaults.footersText);
            if (defaults.inventoryLocation) setInventoryLocation(defaults.inventoryLocation);
        }
    }, []);

    const handleUpdate = () => {
        const defaults = {
            ...extraOptions,
            customTitleText,
            footersText,
            inventoryLocation
        };
        localStorage.setItem('delivery_note_form_defaults', JSON.stringify(defaults));
        navigate('/delivery-notes');
    };

    return (
        <div className="bg-[#f9fafb] min-h-full pb-20 font-sans">
            <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-[12px] text-[#78909c] space-x-1.5 select-none no-print">
                <i className="fas fa-folder-open text-[#90a4ae]"></i>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <Link to="/delivery-notes" className="hover:text-[#2196f3]">Delivery Notes</Link>
                <i className="fas fa-caret-right text-[#cfd8dc] scale-75"></i>
                <span>Form Defaults</span>
            </div>

            <div className="p-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg max-w-[1200px] mx-auto p-10">
                    <div className="flex items-center space-x-2 mb-8 select-none">
                        <h2 className="text-gray-900 text-xl font-bold">Delivery Note — Form Defaults</h2>
                        <i className="far fa-question-circle text-gray-400 text-[14px] cursor-help"></i>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-gray-700">Inventory Location</label>
                                <div className="relative">
                                    <select
                                        value={inventoryLocation}
                                        onChange={(e) => setInventoryLocation(e.target.value)}
                                        className="w-full border border-gray-300 px-3 py-1.5 text-[14px] text-gray-900 rounded-md appearance-none focus:outline-none focus:border-blue-500 bg-white h-[36px]"
                                    >
                                        <option value="Default Inventory Location">Default Inventory Location</option>
                                    </select>
                                    <i className="fas fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={extraOptions.lineNumber}
                                        onChange={() => setExtraOptions(prev => ({ ...prev, lineNumber: !prev.lineNumber }))}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-[14px] text-gray-700 font-normal group-hover:text-blue-600 transition-colors">
                                        Column — Line number
                                    </span>
                                </label>

                                <div className="space-y-2">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={extraOptions.customTitle}
                                            onChange={() => setExtraOptions(prev => ({ ...prev, customTitle: !prev.customTitle }))}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                        />
                                        <span className="text-[14px] text-gray-700 font-normal group-hover:text-blue-600 transition-colors">
                                            Custom title
                                        </span>
                                    </label>
                                    {extraOptions.customTitle && (
                                        <div className="ml-7">
                                            <input
                                                type="text"
                                                value={customTitleText}
                                                onChange={(e) => setCustomTitleText(e.target.value)}
                                                className="w-full max-w-[400px] border border-gray-300 px-3 py-1.5 text-[13px] text-gray-900 rounded focus:outline-none focus:border-blue-500 bg-white h-[32px]"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={extraOptions.footers}
                                            onChange={() => setExtraOptions(prev => ({ ...prev, footers: !prev.footers }))}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                        />
                                        <span className="text-[14px] text-gray-700 font-normal group-hover:text-blue-600 transition-colors">
                                            Footers
                                        </span>
                                    </label>
                                    {extraOptions.footers && (
                                        <div className="ml-7">
                                            <textarea
                                                value={footersText}
                                                onChange={(e) => setFootersText(e.target.value)}
                                                placeholder="Default footer message..."
                                                className="w-full max-w-[600px] border border-gray-300 px-3 py-2 text-[13px] text-gray-900 rounded focus:outline-none focus:border-blue-500 bg-white min-h-[100px] resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-10 border-t border-gray-100 flex items-center space-x-4">
                            <button
                                onClick={handleUpdate}
                                className="bg-blue-600 text-white px-10 py-3 rounded-md text-[16px] font-bold hover:bg-blue-700 transition shadow-md uppercase tracking-wider"
                            >
                                Update
                            </button>
                            <button
                                onClick={() => navigate('/delivery-notes')}
                                className="bg-white border border-gray-300 text-gray-700 px-10 py-3 rounded-md text-[16px] font-bold hover:bg-gray-50 transition shadow-sm uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryNoteFormDefaultsView;
