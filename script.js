// ========== ОТЛАДКА (можно включить для проверки) ==========
const DEBUG = false;

// Таблица соответствия ромадзи → массив катаканы (все символы полноразмерные)
const romajiToKatakana = {
    // Гласные
    "a": ["ア"], "i": ["イ"], "u": ["ウ"], "e": ["エ"], "o": ["オ"],
    // К-ряд
    "ka": ["カ"], "ki": ["キ"], "ku": ["ク"], "ke": ["ケ"], "ko": ["コ"],
    // С-ряд
    "sa": ["サ"], "shi": ["シ"], "su": ["ス"], "se": ["セ"], "so": ["ソ"],
    // Т-ряд
    "ta": ["タ"], "chi": ["チ"], "tsu": ["ツ"], "te": ["テ"], "to": ["ト"],
    // Н-ряд
    "na": ["ナ"], "ni": ["ニ"], "nu": ["ヌ"], "ne": ["ネ"], "no": ["ノ"],
    // Х-ряд
    "ha": ["ハ"], "hi": ["ヒ"], "fu": ["フ"], "he": ["ヘ"], "ho": ["ホ"],
    // М-ряд
    "ma": ["マ"], "mi": ["ミ"], "mu": ["ム"], "me": ["メ"], "mo": ["モ"],
    // Я-ряд
    "ya": ["ヤ"], "yu": ["ユ"], "yo": ["ヨ"],
    // Р-ряд
    "ra": ["ラ"], "ri": ["リ"], "ru": ["ル"], "re": ["レ"], "ro": ["ロ"],
    // В-ряд
    "wa": ["ワ"], "wo": ["ヲ"],
    // Носовой n (одиночный n не будет вставлен сразу, ждёт; используйте nn для ン)
    "n": ["ン"],
    // Дакутэн
    "ga": ["ガ"], "gi": ["ギ"], "gu": ["グ"], "ge": ["ゲ"], "go": ["ゴ"],
    "za": ["ザ"], "ji": ["ジ"], "zu": ["ズ"], "ze": ["ゼ"], "zo": ["ゾ"],
    "da": ["ダ"], "di": ["ヂ"], "du": ["ヅ"], "de": ["デ"], "do": ["ド"],
    "ba": ["バ"], "bi": ["ビ"], "bu": ["ブ"], "be": ["ベ"], "bo": ["ボ"],
    "pa": ["パ"], "pi": ["ピ"], "pu": ["プ"], "pe": ["ペ"], "po": ["ポ"],
    // Комбинированные (полноразмерные вторые символы)
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
    // Длинное n
    "nn": ["ン"]
};

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

function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if (startIndex === 0) {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();

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
                    if (nextEmpty) {
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                    }
                }
            }
        }
    } else {
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

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    let currentIndex = allWords.findIndex(w => w.num === currentNumber);
    if (currentIndex !== -1 && currentIndex + 1 < allWords.length) {
        let nextWord = allWords[currentIndex + 1];
        setActiveWord(nextWord.wordId);
    }
}

function isPrefixOfLongerKey(str) {
    let keys = Object.keys(romajiToKatakana);
    for (let key of keys) {
        if (key !== str && key.startsWith(str)) {
            return true;
        }
    }
    return false;
}

function processBuffer(row, col, buffer) {
    // 1. Точное совпадение
    if (romajiToKatakana.hasOwnProperty(buffer)) {
        // Если это префикс более длинного ключа и длина > 2, ждём
        // Но для двухбуквенных и одиночных вставляем сразу
        const isShort = buffer.length <= 2;
        if (!isPrefixOfLongerKey(buffer) || isShort) {
            if (DEBUG) console.log(`Вставляем "${buffer}" -> ${romajiToKatakana[buffer].join('')}`);
            insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
            return true;
        } else {
            if (DEBUG) console.log(`Ждём, "${buffer}" — префикс`);
            return false;
        }
    }
    
    // 2. Является префиксом – ждём
    if (isPrefixOfLongerKey(buffer)) {
        return false;
    }
    
    // 3. Ищем самый длинный ключ, который является началом буфера
    for (let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if (romajiToKatakana.hasOwnProperty(prefix)) {
            const katakanaArray = romajiToKatakana[prefix];
            const remaining = buffer.slice(i);
            if (DEBUG) console.log(`Частичная вставка "${prefix}" -> ${katakanaArray.join('')}, остаток "${remaining}"`);
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
                            if (DEBUG) console.log(`Перенос остатка "${remaining}" в ячейку (${nextCell.row},${nextCell.col})`);
                            cellElements[nextCell.row][nextCell.col]?.focus();
                        }
                    }
                }
            }
            return true;
        }
    }
    
    if (DEBUG) console.log(`Неверная комбинация "${buffer}", сброс`);
    return false;
}

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
            buffer = buffer.slice(0, -1);
            romajiBuffers.set(key, buffer);
            updateCellUI(row, col);
        } else {
            if (gridData[row][col] !== "") {
                gridData[row][col] = "";
                updateCellUI(row, col);
                syncWordFromGrid();
                checkCompletion();
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

        // Если ячейка уже содержала катакану, стираем её при начале ввода
        if (buffer.length === 1 && gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
        }

        const processed = processBuffer(row, col, buffer);
        if (processed) {
            romajiBuffers.set(key, "");
        } else {
            // Принудительная вставка, если буфер является ключом и не префикс
            if (romajiToKatakana.hasOwnProperty(buffer) && !isPrefixOfLongerKey(buffer)) {
                insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
                romajiBuffers.set(key, "");
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
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s.";
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
