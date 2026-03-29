// Таблица соответствия ромадзи → массив катаканы
const romajiToKatakana = {
    "a": ["ア"], "i": ["イ"], "u": ["ウ"], "e": ["エ"], "o": ["オ"],
    "ka": ["カ"], "ki": ["キ"], "ku": ["ク"], "ke": ["ケ"], "ko": ["コ"],
    "sa": ["サ"], "shi": ["シ"], "su": ["ス"], "se": ["セ"], "so": ["ソ"],
    "ta": ["タ"], "chi": ["チ"], "tsu": ["ツ"], "te": ["テ"], "to": ["ト"],
    "na": ["ナ"], "ni": ["ニ"], "nu": ["ヌ"], "ne": ["ネ"], "no": ["ノ"],
    "ha": ["ハ"], "hi": ["ヒ"], "fu": ["フ"], "he": ["ヘ"], "ho": ["ホ"],
    "ma": ["マ"], "mi": ["ミ"], "mu": ["ム"], "me": ["メ"], "mo": ["モ"],
    "ya": ["ヤ"], "yu": ["ユ"], "yo": ["ヨ"],
    "ra": ["ラ"], "ri": ["リ"], "ru": ["ル"], "re": ["レ"], "ro": ["ロ"],
    "wa": ["ワ"], "wo": ["ヲ"],
    "ga": ["ガ"], "gi": ["ギ"], "gu": ["グ"], "ge": ["ゲ"], "go": ["ゴ"],
    "za": ["ザ"], "ji": ["ジ"], "zu": ["ズ"], "ze": ["ゼ"], "zo": ["ゾ"],
    "da": ["ダ"], "di": ["ヂ"], "du": ["ヅ"], "de": ["デ"], "do": ["ド"],
    "ba": ["バ"], "bi": ["ビ"], "bu": ["ブ"], "be": ["ベ"], "bo": ["ボ"],
    "pa": ["パ"], "pi": ["ピ"], "pu": ["プ"], "pe": ["ペ"], "po": ["ポ"],
    "kya": ["キ", "ヤ"], "kyu": ["キ", "ユ"], "kyo": ["キ", "ヨ"],
    "sha": ["シ", "ヤ"], "shu": ["シ", "ユ"], "sho": ["シ", "ヨ"],
    "cha": ["チ", "ヤ"], "chu": ["チ", "ユ"], "cho": ["チ", "ヨ"],
    "nya": ["ニ", "ヤ"], "nyu": ["ニ", "ユ"], "nyo": ["ニ", "ヨ"],
    "hya": ["ヒ", "ヤ"], "hyu": ["ヒ", "ユ"], "hyo": ["ヒ", "ヨ"],
    "mya": ["ミ", "ヤ"], "myu": ["ミ", "ユ"], "myo": ["ミ", "ヨ"],
    "rya": ["リ", "ヤ"], "ryu": ["リ", "ユ"], "ryo": ["リ", "ヨ"],
    "gya": ["ギ", "ヤ"], "gyu": ["ギ", "ユ"], "gyo": ["ギ", "ヨ"],
    "ja": ["ジ", "ヤ"], "ju": ["ジ", "ユ"], "jo": ["ジ", "ヨ"],
    "bya": ["ビ", "ヤ"], "byu": ["ビ", "ユ"], "byo": ["ビ", "ヨ"],
    "pya": ["ピ", "ヤ"], "pyu": ["ピ", "ユ"], "pyo": ["ピ", "ヨ"],
    "nn": ["ン"],
    "-": ["ー"]
};

// Генерация удвоенных согласных
(function generateDoubledConsonants() {
    const consonants = ['k','s','t','p','c','j','d','b','g','z','r','m','h','f','w'];
    const newEntries = {};
    for (let key in romajiToKatakana) {
        const firstChar = key[0];
        if (!consonants.includes(firstChar)) continue;
        if (key.length > 1 && key[0] === key[1]) continue;
        if (firstChar === 'n') continue;
        const newKey = firstChar + key;
        if (romajiToKatakana[newKey]) continue;
        const originalValue = romajiToKatakana[key];
        newEntries[newKey] = ['ツ'].concat(originalValue);
    }
    Object.assign(romajiToKatakana, newEntries);
})();

