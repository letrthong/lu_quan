const { useState } = React;

const ReportForm = ({ hotelId, hotelName, onClose, onToast }) => {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            setError("Vui lòng chọn lý do báo cáo.");
            return;
        }
        
        setIsSubmitting(true);
        setError(null);

        try {
            await HotelAPI.submitReport({
                hotelId: hotelId,
                reason: reason,
                details: details,
            });
            onToast(`Đã gửi báo cáo cho "${hotelName}". Cảm ơn bạn!`);
            onClose();
        } catch (err) {
            setError(err.message || "Không thể gửi báo cáo. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[110] flex items-center justify-center sm:p-6 pointer-events-auto" onMouseDown={onClose}>
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-md sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100 animate-in zoom-in-95 duration-300" onMouseDown={(e) => e.stopPropagation()}>
                <div className="p-6 bg-red-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                        <Icon name="flag" size={20} /> Báo cáo thông tin
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide bg-white pb-safe">
                    <p className="text-xs text-stone-600 font-bold">Bạn đang báo cáo sai thông tin cho lữ quán: <span className="text-red-700">{hotelName}</span>. Vui lòng chọn lý do và cung cấp thêm chi tiết.</p>
                    
                    <div>
                        <label htmlFor="reportReason" className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Lý do báo cáo</label>
                        <select 
                            id="reportReason" 
                            required 
                            value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                            className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-red-700 outline-none font-bold text-sm cursor-pointer"
                        >
                                <option value="">-- Chọn lý do --</option>
                                <option value="wrong_phone">Số điện thoại sai</option>
                                <option value="wrong_hotel_name">Tên lữ quán sai</option>
                                <option value="wrong_map_location">Vị trí trên bản đồ sai</option>
                                <option value="wrong_address">Địa chỉ không đúng</option>
                                <option value="website_broken">Website không hoạt động</option>
                                <option value="hotel_closed">Lữ quán đã đóng cửa</option>
                                <option value="spam_or_fake">Thông tin giả mạo/Spam</option>
                                <option value="other">Lý do khác (ghi rõ bên dưới)</option>
                            </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Chi tiết (nếu có)</label>
                        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows="3" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-red-700 outline-none font-bold text-sm" placeholder="Ví dụ: Số điện thoại đúng là 09..."></textarea>
                    </div>

                    {error && (<div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-xs" role="alert"><p>{error}</p></div>)}

                    <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] transition-all ${isSubmitting ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-red-700 text-white active:scale-95'}`}>{isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}</button>
                </form>
            </div>
        </div>
    );
};