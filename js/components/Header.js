const Header = ({
    isAdmin,
    onShowSchemaManager,
    onSetAdminTab,
    adminTab,
    pendingRequestsCount,
    pendingReviewHotelsCount,
    reportsCount,
    onShowRequestForm,
    onLogoutAdmin,
    onShowAdminLogin
}) => {
    const { t, lang, changeLang } = window.useTranslation();

    return (
        <header className={`shrink-0 px-4 md:px-8 lg:px-10 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 md:pt-8 md:pb-4 shadow-sm flex items-center justify-between z-30 transition-all duration-300 ${isAdmin ? 'bg-stone-800' : 'bg-moss'} text-white`}>
            <div className="flex items-center gap-2">
                <a href="https://luquan.vn/" className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer" title="Trang chủ">
                    <Icon name="home" size={22} />
                </a>
                <div className="flex flex-col justify-center">
                    <h1 className="text-base md:text-xl lg:text-2xl font-black tracking-tight flex items-center gap-1.5 leading-normal py-0.5">
                        Lữ Quán {isAdmin && <span className="text-[8px] md:text-[10px] bg-red-500 px-1.5 py-0.5 rounded tracking-widest font-bold uppercase">Admin</span>}
                    </h1>
                    <p className="text-[7px] md:text-[10px] lg:text-xs opacity-80 font-bold  tracking-widest mt-0.5 md:mt-1">Luquan.vn - Miễn Phí Kết Nối Cho Du Lịch</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-3">
                {/* Nút chọn ngôn ngữ */}
                <select 
                    value={lang} 
                    onChange={(e) => changeLang(e.target.value)} 
                    className="bg-white/10 hover:bg-white/20 border border-transparent text-white text-[10px] md:text-xs font-bold py-1.5 px-1 md:py-2 md:px-2 rounded-lg outline-none cursor-pointer transition-colors"
                >
                    <option value="vi" className="text-stone-800">{t('lang_vi')}</option>
                    <option value="en" className="text-stone-800">{t('lang_en')}</option>
                    <option value="zh" className="text-stone-800">{t('lang_zh')}</option>
                    <option value="ko" className="text-stone-800">{t('lang_ko')}</option>
                </select>

                {isAdmin ? (
                    <>
                        <button onClick={onShowSchemaManager} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all text-[9px] md:text-xs font-black uppercase tracking-wider shadow-sm text-white mr-1 sm:mr-0">
                            <Icon name="map" size={14} /> <span className="hidden sm:inline">Khu vực</span>
                        </button>
                        <AdminTabs
                            adminTab={adminTab}
                            onSetAdminTab={onSetAdminTab}
                            pendingRequestsCount={pendingRequestsCount}
                            pendingReviewHotelsCount={pendingReviewHotelsCount}
                            reportsCount={reportsCount}
                            isMobile={false}
                        />
                    </>
                ) : (
                    <button onClick={onShowRequestForm} className="flex items-center gap-1 bg-orange-700 hover:bg-orange-800 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-[9px] md:text-xs font-black uppercase tracking-wider">
                        <Icon name="plus" size={14} /> <span className="hidden sm:inline">Đăng ký một điểm</span><span className="sm:hidden">Đăng ký</span>
                    </button>
                )}

                {isAdmin ? (
                    <button onClick={onLogoutAdmin} className="p-1.5 md:p-2 bg-white/10 rounded-lg"><Icon name="unlock" size={18} /></button>
                ) : (
                    <button onClick={onShowAdminLogin} className="p-1.5 md:p-2 bg-white/10 rounded-lg"><Icon name="lock" size={18} /></button>
                )}
            </div>
        </header>
    );
};