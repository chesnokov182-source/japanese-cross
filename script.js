// ========== СЛОВАРЬ СЛОВ ПО УРОВНЯМ ==========
const wordLists = {
    n5: [
        { word: "ニホンゴ", clue: "Японский язык" },
        { word: "ウンテンシユ", clue: "Водитель" },
        { word: "デンワバンゴウ", clue: "Номер телефона" },
        { word: "ギンコウ", clue: "Банк" },
        { word: "イソガシイ", clue: "Занятой" },
        { word: "オシエル", clue: "Учить, рассказывать" },
        { word: "オハヨウ", clue: "Доброе утро" },
        { word: "メイシ", clue: "Визитка" },
        { word: "ハイ", clue: "Да" }
    ],
    n4: [
        { word: "デンシャ", clue: "Электричка, поезд" },
        { word: "ヨミカタ", clue: "Способ чтения (как читается)" },
        { word: "ハナシ", clue: "Разговор, история" },
        { word: "テンプラ", clue: "Блюдо во фритюре" },
        { word: "マチ", clue: "Город" },
        { word: "アメ", clue: "Дождь / конфета" }
    ],
    n3: [
        { word: "ケイザイ", clue: "Экономика" },
        { word: "セイジ", clue: "Политика" },
        { word: "ブンカ", clue: "Культура" },
        { word: "レキシ", clue: "История" },
        { word: "ガクシュウ", clue: "Обучение" },
        { word: "ケンキュウ", clue: "Исследование" }
    ],
    n2: [
        { word: "チョウサ", clue: "Расследование, исследование" },
        { word: "ハッテン", clue: "Развитие" },
        { word: "カンリョウ", clue: "Чиновник, бюрократ" },
        { word: "コクサイ", clue: "Международный" },
        { word: "ジョウホウ", clue: "Информация" },
        { word: "イノベーション", clue: "Инновация" }
    ],
    n1: [
        { word: "ジッソウ", clue: "Внедрение, реализация" },
        { word: "ソウゴウテキ", clue: "Комплексный, всесторонний" },
        { word: "ケイショウ", clue: "Наследование" },
        { word: "ホショウ", clue: "Гарантия" },
        { word: "チイキ", clue: "Регион, район" },
        { word: "サクセイ", clue: "Составление (документа)" }
    ]
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getRandomWords(list, maxWords = 12) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, maxWords);
}

