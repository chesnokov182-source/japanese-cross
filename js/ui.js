import { playClick } from './sounds.js';
import { getSelectedSkinEmoji, updateAllBlockedSkins } from './shop.js';

let cellElements = [];
let gridWidth, gridHeight, gridData, wordsList, activeWordId;
let onCellFocusCallback, onCellInputCallback, onCellBlurCallback, onCellKeydownCallback;
// Глобальная ссылка на буфер ромадзи (устанавливается из crossword.js)
let romajiBuffersGlobal = null;

export function setRomajiBuffers(buffers) {
    romajiBuffersGlobal = buffers;
}

export function setGridDimensions(width, height) {
    gridWidth = width;
    gridHeight = height;
}

export function setGridData(data) {
    gridData = data;
}

export function setWordsList(list) {
    wordsList = list;
}

export function setActiveWordId(id) {
    activeWordId = id;
}

export function getActiveWordId() {
    return activeWordId;
}

export function getCellElements() {
    return cellElements;
}

export function getGridData() {
    return gridData;
}

function getWordNumberAt(row, col) {
    if (!wordsList) return null;
    for (let w of wordsList) {
        if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) {
            return w.number;
        }
    }
    return null;
}

function getDisplayValue(row, col) {
    if (!romajiBuffersGlobal) return (gridData[row]?.[col] !== null ? gridData[row][col] : "");
    const key = `${row},${col}`;
    const buffer = romajiBuffersGlobal.get(key) || "";
    if (buffer !== "") return buffer;
    return gridData[row]?.[col] !== null ? gridData[row][col] : "";
}

export function updateCellUI(row, col) {
    if (cellElements[row] && cellElements[row][col]) {
        cellElements[row][col].value = getDisplayValue(row, col);
    }
}

export function applyHighlight() {
    for(let i = 0; i < gridHeight; i++) {
        for(let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if(cellDiv) cellDiv.classList.remove("highlight", "active-word");
        }
    }
    if(activeWordId !== null && wordsList) {
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord) {
            for(let cell of activeWord.cells) {
                const cellDiv = cellElements[cell.row]?.[cell.col]?.parentElement;
                if(cellDiv) cellDiv.classList.add("active-word");
            }
        }
    }
    document.querySelectorAll(".clue-list li").forEach(li => li.classList.remove("active-clue"));
    if(activeWordId !== null) {
        const target = document.querySelector(`.clue-list li[data-word-id='${activeWordId}']`);
        if(target) target.classList.add("active-clue");
    }
}

export function updateWrongHighlights() {
    // Эта функция вызывается, но реальная подсветка ошибок делается через setWrongHighlight
    // Оставляем пустой или можно перебрать все ячейки
    for(let i = 0; i < gridHeight; i++) {
        for(let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if(cellDiv) cellDiv.classList.remove("wrong");
        }
    }
}

export function setWrongHighlight(row, col, isWrong) {
    const cellDiv = cellElements[row]?.[col]?.parentElement;
    if(cellDiv) {
        if(isWrong) cellDiv.classList.add("wrong");
        else cellDiv.classList.remove("wrong");
    }
}

export function clearHighlight() {
    activeWordId = null;
    applyHighlight();
}

export function renderGrid(isLocked, onFocus, onInput, onBlur, onKeydown) {
    onCellFocusCallback = onFocus;
    onCellInputCallback = onInput;
    onCellBlurCallback = onBlur;
    onCellKeydownCallback = onKeydown;
    
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    container.style.gridTemplateColumns = `repeat(${gridWidth}, minmax(min(70px,13vw), 1fr))`;
    cellElements = [];
    
    for(let i = 0; i < gridHeight; i++) {
        cellElements[i] = [];
        for(let j = 0; j < gridWidth; j++) {
            const isBlocked = (gridData[i][j] === null);
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            if(isBlocked) cellDiv.classList.add("blocked");
            
            const wordNumber = getWordNumberAt(i, j);
            if(wordNumber && !isBlocked) {
                const spanNum = document.createElement("span");
                spanNum.className = "cell-number";
                spanNum.innerText = Math.floor(wordNumber);
                cellDiv.appendChild(spanNum);
            }
            
            const skinSpan = document.createElement("span");
            skinSpan.className = "cell-skin";
            skinSpan.style.display = "none";
            cellDiv.appendChild(skinSpan);
            
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.value = getDisplayValue(i, j);
            input.disabled = isBlocked || isLocked;
            if(!isBlocked && !isLocked) {
                input.addEventListener("focus", () => onCellFocusCallback(i, j));
                input.addEventListener("blur", () => onCellBlurCallback(i, j));
                input.addEventListener("input", () => onCellInputCallback(i, j));
                input.addEventListener("keydown", (e) => onCellKeydownCallback(e, i, j));
                input.setAttribute("inputmode", "latin");
                input.setAttribute("autocomplete", "off");
                input.setAttribute("autocapitalize", "none");
            }
            cellDiv.appendChild(input);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    applyHighlight();
    updateWrongHighlights();
    if (typeof updateAllBlockedSkins === 'function') updateAllBlockedSkins();
}

export function renderClues(cluesAcross, cluesDown, onClueClick) {
    const container = document.getElementById("cluesContainer");
    if(!container) return;
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
    
    for(let clue of cluesAcross) {
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", (e) => {
            playClick();
            onClueClick(clue.wordId);
        });
        acrossUl.appendChild(li);
    }
    for(let clue of cluesDown) {
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", (e) => {
            playClick();
            onClueClick(clue.wordId);
        });
        downUl.appendChild(li);
    }
}

