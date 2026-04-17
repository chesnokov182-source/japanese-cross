import { initTheme, toggleTheme } from './themes.js';
import { initShopModule, openShopModal, upgradeMaxHints, updateAllBlockedSkins } from './shop.js';
import { loadGameStats, saveGameStats, isPuzzleUnlocked, unlockPuzzle, getCompletedCrosswords, getLastPlayed, setLastPlayed } from './storage.js';
import { showToast, showConfirmDialog, updateScoreUI, updateLevelProgress, setMobileNavVisibility, showBuyModal } from './ui.js';
import { playClick } from './sounds.js';
import { loadCrossword, resetCurrentCrossword, giveHint, getCurrentLevel, getCurrentPuzzleIndex, setCurrentPuzzleIndex, getGameStats, setGameStats, getHintCount, getMaxHints, updateHintLimit, getPuzzlePrice, initCrosswordModule } from './crossword.js';
import { checkTutorial, showTutorial } from './tutorial.js';

// Глобальные переменные
let gameStats = loadGameStats();
let currentLevel = "n5";
let currentPuzzleIndex = 0;

// Инициализация модуля кроссворда с колбэками
initCrosswordModule(addPoints, subtractPoints, incrementWordsCompleted, updateButtonStates);

function addPoints(points) {
    gameStats.score += points;
    saveGameStats(gameStats);
    updateScoreUI(gameStats.score, gameStats.wordsCompleted);
    showToast(`+${points} очков!`, "success");
}

function subtractPoints(points) {
    if(gameStats.score >= points) {
        gameStats.score -= points;
        saveGameStats(gameStats);
        updateScoreUI(gameStats.score, gameStats.wordsCompleted);
        showToast(`-${points} очков`, "info");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${points}`, "error");
        return false;
    }
}

function incrementWordsCompleted() {
    gameStats.wordsCompleted++;
    saveGameStats(gameStats);
    updateScoreUI(gameStats.score, gameStats.wordsCompleted);
}

function updateButtonStates() {
    const level = getCurrentLevel();
    const idx = getCurrentPuzzleIndex();
    const unlocked = isPuzzleUnlocked(level, idx);
    const resetBtn = document.getElementById("resetBtn");
    const hintBtn = document.getElementById("hintBtn");
    const buyBtn = document.getElementById("buyPuzzleBtn");
    if(resetBtn) resetBtn.disabled = !unlocked;
    if(!unlocked) {
        if(hintBtn) {
            hintBtn.disabled = true;
            hintBtn.textContent = "Кроссворд заблокирован";
        }
    } else {
        const completed = localStorage.getItem("completedCrosswords")?.includes(`${level}_${idx}`);
        if(completed) {
            if(hintBtn) {
                hintBtn.disabled = true;
                hintBtn.textContent = "Кроссворд решён";
            }
        } else {
            const maxHints = getMaxHints();
            const hintCount = getHintCount();
            if(hintCount >= maxHints) {
                if(hintBtn) {
                    hintBtn.disabled = true;
                    hintBtn.textContent = `Подсказки закончились (${hintCount}/${maxHints})`;
                }
            } else {
                if(hintBtn) {
                    hintBtn.disabled = false;
                    hintBtn.textContent = `Подсказка (20 очков) (${hintCount}/${maxHints})`;
                }
            }
        }
    }
    if(buyBtn) {
        const price = getPuzzlePrice();
        if(!unlocked && price > 0) {
            buyBtn.disabled = false;
            buyBtn.textContent = `💰 Купить (${price} очков)`;
        } else {
            buyBtn.disabled = true;
            buyBtn.textContent = unlocked ? "✅ Разблокирован" : `💰 Купить (0 очков)`;
        }
    }
}

function updateLevelProgressUI() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const total = puzzles.length;
    const completedKeys = getCompletedCrosswords();
    let completedCount = 0;
    for(let i = 0; i < total; i++) {
        if(completedKeys.includes(`${currentLevel}_${i}`)) completedCount++;
    }
    updateLevelProgress(currentLevel, completedCount, total);
}

function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const select = document.getElementById("puzzleSelect");
    if(!select) return;
    select.innerHTML = "";
    for(let idx = 0; idx < puzzles.length; idx++) {
        const puzzle = puzzles[idx];
        const isUnlocked = isPuzzleUnlocked(currentLevel, idx);
        const isCompleted = localStorage.getItem("completedCrosswords")?.includes(`${currentLevel}_${idx}`);
        const price = puzzle.price || 0;
        let text = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx+1}`);
        if(!isUnlocked) text += ` (🔒 ${price} очков)`;
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = text;
        if(isCompleted) option.style.fontWeight = "bold";
        if(!isUnlocked) option.style.color = "#999";
        select.appendChild(option);
    }
    select.value = currentPuzzleIndex;
    updateButtonStates();
}

