const AdminTabs = ({
    adminTab,
    onSetAdminTab,
    pendingRequestsCount,
    pendingReviewHotelsCount,
    reportsCount,
    isMobile = false
}) => {
    const tabs = [
        { id: 'approved', label: 'Đã Duyệt', desktopActiveClass: 'bg-white text-stone-900 shadow', mobileActiveClass: 'bg-moss text-white shadow' },
        { id: 'deleted', label: 'Thùng rác', desktopActiveClass: 'bg-red-700 text-white shadow', mobileActiveClass: 'bg-red-700 text-white shadow' },
        { id: 'inactive', label: 'Đã Ẩn', desktopActiveClass: 'bg-stone-500 text-white shadow', mobileActiveClass: 'bg-stone-500 text-white shadow' },
        { id: 'pending', label: 'Chờ Duyệt', count: pendingRequestsCount, desktopActiveClass: 'bg-white text-stone-900 shadow', mobileActiveClass: 'bg-orange-700 text-white shadow' },
        { id: 'pending_review', label: 'Cần Review', count: pendingReviewHotelsCount, desktopActiveClass: 'bg-purple-600 text-white shadow', mobileActiveClass: 'bg-purple-700 text-white shadow' },
        { id: 'reports', label: 'Báo cáo', count: reportsCount, desktopActiveClass: 'bg-white text-stone-900 shadow', mobileActiveClass: 'bg-red-700 text-white shadow' }
    ];

    if (isMobile) {
        // Mobile view (grid)
        return (
            <div className="grid grid-cols-3 gap-2 mt-2 sm:hidden">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => onSetAdminTab(tab.id)} 
                        className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${adminTab === tab.id ? tab.mobileActiveClass : 'bg-stone-200 text-stone-600'}`}
                    >
                        {tab.label} {tab.count > 0 && `(${tab.count})`}
                    </button>
                ))}
            </div>
        );
    }

    // Desktop view (flex)
    return (
        <div className="flex bg-white/10 p-0.5 rounded-lg mr-1 hidden sm:flex">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => onSetAdminTab(tab.id)} 
                    className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[8px] md:text-[10px] lg:text-xs font-bold uppercase transition-all relative ${adminTab === tab.id ? tab.desktopActiveClass : 'text-white/60 hover:text-white'}`}
                >
                    {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
                </button>
            ))}
        </div>
    );
};