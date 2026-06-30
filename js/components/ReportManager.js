const REPORT_REASONS = {
    "wrong_phone": "Số điện thoại sai",
    "wrong_hotel_name": "Tên lữ quán sai",
    "wrong_map_location": "Vị trí trên bản đồ sai",
    "wrong_address": "Địa chỉ không đúng",
    "website_broken": "Website không hoạt động",
    "hotel_closed": "Lữ quán đã đóng cửa",
    "spam_or_fake": "Thông tin giả mạo/Spam",
    "other": "Lý do khác"
};

const { useState, useMemo } = React;

const ReportManager = ({ reports, setFilterCity, onToast, onProcessReport, onReportDeleted }) => {
    const [expandedHotelId, setExpandedHotelId] = useState(null);
    const [detailedReports, setDetailedReports] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'count'
    const [filterReason, setFilterReason] = useState('');

    const handleGoToHotel = (locationName) => {
        if (locationName && locationName !== "Không rõ") {
            setFilterCity(locationName);
            onToast(`Đã chuyển đến khu vực "${locationName}".`);
        } else {
            onToast("Không thể xác định khu vực của lữ quán này.");
        }
    };

    const getReasonText = (reason) => {
        return REPORT_REASONS[reason] || reason;
    };

    const handleToggleDetails = async (hotelId) => {
        // Nếu đang click vào mục đã mở, đóng nó lại
        if (expandedHotelId === hotelId) {
            setExpandedHotelId(null);
            setDetailedReports([]);
            return;
        }

        setIsLoadingDetails(true);
        try {
            const details = await HotelAPI.fetchReportsForHotel(hotelId);
            setDetailedReports(details);
            setExpandedHotelId(hotelId);
        } catch (error) {
            onToast(error.message || "Không thể tải chi tiết báo cáo.");
            console.error(error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa báo cáo này?")) return;
        try {
            await HotelAPI.deleteReport(reportId);
            onToast("Đã xóa báo cáo thành công.");
            
            const newDetails = detailedReports.filter(r => r.reportId !== reportId);
            setDetailedReports(newDetails);
            if (newDetails.length === 0) {
                setExpandedHotelId(null); // Đóng mục mở rộng nếu không còn report nào
            }
            if (onReportDeleted) onReportDeleted(); // Gọi lại parent refresh UI
        } catch (error) {
            onToast(error.message || "Lỗi khi xóa báo cáo.");
        }
    };

    if (!reports || reports.length === 0) {
        return <div className="p-8 text-center text-stone-500 italic">Chưa có báo cáo nào.</div>;
    }

    const processedReports = useMemo(() => {
        if (!reports) return [];
        let result = [...reports];
        
        // Lọc theo lý do báo cáo
        if (filterReason) {
            result = result.filter(r => r.reason === filterReason);
        }
        
        // Sắp xếp (Theo lượng báo cáo hoặc Mới nhất)
        if (sortBy === 'count') {
            result.sort((a, b) => (b.reportCount || 1) - (a.reportCount || 1));
        } else {
            result.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        }
        
        return result;
    }, [reports, filterReason, sortBy]);

    return (
        <div className="p-3 space-y-3">
            <div className="flex flex-wrap gap-2 mb-1 bg-white p-2 rounded-xl shadow-sm border border-red-200/50">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="flex-1 min-w-[120px] text-[10px] px-2 py-1.5 rounded-lg border border-stone-200 bg-stone-50 font-bold text-stone-600 outline-none focus:border-red-700">
                    <option value="newest">Sắp xếp: Mới nhất</option>
                    <option value="count">Sắp xếp: Bị báo lỗi nhiều nhất</option>
                </select>
                <select value={filterReason} onChange={e => setFilterReason(e.target.value)} className="flex-1 min-w-[120px] text-[10px] px-2 py-1.5 rounded-lg border border-stone-200 bg-stone-50 font-bold text-stone-600 outline-none focus:border-red-700">
                    <option value="">Tất cả loại lỗi</option>
                    {Object.entries(REPORT_REASONS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                    ))}
                </select>
            </div>

            {processedReports.length === 0 ? (
                <div className="p-8 text-center text-stone-500 italic text-xs">Không có báo cáo nào phù hợp với bộ lọc.</div>
            ) : processedReports.map(report => (
                <div key={report.reportId} className="bg-white p-4 rounded-xl shadow-sm border border-red-200/50">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider flex items-center flex-wrap">
                                <span className="flex items-center gap-1">
                                    <span>Lữ quán: <span className="text-red-700 select-text cursor-text">{report.hotelName}</span></span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(report.hotelName);
                                            onToast("Đã copy tên: " + report.hotelName);
                                        }}
                                        className="text-stone-400 hover:text-stone-700 transition-colors"
                                        title="Copy nhanh toàn bộ tên"
                                    >
                                        <Icon name="copy" size={12} />
                                    </button>
                                </span>
                                {report.locationName && report.locationName !== "Không rõ" && (
                                    <span 
                                        onClick={() => handleGoToHotel(report.locationName)} 
                                        className="text-blue-600 hover:underline cursor-pointer ml-1"
                                    >
                                        ({report.locationName})
                                    </span>
                                )}
                                {report.reportCount > 1 ? (
                                    <button onClick={() => handleToggleDetails(report.hotelId)} className="ml-2 bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full hover:bg-red-200 transition-colors flex items-center gap-1">
                                        {report.reportCount} báo cáo
                                        <Icon name={expandedHotelId === report.hotelId ? "chevron-up" : "chevron-down"} size={12} />
                                    </button>
                                ) : (
                                    <span className="ml-2 bg-stone-100 text-stone-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">1 báo cáo</span>
                                )}
                                {report.reportCount >= 5 && (
                                    <span className="ml-2 bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-purple-200 uppercase animate-pulse">
                                        Cần ẩn / Kiểm tra
                                    </span>
                                )}
                            </p>
                            <p className="text-sm font-black text-stone-800 mt-1">{getReasonText(report.reason)}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[9px] text-stone-500 font-bold">{new Date(report.reportedAt).toLocaleString('vi-VN')}</p>
                            
                            {onProcessReport && (
                                <button 
                                    onClick={() => onProcessReport(report.hotelId, report)}
                                    className="text-[10px] text-orange-600 hover:underline mt-1 font-bold">
                                    Cập nhật trạng thái
                                </button>
                            )}
                        </div>
                    </div>
                    {report.details && (
                        <div className="mt-3 pt-3 border-t border-dashed border-stone-200">
                            <p className="text-xs text-stone-600 italic">"{report.details}"</p>
                        </div>
                    )}

                    {/* Expanded details section */}
                    {expandedHotelId === report.hotelId && (
                        <div className="mt-4 pt-4 border-t border-stone-200 animate-in fade-in duration-300">
                            {isLoadingDetails ? (
                                <p className="text-xs text-center text-stone-500 italic">Đang tải chi tiết...</p>
                            ) : (
                                <div>
                                    <h4 className="text-xs font-black text-stone-600 uppercase mb-4">Chi tiết {detailedReports.length} báo cáo:</h4>
                                    <div>
                                        {detailedReports.map((detail, index) => (
                                            <div key={detail.reportId} className="relative flex">
                                                {/* Timeline line and dot */}
                                                <div className="flex flex-col items-center mr-4">
                                                    <div className={`flex-shrink-0 w-3 h-3 rounded-full border-2 border-white shadow ${index === 0 ? 'bg-red-500 animate-pulse' : 'bg-stone-400'}`}></div>
                                                    {index < detailedReports.length - 1 && (
                                                        <div className="w-px h-full bg-stone-200"></div>
                                                    )}
                                                </div>
                                                {/* Content */}
                                                <div className={`flex-1 ${index < detailedReports.length - 1 ? 'pb-5' : ''}`}>
                                                    <div className="flex justify-between items-center text-xs -mt-1">
                                                        <p className="font-bold text-stone-700">{getReasonText(detail.reason)}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] text-stone-500 font-bold">{new Date(detail.reportedAt).toLocaleString('vi-VN')}</p>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(detail.reportId); }} className="text-stone-400 hover:text-red-600 transition-colors p-1" title="Xóa báo cáo này">
                                                                <Icon name="trash-2" size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {detail.details && (
                                                        <div className="mt-1.5 p-2 bg-stone-50 rounded-md border border-stone-200/80">
                                                            <p className="text-xs text-stone-600 italic">"{detail.details}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};