function buyCurrentPuzzle() {
    const price = getPuzzlePrice();
    if(price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showBuyModal(`Купить кроссворд за ${price} очков?`, (confirmed) => {
            if(confirmed && unlockPuzzle(currentLevel, currentPuzzleIndex, price, gameStats, subtractPoints)) {
                loadCrossword(currentLevel, currentPuzzleIndex, true);
                updatePuzzleSelect();
                updateButtonStates();
                updateLevelProgressUI();
            }
        });
    } else {
        showToast("Кроссворд уже разблокирован", "info");
    }
}

function checkDailyBonus() {
    const today = new Date().toDateString();
    if(gameStats.lastBonusDate !== today) {
        addPoints(50);
        gameStats.lastBonusDate = today;
        saveGameStats(gameStats);
        showToast("🎁 Ежедневный бонус: +50 очков!", "success");
    }
}

function initMobileNav() {
    const nav = document.getElementById("mobileNav");
    if(!nav) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setMobileNavVisibility(isMobile);
    if(!isMobile) return;
    const btns = nav.querySelectorAll(".nav-btn");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            const dir = btn.dataset.dir;
            const activeInput = document.activeElement;
            if(!activeInput || !activeInput.closest(".cell")) return;
            const cellDiv = activeInput.closest(".cell");
            const allCells = Array.from(document.querySelectorAll(".cell input:not([disabled])"));
            const idx = allCells.indexOf(activeInput);
            if(idx === -1) return;
            let newIdx = idx;
            const gridWidth = parseInt(document.querySelector(".crossword-grid").style.gridTemplateColumns.split(" ").length);
            if(dir === "left") newIdx = idx - 1;
            else if(dir === "right") newIdx = idx + 1;
            else if(dir === "up") newIdx = idx - gridWidth;
            else if(dir === "down") newIdx = idx + gridWidth;
            if(newIdx >= 0 && newIdx < allCells.length) {
                allCells[newIdx].focus();
            }
        });
    });
}

// Обработчики событий
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initShopModule();
    checkDailyBonus();
    checkTutorial();
    
    const last = getLastPlayed();
    currentLevel = last.level;
    currentPuzzleIndex = last.puzzle;
    document.getElementById("levelSelect").value = currentLevel;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
    updateLevelProgressUI();
    initMobileNav();
    
    // События
    document.getElementById("levelSelect").addEventListener("change", (e) => {
        playClick();
        currentLevel = e.target.value;
        const puzzles = window.crosswordsData[currentLevel].puzzles;
        let firstUnlocked = 0;
        for(let i=0; i<puzzles.length; i++) {
            if(isPuzzleUnlocked(currentLevel, i)) { firstUnlocked = i; break; }
        }
        currentPuzzleIndex = firstUnlocked;
        updatePuzzleSelect();
        loadCrossword(currentLevel, currentPuzzleIndex);
        updateLevelProgressUI();
    });
    
    document.getElementById("puzzleSelect").addEventListener("change", (e) => {
        playClick();
        currentPuzzleIndex = parseInt(e.target.value);
        setCurrentPuzzleIndex(currentPuzzleIndex);
        loadCrossword(currentLevel, currentPuzzleIndex);
        updateButtonStates();
    });
    
    document.getElementById("resetBtn").addEventListener("click", async () => {
        playClick();
        const confirmed = await showConfirmDialog("Сбросить кроссворд? Все ячейки будут очищены, очки за слова возвращены.");
        if(confirmed) resetCurrentCrossword();
    });
    
    document.getElementById("hintBtn").addEventListener("click", () => {
        playClick();
        giveHint(subtractPoints);
        updateButtonStates();
    });
    
    document.getElementById("resetProgressBtn").addEventListener("click", async () => {
        playClick();
        const confirmed = await showConfirmDialog("Удалить весь прогресс? Это нельзя отменить.");
        if(confirmed) {
            localStorage.clear();
            location.reload();
        }
    });
    
    document.getElementById("themeToggle").addEventListener("click", () => {
        playClick();
        toggleTheme();
    });
    
    document.getElementById("shopBtn").addEventListener("click", () => {
        playClick();
        openShopModal(addPoints, subtractPoints, upgradeMaxHints, updateButtonStates);
    });
    
    document.getElementById("buyPuzzleBtn").addEventListener("click", () => {
        playClick();
        buyCurrentPuzzle();
    });
    
    document.getElementById("helpBtn").addEventListener("click", () => {
        playClick();
        showTutorial();
    });
});
