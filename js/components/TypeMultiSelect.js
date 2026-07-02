import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { getIconForHotelType } from '../constants';

const TypeMultiSelect = ({ types, selectedIds, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        let newSelection = [...selectedIds];
        if (id === 'all') {
            newSelection = newSelection.includes('all') ? [] : ['all'];
        } else {
            newSelection = newSelection.filter(v => v !== 'all');
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(v => v !== id);
            } else {
                newSelection.push(id);
            }
        }
        onChange(newSelection);
    };

    const getDisplayText = () => {
        if (selectedIds.length === 0) return "Chọn loại hình";
        if (selectedIds.includes('all')) return t('all_types') || "Tất cả loại hình";
        if (selectedIds.length === 1) {
            const type = types.find(t => t.id === selectedIds[0]);
            return type ? type.label : "Chọn loại hình";
        }
        return `Đã chọn ${selectedIds.length} loại hình`;
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700 pointer-events-none">
                <Icon name="layers" size={14} />
            </div>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-10 pr-16 py-2.5 bg-white rounded-xl border-2 border-stone-100 hover:border-stone-200 outline-none transition-all font-bold text-xs text-stone-600 cursor-pointer flex items-center justify-between select-none"
            >
                <span className="truncate">{getDisplayText()}</span>
            </div>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                {selectedIds.length > 0 && (
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange([]); }}
                        className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all active:scale-95"
                        title="Bỏ chọn tất cả"
                    >
                        <Icon name="x" size={14} />
                    </button>
                )}
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1.5 text-stone-400 cursor-pointer hover:text-stone-600 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} title={isOpen ? "Đóng" : "Mở"}>
                    <Icon name="chevron-down" size={16} />
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-[60vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                            {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : 'Loại hình'}
                        </span>
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                                className="text-[10px] text-red-600 font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 uppercase tracking-widest active:scale-95"
                            >
                                <Icon name="trash-2" size={12} /> Bỏ chọn
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto py-1">
                        <div 
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleSelection('all'); }}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes('all') ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                {selectedIds.includes('all') && <Icon name="check" size={12} />}
                            </div>
                            {t('all_types') || "Tất cả loại hình"}
                        </div>
                        {types.map(type => (
                            <div 
                                key={type.id}
                                className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(type.id); }}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(type.id) ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                    {selectedIds.includes(type.id) && <Icon name="check" size={12} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name={getIconForHotelType(type.id)} size={12} className="text-stone-400" />
                                    <span>{type.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-2 border-t border-stone-100 bg-white shrink-0 relative z-10 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)]">
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm hover:shadow-md">
                            Đóng <Icon name="x" size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TypeMultiSelect;