let currentLevel = "n5";
let currentPuzzleIndex = 0;
let gridData = [];
let wordsList = [];
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let cellElements = [];
let gridWidth, gridHeight;
let romajiBuffers = new Map();
let hintUsed = false;

const levelSelect = document.getElementById("levelSelect");
const puzzleSelect = document.getElementById("puzzleSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const themeToggle = document.getElementById("themeToggle");
const resetProgressBtn = document.getElementById("resetProgressBtn");

// ========== КАСТОМНОЕ УВЕДОМЛЕНИЕ ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== КАСТОМНОЕ ПОДТВЕРЖДЕНИЕ ==========
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
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
    confirmModal.style.display = 'none';
}

confirmYes.addEventListener('click', () => closeConfirmDialog(true));
confirmNo.addEventListener('click', () => closeConfirmDialog(false));

// ========== РАБОТА С ХРАНИЛИЩЕМ ==========
const STORAGE_PROGRESS_KEY = "crosswordProgress";
const STORAGE_COMPLETED_KEY = "completedCrosswords";

// Сохранить состояние текущего кроссворда
function saveCurrentProgress() {
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    progress[key] = {
        gridData: gridData.map(row => row.map(cell => cell)), // копия
        hintUsed: hintUsed
    };
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

// Получить все сохранённые прогрессы
function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
}

// Сохранить флаг решённости
function markAsCompleted() {
    const completed = getCompletedCrosswords();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!completed.includes(key)) {
        completed.push(key);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
    }
    updatePuzzleSelect(); // обновить отображение в списке
}

// Получить список решённых
function getCompletedCrosswords() {
    const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return saved ? JSON.parse(saved) : [];
}

// Проверить, решён ли кроссворд
function isCrosswordCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    return completed.includes(`${level}_${puzzleIdx}`);
}

// Полностью сбросить прогресс
async function resetAllProgress() {
    const confirmed = await showConfirmDialog("Вы уверены, что хотите удалить весь сохранённый прогресс? Это действие нельзя отменить.");
    if (confirmed) {
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        localStorage.removeItem(STORAGE_COMPLETED_KEY);
        // Перезагрузить текущий кроссворд (сбросить до исходного состояния)
        loadCrossword(currentLevel, currentPuzzleIndex, false);
        showToast("Весь прогресс удалён.", "success");
    }
}

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}
function toggleTheme() {
    if (document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}
themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ========== НУМЕРАЦИЯ СЛОВ ==========
function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let hasManualNumbers = allWords.some(w => w.number !== undefined && w.number !== null);
    
    if (!hasManualNumbers) {
        let numberMap = new Map();
        let counter = 1;
        let sorted = [...allWords].sort((a,b) => {
            if(a.row === b.row && a.col === b.col) return a.dir === "across" ? -1 : 1;
            if(a.row === b.row) return a.col - b.col;
            return a.row - b.row;
        });
        for(let w of sorted) {
            let key = `${w.row},${w.col}`;
            if(!numberMap.has(key)) {
                numberMap.set(key, counter++);
            }
            w.number = numberMap.get(key);
        }
        allWords.forEach(w => {
            wordsList[w.id].number = w.number;
        });
    } else {
        allWords.forEach(w => {
            if (typeof w.number !== 'number') w.number = 0;
            wordsList[w.id].number = w.number;
        });
    }
    
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

// ========== ЗАГРУЗКА КРОССВОРДА ==========
function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[levelId];
    if (!levelData) return;
    const puzzles = levelData.puzzles;
    if (puzzleIdx < 0 || puzzleIdx >= puzzles.length) return;
    const puzzle = puzzles[puzzleIdx];
    
    gridWidth = puzzle.width;
    gridHeight = puzzle.height;
    wordsList = puzzle.words.map((w, idx) => ({
        ...w,
        id: idx,
        current: Array(w.word.length).fill(""),
        wordOrig: w.word
    }));
    
    let emptyGrid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
    for(let w of wordsList) {
        let cells = [];
        for(let i=0;i<w.word.length;i++){
            let r = w.dir === "across" ? w.row : w.row + i;
            let c = w.dir === "across" ? w.col + i : w.col;
            if(r>=0 && r<gridHeight && c>=0 && c<gridWidth){
                cells.push({row:r, col:c});
                if(emptyGrid[r][c] === null) emptyGrid[r][c] = "";
            }
        }
        w.cells = cells;
    }
    for(let i=0;i<gridHeight;i++){
        for(let j=0;j<gridWidth;j++){
            if(emptyGrid[i][j] === null) emptyGrid[i][j] = null;
        }
    }
    
    // Исходная пустая сетка
    const freshGrid = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    
    // Проверяем сохранённые данные
    let savedData = null;
    if (preserveSaved) {
        const progress = getStoredProgress();
        const key = `${levelId}_${puzzleIdx}`;
        if (progress[key]) {
            savedData = progress[key];
        }
    }
    
    if (savedData) {
        // Восстанавливаем gridData
        gridData = savedData.gridData.map(row => [...row]);
        hintUsed = savedData.hintUsed;
    } else {
        gridData = freshGrid;
        hintUsed = false;
    }
    
    generateNumbering();
    
    // Синхронизируем current для слов на основе gridData
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
    if (cellElements[row][col]) {
        cellElements[row][col].value = getDisplayValue(row, col);
    }
}