// Генератор кроссворда из списка слов
function generateCrosswordFromWords(words) {
    if (!words || words.length === 0) return null;
    
    // Сортируем по длине (сначала самые длинные)
    const sorted = [...words].sort((a,b) => b.word.length - a.word.length);
    const placed = [];
    const grid = new Map(); // key "row,col" -> { char, wordId, cellIndex }
    let minRow = 0, maxRow = 0, minCol = 0, maxCol = 0;
    
    // Размещаем первое слово горизонтально в центре
    const first = sorted[0];
    const startRow = 0, startCol = 0;
    for (let i = 0; i < first.word.length; i++) {
        const key = `${startRow},${startCol + i}`;
        grid.set(key, { char: first.word[i], wordId: first.id, cellIndex: i });
    }
    placed.push({
        ...first,
        row: startRow,
        col: startCol,
        dir: 'across',
        cells: Array.from({ length: first.word.length }, (_, i) => ({ row: startRow, col: startCol + i }))
    });
    maxRow = Math.max(maxRow, startRow);
    minRow = Math.min(minRow, startRow);
    maxCol = Math.max(maxCol, startCol + first.word.length - 1);
    minCol = Math.min(minCol, startCol);
    
    // Пытаемся разместить остальные слова
    const remaining = sorted.slice(1);
    for (const word of remaining) {
        let placedWord = null;
        // Ищем пересечение с уже размещёнными словами
        for (let tryDir of ['across', 'down']) {
            for (let existing of placed) {
                for (let i = 0; i < word.word.length; i++) {
                    for (let j = 0; j < existing.word.length; j++) {
                        if (word.word[i] === existing.word[j]) {
                            // Потенциальное пересечение
                            let row, col;
                            if (tryDir === 'across') {
                                row = existing.dir === 'across' ? existing.row : existing.row + j;
                                col = existing.dir === 'across' ? existing.col + j : existing.col;
                                // Для нового слова по горизонтали: его строка = row, колонка = col - i
                                const newCol = col - i;
                                const newRow = row;
                                // Проверяем, что все клетки свободны или совпадают
                                let ok = true;
                                for (let k = 0; k < word.word.length; k++) {
                                    const r = newRow;
                                    const c = newCol + k;
                                    const key = `${r},${c}`;
                                    const existingCell = grid.get(key);
                                    if (existingCell) {
                                        if (existingCell.char !== word.word[k]) {
                                            ok = false;
                                            break;
                                        }
                                    } else {
                                        // Проверяем, что не создаём конфликт с другим словом (буквы могут быть только если пересекаются)
                                        // Пока просто проверяем, что клетка не занята другой буквой
                                        // (дополнительно можно проверить, что это не заставит слово вылезти за пределы, но мы не ограничиваем)
                                    }
                                }
                                if (ok) {
                                    // Дополнительная проверка, что новое слово не создаст пересечений с другими словами, кроме ожидаемых
                                    // (упрощённо)
                                    placedWord = { word: word.word, clue: word.clue, id: word.id, row: newRow, col: newCol, dir: 'across' };
                                    break;
                                }
                            } else { // tryDir === 'down'
                                row = existing.dir === 'across' ? existing.row + j : existing.row;
                                col = existing.dir === 'across' ? existing.col + j : existing.col;
                                const newRow = row - i;
                                const newCol = col;
                                let ok = true;
                                for (let k = 0; k < word.word.length; k++) {
                                    const r = newRow + k;
                                    const c = newCol;
                                    const key = `${r},${c}`;
                                    const existingCell = grid.get(key);
                                    if (existingCell) {
                                        if (existingCell.char !== word.word[k]) {
                                            ok = false;
                                            break;
                                        }
                                    }
                                }
                                if (ok) {
                                    placedWord = { word: word.word, clue: word.clue, id: word.id, row: newRow, col: newCol, dir: 'down' };
                                    break;
                                }
                            }
                        }
                    }
                    if (placedWord) break;
                }
                if (placedWord) break;
            }
            if (placedWord) break;
        }
        
        if (placedWord) {
            // Размещаем слово
            const cells = [];
            for (let k = 0; k < placedWord.word.length; k++) {
                const r = placedWord.dir === 'across' ? placedWord.row : placedWord.row + k;
                const c = placedWord.dir === 'across' ? placedWord.col + k : placedWord.col;
                const key = `${r},${c}`;
                const existing = grid.get(key);
                if (!existing) {
                    grid.set(key, { char: placedWord.word[k], wordId: placedWord.id, cellIndex: k });
                }
                cells.push({ row: r, col: c });
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
            }
            placed.push(placedWord);
        } else {
            // Не удалось разместить слово – пропускаем
            console.warn(`Не удалось разместить слово: ${word.word}`);
        }
    }
    
    if (placed.length === 0) return null;
    
    // Создаём сетку
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;
    const gridArray = Array(height).fill().map(() => Array(width).fill(null));
    const wordObjects = [];
    
    // Переносим клетки
    for (let [key, val] of grid.entries()) {
        const [r, c] = key.split(',').map(Number);
        const row = r - minRow;
        const col = c - minCol;
        gridArray[row][col] = val.char;
    }
    
    // Строим объекты слов для рендеринга
    for (let p of placed) {
        const cells = [];
        for (let k = 0; k < p.word.length; k++) {
            const r = p.dir === 'across' ? p.row : p.row + k;
            const c = p.dir === 'across' ? p.col + k : p.col;
            cells.push({ row: r - minRow, col: c - minCol });
        }
        wordObjects.push({
            id: p.id,
            word: p.word,
            clue: p.clue,
            dir: p.dir,
            row: p.row - minRow,
            col: p.col - minCol,
            cells: cells
        });
    }
    
    return { grid: gridArray, words: wordObjects, width, height };
}

