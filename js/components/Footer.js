const Footer = ({ onAboutClick }) => {
    return (
        <footer className="hidden md:block absolute bottom-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-t border-white/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {/* Desktop Footer */}
            <div className="flex py-1.5 px-6 md:px-8 lg:px-10 items-center justify-center gap-4">
                <button onClick={onAboutClick} className="text-red-600 hover:text-red-800 p-0.5 transition-all duration-200 hover:-translate-y-1" title="Thông tin">
                    <Icon name="info" size={18} />
                </button>
                <a href="https://nongtrang.vn/" target="_blank" className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-2 md:py-0.5 bg-emerald-50/90 backdrop-blur text-emerald-700 rounded-md text-[9px] md:text-[10px] font-black hover:bg-emerald-100 hover:text-emerald-900 transition-colors border border-emerald-200/50">
                    Vận hành bởi nongtrang.vn <Icon name="external-link" size={10} />
                </a>
                <a href="https://github.com/letrthong/telua_public_marketing/tree/main/config/hotel_connect" target="_blank" className="text-emerald-700 hover:text-emerald-900 p-0.5 transition-all duration-200 hover:-translate-y-1" title="Mã nguồn mở">
                    <Icon name="github" size={18} />
                </a>
            </div>
        </footer>
    );
};