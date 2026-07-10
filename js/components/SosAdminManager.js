import React, { useState } from 'react';
import Icon from './Icon';
import HotelAPI from '../api';

const SosAdminManager = ({ sosRequests, refreshSos, onToast }) => {
    const [updatingId, setUpdatingId] = useState(null);

    const handleStatusChange = async (sosId, newStatus) => {
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
                    Quản Lý Cứu Hộ SOS ({sosRequests.length})
                </h2>
                <button 
                    onClick={refreshSos} 
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
                    title="Tải lại danh sách"
                >
                    <Icon name="refresh-cw" size={14} />
                </button>
            </div>

            {sosRequests.length === 0 ? (
                <div className="text-center py-16 opacity-30">
                    <Icon name="check-circle" size={32} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-black uppercase text-[9px] tracking-widest">Không có yêu cầu SOS nào cần xử lý</p>
                </div>
            ) : (
                sosRequests.map(sos => (
                    <div 
                        key={sos.id} 
                        className={`p-4 bg-white rounded-2xl border shadow-sm transition-all flex flex-col gap-3 relative ${
                            sos.status === 'processing' ? 'border-orange-200 bg-orange-50/5' : (sos.status === 'resolved' ? 'border-emerald-100 opacity-60' : 'border-red-100')
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
                                onClick={() => handleDelete(sos.id, sos.name)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors ml-auto shadow-sm"
                                title="Xóa yêu cầu"
                            >
                                <Icon name="trash-2" size={12} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default SosAdminManager;
