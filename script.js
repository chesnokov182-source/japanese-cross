// ... (романтика в начале без изменений, до объявления переменных)
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

// Модальное окно покупки
const buyModal = document.getElementById("buyModal");
const buyMessage = document.getElementById("buyMessage");
const buyConfirm = document.getElementById("buyConfirm");
const buyCancel = document.getElementById("buyCancel");

let pendingPurchase = null; // { level, puzzleIndex, price }

function showBuyModal(level, puzzleIndex, price, puzzleName) {
    pendingPurchase = { level, puzzleIndex, price };
    buyMessage.innerText = `Кроссворд "${puzzleName}" заблокирован. Стоимость: ${price} очков. Купить?`;
    buyModal.style.display = 'flex';
}

function closeBuyModal() {
    buyModal.style.display = 'none';
    pendingPurchase = null;
}

buyConfirm.addEventListener('click', () => {
    if (pendingPurchase) {
        const { level, puzzleIndex, price } = pendingPurchase;
        if (unlockPuzzle(level, puzzleIndex, price)) {
            closeBuyModal();
            // Если это текущий выбранный кроссворд, загружаем его
            if (level === currentLevel && puzzleIndex === currentPuzzleIndex) {
                loadCrossword(level, puzzleIndex, true);
            } else {
                // Если покупаем другой, обновляем выбор и загружаем
                currentLevel = level;
                currentPuzzleIndex = puzzleIndex;
                updatePuzzleSelect();
                loadCrossword(level, puzzleIndex, true);
            }
        } else {
            // Недостаточно очков – остаёмся в модалке, но сообщение уже показано в unlockPuzzle
            closeBuyModal(); // или не закрываем? лучше закрыть, сообщение уже было
        }
    }
});

buyCancel.addEventListener('click', () => {
    closeBuyModal();
    // Возвращаемся к предыдущему выбранному разблокированному кроссворду
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    let firstUnlocked = 0;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(currentLevel, i)) {
            firstUnlocked = i;
            break;
        }
    }
    if (firstUnlocked !== currentPuzzleIndex) {
        currentPuzzleIndex = firstUnlocked;
        updatePuzzleSelect();
        loadCrossword(currentLevel, currentPuzzleIndex, true);
    } else {
        // Просто перезагружаем текущий (разблокированный)
        loadCrossword(currentLevel, currentPuzzleIndex, true);
    }
});

// ... (остальной код до функции loadCrossword без изменений)

// ЗАГРУЗКА КРОССВОРДА (изменённая часть)
function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[levelId];
    if (!levelData) return;
    const puzzles = levelData.puzzles;
    if (puzzleIdx < 0 || puzzleIdx >= puzzles.length) return;
    const puzzle = puzzles[puzzleIdx];
    
    if (!isPuzzleUnlocked(levelId, puzzleIdx)) {
        // Вместо заглушки показываем модальное окно покупки
        showBuyModal(levelId, puzzleIdx, puzzle.price || 0, puzzle.name || `Кроссворд ${puzzleIdx+1}`);
        // Возвращаемся к предыдущему разблокированному
        const unlockedIdx = getFirstUnlockedIndex(levelId);
        if (unlockedIdx !== puzzleIdx) {
            currentPuzzleIndex = unlockedIdx;
            updatePuzzleSelect();
            loadCrossword(levelId, unlockedIdx, preserveSaved);
        }
        return;
    }
    
    // ... остальная загрузка без изменений
}

function getFirstUnlockedIndex(levelId) {
    const puzzles = window.crosswordsData[levelId].puzzles;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(levelId, i)) return i;
    }
    return 0;
}

// ... (весь остальной код без изменений)