// ========== ПРЕДВАРИТЕЛЬНЫЕ ЗАГОТОВКИ (на случай ошибки генерации) ==========
const fallbackCrosswords = {
    n5: {
        width: 8,
        height: 6,
        words: [
            { word: "ニホンゴ", row: 3, col: 0, dir: "across", clue: "Японский язык", id: 0 },
            { word: "ウンテンシユ", row: 0, col: 2, dir: "down", clue: "Водитель", id: 1 }
        ]
    }
};

// ========== ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ==========
let currentLevel = "n5";
let currentPuzzleIndex = 0;
let gridData = [];        // двумерный массив (символы или null)
let wordsList = [];       // список объектов слов с полями id, word, clue, dir, cells, current
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let cellElements = [];
let gridWidth, gridHeight;
let romajiBuffers = new Map();
let hintUsed = false;
let generatedPuzzles = {}; // сохранённые сгенерированные кроссворды для каждого уровня

const levelSelect = document.getElementById("levelSelect");
const puzzleSelect = document.getElementById("puzzleSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const themeToggle = document.getElementById("themeToggle");
const resetProgressBtn = document.getElementById("resetProgressBtn");

// ========== УВЕДОМЛЕНИЯ И ПОДТВЕРЖДЕНИЯ ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

let confirmResolve = null;
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
    });
}
function closeConfirmDialog(result) {
    if (confirmResolve) confirmResolve(result);
    confirmResolve = null;
    confirmModal.style.display = 'none';
}
confirmYes.addEventListener('click', () => closeConfirmDialog(true));
confirmNo.addEventListener('click', () => closeConfirmDialog(false));

// ========== ХРАНИЛИЩЕ ==========
const STORAGE_PROGRESS_KEY = "crosswordProgress";
const STORAGE_COMPLETED_KEY = "completedCrosswords";

function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
}
function saveCurrentProgress() {
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    progress[key] = {
        gridData: gridData.map(row => row.map(cell => cell)),
        hintUsed: hintUsed
    };
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}
function getCompletedCrosswords() {
    const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return saved ? JSON.parse(saved) : [];
}
function markAsCompleted() {
    const completed = getCompletedCrosswords();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!completed.includes(key)) {
        completed.push(key);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        updatePuzzleSelect();
    }
}
function isCrosswordCompleted(level, puzzleIdx) {
    return getCompletedCrosswords().includes(`${level}_${puzzleIdx}`);
}
async function resetAllProgress() {
    const confirmed = await showConfirmDialog("Удалить весь сохранённый прогресс?");
    if (confirmed) {
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        localStorage.removeItem(STORAGE_COMPLETED_KEY);
        loadCrossword(currentLevel, currentPuzzleIndex, false);
        showToast("Весь прогресс удалён.", "success");
    }
}
resetProgressBtn.addEventListener("click", resetAllProgress);

// ========== ТЕМА ==========
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark');
}
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}
themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ========== ГЕНЕРАЦИЯ КРОССВОРДА ДЛЯ УРОВНЯ ==========
function generateOrGetPuzzles(level) {
    if (generatedPuzzles[level]) return generatedPuzzles[level];
    const words = wordLists[level];
    if (!words || words.length === 0) return [];
    const puzzles = [];
    // Генерируем несколько вариантов
    for (let attempt = 0; attempt < 3; attempt++) {
        const selected = getRandomWords(words, 10);
        const wordObjs = selected.map((w, idx) => ({ ...w, id: idx }));
        const result = generateCrosswordFromWords(wordObjs);
        if (result && result.words.length >= 3) {
            puzzles.push({
                name: `Вариант ${attempt+1}`,
                width: result.width,
                height: result.height,
                words: result.words
            });
        }
    }
    if (puzzles.length === 0 && fallbackCrosswords[level]) {
        puzzles.push(fallbackCrosswords[level]);
    }
    generatedPuzzles[level] = puzzles;
    return puzzles;
}

