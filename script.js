// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ОБЩИЕ) ==========
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
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return;
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
    if (buffer) {
        if (!processBuffer(row, col, buffer)) {
            romajiBuffers.delete(key);
            updateCellUI(row, col);
        }
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
            if(cellDiv) cellDiv.classList.remove("highlight", "active-word");
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
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if (char === correctChar) {
            playCorrectInput();
            const cellDiv = cellElements[row]?.[col]?.parentElement;
            if (cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            playErrorInput();
        }

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
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if (char === correctChar) {
            playCorrectInput();
            const cellDiv = cellElements[row]?.[col]?.parentElement;
            if (cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            playErrorInput();
        }

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

function processBuffer(row, col, buffer) {
    if (buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
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
                moveRemainingToNextCell(row, col, remaining);
            }
            return true;
        }
    }
    return false;
}

function moveRemainingToNextCell(row, col, remaining) {
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
                if (processBuffer(nextCell.row, nextCell.col, remaining)) {
                    romajiBuffers.delete(nextKey);
                    updateCellUI(nextCell.row, nextCell.col);
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
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    if (allFilled && unlocked) {
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉";
        statusDiv.style.color = "#2c6e2c";
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted();
        }
        updateButtonStates();
    } else if (unlocked) {
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
                updateButtonStates();
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
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if(word && word.cells.length){
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        acrossUl.appendChild(li);
    }
    for(let clue of cluesDown){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if(word && word.cells.length){
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        downUl.appendChild(li);
    }
    updateClueCompletion();
}

async function resetCrossword() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован. Сброс невозможен.", "error");
        return;
    }
    const confirmed = await showConfirmDialog("Вы уверены, что хотите сбросить этот кроссворд? Все ячейки будут очищены, а очки за слова и подсказки будут возвращены.");
    if (!confirmed) return;
    
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    let savedHintCount = 0;
    if (progress[key] && progress[key].hintCount !== undefined) {
        savedHintCount = progress[key].hintCount;
    }
    if (savedHintCount > 0) {
        const refund = savedHintCount * 20;
        gameStats.score += refund;
        saveGameStats();
        updateScoreUI();
        showToast(`Возвращено ${refund} очков за подсказки`, "info");
    }
    revertPointsForCurrentPuzzle();
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
        buyPuzzleBtn.disabled = false;
        buyPuzzleBtn.textContent = `💰 Купить (${currentPrice} очков)`;
        buyPuzzleBtn.style.opacity = "1";
    } else {
        buyPuzzleBtn.disabled = true;
        buyPuzzleBtn.textContent = currentUnlocked ? "✅ Разблокирован" : `💰 Купить (0 очков)`;
        buyPuzzleBtn.style.opacity = "0.6";
    }
}

function buyCurrentPuzzle() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const puzzle = puzzles[currentPuzzleIndex];
    const price = puzzle.price !== undefined ? puzzle.price : 0;
    if (price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        const modal = document.getElementById("buyModal");
        const message = document.getElementById("buyModalMessage");
        message.innerText = `Купить "${puzzle.name}" за ${price} очков?`;
        modal.style.display = "flex";
        
        const confirmBtn = document.getElementById("buyModalConfirm");
        const cancelBtn = document.getElementById("buyModalCancel");
        
        const handleConfirm = () => {
            if (unlockPuzzle(currentLevel, currentPuzzleIndex, price)) {
                loadCrossword(currentLevel, currentPuzzleIndex, true);
                updatePuzzleSelect();
                updateButtonStates();
            }
            modal.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };
        const handleCancel = () => {
            modal.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };
        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);
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
    currentPuzzleIndex = newIndex;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
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
        const lastBonus = gameStats.lastBonusDate;
        localStorage.removeItem(STORAGE_GAME_KEY);
        gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: lastBonus, maxHints: 2 };
        saveGameStats();
        updateScoreUI();
        currentPuzzleIndex = 0;
        updatePuzzleSelect();
        loadCrossword(currentLevel, 0, false);
        showToast("Весь прогресс удалён (кроме ежедневного бонуса).", "success");
    }
});

buyPuzzleBtn.addEventListener("click", buyCurrentPuzzle);

