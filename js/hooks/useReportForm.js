import { useState } from 'react';
import HotelAPI from '../api';

export const useReportForm = (hotelId, hotelName, onClose, onToast) => {
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

    return {
        reason,
        setReason,
        details,
        setDetails,
        isSubmitting,
        error,
        handleSubmit
    };
};
