// mobile-input.js — только для мобильных устройств
(function() {
    if (!window.isMobile) return;

    let activeRow = null, activeCol = null;
    let isActive = false;
    let inputElement = null;
    let buffer = '';

    function init() {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.style.position = 'fixed';
        inputElement.style.top = '-100px';
        inputElement.style.left = '-100px';
        inputElement.style.opacity = '0';
        inputElement.style.pointerEvents = 'none';
        inputElement.style.zIndex = '-1';
        inputElement.setAttribute('autocapitalize', 'none');
        inputElement.setAttribute('autocomplete', 'off');
        inputElement.setAttribute('spellcheck', 'false');
        document.body.appendChild(inputElement);

        inputElement.addEventListener('input', onInput);
        inputElement.addEventListener('blur', () => {
            if (isActive) setTimeout(() => inputElement.focus(), 10);
        });

        document.addEventListener('click', onCellClick);
        document.addEventListener('touchstart', onCellTouch);
    }

    function onCellClick(e) {
        const cellInput = e.target.closest('.cell-input');
        if (cellInput && !cellInput.disabled) {
            const row = parseInt(cellInput.dataset.row);
            const col = parseInt(cellInput.dataset.col);
            activate(row, col);
            e.preventDefault();
        }
    }

    function onCellTouch(e) {
        const cellInput = e.target.closest('.cell-input');
        if (cellInput && !cellInput.disabled) {
            const row = parseInt(cellInput.dataset.row);
            const col = parseInt(cellInput.dataset.col);
            activate(row, col);
            e.preventDefault();
        }
    }

    function activate(row, col) {
        if (activeRow === row && activeCol === col && isActive) return;
        activeRow = row;
        activeCol = col;
        isActive = true;
        buffer = '';
        inputElement.value = '';
        inputElement.focus();
        highlightCell(row, col);
        if (window.setActiveWordFromCell) window.setActiveWordFromCell(row, col);
    }

    function deactivate() {
        isActive = false;
        activeRow = null;
        activeCol = null;
        buffer = '';
        inputElement.value = '';
        removeHighlight();
    }

    function highlightCell(row, col) {
        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('mobile-active'));
        const cellDiv = window.cellElements?.[row]?.[col]?.parentElement;
        if (cellDiv) cellDiv.classList.add('mobile-active');
    }

    function removeHighlight() {
        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('mobile-active'));
    }

    function onInput(e) {
        if (!isActive) return;
        let value = inputElement.value;
        if (value.length < buffer.length) {
            buffer = value;
            if (buffer === '') {
                clearCurrentCell();
            } else {
                processBuffer();
            }
        } else {
            const newChars = value.slice(buffer.length);
            for (let ch of newChars) {
                buffer += ch.toLowerCase();
                processBuffer();
            }
        }
    }

    function processBuffer() {
        const row = activeRow, col = activeCol;
        if (row === null || col === null) return false;

        let b = buffer;
        // n + согласная
        if (b.length === 2 && b[0] === 'n' && !'aiueo'.includes(b[1]) && b[1] !== 'n') {
            insertKatakana(row, col, ["ン"]);
            buffer = '';
            inputElement.value = '';
            moveToNextCell();
            return true;
        }
        if (window.romajiToKatakana && window.romajiToKatakana[b]) {
            insertKatakana(row, col, window.romajiToKatakana[b]);
            buffer = '';
            inputElement.value = '';
            moveToNextCell();
            return true;
        }
        for (let i = b.length - 1; i >= 1; i--) {
            let prefix = b.slice(0, i);
            if (window.romajiToKatakana && window.romajiToKatakana[prefix]) {
                const katakanaArray = window.romajiToKatakana[prefix];
                const remaining = b.slice(i);
                insertKatakana(row, col, katakanaArray);
                buffer = remaining;
                inputElement.value = remaining;
                if (remaining.length === 0) moveToNextCell();
                return true;
            }
        }
        return false;
    }

    function insertKatakana(row, col, katakanaArray) {
        if (!window.gridData || !window.updateCellUI || !window.syncWordFromGrid) return;
        const char = katakanaArray[0];
        window.gridData[row][col] = char;
        window.updateCellUI(row, col);
        window.syncWordFromGrid();
        window.checkCompletion();
        window.updateClueCompletion();
        window.updateWrongHighlights();
        window.saveCurrentProgress();

        const correctChar = window.correctCharMap?.get(`${row},${col}`);
        if (char === correctChar) {
            if (window.playCorrectInput) window.playCorrectInput();
            const cellDiv = window.cellElements?.[row]?.[col]?.parentElement;
            if (cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
            }
        } else {
            if (window.playErrorInput) window.playErrorInput();
        }

        if (katakanaArray.length > 1 && window.activeWordId !== null) {
            const activeWord = window.wordsList?.find(w => w.id === window.activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                for (let k = 1; k < katakanaArray.length; k++) {
                    if (idx + k < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + k];
                        window.gridData[nextCell.row][nextCell.col] = katakanaArray[k];
                        window.updateCellUI(nextCell.row, nextCell.col);
                        const corr = window.correctCharMap?.get(`${nextCell.row},${nextCell.col}`);
                        if (katakanaArray[k] === corr) {
                            if (window.playCorrectInput) window.playCorrectInput();
                        } else {
                            if (window.playErrorInput) window.playErrorInput();
                        }
                    }
                }
                window.syncWordFromGrid();
                window.checkCompletion();
                window.updateClueCompletion();
                window.updateWrongHighlights();
                window.saveCurrentProgress();
            }
        }
    }

    function clearCurrentCell() {
        const row = activeRow, col = activeCol;
        if (row === null || col === null) return;
        if (window.gridData[row][col] !== "") {
            window.gridData[row][col] = "";
            window.updateCellUI(row, col);
            window.syncWordFromGrid();
            window.checkCompletion();
            window.updateClueCompletion();
            window.updateWrongHighlights();
            window.saveCurrentProgress();
        } else if (window.activeWordId !== null) {
            const activeWord = window.wordsList?.find(w => w.id === window.activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if (idx > 0) {
                    let prev = activeWord.cells[idx - 1];
                    activate(prev.row, prev.col);
                }
            }
        }
    }

    function moveToNextCell() {
        if (window.activeWordId !== null) {
            const activeWord = window.wordsList?.find(w => w.id === window.activeWordId);
            if (activeWord) {
                let currentIdx = activeWord.cells.findIndex(c => c.row === activeRow && c.col === activeCol);
                if (currentIdx !== -1 && currentIdx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[currentIdx + 1];
                    if (window.gridData[nextCell.row][nextCell.col] === "") {
                        activate(nextCell.row, nextCell.col);
                        return;
                    }
                }
                if (window.focusNextWord) window.focusNextWord(activeWord.number);
                if (window.activeWordId !== null) {
                    const newWord = window.wordsList?.find(w => w.id === window.activeWordId);
                    if (newWord && newWord.cells.length) {
                        let firstEmpty = newWord.cells.find(cell => window.gridData[cell.row][cell.col] === "");
                        if (firstEmpty) activate(firstEmpty.row, firstEmpty.col);
                        else activate(newWord.cells[0].row, newWord.cells[0].col);
                    }
                }
            }
        }
    }

    // Переопределяем onCellFocus для мобильных
    if (window.onCellFocus) {
        window.originalOnCellFocus = window.onCellFocus;
        window.onCellFocus = function(row, col) {
            activate(row, col);
        };
    }
    if (window.onCellBlur) {
        window.originalOnCellBlur = window.onCellBlur;
        window.onCellBlur = function() {};
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
