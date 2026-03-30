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
let correctCharMap = new Map();

const levelSelect = document.getElementById("levelSelect");
const puzzleSelect = document.getElementById("puzzleSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const themeToggle = document.getElementById("themeToggle");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const helpBtn = document.getElementById("helpBtn");
const buyPuzzleBtn = document.getElementById("buyPuzzleBtn");

// Модальное окно покупки
const buyModal = document.getElementById("buyModal");
const buyModalMessage = document.getElementById("buyModalMessage");
const buyModalConfirm = document.getElementById("buyModalConfirm");
const buyModalCancel = document.getElementById("buyModalCancel");
let pendingPurchase = null;

function showBuyModal(level, puzzleIdx, price) {
    return new Promise((resolve) => {
        pendingPurchase = { level, puzzleIdx, price, resolve };
        buyModalMessage.innerText = `Купить кроссворд "${window.crosswordsData[level].puzzles[puzzleIdx].name}" за ${price} очков?`;
        buyModal.style.display = 'flex';
    });
}

function closeBuyModal() {
    buyModal.style.display = 'none';
    if (pendingPurchase) {
        pendingPurchase.resolve(false);
        pendingPurchase = null;
    }
}

buyModalConfirm.addEventListener('click', () => {
    if (pendingPurchase) {
        pendingPurchase.resolve(true);
        closeBuyModal();
    }
});
buyModalCancel.addEventListener('click', () => closeBuyModal());

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

// ========== ГЕЙМИФИКАЦИЯ ==========
const STORAGE_GAME_KEY = "gameStats";
let gameStats = {
    score: 0,
    wordsCompleted: 0,
    achievements: []
};

function loadGameStats() {
    const saved = localStorage.getItem(STORAGE_GAME_KEY);
    if (saved) {
        gameStats = JSON.parse(saved);
    } else {
        gameStats = { score: 0, wordsCompleted: 0, achievements: [] };
        saveGameStats();
    }
    updateScoreUI();
}

function saveGameStats() {
    localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(gameStats));
}

function updateScoreUI() {
    const scoreSpan = document.getElementById("scoreValue");
    const wordsSpan = document.getElementById("wordsCompleted");
    if (scoreSpan) scoreSpan.innerText = gameStats.score;
    if (wordsSpan) wordsSpan.innerText = gameStats.wordsCompleted;
}

function addPoints(points) {
    gameStats.score += points;
    saveGameStats();
    updateScoreUI();
    showToast(`+${points} очков!`, "success");
}

function subtractPoints(points) {
    gameStats.score = Math.max(0, gameStats.score - points);
    saveGameStats();
    updateScoreUI();
    showToast(`-${points} очков`, "info");
}

function incrementWordsCompleted() {
    gameStats.wordsCompleted++;
    saveGameStats();
    updateScoreUI();
    checkAchievements();
}

function decrementWordsCompleted() {
    gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - 1);
    saveGameStats();
    updateScoreUI();
}

