import { availableSkins, roulettePrizes, rouletteProbabilities } from './constants.js';
import { loadSkinsData, saveSkinsData, loadGameStats, saveGameStats } from './storage.js';
import { showToast, showConfetti, updateScoreUI } from './ui.js';
import { playRouletteSpin, playRouletteWin, playClick } from './sounds.js';
import { getCellElements, getGridData } from './ui.js';

let purchasedSkins = [];
let selectedSkinId = "default";
let gameStats = loadGameStats();

export function initShopModule() {
    const skinsData = loadSkinsData();
    purchasedSkins = skinsData.purchasedSkins;
    selectedSkinId = skinsData.selectedSkinId;
}

export function isSkinPurchased(skinId) {
    return purchasedSkins.includes(skinId);
}

export function purchaseSkin(skinId, price, addPointsFn, subtractPointsFn) {
    if(isSkinPurchased(skinId)) {
        showToast("Скин уже куплен", "error");
        return false;
    }
    if(gameStats.score >= price) {
        subtractPointsFn(price);
        purchasedSkins.push(skinId);
        saveSkinsData(purchasedSkins, selectedSkinId);
        showConfetti();
        showToast(`Скин "${availableSkins.find(s => s.id === skinId).name}" куплен!`, "success");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price}`, "error");
        return false;
    }
}

export function selectSkin(skinId) {
    if(!isSkinPurchased(skinId)) {
        showToast("Сначала купите этот скин", "error");
        return false;
    }
    selectedSkinId = skinId;
    saveSkinsData(purchasedSkins, selectedSkinId);
    showToast(`Скин "${availableSkins.find(s => s.id === skinId).name}" выбран!`, "success");
    updateAllBlockedSkins();
    return true;
}

export function getSelectedSkinEmoji() {
    const skin = availableSkins.find(s => s.id === selectedSkinId);
    return skin ? skin.emoji : "";
}

export function updateAllBlockedSkins() {
    const cellElements = getCellElements();
    const gridData = getGridData();
    if(!cellElements || !gridData) return;
    for(let i = 0; i < gridData.length; i++) {
        for(let j = 0; j < gridData[i].length; j++) {
            if(gridData[i][j] === null) {
                updateBlockedSkin(i, j, cellElements);
            }
        }
    }
}

function updateBlockedSkin(row, col, cellElements) {
    const cellDiv = cellElements[row]?.[col]?.parentElement;
    if(!cellDiv) return;
    const skinSpan = cellDiv.querySelector('.cell-skin');
    if(!skinSpan) return;
    const isBlocked = (getGridData()[row][col] === null);
    const showSkin = isBlocked && selectedSkinId !== "default";
    if(showSkin) {
        skinSpan.style.display = "flex";
        skinSpan.textContent = getSelectedSkinEmoji();
    } else {
        skinSpan.style.display = "none";
    }
}

export function upgradeMaxHints(newLimit, price, subtractPointsFn) {
    if(newLimit <= gameStats.maxHints) {
        showToast("Это улучшение уже куплено", "error");
        return false;
    }
    if(gameStats.score >= price) {
        subtractPointsFn(price);
        gameStats.maxHints = newLimit;
        saveGameStats(gameStats);
        showToast(`Лимит подсказок увеличен до ${newLimit}!`, "success");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price}`, "error");
        return false;
    }
}

let rouletteAnimating = false;
export function spinRoulette(subtractPointsFn, addPointsFn) {
    if(rouletteAnimating) return;
    if(!subtractPointsFn(20)) return;
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedPrize = 0;
    for(let i = 0; i < roulettePrizes.length; i++) {
        cumulative += rouletteProbabilities[i];
        if(rand < cumulative) {
            selectedPrize = roulettePrizes[i];
            break;
        }
    }
    rouletteAnimating = true;
    const rouletteDisplay = document.getElementById('rouletteDisplay');
    const rouletteResult = document.getElementById('rouletteResult');
    if(!rouletteDisplay) return;
    let spins = 0;
    const totalSpins = 20;
    const interval = setInterval(() => {
        const randomTemp = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
        rouletteDisplay.textContent = randomTemp;
        playRouletteSpin();
        spins++;
        if(spins >= totalSpins) {
            clearInterval(interval);
            rouletteDisplay.textContent = selectedPrize;
            if(selectedPrize > 0) {
                addPointsFn(selectedPrize);
                if(rouletteResult) rouletteResult.innerHTML = `🎉 Вы выиграли ${selectedPrize} очков! 🎉`;
                if(selectedPrize >= 100) showConfetti();
                playRouletteWin(selectedPrize);
            } else {
                if(rouletteResult) rouletteResult.innerHTML = `😞 Вам выпало 0 очков. Повезёт в следующий раз!`;
                playRouletteWin(0);
            }
            rouletteAnimating = false;
        }
    }, 50);
}

