import React, { useState, createContext, useContext } from 'react';
import { TRANSLATIONS } from './translations.js';

export const LanguageContext = createContext();

export const useTranslation = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    // Đọc ngôn ngữ lưu trên LocalStorage, mặc định là Tiếng Việt
    const [lang, setLang] = useState(() => localStorage.getItem('luquan_lang') || 'vi');
    
    const changeLang = (newLang) => {
        setLang(newLang);
        localStorage.setItem('luquan_lang', newLang);
    };

    // Hàm t(key): Nhận key và trả về string ứng với ngôn ngữ hiện tại
    const t = (key) => {
        return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['vi']?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, changeLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};