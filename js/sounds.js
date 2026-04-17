let audioContext = null;

export function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(frequency, duration, volume = 0.3, type = 'sine') {
    try {
        initAudio();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start();
        oscillator.stop(now + duration);
    } catch (e) {
        console.warn("Audio not supported", e);
    }
}

export function playPop() {
    playBeep(880, 0.05, 0.2);
}

export function playCorrectInput() {
    playBeep(1200, 0.04, 0.25);
}

export function playErrorInput() {
    playBeep(200, 0.12, 0.2, 'sawtooth');
}

export function playRouletteSpin() {
    playBeep(800, 0.02, 0.15);
}

export function playRouletteWin(prize) {
    if (prize > 0) {
        playBeep(523, 0.15, 0.3);
        setTimeout(() => playBeep(659, 0.15, 0.3), 150);
        setTimeout(() => playBeep(784, 0.2, 0.3), 300);
    } else {
        playBeep(300, 0.3, 0.2, 'sawtooth');
    }
}

export function playClick() {
    playBeep(600, 0.03, 0.1, 'sine');
}
