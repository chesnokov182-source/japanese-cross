import { romajiToKatakanaString } from './romaji.js';
import { saveCurrentProgress, clearProgressForPuzzle, isPuzzleUnlocked, markAsCompleted, isCrosswordCompleted, getEarnedPointsForPuzzle, saveEarnedPointsForPuzzle, clearEarnedPointsForPuzzle, getCompletedCrosswords, loadGameStats, saveGameStats, setLastPlayed } from './storage.js';
import { playCorrectInput, playErrorInput, playPop } from './sounds.js';
import { renderGrid, updateCellUI, applyHighlight, clearHighlight, renderClues, updateClueCompletion, showToast, showConfetti, updateScoreUI, setStatusMessage, getCellElements, getGridData, setGridData, setWordsList, setGridDimensions, setActiveWordId, getActiveWordId, updateWrongHighlights, setWrongHighlight } from './ui.js';
import { updateAllBlockedSkins } from './shop.js';

let currentLevel = "n5";
let currentPuzzleIndex = 0;
let gridData = [];
let wordsList = [];
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let gridWidth = 0, gridHeight = 0;
let hintUsed = false;
let hintCount = 0;
let correctCharMap = new Map();

let gameStats = loadGameStats();

// Ссылки на внешние функции
let addPointsCallback, subtractPointsCallback, incrementWordsCompletedCallback, updateButtonStatesCallback;

export function initCrosswordModule(addPointsFn, subtractPointsFn, incWordsFn, updateButtonsFn) {
    addPointsCallback = addPointsFn;
    subtractPointsCallback = subtractPointsFn;
    incrementWordsCompletedCallback = incWordsFn;
    updateButtonStatesCallback = updateButtonsFn;
}

function buildCorrectCharMap() {
    correctCharMap.clear();
    for(let w of wordsList) {
        for(let idx = 0; idx < w.cells.length; idx++) {
            const cell = w.cells[idx];
            const key = `${cell.row},${cell.col}`;
            correctCharMap.set(key, w.wordOrig[idx]);
        }
    }
}

function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let hasManualNumbers = allWords.some(w => w.number !== undefined && w.number !== null);
    if(!hasManualNumbers) {
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
    } else {
        allWords.forEach(w => { if(typeof w.number !== 'number') w.number = 0; wordsList[w.id].number = w.number; });
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

function syncWordFromGrid() {
    for(let w of wordsList) {
        for(let i = 0; i < w.cells.length; i++) {
            let cell = w.cells[i];
            let val = gridData[cell.row][cell.col] || "";
            w.current[i] = val;
        }
    }
}

function checkCompletion() {
    let allFilled = true;
    for(let w of wordsList) {
        for(let i = 0; i < w.word.length; i++) {
            if(w.current[i] !== w.wordOrig[i]) {
                allFilled = false;
                break;
            }
        }
    }
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    if(allFilled && unlocked) {
        setStatusMessage("🎉 Поздравляем! Кроссворд полностью разгадан! 🎉");
        if(!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted(currentLevel, currentPuzzleIndex);
            if(addPointsCallback) addPointsCallback(50);
            showConfetti();
        }
        if(updateButtonStatesCallback) updateButtonStatesCallback();
    } else if(unlocked) {
        setStatusMessage("Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора.");
        if(isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            // снимаем отметку о завершении, если вдруг она есть (пользователь стёр)
            const completed = getCompletedCrosswords();
            const key = `${currentLevel}_${currentPuzzleIndex}`;
            const idx = completed.indexOf(key);
            if(idx !== -1) {
                completed.splice(idx, 1);
                localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
                if(updateButtonStatesCallback) updateButtonStatesCallback();
            }
        }
    }
}

function updateClueCompletionForAll() {
    for(let w of wordsList) {
        let isComplete = true;
        for(let i = 0; i < w.word.length; i++) {
            if(w.current[i] !== w.wordOrig[i]) { isComplete = false; break; }
        }
        updateClueCompletion(w.id, isComplete);
        if(isComplete) {
            // Начисляем очки за слово, если ещё не начисляли
            const earned = getEarnedPointsForPuzzle(currentLevel, currentPuzzleIndex);
            if(!earned.words[w.id]) {
                earned.words[w.id] = true;
                saveEarnedPointsForPuzzle(currentLevel, currentPuzzleIndex, earned);
                if(addPointsCallback) addPointsCallback(10);
                if(incrementWordsCompletedCallback) incrementWordsCompletedCallback();
                playPop();
            }
        }
    }
}

function applyWrongHighlights() {
    for(let i = 0; i < gridHeight; i++) {
        for(let j = 0; j < gridWidth; j++) {
            const value = gridData[i][j];
            const correct = correctCharMap.get(`${i},${j}`);
            const isWrong = (value && value !== correct && correct);
            setWrongHighlight(i, j, isWrong);
        }
    }
}

function onCellFocus(row, col) {
    if(!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return;
    let containingWords = wordsList.filter(w => w.cells.some(c => c.row === row && c.col === col));
    if(containingWords.length === 0) return;
    if(activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord && activeWord.cells.some(c => c.row === row && c.col === col)) return;
    }
    let newWord = null;
    if(activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord) newWord = containingWords.find(w => w.dir === activeWord.dir);
    }
    if(!newWord) newWord = containingWords.find(w => w.dir === "across") || containingWords[0];
    setActiveWord(newWord.id);
}

