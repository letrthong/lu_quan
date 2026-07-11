import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import HotelAPI from '../api';

const getTimeAgo = (dateStr) => {
    if (!dateStr) return "Chưa rõ";
    const elapsedMs = new Date() - new Date(dateStr);
    const elapsedHrs = elapsedMs / (1000 * 60 * 60);

    if (elapsedHrs < 1) {
        const mins = Math.max(1, Math.round(elapsedHrs * 60));
        return `${mins} phút trước`;
    }
    const hrs = Math.round(elapsedHrs);
    return `${hrs} giờ trước`;
};

const SosAdminManager = ({ sosRequests, refreshSos, onToast, onSelectSOS }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const [activeDetailSos, setActiveDetailSos] = useState(null);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [filterTab, setFilterTab] = useState('active'); // 'active' | 'history'

    const fetchComments = async (sosId) => {
        try {
            const data = await HotelAPI.fetchSosComments(sosId);
            setComments(data || []);
        } catch (err) {
            console.error("Lỗi khi tải bình luận:", err);
        }
    };

    useEffect(() => {
        if (activeDetailSos && activeDetailSos.id) {
            fetchComments(activeDetailSos.id);
            setNewCommentText("");
        } else {
            setComments([]);
        }
    }, [activeDetailSos?.id]);

    const filteredRequests = sosRequests.filter(sos => {
        if (filterTab === 'active') {
            return sos.status === 'pending' || sos.status === 'processing';
        } else {
            return sos.status === 'resolved' || sos.status === 'cancelled';
        }
    });

    const handleStatusChange = async (sosId, newStatus) => {
        if (!window.confirm(`Bạn có chắc chắn muốn chuyển trạng thái yêu cầu SOS này sang "${getStatusLabel(newStatus)}"?`)) {
            return;
        }
        setUpdatingId(sosId);
        try {
            await HotelAPI.updateSosStatus(sosId, newStatus, true);
            if (onToast) onToast(`Đã cập nhật trạng thái yêu cầu SOS thành: ${getStatusLabel(newStatus)}`);
            refreshSos();
        } catch (err) {
            if (onToast) onToast(err.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (sosId, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa yêu cầu cứu hộ của ${name}?`)) {
            return;
        }
        try {
            await HotelAPI.deleteSosRequest(sosId, true);
            if (onToast) onToast("Đã xóa thành công yêu cầu SOS.");
            refreshSos();
        } catch (err) {
            if (onToast) onToast(err.message || "Lỗi khi xóa yêu cầu");
        }
    };

    const handleLocateClick = (sos) => {
        if (window.innerWidth < 768) {
            // Mobile: only show the details overlay dialog
            setActiveDetailSos(sos);
        } else {
            // Desktop: only center map and show card overlay on the map
            if (onSelectSOS) {
                onSelectSOS(sos);
            }
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Đang Chờ';
            case 'processing': return 'Đang Xử Lý';
            case 'resolved': return 'Đã Hỗ Trợ';
            case 'cancelled': return 'Đã Hủy';
            default: return status;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return 'bg-red-50 text-red-700 border-red-100';
            case 'processing': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-stone-50 text-stone-600 border-stone-200';
        }
    };

    const getUrgencyClass = (urgency) => {
        switch (urgency) {
            case 'high': return 'bg-red-100 text-red-800 font-black';
            case 'medium': return 'bg-orange-100 text-orange-800 font-bold';
            default: return 'bg-yellow-100 text-yellow-800 font-medium';
        }
    };

    const getUrgencyLabel = (urgency) => {
        switch (urgency) {
            case 'high': return 'Khẩn cấp';
            case 'medium': return 'Trung bình';
            default: return 'Thấp';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Chưa rõ";
        try {
            return new Date(dateStr).toLocaleString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="p-3 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                <h2 className="text-sm font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                    <Icon name="alert-triangle" size={16} className="text-red-500 animate-pulse" />
                    Quản Lý Cứu Hộ SOS ({filteredRequests.length})
                </h2>
                <button 
                    onClick={refreshSos} 
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
                    title="Tải lại danh sách"
                >
                    <Icon name="refresh-cw" size={14} />
                </button>
            </div>

            {/* Toggle Filter Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-xl">
                <button
                    onClick={() => setFilterTab('active')}
                    className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                        filterTab === 'active' 
                            ? 'bg-white text-red-600 shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700'
                    }`}
                >
                    🚨 Đang Cứu Hộ ({sosRequests.filter(s => s.status === 'pending' || s.status === 'processing').length})
                </button>
                <button
                    onClick={() => setFilterTab('history')}
                    className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                        filterTab === 'history' 
                            ? 'bg-white text-emerald-600 shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700'
                    }`}
                >
                    ✅ Lịch Sử Đã Cứu ({sosRequests.filter(s => s.status === 'resolved' || s.status === 'cancelled').length})
                </button>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="text-center py-16 opacity-30">
                    <Icon name="check-circle" size={32} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-black uppercase text-[9px] tracking-widest">
                        {filterTab === 'active' ? "Không có yêu cầu SOS nào cần xử lý" : "Lịch sử cứu trợ trống"}
                    </p>
                </div>
            ) : (
                filteredRequests.map(sos => (
                    <div 
                        key={sos.id} 
                        className={`p-4 bg-white rounded-2xl border shadow-sm transition-all flex flex-col gap-3 relative ${
                            sos.status === 'processing' ? 'border-orange-200 bg-orange-50/5' : (sos.status === 'resolved' || sos.status === 'cancelled' ? 'border-emerald-100 opacity-60' : 'border-red-100')
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-stone-900 leading-tight uppercase text-xs flex items-center gap-1.5">
                                    {sos.name}
                                </h3>
                                <p className="text-[10px] text-stone-500 font-bold mt-0.5">
                                    📞 SĐT: <a href={`tel:${sos.phone}`} className="text-blue-600 hover:underline">{sos.phone}</a>
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wide border ${getStatusClass(sos.status)}`}>
                                    {getStatusLabel(sos.status)}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wide ${getUrgencyClass(sos.urgency)}`}>
                                    {getUrgencyLabel(sos.urgency)}
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 font-medium">
                            <p className="font-semibold text-stone-500 text-[9px] uppercase tracking-wider mb-1">📝 Tình trạng:</p>
                            {sos.message}
                        </div>

                        {sos.hasImage && (
                            <div className="w-full rounded-xl overflow-hidden border border-stone-100 shadow-sm max-h-32 flex items-center justify-center bg-stone-50">
                                <img 
                                    src={`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sos.id}/image`} 
                                    alt="Ảnh thực tế" 
                                    className="w-full h-full object-cover max-h-32 cursor-pointer"
                                    onClick={() => window.open(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sos.id}/image`, '_blank')}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </div>
                        )}

                        <div className="text-[9px] text-stone-400 font-bold flex flex-wrap justify-between items-center gap-2">
                            <span>Báo cáo: {formatDate(sos.createdAt)}</span>
                            <span>GPS: {sos.lat.toFixed(4)}, {sos.lng.toFixed(4)}</span>
                        </div>

                        <div className="border-t border-stone-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-stone-500 mr-1">Trạng thái:</span>
                                <select
                                    disabled={updatingId === sos.id}
                                    value={sos.status}
                                    onChange={(e) => handleStatusChange(sos.id, e.target.value)}
                                    className="bg-white border border-stone-200 text-stone-700 text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-red-500 transition-colors shadow-sm"
                                >
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="processing">Đang xử lý ⏳</option>
                                    <option value="resolved">Đã hỗ trợ thành công ✅</option>
                                    <option value="cancelled">Đã hủy ❌</option>
                                </select>
                            </div>
                            <button
                                onClick={() => handleLocateClick(sos)}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors ml-auto shadow-sm flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                                title="Định vị trên bản đồ & xem bình luận"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Định vị
                            </button>
                            <button
                                onClick={() => handleDelete(sos.id, sos.name)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors shadow-sm"
                                title="Xóa yêu cầu"
                            >
                                <Icon name="trash-2" size={12} />
                            </button>
                        </div>
                    </div>
                ))
            )}



            {/* Custom Details Modal for Mobile */}
            {activeDetailSos && (
                <div 
                    className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setActiveDetailSos(null)}
                >
                    <div 
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-stone-100 p-5 flex flex-col gap-3 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto scrollbar-hide"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex gap-1.5 items-center flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${activeDetailSos.urgency === 'high' ? 'bg-red-100 text-red-700' : (activeDetailSos.urgency === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')
                                        }`}>
                                        SOS: {activeDetailSos.urgency === 'high' ? 'Rất khẩn cấp' : (activeDetailSos.urgency === 'medium' ? 'Cần cứu hộ' : 'Hỗ trợ')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                        activeDetailSos.status === 'pending' ? 'bg-red-50 text-red-700 border-red-100' : 
                                        activeDetailSos.status === 'processing' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                                        activeDetailSos.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                        'bg-stone-50 text-stone-600 border-stone-200'
                                    }`}>
                                        Trạng thái: {
                                            activeDetailSos.status === 'pending' ? 'Đang Chờ' : 
                                            activeDetailSos.status === 'processing' ? 'Đang Xử Lý' : 
                                            activeDetailSos.status === 'resolved' ? 'Đã Hỗ Trợ' : 
                                            activeDetailSos.status === 'cancelled' ? 'Đã Hủy' : 
                                            activeDetailSos.status
                                        }
                                    </span>
                                </div>
                                <h4 className="text-sm font-black text-stone-800 mt-2 flex items-center gap-1.5 leading-none">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                                    {activeDetailSos.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1">
                                        📍 GPS: {activeDetailSos.lat.toFixed(6)}, {activeDetailSos.lng.toFixed(6)}
                                    </span>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${activeDetailSos.lat},${activeDetailSos.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                    >
                                        Chỉ đường
                                    </a>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveDetailSos(null)}
                                className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 active:scale-95 transition-all"
                            >
                                <Icon name="x" size={16} />
                            </button>
                        </div>

                        <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-100 font-medium max-h-24 overflow-y-auto">
                            <p className="font-semibold text-stone-500 text-[10px] uppercase tracking-wider mb-1">📢 Nội dung hỗ trợ:</p>
                            {activeDetailSos.message}
                        </div>

                        {activeDetailSos.hasImage && (
                            <div className="w-full rounded-2xl overflow-hidden border border-stone-100 shadow-sm max-h-48 flex items-center justify-center bg-stone-50">
                                <img
                                    src={`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${activeDetailSos.id}/image`}
                                    alt="Ảnh cứu nạn thực tế"
                                    className="w-full h-full object-cover max-h-48 cursor-pointer"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                    onClick={() => window.open(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${activeDetailSos.id}/image`, '_blank')}
                                />
                            </div>
                        )}

                        {/* List of comments */}
                        <div className="space-y-1.5 max-h-32 overflow-y-auto mt-1 border-t border-stone-100 pt-2 pb-1">
                            <p className="font-semibold text-stone-500 text-[10px] uppercase tracking-wider mb-1">💬 Nhật ký cập nhật ({comments.length}):</p>
                            {comments.length === 0 ? (
                                <p className="text-[10px] text-stone-400 italic">Chưa có cập nhật tình hình nào.</p>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="text-[10px] leading-relaxed bg-stone-50 p-2 rounded-xl border border-stone-100 flex flex-col">
                                        <div className="flex justify-between items-center font-black uppercase text-[8px] tracking-wider mb-0.5">
                                            <span className={comment.isAdmin ? "text-red-600" : "text-stone-600"}>
                                                👤 {comment.author}
                                            </span>
                                            <span className="text-stone-400 font-bold lowercase">
                                                {getTimeAgo(comment.createdAt)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-stone-700">{comment.message}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add comment form */}
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newCommentText.trim()) return;
                                setIsSubmittingComment(true);
                                try {
                                    await HotelAPI.submitSosComment(activeDetailSos.id, { message: newCommentText.trim(), deviceId: "" }, true);
                                    setNewCommentText("");
                                    fetchComments(activeDetailSos.id);
                                    if (onToast) onToast("💬 Đăng cập nhật tình hình thành công!");
                                } catch (err) {
                                    if (onToast) onToast(err.message || "Lỗi khi gửi bình luận");
                                } finally {
                                    setIsSubmittingComment(false);
                                }
                            }} 
                            className="flex gap-2 items-center mt-1 border-t border-stone-100 pt-2"
                        >
                            <input 
                                type="text"
                                placeholder="Cập nhật tình hình mới..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                disabled={isSubmittingComment}
                                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-semibold focus:border-red-500 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isSubmittingComment || !newCommentText.trim()}
                                className="px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer shrink-0"
                            >
                                {isSubmittingComment ? "..." : "Gửi"}
                            </button>
                        </form>

                        <div className="flex gap-1.5 mt-2 flex-wrap">
                            {activeDetailSos.phone && !activeDetailSos.phone.includes('*') && (
                                <a
                                    href={`tel:${activeDetailSos.phone}`}
                                    className="flex-1 min-w-[80px] py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide text-center flex items-center justify-center gap-1 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 transition-all"
                                >
                                    Gọi Nạn Nhân
                                </a>
                            )}
                            <button
                                onClick={async () => {
                                    if (window.confirm("Bạn có chắc chắn muốn đánh dấu ca cứu nạn này là ĐÃ ĐƯỢC CỨU?")) {
                                        try {
                                            await HotelAPI.updateSosStatus(activeDetailSos.id, 'resolved', true);
                                            if (onToast) onToast("🎉 Đánh dấu đã cứu nạn thành công!");
                                            setActiveDetailSos(null);
                                            refreshSos();
                                        } catch (err) {
                                            if (onToast) onToast(err.message || "Lỗi khi cập nhật");
                                        }
                                    }
                                }}
                                className="flex-1 min-w-[80px] py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-500/20 transition-all"
                            >
                                Đã Được Cứu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SosAdminManager;
