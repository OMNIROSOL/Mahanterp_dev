import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchableSelect({ value, options, onChange, placeholder = 'Select...', className = '' }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    const updatePosition = useCallback(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            // Check if there is enough space below, else show above
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 300; // estimated max height
            const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

            setDropdownStyles({
                position: 'fixed',
                top: showAbove ? 'auto' : `${rect.bottom + 4}px`,
                bottom: showAbove ? `${window.innerHeight - rect.top + 4}px` : 'auto',
                left: `${rect.left}px`,
                width: `${Math.max(300, rect.width)}px`,
                zIndex: 99999,
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(event.target as Node);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
            
            if (isOutsideWrapper && isOutsideDropdown) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div 
                className="w-full flex items-center justify-between bg-transparent border-none p-0 text-sm font-bold text-[#2563eb] cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleOpen();
                }}
            >
                <span className="truncate flex-1 text-left">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown size={14} className="opacity-50 flex-shrink-0 ml-1" />
            </div>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    style={dropdownStyles}
                    className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                            type="text"
                            className="w-full text-sm outline-none bg-transparent placeholder:text-slate-300 font-medium text-slate-700"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">No items found</div>
                        ) : (
                            filteredOptions.map((opt, i) => (
                                <button
                                    key={`${opt.value}-${i}`}
                                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                                        opt.value === value 
                                            ? 'bg-indigo-50 text-indigo-700' 
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