themeToggle.addEventListener('click', () => {
    playClick();
    toggleTheme();
});

resetBtn.addEventListener('click', () => {
    playClick();
    resetCrossword();
});

hintBtn.addEventListener('click', () => {
    playClick();
});

shopBtn.addEventListener('click', () => {
    playClick();
    openShopModal();
});

buyPuzzleBtn.addEventListener('click', () => {
    playClick();
    buyCurrentPuzzle();
});

helpBtn.addEventListener('click', () => {
    playClick();
    showTutorial();
});

levelSelect.addEventListener('change', () => playClick());
puzzleSelect.addEventListener('change', () => playClick());

// ========== МАГАЗИН ==========
let currentShopTab = localStorage.getItem('shopActiveTab') || 'skins';

function openShopModal() {
    const modal = document.getElementById("shopModal");
    const modalContent = modal.querySelector('.modal-content');
    
    const oldTitle = modalContent.querySelector('h3');
    if (oldTitle) oldTitle.remove();
    
    let tabsContainer = modalContent.querySelector('.shop-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'shop-tabs';
        modalContent.insertBefore(tabsContainer, modalContent.firstChild);
    }
    tabsContainer.innerHTML = `
        <button class="shop-tab" data-tab="skins">🎨 Скины</button>
        <button class="shop-tab" data-tab="upgrades">⚡ Улучшения</button>
        <button class="shop-tab" data-tab="roulette">🎲 Рулетка</button>
    `;
    
    let skinsSection = modalContent.querySelector('.shop-section.skins');
    let upgradesSection = modalContent.querySelector('.shop-section.upgrades');
    let rouletteSection = modalContent.querySelector('.shop-section.roulette');
    if (!skinsSection) {
        skinsSection = document.createElement('div');
        skinsSection.className = 'shop-section skins';
        modalContent.appendChild(skinsSection);
        upgradesSection = document.createElement('div');
        upgradesSection.className = 'shop-section upgrades';
        modalContent.appendChild(upgradesSection);
        rouletteSection = document.createElement('div');
        rouletteSection.className = 'shop-section roulette';
        modalContent.appendChild(rouletteSection);
    }
    
    skinsSection.innerHTML = '';
    for (let skin of availableSkins) {
        const purchased = isSkinPurchased(skin.id);
        const selected = (selectedSkinId === skin.id);
        const skinDiv = document.createElement("div");
        skinDiv.className = "skin-item";
        skinDiv.innerHTML = `
            <div class="skin-info">
                <div class="skin-emoji">${skin.emoji || "🖼️"}</div>
                <div class="skin-details">
                    <div class="skin-name">${skin.name}</div>
                    <div class="skin-price">${skin.price > 0 ? `${skin.price} очков` : "бесплатно"}</div>
                </div>
            </div>
            <div>
                ${!purchased ? `<button class="skin-btn buy" data-id="${skin.id}" data-price="${skin.price}">Купить</button>` :
                  (selected ? `<button class="skin-btn selected" disabled>Выбран</button>` :
                   `<button class="skin-btn select" data-id="${skin.id}">Выбрать</button>`)}
            </div>
        `;
        skinsSection.appendChild(skinDiv);
    }
    
    upgradesSection.innerHTML = `
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 3</div>
                <div class="upgrade-desc">Максимум 3 подсказки на кроссворд</div>
                <div class="upgrade-price">500 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 3 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : '<button class="upgrade-btn buy" data-upgrade="3" data-price="500">Купить</button>'}
            </div>
        </div>
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 4</div>
                <div class="upgrade-desc">Максимум 4 подсказки на кроссворд</div>
                <div class="upgrade-price">750 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 4 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : (gameStats.maxHints >= 3 ? '<button class="upgrade-btn buy" data-upgrade="4" data-price="750">Купить</button>' : '<button class="upgrade-btn disabled" disabled>Сначала купите лимит 3</button>')}
            </div>
        </div>
    `;
    
    rouletteSection.innerHTML = `
        <div class="roulette-container">
            <div class="roulette-spin-area">
                <span id="rouletteDisplay">🎰</span>
            </div>
            <button id="rouletteSpinBtn" class="roulette-spin-btn">Крутить (20 очков)</button>
            <div id="rouletteResult" class="roulette-result"></div>
            <div class="roulette-info">
                Шансы выигрыша:<br>
                0 очков – 25%<br>
                10 очков – 20%<br>
                20 очков – 20%<br>
                50 очков – 15%<br>
                100 очков – 10%<br>
                200 очков – 10%
            </div>
        </div>
    `;
    const spinBtn = document.getElementById('rouletteSpinBtn');
    if (spinBtn) spinBtn.addEventListener('click', spinRoulette);
    
    skinsSection.querySelectorAll('.skin-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            if (purchaseSkin(id, price)) {
                openShopModal();
            }
        });
    });
    skinsSection.querySelectorAll('.skin-btn.select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            selectSkin(id);
            openShopModal();
        });
    });
    
    upgradesSection.querySelectorAll('.upgrade-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newLimit = parseInt(btn.dataset.upgrade);
            const price = parseInt(btn.dataset.price);
            if (upgradeMaxHints(newLimit, price)) {
                openShopModal();
                updateButtonStates();
            }
        });
    });
    
    const tabs = tabsContainer.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentShopTab = tab.dataset.tab;
            localStorage.setItem('shopActiveTab', currentShopTab);
            skinsSection.classList.toggle('active', currentShopTab === 'skins');
            upgradesSection.classList.toggle('active', currentShopTab === 'upgrades');
            rouletteSection.classList.toggle('active', currentShopTab === 'roulette');
        });
    });
    
    const activeTab = currentShopTab;
    tabs.forEach(tab => {
        if (tab.dataset.tab === activeTab) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    skinsSection.classList.toggle('active', activeTab === 'skins');
    upgradesSection.classList.toggle('active', activeTab === 'upgrades');
    rouletteSection.classList.toggle('active', activeTab === 'roulette');
    
    modal.style.display = "flex";
}

document.getElementById("closeShopBtn").addEventListener("click", () => {
    document.getElementById("shopModal").style.display = "none";
});
shopBtn.addEventListener("click", openShopModal);

// ========== ПОДСКАЗКА ==========
function giveHint() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован. Подсказки недоступны.", "error");
        return;
    }
    if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд уже решён! Подсказки не нужны.", "error");
        return;
    }
    if (hintCount >= gameStats.maxHints) {
        showToast(`Вы уже использовали все ${gameStats.maxHints} подсказки для этого кроссворда.`, "error");
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
    if (!subtractPoints(20)) {
        return;
    }
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    let correctChar = correctCharMap.get(`${row},${col}`);
    if (!correctChar) {
        showToast("Ошибка: не удалось определить правильную букву.", "error");
        addPoints(20);
        return;
    }
    gridData[row][col] = correctChar;
    updateCellUI(row, col);
    syncWordFromGrid();
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    saveCurrentProgress();
    hintCount++;
    saveCurrentProgress();
    updateButtonStates();
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
        "🎯 За правильно угаданное слово даётся 10 очков, за полный кроссворд – 50 очков.",
        "💰 Очки можно тратить на разблокировку новых кроссвордов, на подсказки (20 очков за подсказку, лимит можно увеличить в магазине), на скины и в рулетке.",
        "🎁 Каждый день вы получаете 50 бонусных очков за вход.",
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
checkDailyBonus();
loadSkinsData();
updatePuzzleSelect();

let startLevel = localStorage.getItem('lastPlayedLevel') || "n5";
let startPuzzle = parseInt(localStorage.getItem('lastPlayedPuzzle')) || 0;

if (!isPuzzleUnlocked(startLevel, startPuzzle)) {
    const puzzles = window.crosswordsData[startLevel].puzzles;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(startLevel, i)) {
            startPuzzle = i;
            break;
        }
    }
    if (!isPuzzleUnlocked(startLevel, startPuzzle) && startLevel !== "n5") {
        startLevel = "n5";
        startPuzzle = 0;
    }
}

levelSelect.value = startLevel;
currentLevel = startLevel;
currentPuzzleIndex = startPuzzle;

loadCrossword(startLevel, startPuzzle);
