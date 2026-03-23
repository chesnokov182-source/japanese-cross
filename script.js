function processBuffer(row, col, buffer) {
    // 1. Проверяем точное совпадение
    if (romajiToKatakana.hasOwnProperty(buffer)) {
        // Если буфер является префиксом более длинного ключа, ждём
        if (isPrefixOfLongerKey(buffer)) {
            console.log(`[${row},${col}] Ждём, "${buffer}" — префикс`);
            return false;
        }
        // Иначе вставляем
        const katakanaArray = romajiToKatakana[buffer];
        console.log(`[${row},${col}] Вставляем "${buffer}" -> ${katakanaArray.join('')}`);
        insertKatakanaArray(row, col, katakanaArray, 0);
        return true;
    }
    
    // 2. Если не совпадает, но является префиксом какого-либо ключа – ждём
    if (isPrefixOfLongerKey(buffer)) {
        console.log(`[${row},${col}] Ждём, "${buffer}" — префикс`);
        return false;
    }
    
    // 3. Иначе ищем самый длинный ключ, который является началом буфера
    for (let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if (romajiToKatakana.hasOwnProperty(prefix)) {
            const katakanaArray = romajiToKatakana[prefix];
            const remaining = buffer.slice(i);
            console.log(`[${row},${col}] Частичная вставка "${prefix}" -> ${katakanaArray.join('')}, остаток "${remaining}"`);
            insertKatakanaArray(row, col, katakanaArray, 0);
            if (remaining.length > 0) {
                // Переносим остаток в следующую ячейку
                if (activeWordId !== null) {
                    const activeWord = wordsList.find(w => w.id === activeWordId);
                    if (activeWord) {
                        let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                        if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                            let nextCell = activeWord.cells[idx + 1];
                            const nextKey = `${nextCell.row},${nextCell.col}`;
                            romajiBuffers.set(nextKey, remaining);
                            // Сразу обрабатываем перенесённый остаток в следующей ячейке
                            // Нужно вызвать processBuffer для следующей ячейки с оставшимся буфером
                            // Для этого мы временно сохраняем активное слово? Лучше вызвать processBuffer напрямую
                            processBuffer(nextCell.row, nextCell.col, remaining);
                            return true;
                        }
                    }
                }
            }
            return true;
        }
    }
    
    console.log(`[${row},${col}] Неверная комбинация "${buffer}", сброс`);
    return false;
}