const achievementsList = [
    { id: "first_word", name: "Первое слово", condition: () => gameStats.wordsCompleted >= 1, reward: 20 },
    { id: "first_crossword", name: "Первый решённый кроссворд", condition: () => getCompletedCrosswords().length >= 1, reward: 50 },
    { id: "n5_master", name: "Мастер N5", condition: () => {
        const total = window.crosswordsData.n5.puzzles.length;
        const completed = getCompletedCrosswords().filter(k => k.startsWith("n5_")).length;
        return completed === total && total > 0;
    }, reward: 100 },
    { id: "n4_master", name: "Мастер N4", condition: () => {
        const total = window.crosswordsData.n4.puzzles.length;
        const completed = getCompletedCrosswords().filter(k => k.startsWith("n4_")).length;
        return completed === total && total > 0;
    }, reward: 100 },
    { id: "n3_master", name: "Мастер N3", condition: () => {
        const total = window.crosswordsData.n3.puzzles.length;
        const completed = getCompletedCrosswords().filter(k => k.startsWith("n3_")).length;
        return completed === total && total > 0;
    }, reward: 100 },
    { id: "n2_master", name: "Мастер N2", condition: () => {
        const total = window.crosswordsData.n2.puzzles.length;
        const completed = getCompletedCrosswords().filter(k => k.startsWith("n2_")).length;
        return completed === total && total > 0;
    }, reward: 100 },
    { id: "n1_master", name: "Мастер N1", condition: () => {
        const total = window.crosswordsData.n1.puzzles.length;
        const completed = getCompletedCrosswords().filter(k => k.startsWith("n1_")).length;
        return completed === total && total > 0;
    }, reward: 100 },
    { id: "words_10", name: "10 слов", condition: () => gameStats.wordsCompleted >= 10, reward: 30 },
    { id: "words_50", name: "50 слов", condition: () => gameStats.wordsCompleted >= 50, reward: 100 },
    { id: "words_100", name: "100 слов", condition: () => gameStats.wordsCompleted >= 100, reward: 200 }
];

function checkAchievements() {
    let newAchievements = [];
    for (let ach of achievementsList) {
        if (!gameStats.achievements.includes(ach.id) && ach.condition()) {
            gameStats.achievements.push(ach.id);
            newAchievements.push(ach);
            addPoints(ach.reward);
            showToast(`🏆 Достижение: ${ach.name}! +${ach.reward} очков`, "success");
        }
    }
    if (newAchievements.length > 0) {
        saveGameStats();
    }
}

// ========== ПРОГРЕСС-БАР ==========
function updateLevelProgress() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const total = puzzles.length;
    const completedKeys = getCompletedCrosswords();
    let completedCount = 0;
    for (let i = 0; i < total; i++) {
        if (completedKeys.includes(`${currentLevel}_${i}`)) completedCount++;
    }
    const textSpan = document.getElementById("levelProgressText");
    const fillDiv = document.getElementById("levelProgressFill");
    if (textSpan) textSpan.innerText = `${completedCount}/${total}`;
    const percent = total === 0 ? 0 : (completedCount / total) * 100;
    if (fillDiv) fillDiv.style.width = `${percent}%`;
}

// ========== ПОДСВЕТКА ОШИБОК ==========
function updateWrongHighlights() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if (!cellDiv) continue;
            const value = gridData[i][j];
            const correct = correctCharMap.get(`${i},${j}`);
            if (value && value !== correct && correct) {
                cellDiv.classList.add("wrong");
            } else {
                cellDiv.classList.remove("wrong");
            }
        }
    }
}

function buildCorrectCharMap() {
    correctCharMap.clear();
    for (let w of wordsList) {
        for (let idx = 0; idx < w.cells.length; idx++) {
            const cell = w.cells[idx];
            const key = `${cell.row},${cell.col}`;
            correctCharMap.set(key, w.wordOrig[idx]);
        }
    }
}

// ========== РАБОТА С ХРАНИЛИЩЕМ ==========
const STORAGE_PROGRESS_KEY = "crosswordProgress";
const STORAGE_COMPLETED_KEY = "completedCrosswords";
const STORAGE_UNLOCKED_KEY = "unlockedCrosswords";
const STORAGE_EARNED_KEY = "earnedPoints";

function saveCurrentProgress() {
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    progress[key] = {
        gridData: gridData.map(row => row.map(cell => cell)),
        hintUsed: hintUsed
    };
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
}

function getUnlockedCrosswords() {
    const saved = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    return saved ? JSON.parse(saved) : {};
}

function saveUnlockedCrosswords(unlocked) {
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(unlocked));
}

function isPuzzleUnlocked(level, puzzleIdx) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (puzzleIdx === 0 && !unlocked[key]) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        return true;
    }
    return unlocked[key] === true;
}