// ========== ЗАГРУЗКА КРОССВОРДА ==========
function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const puzzles = generateOrGetPuzzles(levelId);
    if (puzzleIdx >= puzzles.length) puzzleIdx = 0;
    const puzzle = puzzles[puzzleIdx];
    if (!puzzle) return;
    
    gridWidth = puzzle.width;
    gridHeight = puzzle.height;
    wordsList = puzzle.words.map((w, idx) => ({
        ...w,
        id: w.id !== undefined ? w.id : idx,
        current: Array(w.word.length).fill(""),
        wordOrig: w.word
    }));
    
    // Инициализация сетки
    const freshGrid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
    for (let w of wordsList) {
        for (let i = 0; i < w.cells.length; i++) {
            const cell = w.cells[i];
            if (freshGrid[cell.row][cell.col] === null) freshGrid[cell.row][cell.col] = "";
        }
    }
    
    let savedData = null;
    if (preserveSaved) {
        const progress = getStoredProgress();
        const key = `${levelId}_${puzzleIdx}`;
        if (progress[key]) savedData = progress[key];
    }
    if (savedData) {
        gridData = savedData.gridData.map(row => [...row]);
        hintUsed = savedData.hintUsed;
    } else {
        gridData = freshGrid;
        hintUsed = false;
    }
    
    generateNumbering();
    syncWordFromGrid();
    renderGrid();
    renderClues();
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    updateClueCompletion();
    romajiBuffers.clear();
    hintBtn.disabled = hintUsed;
    hintBtn.textContent = hintUsed ? "Подсказка использована" : "Подсказка (1 раз)";
}

function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let numberMap = new Map();
    let counter = 1;
    let sorted = [...allWords].sort((a,b) => {
        if(a.row === b.row && a.col === b.col) return a.dir === "across" ? -1 : 1;
        if(a.row === b.row) return a.col - b.col;
        return a.row - b.row;
    });
    for(let w of sorted) {
        let key = `${w.row},${w.col}`;
        if(!numberMap.has(key)) numberMap.set(key, counter++);
        w.number = numberMap.get(key);
    }
    allWords.forEach(w => { wordsList[w.id].number = w.number; });
    
    cluesAcross = [];
    cluesDown = [];
    for(let w of wordsList) {
        let clueItem = { num: w.number, wordId: w.id, clue: w.clue, cells: w.cells };
        if(w.dir === "across") cluesAcross.push(clueItem);
        else cluesDown.push(clueItem);
    }
    cluesAcross.sort((a,b) => a.num - b.num);
    cluesDown.sort((a,b) => a.num - b.num);
}

function syncWordFromGrid() {
    for (let w of wordsList) {
        for (let i = 0; i < w.cells.length; i++) {
            let cell = w.cells[i];
            let val = gridData[cell.row][cell.col] || "";
            w.current[i] = val;
        }
    }
}

