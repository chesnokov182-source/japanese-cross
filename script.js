// Глобальное состояние
let currentLevel = "n5";
let currentPuzzleIndex = 0;
let gridData = [];        // 2D массив символов (null для блоков)
let wordsList = [];       // список слов с доп. инфой
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let cellElements = [];
let gridWidth, gridHeight;

// Буферы для ввода ромадзи (ключ: `${row},${col}`)
let romajiBuffers = new Map();

// DOM элементы
const levelSelect = document.getElementById("levelSelect");
const puzzleSelect = document.getElementById("puzzleSelect");
const resetBtn = document.getElementById("resetBtn");

// ========== Вспомогательные функции ==========
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
        if(!numberMap.has(key)) {
            numberMap.set(key, counter++);
        }
        w.number = numberMap.get(key);
    }
    allWords.forEach(w => {
        wordsList[w.id].number = w.number;
    });
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

function loadCrossword(levelId, puzzleIdx) {
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
    
    // Построение сетки
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
    gridData = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    generateNumbering();
    renderGrid();
    renderClues();
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    romajiBuffers.clear();
}

function renderGrid() {
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    container.style.gridTemplateColumns = `repeat(${gridWidth}, minmax(50px, 1fr))`;
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
                spanNum.innerText = wordNumber;
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

function getWordNumberAt(row, col){
    for(let w of wordsList){
        if(w.cells.some(cell => cell.row === row && cell.col === col)){
            if(w.cells[0].row === row && w.cells[0].col === col) return w.number;
            break;
        }
    }
    return null;
}

function onCellFocus(row, col){
    let containingWords = wordsList.filter(w => w.cells.some(c => c.row === row && c.col === col));
    if (containingWords.length === 0) return;
    
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord && activeWord.cells.some(c => c.row === row && c.col === col)) {
            return;
        }
    }
    
    let newWord = null;
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) {
            newWord = containingWords.find(w => w.dir === activeWord.dir);
        }
    }
    if (!newWord) {
        newWord = containingWords.find(w => w.dir === "across") || containingWords[0];
    }
    setActiveWord(newWord.id);
}

function onCellBlur(row, col) {
    const key = `${row},${col}`;
    if (romajiBuffers.has(key) && romajiBuffers.get(key) !== "") {
        romajiBuffers.set(key, "");
        updateCellUI(row, col);
    }
}

function setActiveWord(wordId){
    activeWordId = wordId;
    applyHighlight();
    const word = wordsList.find(w => w.id === activeWordId);
    if (word && word.cells.length) {
        const firstEmpty = word.cells.find(cell => gridData[cell.row][cell.col] === "");
        if (firstEmpty) {
            cellElements[firstEmpty.row][firstEmpty.col]?.focus();
        } else {
            cellElements[word.cells[0].row][word.cells[0].col]?.focus();
        }
    }
}

function applyHighlight(){
    for(let i=0;i<gridHeight;i++){
        for(let j=0;j<gridWidth;j++){
            const cellDiv = cellElements[i][j]?.parentElement;
            if(cellDiv){
                cellDiv.classList.remove("highlight", "active-word");
            }
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

// Возвращает следующую пустую ячейку в слове после указанной (row,col)
function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if (gridData[cell.row][cell.col] === "") {
            return cell;
        }
    }
    return null;
}

// Вставляет массив символов, начиная с (row,col), последовательно по ячейкам слова
function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if (startIndex === 0) {
        // Первый символ – вставляем в текущую ячейку
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();

        if (katakanaArray.length > 1) {
            // Есть остаток – рекурсивно вставляем в следующую ячейку
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
            // Если следующей ячейки нет, остаток просто теряется (но в корректном кроссворде такого не будет)
        } else {
            // Вставлен один символ – переходим к следующей пустой ячейке этого слова
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) {
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        // Слово полностью заполнено – переходим к следующему слову
                        focusNextWord(activeWord.number);
                    }
                }
            }
        }
    } else {
        // Вставка в последующие ячейки (при рекурсии)
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();

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
            // После вставки последнего символа переходим к следующей пустой ячейке
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) {
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                    }
                }
            }
        }
    }
}

