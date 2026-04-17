import { 
    STORAGE_PROGRESS_KEY, STORAGE_COMPLETED_KEY, STORAGE_UNLOCKED_KEY,
    STORAGE_EARNED_KEY, STORAGE_GAME_KEY, STORAGE_SKINS_KEY,
    STORAGE_LAST_LEVEL, STORAGE_LAST_PUZZLE
} from './constants.js';

// ------------------- Прогресс кроссвордов -------------------
export function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
}

export function saveCurrentProgress(level, puzzleIdx, gridData, hintUsed, hintCount) {
    const progress = getStoredProgress();
    const key = `${level}_${puzzleIdx}`;
    progress[key] = {
        gridData: gridData.map(row => row.map(cell => cell)),
        hintUsed,
        hintCount
    };
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

export function clearProgressForPuzzle(level, puzzleIdx) {
    const progress = getStoredProgress();
    const key = `${level}_${puzzleIdx}`;
    delete progress[key];
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

// ------------------- Разблокировка кроссвордов -------------------
export function getUnlockedCrosswords() {
    const saved = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    return saved ? JSON.parse(saved) : {};
}

export function saveUnlockedCrosswords(unlocked) {
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(unlocked));
}

export function isPuzzleUnlocked(level, puzzleIdx) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (puzzleIdx === 0 && !unlocked[key]) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        return true;
    }
    return unlocked[key] === true;
}

export function unlockPuzzle(level, puzzleIdx, price, gameStats, subtractPoints) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (unlocked[key]) return true;
    if (gameStats.score >= price) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        subtractPoints(price);
        return true;
    }
    return false;
}

// ------------------- Завершённые кроссворды -------------------
export function getCompletedCrosswords() {
    const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return saved ? JSON.parse(saved) : [];
}

export function markAsCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (!completed.includes(key)) {
        completed.push(key);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        return true;
    }
    return false;
}

export function isCrosswordCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    return completed.includes(`${level}_${puzzleIdx}`);
}

// ------------------- Очки за слова и кроссворд -------------------
export function getEarnedPointsForPuzzle(level, puzzleIdx) {
    const earned = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earned ? JSON.parse(earned) : {};
    const key = `${level}_${puzzleIdx}`;
    if (!data[key]) data[key] = { words: {}, completed: false };
    return data[key];
}

export function saveEarnedPointsForPuzzle(level, puzzleIdx, earned) {
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earnedAll ? JSON.parse(earnedAll) : {};
    const key = `${level}_${puzzleIdx}`;
    data[key] = earned;
    localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
}

export function clearEarnedPointsForPuzzle(level, puzzleIdx) {
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    if (earnedAll) {
        const data = JSON.parse(earnedAll);
        delete data[`${level}_${puzzleIdx}`];
        localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
    }
}

// ------------------- Статистика игрока (очки, слова, лимит подсказок) -------------------
export function loadGameStats() {
    const saved = localStorage.getItem(STORAGE_GAME_KEY);
    const defaultStats = { score: 0, wordsCompleted: 0, lastBonusDate: null, maxHints: 2 };
    if (saved) {
        const stats = JSON.parse(saved);
        if (stats.maxHints === undefined) stats.maxHints = 2;
        return stats;
    }
    return defaultStats;
}

export function saveGameStats(stats) {
    localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(stats));
}

// ------------------- Скины -------------------
export function loadSkinsData() {
    const saved = localStorage.getItem(STORAGE_SKINS_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        return { purchasedSkins: data.purchasedSkins || ["default"], selectedSkinId: data.selectedSkinId || "default" };
    }
    return { purchasedSkins: ["default"], selectedSkinId: "default" };
}

export function saveSkinsData(purchasedSkins, selectedSkinId) {
    localStorage.setItem(STORAGE_SKINS_KEY, JSON.stringify({ purchasedSkins, selectedSkinId }));
}

// ------------------- Последний открытый кроссворд -------------------
export function getLastPlayed() {
    const level = localStorage.getItem(STORAGE_LAST_LEVEL) || "n5";
    const puzzle = parseInt(localStorage.getItem(STORAGE_LAST_PUZZLE)) || 0;
    return { level, puzzle };
}

export function setLastPlayed(level, puzzleIdx) {
    localStorage.setItem(STORAGE_LAST_LEVEL, level);
    localStorage.setItem(STORAGE_LAST_PUZZLE, puzzleIdx);
}
