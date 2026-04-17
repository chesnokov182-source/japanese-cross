import { romajiToKatakana } from './constants.js';
import { saveCurrentProgress, clearProgressForPuzzle, isPuzzleUnlocked, markAsCompleted, isCrosswordCompleted, getEarnedPointsForPuzzle, saveEarnedPointsForPuzzle, clearEarnedPointsForPuzzle, getCompletedCrosswords, loadGameStats, saveGameStats, setLastPlayed } from './storage.js';
import { playCorrectInput, playErrorInput, playPop } from './sounds.js';
import { renderGrid, updateCellUI, applyHighlight, clearHighlight, renderClues, updateClueCompletion, showToast, showConfetti, updateScoreUI, setStatusMessage, getCellElements, getGridData, setGridData, setWordsList, setGridDimensions, setActiveWordId, getActiveWordId, updateWrongHighlights, setWrongHighlight, setRomajiBuffers } from './ui.js';
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
let romajiBuffers = new Map();

let gameStats = loadGameStats();

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
            const completed = getCompletedCrosswords();
            const key = `${currentLevel}_${currentPuzzleIndex}`;
            const idx = completed.indexOf(key);
            if(idx !== -1) {
                completed.splice(idx, 1);
                localStorage.setItem("completedCrosswords", JSON.stringify(completed));
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

function getDisplayValue(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key) || "";
    if(buffer !== "") return buffer;
    return gridData[row][col] !== null ? gridData[row][col] : "";
}

