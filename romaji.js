import { romajiToKatakana } from './constants.js';

/**
 * Преобразует строку ромадзи в строку катаканы.
 * @param {string} romaji 
 * @returns {string} Катакана (или пустая строка, если не удалось разобрать)
 */
export function romajiToKatakanaString(romaji) {
    if (!romaji) return "";
    let result = "";
    let i = 0;
    const len = romaji.length;
    while (i < len) {
        let matched = false;
        // Пытаемся найти самое длинное совпадение
        for (let l = Math.min(4, len - i); l >= 1; l--) {
            const sub = romaji.substr(i, l);
            if (romajiToKatakana[sub]) {
                result += romajiToKatakana[sub].join('');
                i += l;
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Если не найдено, пропускаем символ (не латиница)
            i++;
        }
    }
    return result;
}
