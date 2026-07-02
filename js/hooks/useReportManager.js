import { useState, useMemo } from 'react';
import HotelAPI from '../api';

export const useReportManager = (reports, setFilterCity, onToast, onReportDeleted) => {
    const [expandedHotelId, setExpandedHotelId] = useState(null);
    const [detailedReports, setDetailedReports] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [filterReason, setFilterReason] = useState('');

    const handleGoToHotel = (locationName) => {
        if (locationName && locationName !== "Không rõ") {
            setFilterCity(locationName);
            onToast(`Đã chuyển đến khu vực "${locationName}".`);
        } else {
            onToast("Không thể xác định khu vực của lữ quán này.");
        }
    };

    const handleToggleDetails = async (hotelId) => {
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
                setExpandedHotelId(null);
            }
            if (onReportDeleted) onReportDeleted();
        } catch (error) {
            onToast(error.message || "Lỗi khi xóa báo cáo.");
        }
    };

    const processedReports = useMemo(() => {
        if (!reports) return [];
        let result = [...reports];
        
        if (filterReason) {
            result = result.filter(r => r.reason === filterReason);
        }
        
        if (sortBy === 'count') {
            result.sort((a, b) => (b.reportCount || 1) - (a.reportCount || 1));
        } else {
            result.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        }
        
        return result;
    }, [reports, filterReason, sortBy]);

    return {
        expandedHotelId,
        detailedReports,
        isLoadingDetails,
        sortBy,
        setSortBy,
        filterReason,
        setFilterReason,
        handleGoToHotel,
        handleToggleDetails,
        handleDeleteReport,
        processedReports
    };
};