// ========== ОТРИСОВКА СЕТКИ ==========
function renderGrid() {
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    container.style.gridTemplateColumns = `repeat(${gridWidth}, minmax(70px, 1fr))`;
    cellElements = [];
    for(let i=0;i<gridHeight;i++){
        cellElements[i]=[];
        for(let j=0;j<gridWidth;j++){
            const isBlocked = (gridData[i][j] === null);
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            if(isBlocked) cellDiv.classList.add("blocked");
            const wordNumber = getWordNumberAt(i,j);
            if(wordNumber && !isBlocked){
                const spanNum = document.createElement("span");
                spanNum.className = "cell-number";
                spanNum.innerText = Math.floor(wordNumber);
                cellDiv.appendChild(spanNum);
            }
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.value = getDisplayValue(i, j);
            input.disabled = isBlocked;
            if(!isBlocked){
                input.addEventListener("keydown", (e) => handleKeydown(e, i, j));
                input.addEventListener("focus", () => onCellFocus(i,j));
                input.addEventListener("blur", () => onCellBlur(i,j));
                input.addEventListener("input", () => onCellInput(i,j));
            }
            cellDiv.appendChild(input);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    applyHighlight();
}

function getDisplayValue(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key) || "";
    if (buffer !== "") return buffer;
    return gridData[row][col] !== null ? gridData[row][col] : "";
}
function updateCellUI(row, col) {
    if (cellElements[row][col]) cellElements[row][col].value = getDisplayValue(row, col);
}
function getWordNumberAt(row, col) {
    for (let w of wordsList) {
        if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) return w.number;
    }
    return null;
}
function onCellFocus(row, col){
    let containingWords = wordsList.filter(w => w.cells.some(c => c.row === row && c.col === col));
    if (containingWords.length === 0) return;
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord && activeWord.cells.some(c => c.row === row && c.col === col)) return;
    }
    let newWord = null;
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) newWord = containingWords.find(w => w.dir === activeWord.dir);
    }
    if (!newWord) newWord = containingWords.find(w => w.dir === "across") || containingWords[0];
    setActiveWord(newWord.id);
}
function onCellBlur(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key);
    if (buffer === "n") {
        insertKatakanaArray(row, col, ["ン"], 0);
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    } else if (buffer) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}
function setActiveWord(wordId){
    activeWordId = wordId;
    applyHighlight();
    const word = wordsList.find(w => w.id === activeWordId);
    if (word && word.cells.length) {
        const firstEmpty = word.cells.find(cell => gridData[cell.row][cell.col] === "");
        if (firstEmpty) cellElements[firstEmpty.row][firstEmpty.col]?.focus();
        else cellElements[word.cells[0].row][word.cells[0].col]?.focus();
    }
}
function applyHighlight(){
    for(let i=0;i<gridHeight;i++){
        for(let j=0;j<gridWidth;j++){
            const cellDiv = cellElements[i][j]?.parentElement;
            if(cellDiv) cellDiv.classList.remove("highlight", "active-word", "wrong");
        }
    }
    if(activeWordId !== null){
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord){
            for(let cell of activeWord.cells){
                const cellDiv = cellElements[cell.row][cell.col]?.parentElement;
                if(cellDiv) cellDiv.classList.add("active-word");
            }
        }
    }
    document.querySelectorAll(".clue-list li").forEach(li => li.classList.remove("active-clue"));
    if(activeWordId !== null){
        let target = document.querySelector(`.clue-list li[data-word-id='${activeWordId}']`);
        if(target) target.classList.add("active-clue");
    }
}
function clearHighlight(){ activeWordId = null; applyHighlight(); }
function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if (gridData[cell.row][cell.col] === "") return cell;
    }
    return null;
}
function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    for (let w of allWords) {
        if (w.num > currentNumber) {
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if (!wordObj) continue;
            let isComplete = true;
            for (let i = 0; i < wordObj.word.length; i++) if (wordObj.current[i] !== wordObj.wordOrig[i]) { isComplete = false; break; }
            if (!isComplete) { setActiveWord(wordObj.id); return; }
        }
    }
    for (let w of allWords) {
        const wordObj = wordsList.find(word => word.id === w.wordId);
        if (!wordObj) continue;
        let isComplete = true;
        for (let i = 0; i < wordObj.word.length; i++) if (wordObj.current[i] !== wordObj.wordOrig[i]) { isComplete = false; break; }
        if (!isComplete) { setActiveWord(wordObj.id); return; }
    }
}

