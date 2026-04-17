let currentStep = 0;
const steps = [
    "Добро пожаловать в японские кроссворды JLPT! 🎌\n\nВ этом туториале вы узнаете основы работы.",
    "📝 Вводите слова английскими буквами (ромадзи).\nПример: 'su' → ス, 'shu' → シ+ユ, 'n' → ン.\nДефис '-' даёт длинную гласную ー.",
    "🎯 За правильно угаданное слово даётся 10 очков, за полный кроссворд – 50 очков.",
    "💰 Очки можно тратить на разблокировку новых кроссвордов, на подсказки (20 очков за подсказку, лимит можно увеличить в магазине), на скины и в рулетке.",
    "🎁 Каждый день вы получаете 50 бонусных очков за вход.",
    "🌓 Кнопка темы переключает светлую/тёмную тему. Прогресс сохраняется автоматически.\n\nПриятной игры!"
];

export function showTutorial() {
    const modal = document.getElementById("tutorialModal");
    const messageEl = document.getElementById("tutorialMessage");
    const nextBtn = document.getElementById("tutorialNext");
    const closeBtn = document.getElementById("tutorialClose");
    if (!modal) return;
    
    function update() {
        messageEl.innerText = steps[currentStep];
        nextBtn.innerText = currentStep === steps.length - 1 ? "Завершить" : "Далее";
    }
    
    function nextStep() {
        if (currentStep < steps.length - 1) {
            currentStep++;
            update();
        } else {
            close();
        }
    }
    
    function close() {
        modal.style.display = "none";
        nextBtn.removeEventListener("click", nextStep);
        closeBtn.removeEventListener("click", close);
        localStorage.setItem("tutorialShown", "true");
    }
    
    nextBtn.addEventListener("click", nextStep);
    closeBtn.addEventListener("click", close);
    currentStep = 0;
    update();
    modal.style.display = "flex";
}

export function checkTutorial() {
    if (!localStorage.getItem("tutorialShown")) {
        setTimeout(showTutorial, 500);
    }
}
