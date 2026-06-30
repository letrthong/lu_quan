const { useState, createContext, useContext } = React;

// Từ điển đa ngôn ngữ
window.TRANSLATIONS = {
    vi: {
        search_placeholder: "Tìm tên, địa chỉ, thành phố...",
        all_regions: "Tất cả khu vực",
        all_types: "Tất cả loại hình",
        select_region: "-- Chọn khu vực --",
        lang_vi: "🇻🇳 Tiếng Việt",
        lang_en: "🇬🇧 English",
        lang_zh: "🇨🇳 中文",
        lang_ko: "🇰🇷 한국어"
    },
    en: {
        search_placeholder: "Search name, address, city...",
        all_regions: "All regions",
        all_types: "All types",
        select_region: "-- Select region --",
        lang_vi: "🇻🇳 Vietnamese",
        lang_en: "🇬🇧 English",
        lang_zh: "🇨🇳 Chinese",
        lang_ko: "🇰🇷 Korean"
    },
    zh: {
        search_placeholder: "搜索名称、地址、城市...",
        all_regions: "所有区域",
        all_types: "所有类型",
        select_region: "-- 选择区域 --",
        lang_vi: "🇻🇳 越南语",
        lang_en: "🇬🇧 英语",
        lang_zh: "🇨🇳 中文",
        lang_ko: "🇰🇷 韩语"
    },
    ko: {
        search_placeholder: "이름, 주소, 도시 검색...",
        all_regions: "모든 지역",
        all_types: "모든 유형",
        select_region: "-- 지역 선택 --",
        lang_vi: "🇻🇳 베트남어",
        lang_en: "🇬🇧 영어",
        lang_zh: "🇨🇳 중국어",
        lang_ko: "🇰🇷 한국어"
    }
};

window.LanguageContext = createContext();

window.useTranslation = () => useContext(window.LanguageContext);

window.LanguageProvider = ({ children }) => {
    // Đọc ngôn ngữ lưu trên LocalStorage, mặc định là Tiếng Việt
    const [lang, setLang] = useState(() => localStorage.getItem('luquan_lang') || 'vi');
    
    const changeLang = (newLang) => {
        setLang(newLang);
        localStorage.setItem('luquan_lang', newLang);
    };

    // Hàm t(key): Nhận key và trả về string ứng với ngôn ngữ hiện tại
    const t = (key) => {
        return window.TRANSLATIONS[lang]?.[key] || window.TRANSLATIONS['vi']?.[key] || key;
    };

    return (
        <window.LanguageContext.Provider value={{ lang, changeLang, t }}>
            {children}
        </window.LanguageContext.Provider>
    );
};