import test from 'node:test';
import assert from 'node:assert';
import { TRANSLATIONS } from '../i18n.js';

test('i18n - supported languages', (t) => {
    const langs = Object.keys(TRANSLATIONS);
    assert.ok(langs.includes('vi'));
    assert.ok(langs.includes('en'));
    assert.ok(langs.includes('zh'));
    assert.ok(langs.includes('ko'));
});

test('i18n - dictionary key alignment', (t) => {
    const viKeys = Object.keys(TRANSLATIONS.vi).sort();
    
    // Each other language should have the exact same set of translation keys as Vietnamese
    for (const lang of ['en', 'zh', 'ko']) {
        const langKeys = Object.keys(TRANSLATIONS[lang]).sort();
        assert.deepStrictEqual(langKeys, viKeys, `Language keys for '${lang}' do not match 'vi'`);
    }
});