// ========== ВВОД РОМАДЗИ → КАТАКАНА ==========
const romajiToKatakana = {
    "a":["ア"],"i":["イ"],"u":["ウ"],"e":["エ"],"o":["オ"],"ka":["カ"],"ki":["キ"],"ku":["ク"],"ke":["ケ"],"ko":["コ"],
    "sa":["サ"],"shi":["シ"],"su":["ス"],"se":["セ"],"so":["ソ"],"ta":["タ"],"chi":["チ"],"tsu":["ツ"],"te":["テ"],"to":["ト"],
    "na":["ナ"],"ni":["ニ"],"nu":["ヌ"],"ne":["ネ"],"no":["ノ"],"ha":["ハ"],"hi":["ヒ"],"fu":["フ"],"he":["ヘ"],"ho":["ホ"],
    "ma":["マ"],"mi":["ミ"],"mu":["ム"],"me":["メ"],"mo":["モ"],"ya":["ヤ"],"yu":["ユ"],"yo":["ヨ"],"ra":["ラ"],"ri":["リ"],
    "ru":["ル"],"re":["レ"],"ro":["ロ"],"wa":["ワ"],"wo":["ヲ"],"ga":["ガ"],"gi":["ギ"],"gu":["グ"],"ge":["ゲ"],"go":["ゴ"],
    "za":["ザ"],"ji":["ジ"],"zu":["ズ"],"ze":["ゼ"],"zo":["ゾ"],"da":["ダ"],"di":["ヂ"],"du":["ヅ"],"de":["デ"],"do":["ド"],
    "ba":["バ"],"bi":["ビ"],"bu":["ブ"],"be":["ベ"],"bo":["ボ"],"pa":["パ"],"pi":["ピ"],"pu":["プ"],"pe":["ペ"],"po":["ポ"],
    "kya":["キ","ヤ"],"kyu":["キ","ユ"],"kyo":["キ","ヨ"],"sha":["シ","ヤ"],"shu":["シ","ユ"],"sho":["シ","ヨ"],
    "cha":["チ","ヤ"],"chu":["チ","ユ"],"cho":["チ","ヨ"],"nya":["ニ","ヤ"],"nyu":["ニ","ユ"],"nyo":["ニ","ヨ"],
    "hya":["ヒ","ヤ"],"hyu":["ヒ","ユ"],"hyo":["ヒ","ヨ"],"mya":["ミ","ヤ"],"myu":["ミ","ユ"],"myo":["ミ","ヨ"],
    "rya":["リ","ヤ"],"ryu":["リ","ユ"],"ryo":["リ","ヨ"],"gya":["ギ","ヤ"],"gyu":["ギ","ユ"],"gyo":["ギ","ヨ"],
    "ja":["ジ","ヤ"],"ju":["ジ","ユ"],"jo":["ジ","ヨ"],"bya":["ビ","ヤ"],"byu":["ビ","ユ"],"byo":["ビ","ヨ"],
    "pya":["ピ","ヤ"],"pyu":["ピ","ユ"],"pyo":["ピ","ヨ"],"nn":["ン"],"-":["ー"]
};
(function generateDoubled() {
    const cons=['k','s','t','p','c','j','d','b','g','z','r','m','h','f','w'];
    const newEntries={};
    for(let key in romajiToKatakana){
        const fc=key[0];
        if(!cons.includes(fc)) continue;
        if(key.length>1 && key[0]===key[1]) continue;
        if(fc==='n') continue;
        const newKey=fc+key;
        if(romajiToKatakana[newKey]) continue;
        newEntries[newKey]=['ツ'].concat(romajiToKatakana[key]);
    }
    Object.assign(romajiToKatakana,newEntries);
})();

function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if (startIndex === 0) {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        saveCurrentProgress();
        if (katakanaArray.length > 1 && activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[idx + 1];
                    insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, 1);
                    return;
                }
            }
        } else if (activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                else focusNextWord(activeWord.number);
            }
        }
    } else {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        saveCurrentProgress();
        if (startIndex + 1 < katakanaArray.length && activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[idx + 1];
                    insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex + 1);
                    return;
                }
            }
        } else if (activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                else focusNextWord(activeWord.number);
            }
        }
    }
}

