import React, { useState, useEffect, useRef, useMemo } from 'react';
import Icon from './Icon';
import { removeVietnameseTones } from '../utils';

const RegionMultiSelect = ({ provinces, selectedIds, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery("");
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
        if (selectedIds.length === 0) return t('select_region');
        if (selectedIds.includes('all')) return t('all_regions');
        if (selectedIds.length === 1) {
            const p = provinces.find(p => p.id === selectedIds[0]);
            return p ? p.locationName : t('select_region');
        }
        return `Đã chọn ${selectedIds.length} khu vực`;
    };

    const filteredProvinces = useMemo(() => {
        if (!searchQuery) return provinces;
        const normalizedSearch = removeVietnameseTones(searchQuery);
        return provinces.filter(p => 
            removeVietnameseTones(p.locationName).includes(normalizedSearch)
        );
    }, [provinces, searchQuery]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700 pointer-events-none">
                <Icon name="map" size={14} />
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
                            {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : 'Khu vực'}
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
                    
                    <div className="p-2 border-b border-stone-100 bg-white sticky top-0 z-10">
                        <div className="relative">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                                <Icon name="search" size={12} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Tìm khu vực..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-7 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                                >
                                    <Icon name="x" size={10} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto py-1">
                    {!searchQuery && (
                        <div 
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleSelection('all'); }}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes('all') ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                {selectedIds.includes('all') && <Icon name="check" size={12} />}
                            </div>
                            {t('all_regions')}
                        </div>
                    )}
                    {filteredProvinces.length > 0 ? (
                        filteredProvinces.map(p => (
                            <div 
                                key={p.id}
                                className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(p.id) ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                    {selectedIds.includes(p.id) && <Icon name="check" size={12} />}
                                </div>
                                {p.locationName}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-4 text-center text-xs text-stone-500 font-medium italic">
                            Không tìm thấy khu vực nào
                        </div>
                    )}
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

export default RegionMultiSelect;