function onCellBlur(row, col) {
    // Ничего не делаем, ввод уже обработан
}

function onCellInput(row, col) {
    if(!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return;
    const input = getCellElements()[row]?.[col];
    if(!input) return;
    let rawValue = input.value;
    // Преобразуем ромадзи в катакану
    const katakana = romajiToKatakanaString(rawValue);
    if(katakana) {
        // Вводим только первый символ? Нет, мы должны заменить всё содержимое ячейки на катакану,
        // но если katakana длиннее 1 символа, это значит, что пользователь ввёл комбинацию типа "shu" -> シュ (2 символа).
        // В классическом кроссворде одна ячейка = одна катакана. Поэтому мы должны взять только первый символ катаканы,
        // а остальные символы попытаться поместить в следующие ячейки.
        const firstChar = katakana[0];
        const remaining = katakana.slice(1);
        gridData[row][col] = firstChar;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletionForAll();
        applyWrongHighlights();
        saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if(firstChar === correctChar) {
            playCorrectInput();
            // анимация
            const cellDiv = getCellElements()[row]?.[col]?.parentElement;
            if(cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            playErrorInput();
        }
        
        // Если есть остаток, вставляем его в следующие ячейки текущего слова
        if(remaining.length > 0 && activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if(activeWord) {
                let currentIdx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if(currentIdx !== -1) {
                    for(let i = 0; i < remaining.length; i++) {
                        const nextIdx = currentIdx + 1 + i;
                        if(nextIdx < activeWord.cells.length) {
                            const nextCell = activeWord.cells[nextIdx];
                            gridData[nextCell.row][nextCell.col] = remaining[i];
                            updateCellUI(nextCell.row, nextCell.col);
                        } else {
                            break;
                        }
                    }
                    syncWordFromGrid();
                    checkCompletion();
                    updateClueCompletionForAll();
                    applyWrongHighlights();
                    saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
                    // фокус на следующую пустую ячейку
                    const nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if(nextEmpty) {
                        getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                    }
                }
            }
        } else {
            // Переход к следующей пустой ячейке в слове
            if(activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord) {
                    const nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if(nextEmpty) {
                        getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                    }
                }
            }
        }
        // Очищаем поле ввода от лишнего текста (он уже преобразован)
        input.value = gridData[row][col];
    } else {
        // Если не удалось преобразовать, очищаем ячейку
        if(gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
            updateClueCompletionForAll();
            applyWrongHighlights();
            saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
        }
        input.value = "";
    }
}

function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if(currentIndex === -1) return null;
    for(let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if(gridData[cell.row][cell.col] === "") return cell;
    }
    return null;
}

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    for(let w of allWords) {
        if(w.num > currentNumber) {
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if(!wordObj) continue;
            let isComplete = wordObj.current.every((ch, idx) => ch === wordObj.wordOrig[idx]);
            if(!isComplete) {
                setActiveWord(wordObj.id);
                return;
            }
        }
    }
    for(let w of allWords) {
        const wordObj = wordsList.find(word => word.id === w.wordId);
        if(!wordObj) continue;
        let isComplete = wordObj.current.every((ch, idx) => ch === wordObj.wordOrig[idx]);
        if(!isComplete) {
            setActiveWord(wordObj.id);
            return;
        }
    }
}

function setActiveWord(wordId) {
    activeWordId = wordId;
    applyHighlight();
    const word = wordsList.find(w => w.id === activeWordId);
    if(word && word.cells.length) {
        const firstEmpty = word.cells.find(cell => gridData[cell.row][cell.col] === "");
        if(firstEmpty) getCellElements()[firstEmpty.row][firstEmpty.col]?.focus();
        else getCellElements()[word.cells[0].row][word.cells[0].col]?.focus();
    }
}