// Фокус на следующее слово по номеру (первая пустая ячейка)
function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    let currentIndex = allWords.findIndex(w => w.num === currentNumber);
    if (currentIndex !== -1 && currentIndex + 1 < allWords.length) {
        let nextWord = allWords[currentIndex + 1];
        setActiveWord(nextWord.wordId);
        // setActiveWord уже поставит фокус на первую пустую ячейку
    }
}

// Обработка ввода с помощью wanakana
function handleKeydown(e, row, col) {
    if (gridData[row][col] === null) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
    }

    // Backspace
    if (e.key === "Backspace") {
        const key = `${row},${col}`;
        let buffer = romajiBuffers.get(key) || "";
        if (buffer.length > 0) {
            // Удаляем последний символ из буфера
            buffer = buffer.slice(0, -1);
            romajiBuffers.set(key, buffer);
            updateCellUI(row, col);
        } else {
            // Буфер пуст – удаляем символ из ячейки, если есть
            if (gridData[row][col] !== "") {
                gridData[row][col] = "";
                updateCellUI(row, col);
                syncWordFromGrid();
                checkCompletion();
            } else {
                // Переход на предыдущую ячейку в активном слове
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

    // Стрелки
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

    // Латинские буквы
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const key = `${row},${col}`;
        let buffer = (romajiBuffers.get(key) || "") + e.key.toLowerCase();
        romajiBuffers.set(key, buffer);
        updateCellUI(row, col);

        // Если в ячейке уже была катакана, стираем её при начале ввода
        if (buffer.length === 1 && gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
        }

        // Преобразуем весь буфер в катакану с помощью wanakana
        let katakana = wanakana.toKatakana(buffer);
        if (DEBUG) console.log(`Buffer: "${buffer}" -> Katakana: "${katakana}"`);

        if (katakana.length === 0) {
            // Ни одного символа – ждём дальнейшего ввода
            return;
        }

        // Разбиваем katakana на символы (каждый символ – это одна мора)
        let chars = [...katakana];
        let firstChar = chars[0];
        let remainingChars = chars.slice(1);

        // Вставляем первый символ в текущую ячейку
        gridData[row][col] = firstChar;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();

        // Очищаем буфер текущей ячейки
        romajiBuffers.set(key, "");

        // Если есть остаток, переносим его в следующую ячейку (рекурсивно)
        if (remainingChars.length > 0) {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        // Вставляем остаток в следующую ячейку, передавая массив символов
                        insertKatakanaArray(nextCell.row, nextCell.col, remainingChars, 0);
                        return;
                    }
                }
            }
            // Если нет следующей ячейки, остаток просто теряется (в корректном кроссворде такого не должно быть)
        } else {
            // Переходим к следующей пустой ячейке этого слова
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) {
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        // Слово полностью заполнено – переходим к следующему слову
                        focusNextWord(activeWord.number);
                    }
                }
            }
        }
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
    } else {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ュ, a → ア, n+s → ン+s.";
        statusDiv.style.color = "#666";
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
        li.innerHTML = `<span class="clue-num">${clue.num}.</span><span class="clue-text">${clue.clue}</span>`;
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
        li.innerHTML = `<span class="clue-num">${clue.num}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            setActiveWord(clue.wordId);
            const word = wordsList.find(w => w.id === clue.wordId);
            if(word && word.cells.length){
                cellElements[word.cells[0].row][word.cells[0].col]?.focus();
            }
        });
        downUl.appendChild(li);
    }
}

function resetCrossword(){
    loadCrossword(currentLevel, currentPuzzleIndex);
}

function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    puzzleSelect.innerHTML = "";
    puzzles.forEach((puzzle, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = puzzle.name || `Кроссворд ${idx + 1}`;
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

updatePuzzleSelect();
loadCrossword("n5", 0);