function processBuffer(row, col, buffer) {
    if (buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
        if (activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[idx + 1];
                    const nextKey = `${nextCell.row},${nextCell.col}`;
                    romajiBuffers.set(nextKey, buffer[1]);
                    updateCellUI(nextCell.row, nextCell.col);
                    cellElements[nextCell.row][nextCell.col]?.focus();
                } else {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) {
                        const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                        romajiBuffers.set(nextKey, buffer[1]);
                        updateCellUI(nextEmpty.row, nextEmpty.col);
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                        setTimeout(() => {
                            if (activeWordId !== null) {
                                const newWord = wordsList.find(w => w.id === activeWordId);
                                if (newWord && newWord.cells.length) {
                                    let firstCell = newWord.cells[0];
                                    const firstKey = `${firstCell.row},${firstCell.col}`;
                                    romajiBuffers.set(firstKey, buffer[1]);
                                    updateCellUI(firstCell.row, firstCell.col);
                                    cellElements[firstCell.row][firstCell.col]?.focus();
                                }
                            }
                        }, 10);
                    }
                }
            }
        }
        return true;
    }
    if (romajiToKatakana.hasOwnProperty(buffer)) {
        insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
        return true;
    }
    for (let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if (romajiToKatakana.hasOwnProperty(prefix)) {
            const katakanaArray = romajiToKatakana[prefix];
            const remaining = buffer.slice(i);
            insertKatakanaArray(row, col, katakanaArray, 0);
            if (remaining.length > 0 && activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        const nextKey = `${nextCell.row},${nextCell.col}`;
                        romajiBuffers.set(nextKey, remaining);
                        updateCellUI(nextCell.row, nextCell.col);
                        cellElements[nextCell.row][nextCell.col]?.focus();
                    } else {
                        let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                        if (nextEmpty) {
                            const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                            romajiBuffers.set(nextKey, remaining);
                            updateCellUI(nextEmpty.row, nextEmpty.col);
                            cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                        } else {
                            focusNextWord(activeWord.number);
                            setTimeout(() => {
                                if (activeWordId !== null) {
                                    const newWord = wordsList.find(w => w.id === activeWordId);
                                    if (newWord && newWord.cells.length) {
                                        let firstCell = newWord.cells[0];
                                        const firstKey = `${firstCell.row},${firstCell.col}`;
                                        romajiBuffers.set(firstKey, remaining);
                                        updateCellUI(firstCell.row, firstCell.col);
                                        cellElements[firstCell.row][firstCell.col]?.focus();
                                    }
                                }
                            }, 10);
                        }
                    }
                }
            }
            return true;
        }
    }
    return false;
}

function handleKeydown(e, row, col) {
    if (gridData[row][col] === null) return;
    const allowedChars = /^[a-zA-Z-]$/;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !allowedChars.test(e.key)) {
        e.preventDefault();
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) e.preventDefault();

    if (e.key === "Backspace") {
        const key = `${row},${col}`;
        let buffer = romajiBuffers.get(key) || "";
        if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            romajiBuffers.set(key, buffer);
            updateCellUI(row, col);
        } else {
            if (gridData[row][col] !== "") {
                gridData[row][col] = "";
                updateCellUI(row, col);
                syncWordFromGrid();
                checkCompletion();
                updateClueCompletion();
                saveCurrentProgress();
            } else if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx > 0) {
                        let prev = activeWord.cells[idx - 1];
                        cellElements[prev.row][prev.col]?.focus();
                    }
                }
            }
        }
        return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        let newRow = row, newCol = col;
        if (e.key === "ArrowLeft") newCol--;
        if (e.key === "ArrowRight") newCol++;
        if (e.key === "ArrowUp") newRow--;
        if (e.key === "ArrowDown") newRow++;
        if (newRow >= 0 && newRow < gridHeight && newCol >= 0 && newCol < gridWidth && gridData[newRow][newCol] !== null) {
            cellElements[newRow][newCol]?.focus();
        }
        return;
    }
    if (e.key.length === 1 && allowedChars.test(e.key)) {
        const key = `${row},${col}`;
        let buffer = (romajiBuffers.get(key) || "") + e.key.toLowerCase();
        romajiBuffers.set(key, buffer);
        updateCellUI(row, col);
        if (buffer.length === 1 && gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
            updateClueCompletion();
            saveCurrentProgress();
        }
        const processed = processBuffer(row, col, buffer);
        if (processed) {
            romajiBuffers.set(key, "");
            updateCellUI(row, col);
        }
    }
}
function onCellInput(row, col) {
    const key = `${row},${col}`;
    if (romajiBuffers.has(key)) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}