export function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[levelId];
    if(!levelData) return;
    const puzzles = levelData.puzzles;
    if(puzzleIdx < 0 || puzzleIdx >= puzzles.length) return;
    const puzzle = puzzles[puzzleIdx];
    
    setLastPlayed(levelId, puzzleIdx);
    currentLevel = levelId;
    currentPuzzleIndex = puzzleIdx;
    
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
        for(let i=0; i<w.word.length; i++) {
            let r = w.dir === "across" ? w.row : w.row + i;
            let c = w.dir === "across" ? w.col + i : w.col;
            if(r>=0 && r<gridHeight && c>=0 && c<gridWidth) {
                cells.push({row:r, col:c});
                if(emptyGrid[r][c] === null) emptyGrid[r][c] = "";
            }
        }
        w.cells = cells;
    }
    for(let i=0;i<gridHeight;i++) {
        for(let j=0;j<gridWidth;j++) {
            if(emptyGrid[i][j] === null) emptyGrid[i][j] = null;
        }
    }
    const freshGrid = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    
    let savedData = null;
    if(preserveSaved && isPuzzleUnlocked(levelId, puzzleIdx)) {
        const progress = JSON.parse(localStorage.getItem("crosswordProgress") || "{}");
        const key = `${levelId}_${puzzleIdx}`;
        if(progress[key]) savedData = progress[key];
    }
    
    if(savedData) {
        gridData = savedData.gridData.map(row => [...row]);
        hintUsed = savedData.hintUsed;
        hintCount = savedData.hintCount !== undefined ? savedData.hintCount : 0;
    } else {
        gridData = freshGrid;
        hintUsed = false;
        hintCount = 0;
    }
    
    setGridDimensions(gridWidth, gridHeight);
    setGridData(gridData);
    setWordsList(wordsList);
    generateNumbering();
    syncWordFromGrid();
    buildCorrectCharMap();
    
    const isLocked = !isPuzzleUnlocked(levelId, puzzleIdx);
    renderGrid(isLocked, onCellFocus, onCellInput, onCellBlur);
    renderClues(cluesAcross, cluesDown, (wordId) => setActiveWord(wordId));
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    updateClueCompletionForAll();
    applyWrongHighlights();
    updateAllBlockedSkins();
    
    if(isLocked) {
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        setStatusMessage(`🔒 Кроссворд заблокирован. Цена: ${price} очков. Нажмите «Купить», чтобы разблокировать.`, true);
    }
    if(updateButtonStatesCallback) updateButtonStatesCallback();
}

export function resetCurrentCrossword() {
    // очищаем прогресс и перезагружаем
    clearProgressForPuzzle(currentLevel, currentPuzzleIndex);
    clearEarnedPointsForPuzzle(currentLevel, currentPuzzleIndex);
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    showToast("Кроссворд сброшен", "success");
}

export function giveHint(subtractPointsFn) {
    if(!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован", "error");
        return false;
    }
    if(isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд уже решён", "error");
        return false;
    }
    if(hintCount >= gameStats.maxHints) {
        showToast(`Вы использовали все ${gameStats.maxHints} подсказки`, "error");
        return false;
    }
    // найти пустую ячейку в неполном слове
    let emptyCells = [];
    for(let i=0;i<gridHeight;i++) {
        for(let j=0;j<gridWidth;j++) {
            if(gridData[i][j] === "") {
                let belongsToIncomplete = false;
                for(let w of wordsList) {
                    const idx = w.cells.findIndex(c => c.row === i && c.col === j);
                    if(idx !== -1) {
                        let wordComplete = w.current.every((ch, k) => ch === w.wordOrig[k]);
                        if(!wordComplete) {
                            belongsToIncomplete = true;
                            break;
                        }
                    }
                }
                if(belongsToIncomplete) emptyCells.push({row:i, col:j});
            }
        }
    }
    if(emptyCells.length === 0) {
        showToast("Нет пустых ячеек для подсказки", "error");
        return false;
    }
    if(!subtractPointsFn(20)) return false;
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    let correctChar = correctCharMap.get(`${row},${col}`);
    if(!correctChar) return false;
    gridData[row][col] = correctChar;
    updateCellUI(row, col);
    syncWordFromGrid();
    checkCompletion();
    updateClueCompletionForAll();
    applyWrongHighlights();
    saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
    hintCount++;
    saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
    if(updateButtonStatesCallback) updateButtonStatesCallback();
    showToast(`Подсказка: в ячейке ${row+1},${col+1} → ${correctChar}`, "info");
    return true;
}

export function getCurrentLevel() { return currentLevel; }
export function getCurrentPuzzleIndex() { return currentPuzzleIndex; }
export function setCurrentPuzzleIndex(idx) { currentPuzzleIndex = idx; }
export function getGameStats() { return gameStats; }
export function setGameStats(stats) { gameStats = stats; }
export function getHintCount() { return hintCount; }
export function getMaxHints() { return gameStats.maxHints; }
export function updateHintLimit(newLimit) { gameStats.maxHints = newLimit; saveGameStats(gameStats); }
export function getPuzzlePrice() {
    const levelData = window.crosswordsData[currentLevel];
    if(!levelData) return 0;
    const puzzle = levelData.puzzles[currentPuzzleIndex];
    return puzzle ? (puzzle.price || 0) : 0;
}
