import React, { useState, useCallback, useMemo } from 'react'; 
import Icon from './Icon';
import ReportForm from './ReportForm';
import { HOTEL_TYPES, getIconForHotelType } from '../constants';
import { decodeBase64 } from '../utils';

const getTypeLabel = (type) => {
    const found = HOTEL_TYPES.find(t => t.id === type);
    return found ? found.label : type;
};

const StatusBadge = ({ status }) => {
    switch (status) {
        case 'reported':
            return (
                <div className="absolute bottom-4 left-4 bg-red-600 text-white px-3 py-1 rounded-xl text-[8px] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest">
                    <Icon name="flag" size={12} /> Đang bị báo lỗi
                </div>
            );
        case 'pending_review':
            return (
                <div className="absolute bottom-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-xl text-[8px] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest animate-pulse">
                    <Icon name="shield-alert" size={12} /> Cần Review Gấp
                </div>
            );
        case 'approved':
        default:
            return (
                <div className="absolute bottom-4 left-4 bg-orange-700 text-white px-3 py-1 rounded-xl text-[8px] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest">
                    <Icon name="check-circle" size={12} /> Đã xác thực
                </div>
            );
    }
};

const HotelDetail = ({ hotel, onClose, onShare, formatDate, handleImageError, onToast }) => {
    if (!hotel) return null;

    const [showReportForm, setShowReportForm] = useState(false);

    const handleCloseReportForm = useCallback(() => {
        setShowReportForm(false);
    }, []);

    const decodedDescription = useMemo(() => decodeBase64(hotel.description), [hotel.description]);
    const decodedPhone = useMemo(() => decodeBase64(hotel.phone), [hotel.phone]);
    const decodedAddress = useMemo(() => decodeBase64(hotel.address), [hotel.address]);
    const decodedWebsite = useMemo(() => decodeBase64(hotel.website), [hotel.website]);

    return (
        <div className={`
            fixed inset-0 z-50 flex items-end justify-center md:absolute md:inset-auto md:right-4 md:top-4 md:bottom-4 md:items-start
            animate-in slide-in-from-bottom duration-300 pointer-events-none
        `}>
            {/* Backdrop mobile */}
            <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden pointer-events-auto"></div>
            
            <div className="relative bg-white w-full max-h-[85vh] md:max-h-full md:w-[400px] md:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-hidden flex flex-col rounded-t-[40px] border-t-4 border-orange-700 md:border-none pb-safe isolate pointer-events-auto">
                <div className="relative h-48 sm:h-56 shrink-0 group">
                    <img src={hotel.image} onError={handleImageError} className="w-full h-full object-cover" />
                    <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[60] bg-stone-900/60 backdrop-blur-md text-white p-2 sm:p-2.5 rounded-full hover:bg-stone-900/80 active:scale-90 transition-all shadow-xl border border-white/20">
                        <Icon name="x" size={20} />
                    </button>
                    <StatusBadge status={hotel.status} />
                </div>
                
                <div id="hotel-detail-content" className="p-6 sm:p-8 flex-1 overflow-y-auto bg-white scrollbar-hide">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                            {hotel.type && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-stone-100 text-stone-600 text-[8px] font-black uppercase tracking-widest rounded-md mb-1.5 border border-stone-200">
                                    <Icon name={getIconForHotelType(hotel.type)} size={12} />
                                    {getTypeLabel(hotel.type)}
                                </span>
                            )}
                            <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight uppercase tracking-tight">{hotel.name}</h2>
                        </div>
                        <button onClick={() => onShare(hotel)} className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 rounded-full transition-all shrink-0 active:scale-95" title="Chia sẻ">
                            <Icon name="share-2" size={18} />
                        </button>
                    </div>
                    <p className="text-stone-500 text-[10px] font-bold flex items-start gap-1 mb-6 uppercase leading-relaxed">
                        <Icon name="map-pin" size={14} className="text-orange-700 shrink-0 mt-0.5" /> {decodedAddress}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-center flex flex-col justify-center">
                            <span className="text-[8px] text-stone-400 block mb-1 uppercase font-black tracking-widest">Ngày tham gia</span>
                            <div className="flex items-center justify-center gap-1 md:gap-1.5 text-stone-700 font-black text-[10px] md:text-xs uppercase">
                                <Icon name="calendar-plus" size={14} className="text-orange-700" /> {formatDate(hotel.createdAt)}
                            </div>
                        </div>
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-center flex flex-col justify-center">
                            <span className="text-[8px] text-stone-400 block mb-1 uppercase font-black tracking-widest">Cập nhật gần nhất</span>
                            <div className="flex items-center justify-center gap-1 md:gap-1.5 text-stone-700 font-black text-[10px] md:text-xs uppercase">
                                <Icon name="calendar-check" size={14} className="text-moss" /> {formatDate(hotel.updatedAt)}
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-stone-600 text-[13px] leading-relaxed bg-stone-50 p-4 rounded-2xl border-2 border-dashed border-stone-200 italic font-medium">
                            "{decodedDescription}"
                        </p>
                    </div>

                    <div className="space-y-3 mb-6 text-center">
                        <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-4">
                            Liên hệ & Tiện ích
                        </p>
                        {decodedWebsite && (
                            <a href={decodedWebsite} target="_blank" className="w-full flex items-center justify-center gap-2 bg-stone-900 text-stone-100 py-4 rounded-2xl font-black active:scale-95 transition-all uppercase text-[10px] tracking-widest">
                                <Icon name="external-link" size={16} /> Truy cập website
                            </a>
                        )}
                        <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}`} 
                            target="_blank" 
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black active:scale-95 transition-all uppercase text-[10px] tracking-widest hover:bg-blue-700"
                        >
                            <Icon name="navigation" size={16} /> Tìm đường đi
                        </a>
                        {decodedPhone && (
                            <button disabled className="w-full flex flex-col items-center justify-center gap-1 bg-orange-700 text-white py-4 sm:py-5 rounded-2xl font-black opacity-50 cursor-not-allowed transition-all">
                                    <div className="flex items-center gap-2 text-sm uppercase"><Icon name="phone" size={18} /> Gọi Hotline</div>
                                    <span className="text-[9px] opacity-70 tracking-widest font-bold">{decodedPhone}</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowReportForm(true)}
                            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 py-3 rounded-2xl font-black active:scale-95 transition-all uppercase text-[10px] tracking-widest hover:bg-red-100 hover:text-red-900 border border-red-200"
                        >
                            <Icon name="flag" size={16} /> Báo sai thông tin
                        </button>
                    </div>

                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[9px] text-red-800 font-bold text-center leading-relaxed italic tracking-tighter">
                        Lưu ý: Lữ Quán là website miễn phí, chỉ hỗ trợ kết nối khách sạn nên chúng tôi không chịu trách nhiệm về chất lượng dịch vụ của cơ sở.
                    </div>
                </div>
            </div>

            {showReportForm && (
                <ReportForm 
                    hotelId={hotel.id}
                    hotelName={hotel.name}
                    onClose={handleCloseReportForm}
                    onToast={onToast}
                />
            )}
        </div>
    );
};

export default HotelDetail;