function getWordNumberAt(row, col) {
    for (let w of wordsList) {
        if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) {
            return w.number;
        }
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

function clearHighlight(){
    activeWordId = null;
    applyHighlight();
}

function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if (gridData[cell.row][cell.col] === "") return cell;
    }
    return null;
}

// ========== ВСТАВКА СИМВОЛОВ ==========
function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if (startIndex === 0) {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        saveCurrentProgress(); // сохраняем после изменения

        if (katakanaArray.length > 1) {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, 1);
                        return;
                    }
                }
            }
        } else {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    } else {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        saveCurrentProgress();

        if (startIndex + 1 < katakanaArray.length) {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex + 1);
                        return;
                    }
                }
            }
        } else {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    }
}

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    
    for (let w of allWords) {
        if (w.num > currentNumber) {
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if (!wordObj) continue;
            let isComplete = true;
            for (let i = 0; i < wordObj.word.length; i++) {
                if (wordObj.current[i] !== wordObj.wordOrig[i]) {
                    isComplete = false;
                    break;
                }
            }
            if (!isComplete) {
                setActiveWord(wordObj.id);
                return;
            }
        }
    }
    
    for (let w of allWords) {
        const wordObj = wordsList.find(word => word.id === w.wordId);
        if (!wordObj) continue;
        let isComplete = true;
        for (let i = 0; i < wordObj.word.length; i++) {
            if (wordObj.current[i] !== wordObj.wordOrig[i]) {
                isComplete = false;
                break;
            }
        }
        if (!isComplete) {
            setActiveWord(wordObj.id);
            return;
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
            if (remaining.length > 0) {
                if (activeWordId !== null) {
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
            } else {
                if (activeWordId !== null) {
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

function syncWordFromGrid() {
    for (let w of wordsList) {
        for (let i = 0; i < w.cells.length; i++) {
            let cell = w.cells[i];
            let val = gridData[cell.row][cell.col] || "";
            w.current[i] = val;
        }
    }
}

function checkCompletion() {
    let allFilled = true;
    for (let w of wordsList) {
        for (let i = 0; i < w.word.length; i++) {
            if (w.current[i] !== w.wordOrig[i]) {
                allFilled = false;
                break;
            }
        }
    }
    const statusDiv = document.getElementById("statusMsg");
    if (allFilled) {
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉";
        statusDiv.style.color = "#2c6e2c";
        // Если ещё не отмечен как решённый — отмечаем
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted();
        }
    } else {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s, - → ー.";
        statusDiv.style.color = "#666";
        // Если кроссворд был ранее отмечен как решённый, но теперь стал нерешённым (например, стёрли буквы) — убираем из списка решённых
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
        for (let i = 0; i < w.word.length; i++) {
            if (w.current[i] !== w.wordOrig[i]) {
                isComplete = false;
                break;
            }
        }
        const clueLi = document.querySelector(`.clue-list li[data-word-id='${w.id}']`);
        if (clueLi) {
            if (isComplete) clueLi.classList.add("completed");
            else clueLi.classList.remove("completed");
        }
    }
}

function renderClues() {
    const container = document.getElementById("cluesContainer");
    container.innerHTML = `
        <div class="clue-block">
            <h3>По горизонтали</h3>
            <ul class="clue-list" id="acrossList"></ul>
        </div>
        <div class="clue-block">
            <h3>По вертикали</h3>
            <ul class="clue-list" id="downList"></ul>
        </div>
    `;
    const acrossUl = document.getElementById("acrossList");
    const downUl = document.getElementById("downList");
    
    for(let clue of cluesAcross){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            setActiveWord(clue.wordId);
            const word = wordsList.find(w => w.id === clue.wordId);
            if(word && word.cells.length){
                cellElements[word.cells[0].row][word.cells[0].col]?.focus();
            }
        });
        acrossUl.appendChild(li);
    }
    for(let clue of cluesDown){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            setActiveWord(clue.wordId);
            const word = wordsList.find(w => w.id === clue.wordId);
            if(word && word.cells.length){
                cellElements[word.cells[0].row][word.cells[0].col]?.focus();
            }
        });
        downUl.appendChild(li);
    }
    updateClueCompletion();
}