// ========== ПРОВЕРКА ЗАВЕРШЕНИЯ ==========
function checkCompletion() {
    let allFilled = true;
    for (let w of wordsList) {
        for (let i = 0; i < w.word.length; i++) {
            if (w.current[i] !== w.wordOrig[i]) { allFilled = false; break; }
        }
    }
    const statusDiv = document.getElementById("statusMsg");
    if (allFilled) {
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉";
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) markAsCompleted();
    } else {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s, - → ー.";
        if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            const completed = getCompletedCrosswords();
            const key = `${currentLevel}_${currentPuzzleIndex}`;
            const index = completed.indexOf(key);
            if (index !== -1) {
                completed.splice(index, 1);
                localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
                updatePuzzleSelect();
            }
        }
    }
}
function updateClueCompletion() {
    for (let w of wordsList) {
        let isComplete = true;
        for (let i = 0; i < w.word.length; i++) if (w.current[i] !== w.wordOrig[i]) { isComplete = false; break; }
        const clueLi = document.querySelector(`.clue-list li[data-word-id='${w.id}']`);
        if (clueLi) isComplete ? clueLi.classList.add("completed") : clueLi.classList.remove("completed");
    }
}
function renderClues() {
    const container = document.getElementById("cluesContainer");
    container.innerHTML = `
        <div class="clue-block"><h3>По горизонтали</h3><ul class="clue-list" id="acrossList"></ul></div>
        <div class="clue-block"><h3>По вертикали</h3><ul class="clue-list" id="downList"></ul></div>
    `;
    const acrossUl = document.getElementById("acrossList");
    const downUl = document.getElementById("downList");
    for(let clue of cluesAcross){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => { setActiveWord(clue.wordId); const word = wordsList.find(w => w.id === clue.wordId); if(word && word.cells.length) cellElements[word.cells[0].row][word.cells[0].col]?.focus(); });
        acrossUl.appendChild(li);
    }
    for(let clue of cluesDown){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => { setActiveWord(clue.wordId); const word = wordsList.find(w => w.id === clue.wordId); if(word && word.cells.length) cellElements[word.cells[0].row][word.cells[0].col]?.focus(); });
        downUl.appendChild(li);
    }
    updateClueCompletion();
}

// ========== СБРОС ==========
function resetCrossword() {
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (progress[key]) delete progress[key];
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    const completed = getCompletedCrosswords();
    const completedKey = `${currentLevel}_${currentPuzzleIndex}`;
    const index = completed.indexOf(completedKey);
    if (index !== -1) { completed.splice(index,1); localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed)); }
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    showToast("Кроссворд сброшен.", "success");
}
resetBtn.addEventListener("click", resetCrossword);

// ========== ПОДСКАЗКА ==========
function giveHint() {
    if (hintUsed) { showToast("Подсказка уже использована.", "error"); return; }
    let emptyCells = [];
    for (let i=0;i<gridHeight;i++) for(let j=0;j<gridWidth;j++) if(gridData[i][j]==="") emptyCells.push({row:i,col:j});
    if (emptyCells.length===0) { showToast("Нет пустых ячеек.", "error"); return; }
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    let correctChar = null;
    for (let w of wordsList) {
        const idx = w.cells.findIndex(c => c.row === row && c.col === col);
        if (idx !== -1) { correctChar = w.wordOrig[idx]; break; }
    }
    if (!correctChar) return;
    gridData[row][col] = correctChar;
    updateCellUI(row, col);
    syncWordFromGrid();
    checkCompletion();
    updateClueCompletion();
    saveCurrentProgress();
    hintUsed = true;
    hintBtn.disabled = true;
    hintBtn.textContent = "Подсказка использована";
    saveCurrentProgress();
}
hintBtn.addEventListener("click", giveHint);

// ========== ОБНОВЛЕНИЕ СПИСКА КРОССВОРДОВ ==========
function updatePuzzleSelect() {
    const puzzles = generateOrGetPuzzles(currentLevel);
    puzzleSelect.innerHTML = "";
    puzzles.forEach((puzzle, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        option.textContent = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        puzzleSelect.appendChild(option);
    });
    puzzleSelect.value = currentPuzzleIndex;
}
levelSelect.addEventListener("change", (e) => {
    currentLevel = e.target.value;
    currentPuzzleIndex = 0;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
});
puzzleSelect.addEventListener("change", (e) => {
    currentPuzzleIndex = parseInt(e.target.value, 10);
    loadCrossword(currentLevel, currentPuzzleIndex);
});

// ========== ЗАПУСК ==========
updatePuzzleSelect();
loadCrossword("n5", 0);
