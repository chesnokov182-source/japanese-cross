// БИБЛИОТЕКА КРОССВОРДОВ ПО УРОВНЯМ JLPT
const crosswords = {
    n5: {
        name: "JLPT N5",
        width: 7,
        height: 7,
        words: [
            { word: "サクラ", row: 0, col: 2, dir: "across", clue: "Весенний цветок, символ Японии" },
            { word: "スシ", row: 2, col: 1, dir: "across", clue: "Блюдо из риса с рыбой" },
            { word: "ニホン", row: 4, col: 0, dir: "across", clue: "Страна восходящего солнца" },
            { word: "サケ", row: 1, col: 3, dir: "down", clue: "Лосось (рыба)" },
            { word: "カワ", row: 0, col: 4, dir: "down", clue: "Река" },
            { word: "ヤマ", row: 2, col: 5, dir: "down", clue: "Гора" }
        ]
    },
    n4: {
        name: "JLPT N4",
        width: 8,
        height: 8,
        words: [
            { word: "デンシャ", row: 0, col: 1, dir: "across", clue: "Электричка, поезд" },
            { word: "ヨミカタ", row: 3, col: 0, dir: "across", clue: "Способ чтения (как читается)" },
            { word: "ハナシ", row: 5, col: 2, dir: "across", clue: "Разговор, история" },
            { word: "テンプラ", row: 1, col: 4, dir: "down", clue: "Блюдо во фритюре" },
            { word: "マチ", row: 2, col: 6, dir: "down", clue: "Город" },
            { word: "アメ", row: 4, col: 1, dir: "down", clue: "Дождь / конфета" }
        ]
    },
    n3: {
        name: "JLPT N3",
        width: 9,
        height: 9,
        words: [
            { word: "ケイザイ", row: 0, col: 2, dir: "across", clue: "Экономика" },
            { word: "セイジ", row: 2, col: 1, dir: "across", clue: "Политика" },
            { word: "ブンカ", row: 4, col: 0, dir: "across", clue: "Культура" },
            { word: "レキシ", row: 6, col: 3, dir: "across", clue: "История" },
            { word: "ガクシュウ", row: 1, col: 5, dir: "down", clue: "Обучение" },
            { word: "ケンキュウ", row: 3, col: 7, dir: "down", clue: "Исследование" }
        ]
    },
    n2: {
        name: "JLPT N2",
        width: 10,
        height: 10,
        words: [
            { word: "チョウサ", row: 0, col: 3, dir: "across", clue: "Расследование, исследование" },
            { word: "ハッテン", row: 2, col: 1, dir: "across", clue: "Развитие" },
            { word: "カンリョウ", row: 4, col: 2, dir: "across", clue: "Чиновник, бюрократ" },
            { word: "コクサイ", row: 6, col: 0, dir: "across", clue: "Международный" },
            { word: "ジョウホウ", row: 1, col: 5, dir: "down", clue: "Информация" },
            { word: "イノベーション", row: 3, col: 7, dir: "down", clue: "Инновация" }
        ]
    },
    n1: {
        name: "JLPT N1",
        width: 12,
        height: 12,
        words: [
            { word: "ジッソウ", row: 0, col: 2, dir: "across", clue: "Внедрение, реализация" },
            { word: "ソウゴウテキ", row: 2, col: 1, dir: "across", clue: "Комплексный, всесторонний" },
            { word: "ケイショウ", row: 4, col: 4, dir: "across", clue: "Наследование" },
            { word: "ホショウ", row: 6, col: 0, dir: "across", clue: "Гарантия" },
            { word: "チイキ", row: 1, col: 8, dir: "down", clue: "Регион, район" },
            { word: "サクセイ", row: 3, col: 5, dir: "down", clue: "Составление (документа)" }
        ]
    }
};

// Глобальное состояние
let currentLevel = "n5";
let gridData = [];        // 2D массив символов (null для блоков)
let wordsList = [];       // список слов с доп. инфой
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let cellElements = [];
let gridWidth, gridHeight;

// Вспомогательные функции
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

function buildGridFromWords(words, width, height) {
    let grid = Array(height).fill().map(() => Array(width).fill(null));
    for(let w of words) {
        let cells = [];
        if(w.dir === "across") {
            for(let i = 0; i < w.word.length; i++) {
                let r = w.row;
                let c = w.col + i;
                if(c < width && r < height) cells.push({ row: r, col: c });
            }
        } else {
            for(let i = 0; i < w.word.length; i++) {
                let r = w.row + i;
                let c = w.col;
                if(r < height && c < width) cells.push({ row: r, col: c });
            }
        }
        w.cells = cells;
        for(let cell of cells) {
            if(grid[cell.row][cell.col] === null) grid[cell.row][cell.col] = "";
        }
    }
    for(let i=0;i<height;i++){
        for(let j=0;j<width;j++){
            if(grid[i][j] === null) grid[i][j] = null;
        }
    }
    return grid;
}