function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if(startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if(startIndex === 0) {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletionForAll();
        applyWrongHighlights();
        saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if(char === correctChar) {
            playCorrectInput();
            const cellDiv = getCellElements()[row]?.[col]?.parentElement;
            if(cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            playErrorInput();
        }

        if(katakanaArray.length > 1) {
            if(activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if(idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, 1);
                        return;
                    }
                }
            }
        } else {
            if(activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if(nextEmpty) getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    } else {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletionForAll();
        applyWrongHighlights();
        saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if(char === correctChar) {
            playCorrectInput();
            const cellDiv = getCellElements()[row]?.[col]?.parentElement;
            if(cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            playErrorInput();
        }

        if(startIndex + 1 < katakanaArray.length) {
            if(activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if(idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex + 1);
                        return;
                    }
                }
            }
        } else {
            if(activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if(nextEmpty) getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    }
}

function processBuffer(row, col, buffer) {
    if(buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
        if(activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if(activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if(idx !== -1 && idx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[idx + 1];
                    const nextKey = `${nextCell.row},${nextCell.col}`;
                    romajiBuffers.set(nextKey, buffer[1]);
                    updateCellUI(nextCell.row, nextCell.col);
                    getCellElements()[nextCell.row][nextCell.col]?.focus();
                } else {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if(nextEmpty) {
                        const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                        romajiBuffers.set(nextKey, buffer[1]);
                        updateCellUI(nextEmpty.row, nextEmpty.col);
                        getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                        setTimeout(() => {
                            if(activeWordId !== null) {
                                const newWord = wordsList.find(w => w.id === activeWordId);
                                if(newWord && newWord.cells.length) {
                                    let firstCell = newWord.cells[0];
                                    const firstKey = `${firstCell.row},${firstCell.col}`;
                                    romajiBuffers.set(firstKey, buffer[1]);
                                    updateCellUI(firstCell.row, firstCell.col);
                                    getCellElements()[firstCell.row][firstCell.col]?.focus();
                                }
                            }
                        }, 10);
                    }
                }
            }
        }
        return true;
    }

    if(romajiToKatakana.hasOwnProperty(buffer)) {
        insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
        return true;
    }

    for(let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if(romajiToKatakana.hasOwnProperty(prefix)) {
            const katakanaArray = romajiToKatakana[prefix];
            const remaining = buffer.slice(i);
            insertKatakanaArray(row, col, katakanaArray, 0);
            if(remaining.length > 0) {
                if(activeWordId !== null) {
                    const activeWord = wordsList.find(w => w.id === activeWordId);
                    if(activeWord) {
                        let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                        if(idx !== -1 && idx + 1 < activeWord.cells.length) {
                            let nextCell = activeWord.cells[idx + 1];
                            const nextKey = `${nextCell.row},${nextCell.col}`;
                            romajiBuffers.set(nextKey, remaining);
                            updateCellUI(nextCell.row, nextCell.col);
                            getCellElements()[nextCell.row][nextCell.col]?.focus();
                        } else {
                            let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                            if(nextEmpty) {
                                const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                                romajiBuffers.set(nextKey, remaining);
                                updateCellUI(nextEmpty.row, nextEmpty.col);
                                getCellElements()[nextEmpty.row][nextEmpty.col]?.focus();
                            } else {
                                focusNextWord(activeWord.number);
                                setTimeout(() => {
                                    if(activeWordId !== null) {
                                        const newWord = wordsList.find(w => w.id === activeWordId);
                                        if(newWord && newWord.cells.length) {
                                            let firstCell = newWord.cells[0];
                                            const firstKey = `${firstCell.row},${firstCell.col}`;
                                            romajiBuffers.set(firstKey, remaining);
                                            updateCellUI(firstCell.row, firstCell.col);
                                            getCellElements()[firstCell.row][firstCell.col]?.focus();
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

function handleKeydown(e, row, col) {
    if(gridData[row][col] === null) return;
    const allowedChars = /^[a-zA-Z-]$/;
    if(e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !allowedChars.test(e.key)) {
        e.preventDefault();
        return;
    }
    if(e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) e.preventDefault();

    if(e.key === "Backspace") {
        const key = `${row},${col}`;
        let buffer = romajiBuffers.get(key) || "";
        if(buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            romajiBuffers.set(key, buffer);
            updateCellUI(row, col);
        } else {
            if(gridData[row][col] !== "") {
                gridData[row][col] = "";
                updateCellUI(row, col);
                syncWordFromGrid();
                checkCompletion();
                updateClueCompletionForAll();
                applyWrongHighlights();
                saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
            } else {
                if(activeWordId !== null) {
                    const activeWord = wordsList.find(w => w.id === activeWordId);
                    if(activeWord) {
                        let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                        if(idx > 0) {
                            let prev = activeWord.cells[idx - 1];
                            getCellElements()[prev.row][prev.col]?.focus();
                        }
                    }
                }
            }
        }
        return;
    }

    if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        let newRow = row, newCol = col;
        if(e.key === "ArrowLeft") newCol--;
        if(e.key === "ArrowRight") newCol++;
        if(e.key === "ArrowUp") newRow--;
        if(e.key === "ArrowDown") newRow++;
        if(newRow >= 0 && newRow < gridHeight && newCol >= 0 && newCol < gridWidth && gridData[newRow][newCol] !== null) {
            getCellElements()[newRow][newCol]?.focus();
        }
        return;
    }

    if(e.key.length === 1 && allowedChars.test(e.key)) {
        const key = `${row},${col}`;
        let buffer = (romajiBuffers.get(key) || "") + e.key.toLowerCase();
        romajiBuffers.set(key, buffer);
        updateCellUI(row, col);

        if(buffer.length === 1 && gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
            updateClueCompletionForAll();
            applyWrongHighlights();
            saveCurrentProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
        }

        const processed = processBuffer(row, col, buffer);
        if(processed) {
            romajiBuffers.set(key, "");
            updateCellUI(row, col);
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
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key);
    if(buffer === "n") {
        insertKatakanaArray(row, col, ["ン"], 0);
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    } else if(buffer) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}

function onCellInput(row, col) {
    const key = `${row},${col}`;
    if(romajiBuffers.has(key)) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
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
        romajiBuffers.clear();
    }
    
    setGridDimensions(gridWidth, gridHeight);
    setGridData(gridData);
    setWordsList(wordsList);
    generateNumbering();
    syncWordFromGrid();
    buildCorrectCharMap();
    
    const isLocked = !isPuzzleUnlocked(levelId, puzzleIdx);
    
    // Передаём буфер ромадзи в UI
    setRomajiBuffers(romajiBuffers);
    
    renderGrid(isLocked, onCellFocus, onCellInput, onCellBlur, handleKeydown);
    renderClues(cluesAcross, cluesDown, (wordId) => setActiveWord(wordId));
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    updateClueCompletionForAll();
    applyWrongHighlights();
    updateAllBlockedSkins();
    
    // Устанавливаем активное слово по умолчанию (первое)
    if(wordsList.length > 0 && !activeWordId) {
        setActiveWord(wordsList[0].id);
    }
    
    if(isLocked) {
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        setStatusMessage(`🔒 Кроссворд заблокирован. Цена: ${price} очков. Нажмите «Купить», чтобы разблокировать.`, true);
    }
    if(updateButtonStatesCallback) updateButtonStatesCallback();
}

export function resetCurrentCrossword() {
    clearProgressForPuzzle(currentLevel, currentPuzzleIndex);
    clearEarnedPointsForPuzzle(currentLevel, currentPuzzleIndex);
    romajiBuffers.clear();
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
    showToast(`Подсказка: ${correctChar}`, "info");
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
