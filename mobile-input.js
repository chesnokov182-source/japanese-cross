// mobile-input.js – полностью заменяет ввод на мобильных устройствах
(function() {
    if (!window.isMobile) return;

    let activeRow = null, activeCol = null;
    let isActive = false;
    let hiddenInput = null;
    let buffer = '';

    function init() {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.style.position = 'fixed';
        hiddenInput.style.top = '-100px';
        hiddenInput.style.left = '-100px';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.style.zIndex = '-1';
        hiddenInput.setAttribute('autocapitalize', 'none');
        hiddenInput.setAttribute('autocomplete', 'off');
        hiddenInput.setAttribute('spellcheck', 'false');
        document.body.appendChild(hiddenInput);

        hiddenInput.addEventListener('input', onInput);
        hiddenInput.addEventListener('blur', () => {
            if (isActive) setTimeout(() => hiddenInput.focus(), 10);
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
        hiddenInput.value = '';
        hiddenInput.focus();
        highlightCell(row, col);
        if (window.setActiveWordFromCell) window.setActiveWordFromCell(row, col);
    }

    function deactivate() {
        isActive = false;
        activeRow = null;
        activeCol = null;
        buffer = '';
        hiddenInput.value = '';
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
        let value = hiddenInput.value;
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
            hiddenInput.value = '';
            moveToNextCell();
            return true;
        }
        if (window.romajiToKatakana && window.romajiToKatakana[b]) {
            insertKatakana(row, col, window.romajiToKatakana[b]);
            buffer = '';
            hiddenInput.value = '';
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
                hiddenInput.value = remaining;
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