function loadCrossword(levelId) {
    const data = crosswords[levelId];
    if(!data) return;
    gridWidth = data.width;
    gridHeight = data.height;
    wordsList = data.words.map((w, idx) => ({
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
    gridData = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    generateNumbering();
    renderGrid();
    renderClues();
    clearHighlight();
    activeWordId = null;
    checkCompletion();
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
            input.value = gridData[i][j] !== null ? gridData[i][j] : "";
            input.disabled = isBlocked;
            if(!isBlocked){
                input.addEventListener("keydown", (e) => handleKeydown(e, i, j));
                input.addEventListener("focus", () => onCellFocus(i,j));
            }
            cellDiv.appendChild(input);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    applyHighlight();
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
    let acrossWord = wordsList.find(w => w.dir === "across" && w.cells.some(c => c.row === row && c.col === col));
    let downWord = wordsList.find(w => w.dir === "down" && w.cells.some(c => c.row === row && c.col === col));
    if(acrossWord) setActiveWord(acrossWord.id);
    else if(downWord) setActiveWord(downWord.id);
}

function setActiveWord(wordId){
    activeWordId = wordId;
    applyHighlight();
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

function handleKeydown(e, row, col){
    if(gridData[row][col] === null) return;
    if(e.key === "Backspace"){
        e.preventDefault();
        if(gridData[row][col] !== ""){
            gridData[row][col] = "";
            updateCellUI(row,col);
            syncWordFromGrid();
            checkCompletion();
        } else {
            if(activeWordId !== null){
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord){
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if(idx > 0){
                        let prev = activeWord.cells[idx-1];
                        cellElements[prev.row][prev.col]?.focus();
                    }
                }
            }
        }
        return;
    }
    if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown"){
        let newRow = row, newCol = col;
        if(e.key === "ArrowLeft") newCol--;
        if(e.key === "ArrowRight") newCol++;
        if(e.key === "ArrowUp") newRow--;
        if(e.key === "ArrowDown") newRow++;
        if(newRow>=0 && newRow<gridHeight && newCol>=0 && newCol<gridWidth && gridData[newRow][newCol] !== null){
            cellElements[newRow][newCol]?.focus();
        }
        e.preventDefault();
        return;
    }
    if(e.key.length === 1 && /[a-zA-Z]/.test(e.key)){
        e.preventDefault();
        let romaji = e.key;
        let katakana = wanakana.toKatakana(romaji);
        if(katakana.length > 0){
            let newChar = katakana[0];
            gridData[row][col] = newChar;
            updateCellUI(row,col);
            syncWordFromGrid();
            checkCompletion();
            if(activeWordId !== null){
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if(activeWord){
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if(idx !== -1 && idx+1 < activeWord.cells.length){
                        let nextCell = activeWord.cells[idx+1];
                        cellElements[nextCell.row][nextCell.col]?.focus();
                    }
                }
            }
        }
    }
}

function updateCellUI(row,col){
    if(cellElements[row][col]){
        cellElements[row][col].value = gridData[row][col] || "";
    }
}

function syncWordFromGrid(){
    for(let w of wordsList){
        for(let i=0;i<w.cells.length;i++){
            let cell = w.cells[i];
            let val = gridData[cell.row][cell.col] || "";
            w.current[i] = val;
        }
    }
}

function checkCompletion(){
    let allFilled = true;
    for(let w of wordsList){
        for(let i=0;i<w.word.length;i++){
            if(w.current[i] !== w.wordOrig[i]){
                allFilled = false;
                break;
            }
        }
    }
    const statusDiv = document.getElementById("statusMsg");
    if(allFilled){
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉";
        statusDiv.style.color = "#2c6e2c";
    } else {
        statusDiv.innerHTML = "Заполняйте ячейки. Для ввода используйте английские буквы (a-z).";
        statusDiv.style.color = "#666";
    }
}

function renderClues(){
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
    loadCrossword(currentLevel);
}

// Инициализация
document.getElementById("levelSelect").addEventListener("change", (e) => {
    currentLevel = e.target.value;
    loadCrossword(currentLevel);
});
document.getElementById("resetBtn").addEventListener("click", () => {
    resetCrossword();
});

loadCrossword("n5");