export function updateClueCompletion(wordId, isComplete) {
    const clueLi = document.querySelector(`.clue-list li[data-word-id='${wordId}']`);
    if(clueLi) {
        if(isComplete) clueLi.classList.add("completed");
        else clueLi.classList.remove("completed");
    }
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

export function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    for(let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            speedY: Math.random() * 8 + 5,
            speedX: (Math.random() - 0.5) * 3,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        });
    }
    let animationId = null;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;
        for(let p of particles) {
            p.y += p.speedY;
            p.x += p.speedX;
            if(p.y < canvas.height + p.size) allDone = false;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if(!allDone) {
            animationId = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationId);
            document.body.removeChild(canvas);
        }
    }
    animate();
    setTimeout(() => {
        if(animationId) cancelAnimationFrame(animationId);
        if(canvas.parentNode) document.body.removeChild(canvas);
    }, 2000);
}

export function updateScoreUI(score, wordsCompleted) {
    const scoreSpan = document.getElementById("scoreValue");
    const wordsSpan = document.getElementById("wordsCompleted");
    if(scoreSpan) scoreSpan.innerText = score;
    if(wordsSpan) wordsSpan.innerText = wordsCompleted;
}

export function updateLevelProgress(level, completedCount, total) {
    const textSpan = document.getElementById("levelProgressText");
    const fillDiv = document.getElementById("levelProgressFill");
    if(textSpan) textSpan.innerText = `${completedCount}/${total}`;
    const percent = total === 0 ? 0 : (completedCount / total) * 100;
    if(fillDiv) fillDiv.style.width = `${percent}%`;
}

export function setStatusMessage(message, isError = false) {
    const statusDiv = document.getElementById("statusMsg");
    if(statusDiv) {
        statusDiv.innerHTML = message;
        statusDiv.style.color = isError ? "#c94f4f" : "#2c6e2c";
    }
}

export function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        const msgEl = document.getElementById("confirmMessage");
        const yesBtn = document.getElementById("confirmYes");
        const noBtn = document.getElementById("confirmNo");
        msgEl.textContent = message;
        modal.style.display = "flex";
        const onYes = () => {
            modal.style.display = "none";
            yesBtn.removeEventListener("click", onYes);
            noBtn.removeEventListener("click", onNo);
            resolve(true);
        };
        const onNo = () => {
            modal.style.display = "none";
            yesBtn.removeEventListener("click", onYes);
            noBtn.removeEventListener("click", onNo);
            resolve(false);
        };
        yesBtn.addEventListener("click", onYes);
        noBtn.addEventListener("click", onNo);
    });
}

export function showBuyModal(message, onConfirm) {
    const modal = document.getElementById("buyModal");
    const msgEl = document.getElementById("buyModalMessage");
    const confirmBtn = document.getElementById("buyModalConfirm");
    const cancelBtn = document.getElementById("buyModalCancel");
    msgEl.innerText = message;
    modal.style.display = "flex";
    const handleConfirm = () => {
        modal.style.display = "none";
        confirmBtn.removeEventListener("click", handleConfirm);
        cancelBtn.removeEventListener("click", handleCancel);
        onConfirm(true);
    };
    const handleCancel = () => {
        modal.style.display = "none";
        confirmBtn.removeEventListener("click", handleConfirm);
        cancelBtn.removeEventListener("click", handleCancel);
        onConfirm(false);
    };
    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
}

export function setMobileNavVisibility(show) {
    const nav = document.getElementById("mobileNav");
    if(nav) nav.style.display = show ? "flex" : "none";
}