export function openShopModal(addPointsFn, subtractPointsFn, upgradeMaxHintsFn, updateButtonStatesCallback) {
    const modal = document.getElementById("shopModal");
    const skinsList = document.getElementById("skinsList");
    if(!modal || !skinsList) return;
    // Простая реализация магазина – показываем скины, улучшения и рулетку
    skinsList.innerHTML = `
        <div class="shop-tabs">
            <button class="shop-tab active" data-tab="skins">🎨 Скины</button>
            <button class="shop-tab" data-tab="upgrades">⚡ Улучшения</button>
            <button class="shop-tab" data-tab="roulette">🎲 Рулетка</button>
        </div>
        <div class="shop-section skins active">
            ${availableSkins.map(skin => `
                <div class="skin-item">
                    <div class="skin-info">
                        <div class="skin-emoji">${skin.emoji || "🖼️"}</div>
                        <div class="skin-details">
                            <div class="skin-name">${skin.name}</div>
                            <div class="skin-price">${skin.price > 0 ? `${skin.price} очков` : "бесплатно"}</div>
                        </div>
                    </div>
                    <div>
                        ${!isSkinPurchased(skin.id) ? `<button class="skin-btn buy" data-id="${skin.id}" data-price="${skin.price}">Купить</button>` :
                          (selectedSkinId === skin.id ? `<button class="skin-btn selected" disabled>Выбран</button>` :
                           `<button class="skin-btn select" data-id="${skin.id}">Выбрать</button>`)}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="shop-section upgrades">
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
        </div>
        <div class="shop-section roulette">
            <div class="roulette-container">
                <div class="roulette-spin-area">
                    <span id="rouletteDisplay">🎰</span>
                </div>
                <button id="rouletteSpinBtn" class="roulette-spin-btn">Крутить (20 очков)</button>
                <div id="rouletteResult" class="roulette-result"></div>
                <div class="roulette-info">
                    Шансы выигрыша:<br>
                    0 – 25% | 10 – 20% | 20 – 20% | 50 – 15% | 100 – 10% | 200 – 10%
                </div>
            </div>
        </div>
    `;
    
    // Обработчики для скинов
    skinsList.querySelectorAll('.skin-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            if(purchaseSkin(id, price, addPointsFn, subtractPointsFn)) {
                openShopModal(addPointsFn, subtractPointsFn, upgradeMaxHintsFn, updateButtonStatesCallback);
            }
        });
    });
    skinsList.querySelectorAll('.skin-btn.select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            selectSkin(id);
            openShopModal(addPointsFn, subtractPointsFn, upgradeMaxHintsFn, updateButtonStatesCallback);
        });
    });
    // Улучшения
    skinsList.querySelectorAll('.upgrade-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newLimit = parseInt(btn.dataset.upgrade);
            const price = parseInt(btn.dataset.price);
            if(upgradeMaxHintsFn(newLimit, price, subtractPointsFn)) {
                if(updateButtonStatesCallback) updateButtonStatesCallback();
                openShopModal(addPointsFn, subtractPointsFn, upgradeMaxHintsFn, updateButtonStatesCallback);
            }
        });
    });
    // Рулетка
    const spinBtn = skinsList.querySelector('#rouletteSpinBtn');
    if(spinBtn) {
        spinBtn.addEventListener('click', () => spinRoulette(subtractPointsFn, addPointsFn));
    }
    // Переключение вкладок
    const tabs = skinsList.querySelectorAll('.shop-tab');
    const sections = {
        skins: skinsList.querySelector('.shop-section.skins'),
        upgrades: skinsList.querySelector('.shop-section.upgrades'),
        roulette: skinsList.querySelector('.shop-section.roulette')
    };
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.keys(sections).forEach(s => sections[s].classList.remove('active'));
            if(sections[tabName]) sections[tabName].classList.add('active');
        });
    });
    modal.style.display = "flex";
    document.getElementById("closeShopBtn").addEventListener("click", () => modal.style.display = "none", { once: true });
}