// ========== СБРОС ТЕКУЩЕГО КРОССВОРДА ==========
function resetCrossword() {
    // Удаляем сохранённый прогресс для этого кроссворда
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (progress[key]) {
        delete progress[key];
        localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    }
    
    // Удаляем из списка решённых, если он там был
    const completed = getCompletedCrosswords();
    const completedKey = `${currentLevel}_${currentPuzzleIndex}`;
    const index = completed.indexOf(completedKey);
    if (index !== -1) {
        completed.splice(index, 1);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        updatePuzzleSelect(); // обновить список
    }
    
    // Загружаем кроссворд заново, но без восстановления сохранённого (preserveSaved = false)
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    
    showToast("Кроссворд сброшен. Все ячейки очищены.", "success");
}

function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    puzzleSelect.innerHTML = "";
    puzzles.forEach((puzzle, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        option.textContent = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        if (isCompleted) {
            option.style.fontWeight = "bold";
        }
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

resetBtn.addEventListener("click", () => {
    resetCrossword();
});

resetProgressBtn.addEventListener("click", resetAllProgress);

// ========== ПОДСКАЗКА С КАСТОМНЫМ УВЕДОМЛЕНИЕМ ==========
function giveHint() {
    if (hintUsed) {
        showToast("Подсказка уже использована для этого кроссворда.", "error");
        return;
    }
    
    let emptyCells = [];
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === "") {
                let belongsToIncomplete = false;
                for (let w of wordsList) {
                    const idx = w.cells.findIndex(c => c.row === i && c.col === j);
                    if (idx !== -1) {
                        let wordComplete = true;
                        for (let k = 0; k < w.word.length; k++) {
                            if (w.current[k] !== w.wordOrig[k]) {
                                wordComplete = false;
                                break;
                            }
                        }
                        if (!wordComplete) {
                            belongsToIncomplete = true;
                            break;
                        }
                    }
                }
                if (belongsToIncomplete) {
                    emptyCells.push({row: i, col: j});
                }
            }
        }
    }
    
    if (emptyCells.length === 0) {
        showToast("Нет пустых ячеек для подсказки! (Возможно, всё уже заполнено или остались только ошибки?)", "error");
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    
    let correctChar = null;
    for (let w of wordsList) {
        const idx = w.cells.findIndex(c => c.row === row && c.col === col);
        if (idx !== -1) {
            correctChar = w.wordOrig[idx];
            break;
        }
    }
    if (!correctChar) {
        showToast("Ошибка: не удалось определить правильную букву.", "error");
        return;
    }
    
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

updatePuzzleSelect();
loadCrossword("n5", 0);