function unlockPuzzle(level, puzzleIdx, price) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (unlocked[key]) return true;
    if (gameStats.score >= price) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        subtractPoints(price);
        showToast(`Кроссворд разблокирован! -${price} очков`, "success");
        updatePuzzleSelect();
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price} очков.`, "error");
        return false;
    }
}

function getEarnedPointsForCurrent() {
    const earned = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earned ? JSON.parse(earned) : {};
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!data[key]) data[key] = { words: {}, completed: false };
    return data[key];
}

function saveEarnedPointsForCurrent(earned) {
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earnedAll ? JSON.parse(earnedAll) : {};
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    data[key] = earned;
    localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
}

function markWordPointsEarned(wordId) {
    const earned = getEarnedPointsForCurrent();
    if (!earned.words[wordId]) {
        earned.words[wordId] = true;
        saveEarnedPointsForCurrent(earned);
        addPoints(10);
        incrementWordsCompleted();
    }
}

function markCrosswordCompletedEarned() {
    const earned = getEarnedPointsForCurrent();
    if (!earned.completed) {
        earned.completed = true;
        saveEarnedPointsForCurrent(earned);
        addPoints(50);
    }
}

function revertPointsForCurrentPuzzle() {
    const earned = getEarnedPointsForCurrent();
    let pointsToSubtract = 0;
    let wordsToSubtract = 0;
    for (let wordId in earned.words) {
        if (earned.words[wordId]) {
            pointsToSubtract += 10;
            wordsToSubtract++;
        }
    }
    if (earned.completed) {
        pointsToSubtract += 50;
    }
    if (pointsToSubtract > 0) {
        gameStats.score = Math.max(0, gameStats.score - pointsToSubtract);
        gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - wordsToSubtract);
        saveGameStats();
        updateScoreUI();
        showToast(`Сброшено ${pointsToSubtract} очков и ${wordsToSubtract} слов`, "info");
    }
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    if (earnedAll) {
        const data = JSON.parse(earnedAll);
        delete data[`${currentLevel}_${currentPuzzleIndex}`];
        localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
    }
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
        updateLevelProgress();
        checkAchievements();
        markCrosswordCompletedEarned();
        showToast(`Кроссворд решён! +50 очков`, "success");
    }
}

function isCrosswordCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    return completed.includes(`${level}_${puzzleIdx}`);
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
    
    if (!isPuzzleUnlocked(levelId, puzzleIdx)) {
        // Не загружаем заблокированный, просто показываем сообщение в статусе
        document.getElementById("statusMsg").innerHTML = `Этот кроссворд заблокирован. Цена: ${puzzle.price || 0} очков. Нажмите "Купить" для разблокировки.`;
        // Очищаем сетку, чтобы не было старого содержимого
        const container = document.getElementById("gridContainer");
        container.innerHTML = "";
        document.getElementById("cluesContainer").innerHTML = "";
        return;
    }
    
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
    
    const freshGrid = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    
    let savedData = null;
    if (preserveSaved) {
        const progress = getStoredProgress();
        const key = `${levelId}_${puzzleIdx}`;
        if (progress[key]) {
            savedData = progress[key];
        }
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
    buildCorrectCharMap();
    renderGrid();
    renderClues();
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    romajiBuffers.clear();
    
    hintBtn.disabled = hintUsed;
    hintBtn.textContent = hintUsed ? "Подсказка использована" : "Подсказка (1 раз)";
    
    updateLevelProgress();
    updatePuzzleSelect();
    // Убираем сообщение о блокировке, если оно было
    document.getElementById("statusMsg").innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z).";
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
    updateWrongHighlights();
}

function getDisplayValue(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key) || "";
    if (buffer !== "") return buffer;
    return gridData[row][col] !== null ? gridData[row][col] : "";
}

function updateCellUI(row, col) {
    if (cellElements[row] && cellElements[row][col]) {
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
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if(cellDiv) cellDiv.classList.remove("highlight", "active-word", "wrong");
        }
    }
    if(activeWordId !== null){
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord){
            for(let cell of activeWord.cells){
                const cellDiv = cellElements[cell.row]?.[cell.col]?.parentElement;
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
        updateWrongHighlights();
        saveCurrentProgress();

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
        updateWrongHighlights();
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
                updateWrongHighlights();
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
            updateWrongHighlights();
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
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted();
        }
    } else {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s, - → ー.";
        statusDiv.style.color = "#666";
        if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            const completed = getCompletedCrosswords();
            const key = `${currentLevel}_${currentPuzzleIndex}`;
            const index = completed.indexOf(key);
            if (index !== -1) {
                completed.splice(index, 1);
                localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
                updatePuzzleSelect();
                updateLevelProgress();
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
        if (isComplete) {
            markWordPointsEarned(w.id);
        }
    }
}

function renderClues() {
    const container = document.getElementById("cluesContainer");
    if (!container) return;
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
    revertPointsForCurrentPuzzle();
    
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (progress[key]) {
        delete progress[key];
        localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    }
    
    const completed = getCompletedCrosswords();
    const completedKey = `${currentLevel}_${currentPuzzleIndex}`;
    const index = completed.indexOf(completedKey);
    if (index !== -1) {
        completed.splice(index, 1);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        updatePuzzleSelect();
        updateLevelProgress();
    }
    
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    showToast("Кроссворд сброшен. Все ячейки очищены.", "success");
}

function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    puzzleSelect.innerHTML = "";
    for (let idx = 0; idx < puzzles.length; idx++) {
        const puzzle = puzzles[idx];
        const isUnlocked = isPuzzleUnlocked(currentLevel, idx);
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        let text = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        if (!isUnlocked) {
            text += ` (🔒 ${price} очков)`;
        }
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = text;
        if (isCompleted) {
            option.style.fontWeight = "bold";
        }
        if (!isUnlocked) {
            option.style.color = "#999";
        }
        puzzleSelect.appendChild(option);
    }
    puzzleSelect.value = currentPuzzleIndex;
    
    const currentPuzzle = puzzles[currentPuzzleIndex];
    const currentUnlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const currentPrice = currentPuzzle.price !== undefined ? currentPuzzle.price : 0;
    if (!currentUnlocked && currentPrice > 0) {
        buyPuzzleBtn.style.display = "inline-block";
        buyPuzzleBtn.textContent = `💰 Купить (${currentPrice} очков)`;
    } else {
        buyPuzzleBtn.style.display = "none";
    }
}

async function buyCurrentPuzzle() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const puzzle = puzzles[currentPuzzleIndex];
    const price = puzzle.price !== undefined ? puzzle.price : 0;
    if (price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        const confirmed = await showBuyModal(currentLevel, currentPuzzleIndex, price);
        if (confirmed) {
            if (unlockPuzzle(currentLevel, currentPuzzleIndex, price)) {
                loadCrossword(currentLevel, currentPuzzleIndex, true);
                updatePuzzleSelect();
            }
        }
    } else {
        showToast("Этот кроссворд уже разблокирован!", "info");
    }
}

levelSelect.addEventListener("change", (e) => {
    currentLevel = e.target.value;
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    let firstUnlocked = 0;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(currentLevel, i)) {
            firstUnlocked = i;
            break;
        }
    }
    currentPuzzleIndex = firstUnlocked;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
});

puzzleSelect.addEventListener("change", (e) => {
    const newIndex = parseInt(e.target.value, 10);
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const isUnlocked = isPuzzleUnlocked(currentLevel, newIndex);
    currentPuzzleIndex = newIndex;
    updatePuzzleSelect(); // обновляем кнопку покупки
    if (isUnlocked) {
        loadCrossword(currentLevel, currentPuzzleIndex);
    } else {
        // Показываем сообщение о блокировке
        const puzzle = puzzles[newIndex];
        document.getElementById("statusMsg").innerHTML = `Этот кроссворд заблокирован. Цена: ${puzzle.price || 0} очков. Нажмите "Купить" для разблокировки.`;
        // Очищаем сетку и подсказки
        const container = document.getElementById("gridContainer");
        container.innerHTML = "";
        document.getElementById("cluesContainer").innerHTML = "";
    }
});

resetBtn.addEventListener("click", () => {
    resetCrossword();
});

resetProgressBtn.addEventListener("click", async () => {
    const confirmed = await showConfirmDialog("Вы уверены, что хотите удалить весь сохранённый прогресс? Это действие нельзя отменить.");
    if (confirmed) {
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        localStorage.removeItem(STORAGE_COMPLETED_KEY);
        localStorage.removeItem(STORAGE_UNLOCKED_KEY);
        localStorage.removeItem(STORAGE_EARNED_KEY);
        localStorage.removeItem(STORAGE_GAME_KEY);
        loadGameStats();
        currentPuzzleIndex = 0;
        updatePuzzleSelect();
        loadCrossword(currentLevel, 0, false);
        showToast("Весь прогресс удалён.", "success");
    }
});

buyPuzzleBtn.addEventListener("click", buyCurrentPuzzle);

// ========== ПОДСКАЗКА ==========
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
    
    let correctChar = correctCharMap.get(`${row},${col}`);
    if (!correctChar) {
        showToast("Ошибка: не удалось определить правильную букву.", "error");
        return;
    }
    
    gridData[row][col] = correctChar;
    updateCellUI(row, col);
    syncWordFromGrid();
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    saveCurrentProgress();
    
    hintUsed = true;
    hintBtn.disabled = true;
    hintBtn.textContent = "Подсказка использована";
    saveCurrentProgress();
}

hintBtn.addEventListener("click", giveHint);

// ========== ТУТОРИАЛ ==========
function showTutorial() {
    const tutorialModal = document.getElementById("tutorialModal");
    const tutorialMessage = document.getElementById("tutorialMessage");
    const tutorialNext = document.getElementById("tutorialNext");
    const tutorialClose = document.getElementById("tutorialClose");
    let step = 0;
    const steps = [
        "Добро пожаловать в японские кроссворды JLPT! 🎌\n\nВ этом туториале вы узнаете основы работы.",
        "📝 Вводите слова английскими буквами (ромадзи).\nПример: 'su' → ス, 'shu' → シ+ユ, 'n' → ン.\nДефис '-' даёт длинную гласную ー.",
        "🔍 Используйте подсказку один раз на кроссворд. Кнопка 'Сбросить кроссворд' очистит все ячейки.",
        "🎯 За правильно угаданное слово даётся 10 очков, за полный кроссворд – 50 очков. Есть достижения!",
        "💰 Очки можно тратить на разблокировку новых кроссвордов. Некоторые кроссворды требуют определённое количество очков.",
        "🌓 Кнопка темы переключает светлую/тёмную тему. Прогресс сохраняется автоматически.\n\nПриятной игры!"
    ];
    
    function updateTutorial() {
        tutorialMessage.innerText = steps[step];
        if (step === steps.length - 1) {
            tutorialNext.innerText = "Завершить";
        } else {
            tutorialNext.innerText = "Далее";
        }
    }
    
    function nextStep() {
        step++;
        if (step < steps.length) {
            updateTutorial();
        } else {
            closeTutorial();
        }
    }
    
    function closeTutorial() {
        tutorialModal.style.display = "none";
        tutorialNext.removeEventListener("click", nextStep);
        tutorialClose.removeEventListener("click", closeTutorial);
        localStorage.setItem("tutorialShown", "true");
    }
    
    tutorialNext.addEventListener("click", nextStep);
    tutorialClose.addEventListener("click", closeTutorial);
    
    step = 0;
    updateTutorial();
    tutorialModal.style.display = "flex";
}

if (!localStorage.getItem("tutorialShown")) {
    window.addEventListener("load", () => {
        setTimeout(showTutorial, 500);
    });
}

helpBtn.addEventListener("click", showTutorial);

// Инициализация
loadGameStats();
updatePuzzleSelect();
loadCrossword("n5", 0);
