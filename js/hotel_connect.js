import React, { useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import Icon from './components/Icon';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminTabs from './components/AdminTabs';
import { MainLeafletMap } from './components/MapComponents';
import SchemaManager from './components/SchemaManager';
import HotelRequestForm from './components/HotelRequestForm';
import HotelEditForm from './components/HotelEditForm';
import ReportManager from './components/ReportManager';
import HotelDetail from './components/HotelDetail';
import NearByComponents from './components/NearByComponents';
import SoSComponents from './components/SoSComponents';
import SosAdminManager from './components/SosAdminManager';
import RegionMultiSelect from './components/RegionMultiSelect';
import TypeMultiSelect from './components/TypeMultiSelect';
import { HOTEL_TYPES, getIconForHotelType, getReasonText, getTypeLabel } from './constants';
import { LanguageProvider, useTranslation } from './i18n';
import HotelAPI from './api';
import { decodeBase64 } from './utils';
import { useHotelConnectApp } from './hooks/useHotelConnectApp';

// Polyfill for crypto.randomUUID() in non-secure contexts or older browsers
if (window.crypto && !window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
}

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600";
const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE_URL;
};

const MainApp = () => {
    const { t } = useTranslation();
    const {
        hotels,
        provinces,
        isLoading,
        pendingRequests,
        setPendingRequests,
        searchTerm,
        setSearchTerm,
        filterLocationIds,
        setFilterLocationIds,
        filterTypeIds,
        setFilterTypeIds,
        selectedHotel,
        setSelectedHotel,
        showRequestForm,
        setShowRequestForm,
        showSchemaManager,
        setShowSchemaManager,
        showAboutDialog,
        setShowAboutDialog,
        viewMode,
        setViewMode,
        isAdmin,
        setIsAdmin,
        showAdminLogin,
        setShowAdminLogin,
        adminPass,
        setAdminPass,
        adminError,
        setAdminError,
        adminTab,
        setAdminTab,
        pendingReviewHotels,
        reports,
        editingHotel,
        setEditingHotel,
        toastMessage,
        setToastMessage,
        reviewConfirm,
        setReviewConfirm,
        getLocationNameById,
        handleUserLocationUpdate,
        handleAdminLogin,
        approveRequest,
        rejectRequest,
        handleReviewApprove,
        handleReviewReject,
        handleRestoreHotel,
        permanentlyDeleteHotel,
        onProcessReport,
        startEditHotel,
        handleEditSuccess,
        hideHotel,
        deleteHotel,
        refreshReports,
        refreshSos,
        sosRequests,
        formatDate,
        handleCloseHotelDetail,
        filteredHotels,
        handleShare
    } = useHotelConnectApp(t);

    return (
        <div className="absolute inset-0 flex flex-col bg-stone-50 text-stone-900 overflow-hidden font-sans select-none">
            <Header
                isAdmin={isAdmin}
                onShowSchemaManager={() => setShowSchemaManager(true)}
                onSetAdminTab={setAdminTab}
                adminTab={adminTab}
                pendingRequestsCount={pendingRequests.length}
                pendingReviewHotelsCount={pendingReviewHotels.length}
                reportsCount={reports.length}
                sosRequestsCount={sosRequests.filter(s => s.status === 'pending' || s.status === 'processing').length}
                onShowRequestForm={() => setShowRequestForm(true)}
                onLogoutAdmin={() => setIsAdmin(false)}
                onShowAdminLogin={() => setShowAdminLogin(true)}
            />

            <main className="flex flex-1 overflow-hidden relative min-h-0">
                {/* Sidebar / Danh sách: Fullscreen on mobile when active */}
                <div className={`
                    absolute md:relative z-10 w-full md:w-[400px] bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 border-b bg-stone-50/50 space-y-2">
                        
                        {/* Dropdown Lọc Tỉnh/Thành */}
                        <RegionMultiSelect 
                            provinces={provinces} 
                            selectedIds={filterLocationIds} 
                            onChange={setFilterLocationIds} 
                            t={t} 
                        />

                        <TypeMultiSelect
                            types={HOTEL_TYPES}
                            selectedIds={filterTypeIds}
                            onChange={setFilterTypeIds}
                            t={t}
                        />

                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                <Icon name="search" size={16} />
                            </div>
                            <input 
                                type="text"
                                placeholder={t('search_placeholder')}
                                className="w-full pl-10 pr-20 py-3 bg-white rounded-xl border-2 border-stone-100 focus:border-orange-700 outline-none transition-all font-bold text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-11 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                                >
                                    <Icon name="x" size={14} />
                                </button>
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-stone-100 text-stone-500 text-[10px] font-black px-2 py-1 rounded-md pointer-events-none shadow-sm">
                                {filteredHotels.length}
                            </div>
                        </div>

                        {isAdmin && (
                            <AdminTabs
                                adminTab={adminTab}
                                onSetAdminTab={setAdminTab}
                                pendingRequestsCount={pendingRequests.length}
                                pendingReviewHotelsCount={pendingReviewHotels.length}
                                reportsCount={reports.length}
                                sosRequestsCount={sosRequests.filter(s => s.status === 'pending' || s.status === 'processing').length}
                                isMobile={true}
                            />
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-stone-50 scrollbar-hide pb-24">
                        {isAdmin && adminTab === 'reports' ? (
                            <ReportManager reports={reports} setFilterCity={(id) => setFilterLocationIds([id])} onToast={setToastMessage} onReportDeleted={refreshReports} onProcessReport={onProcessReport} />
                        ) : isAdmin && adminTab === 'sos' ? (
                            <SosAdminManager sosRequests={sosRequests} refreshSos={refreshSos} onToast={setToastMessage} />
                        ) : (
                            <div className="p-3 space-y-3">
                                {isLoading ? (
                                    <div className="text-center py-20 opacity-50">
                                        <Icon name="loader" size={32} className="mx-auto mb-2 text-stone-400 animate-spin" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Đang tải dữ liệu...</p>
                                    </div>
                                ) : filterLocationIds.length === 0 ? (
                                    <div className="text-center py-20 opacity-40">
                                        <Icon name="map" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Vui lòng chọn một khu vực để xem khách sạn</p>
                                    </div>
                                ) : filterTypeIds.length === 0 ? (
                                    <div className="text-center py-20 opacity-40">
                                        <Icon name="layers" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Vui lòng chọn loại hình cần xem</p>
                                    </div>
                                ) : filteredHotels.length > 0 ? (
                                    filteredHotels.map(hotel => (
                                        <div 
                                            key={hotel.id}
                                            id={`hotel-item-${hotel.id}`}
                                            onClick={() => {
                                                setSelectedHotel(hotel);
                                                setViewMode('map');
                                            }}
                                            className={`p-3 bg-white rounded-2xl cursor-pointer border-2 transition-all flex gap-3 relative group
                                                ${selectedHotel?.id === hotel.id ? 'border-red-600 ring-4 ring-red-100 shadow-lg' : 'border-transparent shadow-sm'}
                                            `}
                                        >
                                            <img src={hotel.thumbnail || hotel.image} onError={handleImageError} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100 shadow-sm" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    {hotel.type && (
                                                        <span className="inline-flex items-center gap-1 w-max px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[8px] font-black uppercase tracking-widest rounded border border-stone-200 mb-1">
                                                            <Icon name={getIconForHotelType(hotel.type)} size={10} />
                                                            {getTypeLabel(hotel.type)}
                                                        </span>
                                                    )}
                                                    <h3 className="font-black text-stone-900 leading-tight truncate text-xs uppercase">{hotel.name}</h3>
                                                    <p className="text-[9px] text-stone-500 flex items-center gap-1 mt-0.5 font-bold truncate">
                                                        <Icon name="map-pin" size={10} className="text-orange-700" /> {decodeBase64(hotel.address)} • {getLocationNameById(hotel.locationId)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex items-center gap-1 text-[8px] text-stone-400 font-bold uppercase tracking-tight">
                                                        <Icon name="calendar" size={8} /> {formatDate(hotel.updatedAt)}
                                                    </div>
                                                    {hotel.website && <div className="text-moss"><Icon name="globe" size={12} /></div>}
                                                </div>
                                            </div>

                                            {isAdmin && adminTab === 'pending' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); approveRequest(hotel); }} className="bg-emerald-700 text-white p-2 rounded-lg shadow-lg"><Icon name="check" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); rejectRequest(hotel.id, hotel.name); }} className="bg-red-700 text-white p-2 rounded-lg shadow-lg"><Icon name="trash-2" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'pending_review' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'approve', hotel }); }} className="bg-emerald-700 text-white p-2 rounded-lg shadow-lg" title="Duyệt lại"><Icon name="check" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'reject', hotel }); }} className="bg-purple-700 text-white p-2 rounded-lg shadow-lg" title="Tạm ẩn"><Icon name="eye-off" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'inactive' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'restore', hotel }); }} className="bg-emerald-600 text-white p-2 rounded-lg shadow-lg" title="Khôi phục hiển thị"><Icon name="refresh-cw" size={12} /></button>
                                                    <button onClick={(e) => deleteHotel(hotel.id, e)} className="bg-red-700 text-white p-2 rounded-lg shadow-lg" title="Đưa vào thùng rác"><Icon name="trash-2" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'deleted' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'restore', hotel }); }} className="bg-emerald-600 text-white p-2 rounded-lg shadow-lg" title="Khôi phục hiển thị"><Icon name="refresh-cw" size={12} /></button>
                                                    <button onClick={(e) => permanentlyDeleteHotel(hotel.id, e)} className="bg-red-800 text-white p-2 rounded-lg shadow-lg" title="Xóa vĩnh viễn"><Icon name="shield-x" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'approved' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="p-2 text-blue-600 bg-white rounded shadow hover:bg-stone-50" title="Sửa thông tin"><Icon name="edit" size={14} /></button>
                                                    <button onClick={(e) => hideHotel(hotel, e)} className="p-2 text-purple-600 bg-white rounded shadow hover:bg-stone-50" title="Tạm ẩn"><Icon name="eye-off" size={14} /></button>
                                                    <button onClick={(e) => deleteHotel(hotel.id, e)} className="p-2 text-red-600 bg-white rounded shadow hover:bg-stone-50" title="Đưa vào thùng rác"><Icon name="trash-2" size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 opacity-30">
                                        <Icon name="search-x" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Không có kết quả tìm kiếm</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map View: Visible or hidden depending on toggle */}
                <div className={`
                    absolute inset-0 md:relative md:inset-auto z-10 flex-1 bg-stone-200 overflow-hidden transition-transform duration-300
                    ${viewMode === 'map' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <div className="w-full h-full relative z-0">
                        <MainLeafletMap hotels={filteredHotels} selectedHotel={selectedHotel} onSelectHotel={setSelectedHotel} filterCity={filterLocationIds.includes("all") || filterLocationIds.length === 0 ? null : filterLocationIds} viewMode={viewMode} />
                    </div>
                </div>

                {/* Nearby View: Mobile Only */}
                <div className={`
                    absolute md:hidden z-20 w-full bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'nearby' ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <NearByComponents 
                        hotels={filteredHotels} 
                        onSelectHotel={setSelectedHotel} 
                        setViewMode={setViewMode} 
                        isActive={viewMode === 'nearby'}
                        onToast={setToastMessage}
                        onLocationUpdate={handleUserLocationUpdate}
                    />
                </div>

                {/* SOS Emergency Rescue View: Mobile Only */}
                <div className={`
                    absolute md:hidden z-20 w-full bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'sos' ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <SoSComponents 
                        setViewMode={setViewMode}
                        isActive={viewMode === 'sos'}
                        onToast={setToastMessage}
                    />
                </div>

                {/* View Switcher: Mobile Only */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 flex bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'list' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'list' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="list" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Danh Sách</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'map' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'map' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="map" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Bản Đồ</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('nearby')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'nearby' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'nearby' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="navigation" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Gần Đây</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('sos')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'sos' ? 'text-red-600' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'sos' ? '-translate-y-1 scale-110 animate-pulse' : 'translate-y-0 scale-100'}`}>
                            <Icon name="alert-triangle" size={20} className={viewMode === 'sos' ? 'text-red-600' : ''} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Cứu Hộ</span>
                    </button>
                </div>

                {/* Detail Overlay (Bottom Sheet for Mobile, Floating Sidebar for PC) */}
                {selectedHotel && (
                    <HotelDetail
                        hotel={selectedHotel}
                        onClose={handleCloseHotelDetail}
                        onShare={handleShare}
                        formatDate={formatDate}
                        handleImageError={handleImageError}
                        onToast={setToastMessage}
                    />
                )}

                {/* Modals: Simplified for Mobile */}
                {showRequestForm && (
                    <HotelRequestForm 
                        provinces={provinces}
                        onClose={() => setShowRequestForm(false)}
                        onSubmitSuccess={(newRequest) => setPendingRequests(prev => [...prev, newRequest])}
                        onToast={setToastMessage}
                    />
                )}

                {editingHotel && (
                    <HotelEditForm
                        hotel={editingHotel}
                        provinces={provinces}
                        onClose={() => setEditingHotel(null)}
                        onSaveSuccess={handleEditSuccess}
                        onToast={setToastMessage}
                    />
                )}

                {/* Modal Quản lý Khu vực (Schema Manager) */}
                {showSchemaManager && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
                        <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-5xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                            <div className="p-4 sm:p-6 bg-blue-700 text-white flex justify-between items-center shrink-0">
                                <h3 className="text-sm sm:text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                                    <Icon name="map" size={20} /> Quản lý Khu vực
                                </h3>
                                <button onClick={() => setShowSchemaManager(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 bg-stone-50 pb-safe relative">
                                <SchemaManager api={HotelAPI} onToast={setToastMessage} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Login Modal */}
                {showAdminLogin && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-orange-50 text-orange-700 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6">
                                <Icon name="lock" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-stone-900 uppercase mb-2 tracking-tight">Xác thực Admin</h3>
                            <p className="text-[9px] text-stone-400 font-black uppercase tracking-[0.2em] mb-8 italic">Phê duyệt hệ thống Luquan.vn</p>
                            
                            <form onSubmit={handleAdminLogin} className="space-y-5">
                                <input 
                                    type="password" 
                                    placeholder="MẬT MÃ"
                                    className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-2 border-stone-100 focus:border-orange-700 outline-none text-center font-black text-lg tracking-[0.5em]"
                                    value={adminPass}
                                    onChange={(e) => setAdminPass(e.target.value)}
                                    autoFocus
                                />
                                {adminError && <p className="text-red-600 text-[10px] font-black uppercase">{adminError}</p>}
                                <button type="submit" className="w-full py-4 bg-moss text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest">Đăng nhập</button>
                                <button type="button" onClick={() => setShowAdminLogin(false)} className="text-stone-400 font-black uppercase text-[9px] tracking-widest active:text-stone-700 py-2">Quay lại</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* About Dialog Modal */}
                {showAboutDialog && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-2xl max-h-[95dvh] overflow-y-auto scrollbar-hide rounded-[40px] shadow-2xl p-8 text-left animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">Chính sách & Thông tin</h3>
                                    <p className="text-xs text-stone-500 font-bold">Lữ Quán – Nền tảng dữ liệu du lịch mở</p>
                                </div>
                                <button onClick={() => setShowAboutDialog(false)} className="p-2 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors shrink-0"><Icon name="x" size={20} /></button>
                            </div>
                            
                            <div className="text-sm text-stone-700 font-medium leading-relaxed space-y-4">
                                <p>Lữ Quán là một nền tảng hạ tầng dữ liệu du lịch, hoạt động theo nguyên tắc miễn phí – minh bạch – tự động hoá cao.</p>
                                <p>Để đảm bảo hệ thống vận hành ổn định, tiết kiệm thời gian cho cả hai bên và giữ đúng vai trò hạ tầng, chúng tôi áp dụng chính sách liên hệ như sau:</p>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">1. Kênh liên hệ chính thức</h4>
                                    <p>Hiện tại, email là kênh liên hệ duy nhất:</p>
                                    <p className="my-2 p-3 bg-stone-100 rounded-lg border border-stone-200">📧 Email: <strong>info@telua.vn</strong></p>
                                    <p>Chúng tôi không hỗ trợ liên hệ qua điện thoại.</p>
                                    <p>Việc sử dụng email giúp:</p>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Ghi nhận yêu cầu rõ ràng, có nội dung đầy đủ</li>
                                        <li>Lưu vết và xử lý theo quy trình</li>
                                        <li>Hạn chế các yêu cầu rời rạc, thiếu thông tin</li>
                                        <li>Phù hợp với mô hình vận hành tự động và dữ liệu mở</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">2. Những trường hợp nên liên hệ</h4>
                                    <p>Vui lòng liên hệ qua email trong các trường hợp sau:</p>
                                    <div className="space-y-2 mt-2">
                                        <p><strong>✅ Chủ khách sạn / nhà nghỉ</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Yêu cầu cập nhật hoặc chỉnh sửa thông tin</li>
                                            <li>Báo sai thông tin (số điện thoại, địa chỉ, vị trí bản đồ…)</li>
                                            <li>Xác nhận quyền sở hữu cơ sở lưu trú</li>
                                            <li>Gỡ thông tin theo yêu cầu chính đáng</li>
                                        </ul>
                                        <p><strong>✅ Cộng tác viên / đối tác</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Đăng ký tham gia thu thập dữ liệu địa phương</li>
                                            <li>Góp ý về chất lượng dữ liệu</li>
                                            <li>Đề xuất mở rộng khu vực</li>
                                        </ul>
                                        <p><strong>✅ Người dùng</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Báo lỗi dữ liệu</li>
                                            <li>Góp ý cải thiện nền tảng</li>
                                        </ul>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">3. Những trường hợp KHÔNG được hỗ trợ</h4>
                                    <p>Lữ Quán không hỗ trợ các nội dung sau:</p>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Hỗ trợ đặt phòng, giữ phòng, báo giá</li>
                                        <li>Giải quyết tranh chấp giữa khách và khách sạn</li>
                                        <li>Hỗ trợ kinh doanh, marketing, quảng bá riêng lẻ</li>
                                        <li>Hỗ trợ khẩn cấp qua điện thoại</li>
                                    </ul>
                                    <p className="mt-2 italic">👉 Lữ Quán không phải dịch vụ trung gian, chúng tôi không can thiệp vào hoạt động kinh doanh của các cơ sở lưu trú.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">4. Thời gian xử lý</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Mọi yêu cầu hợp lệ sẽ được xem xét và phản hồi trong 2–5 ngày làm việc</li>
                                        <li>Thời gian có thể lâu hơn đối với các yêu cầu cần xác minh thực tế</li>
                                        <li>Các thay đổi được phê duyệt sẽ được đồng bộ tự động lên hệ thống dữ liệu công khai</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">5. Nguyên tắc vận hành</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Lữ Quán ưu tiên hệ thống và quy trình, không xử lý theo cảm tính</li>
                                        <li>Mọi thay đổi đều phải phù hợp với dữ liệu mở – minh bạch</li>
                                        <li>Chúng tôi chỉ xử lý ngoại lệ, phần lớn dữ liệu được duy trì bởi hệ thống và cộng đồng</li>
                                    </ul>
                                    <p className="mt-2 font-bold">Lữ Quán xây dựng hạ tầng để dùng lâu dài, không phải dịch vụ hỗ trợ ngắn hạn.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">6. Cam kết</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Không thu phí liên hệ</li>
                                        <li>Không yêu cầu đăng ký tài khoản</li>
                                        <li>Không sử dụng thông tin liên hệ cho mục đích quảng cáo</li>
                                    </ul>
                                </div>

                                <div className="text-center pt-4 border-t border-stone-200">
                                    <p className="font-bold">📌 Nếu bạn hiểu và đồng thuận với cách vận hành này, chúng tôi rất sẵn lòng tiếp nhận đóng góp của bạn.</p>
                                    <p className="font-bold mt-2">Trân trọng,<br/>Lữ Quán – Nền tảng dữ liệu du lịch mở</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAboutDialog(false)} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest hover:bg-stone-800 mt-6">
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                )}

                {/* Review Confirm Dialog Modal */}
                {reviewConfirm && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        {(() => {
                            const { action, hotel } = reviewConfirm;
                            const isRestore = action === 'restore';
                            const isApprove = action === 'approve';

                            const iconMap = {
                                approve: { name: 'check-circle', color: 'bg-emerald-50 text-emerald-600 rotate-3' },
                                reject: { name: 'eye-off', color: 'bg-purple-50 text-purple-600 -rotate-3' },
                                restore: { name: 'refresh-cw', color: 'bg-blue-50 text-blue-600' }
                            };
                            const titleMap = {
                                approve: 'Xác nhận Duyệt Lại',
                                reject: 'Xác nhận Tạm Ẩn',
                                restore: 'Xác nhận Khôi Phục'
                            };

                            return (
                                <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 transform ${iconMap[action].color}`}>
                                        <Icon name={iconMap[action].name} size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 uppercase mb-2 tracking-tight text-center">
                                        {titleMap[action]}
                                    </h3>
                                    <p className="text-center text-sm font-bold text-stone-600 mb-6">{hotel.name}</p>
                                    
                                    <div className="bg-stone-50 rounded-2xl p-4 mb-6 overflow-y-auto flex-1 border border-stone-200 scrollbar-hide">
                                        {isRestore ? (
                                            <>
                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Thay đổi trạng thái</p>
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${hotel.status === 'inactive' ? 'bg-stone-500' : 'bg-red-700'}`}>
                                                        {hotel.status === 'inactive' ? 'Đã Ẩn' : 'Trong rác'}
                                                    </span>
                                                    <Icon name="arrow-right" size={14} className="text-stone-400" />
                                                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm bg-emerald-600">
                                                        Approved
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-stone-500 italic mt-3 leading-relaxed">
                                                    * Lữ quán sẽ được khôi phục và hiển thị công khai trở lại trên bản đồ.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Thay đổi trạng thái</p>
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${hotel.status === 'pending_review' ? 'bg-purple-600' : 'bg-red-600'}`}>
                                                        {hotel.status === 'pending_review' ? 'Cần Review Gấp' : 'Đang bị báo lỗi'}
                                                    </span>
                                                    <Icon name="arrow-right" size={14} className="text-stone-400" />
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${isApprove ? 'bg-emerald-600' : 'bg-stone-500'}`}>
                                                        {isApprove ? 'Approved (Khôi phục)' : 'Inactive (Tạm ẩn)'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-stone-500 italic mb-5 leading-relaxed">
                                                    {isApprove 
                                                        ? '* Lữ quán sẽ được hiển thị công khai trên bản đồ và các báo cáo cũ sẽ được dọn dẹp.'
                                                        : '* Lữ quán sẽ bị ẩn khỏi hệ thống công khai nhưng dữ liệu vẫn được giữ lại để kiểm tra.'}
                                                </p>

                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Danh sách báo lỗi từ người dùng</p>
                                                <div className="space-y-3">
                                                    {reports.filter(r => r.hotelId === hotel.id).length > 0 ? (
                                                        reports.filter(r => r.hotelId === hotel.id).map((r, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                                <p className="text-xs font-bold text-red-700">{getReasonText(r.reason)}</p>
                                                                {r.details && <p className="text-[11px] text-stone-600 mt-1.5 italic">"{r.details}"</p>}
                                                                <p className="text-[8px] text-stone-400 font-bold mt-2 uppercase tracking-wider">{new Date(r.reportedAt).toLocaleString('vi-VN')}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-stone-500 italic bg-white p-3 rounded-xl border border-stone-200">Không có báo cáo nào hoặc đã được dọn dẹp.</p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-3 shrink-0">
                                        <button onClick={() => setReviewConfirm(null)} className="flex-1 py-3.5 bg-stone-200 text-stone-700 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all hover:bg-stone-300">Hủy</button>
                                        <button 
                                            onClick={() => {
                                                if (action === 'approve') handleReviewApprove(hotel);
                                                else if (action === 'restore') handleRestoreHotel(hotel);
                                                else handleReviewReject(hotel);
                                                setReviewConfirm(null);
                                            }} 
                                            className={`flex-1 py-3.5 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest hover:brightness-110 ${isApprove || isRestore ? 'bg-emerald-600' : 'bg-purple-600'}`}
                                        >
                                            Xác nhận
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </main>

            {/* Footer - Optimized for Desktop & Mobile */}
            <Footer onAboutClick={() => setShowAboutDialog(true)} />

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[300] bg-stone-900/90 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest border border-white/20 animate-in slide-in-from-top-4 fade-in duration-300 max-w-[90vw] text-center pointer-events-none">
                    <Icon name="bell-ring" size={18} className="text-orange-500 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

const App = () => (
    <LanguageProvider>
        <MainApp />
    </LanguageProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);