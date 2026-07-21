console.log("Focus JS Loaded");

// Timer states
let maxTime = 1500; // default 25m
let time = 1500;
let timer = null;

// Sound map
const sounds = {
    none: "",
    lofi: "https://assets.mixkit.co/music/preview/mixkit-lofi-band-loop-116.mp3",
    rain: "https://www.soundjay.com/nature/sounds/rain-07.mp3",
    forest: "https://www.soundjay.com/nature/sounds/forest-wind-1.mp3"
};
let activeSoundKey = "none";

document.addEventListener("DOMContentLoaded", () => {
    setupModeTabs();
    setupSoundscape();
    updateDisplay();
});

// Setup duration switching tabs
function setupModeTabs() {
    const tabs = document.querySelectorAll(".timer-mode-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            if (timer) {
                // If running, warn user before resetting
                if (!confirm("Reset the current session to switch modes?")) return;
            }
            
            // Toggle active style
            tabs.forEach(t => {
                t.classList.remove("active");
                t.style.background = "var(--card)";
                t.style.color = "#94A3B8";
                t.style.fontWeight = "normal";
            });
            tab.classList.add("active");
            tab.style.background = "rgba(255,255,255,0.05)";
            tab.style.color = "#F8FAFC";
            tab.style.fontWeight = "600";

            // Set times
            maxTime = parseInt(tab.getAttribute("data-time"));
            resetTimer();
        });
    });
}

// Setup ambient sounds selector
function setupSoundscape() {
    const soundBtns = document.querySelectorAll(".sound-btn");
    const audioEl = document.getElementById("ambient-audio");

    soundBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            soundBtns.forEach(b => {
                b.classList.remove("active");
                b.style.background = "rgba(255,255,255,0.05)";
                b.style.border = "1px solid rgba(255,255,255,0.05)";
                b.style.color = "#94A3B8";
            });
            btn.classList.add("active");
            btn.style.background = "var(--primary)";
            btn.style.border = "none";
            btn.style.color = "white";

            activeSoundKey = btn.getAttribute("data-sound");
            console.log("Selected sound:", activeSoundKey);

            if (activeSoundKey === "none") {
                audioEl.pause();
                audioEl.src = "";
            } else {
                audioEl.src = sounds[activeSoundKey];
                // If timer is currently running, play sound immediately
                if (timer) {
                    audioEl.play().catch(e => console.log("Audio autoplay block:", e));
                }
            }
        });
    });
}

// Update countdown text and SVG progress bar offset
function updateDisplay() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    // Update digital display
    document.getElementById("timer").innerText = `${minutes}:${seconds}`;

    // Update SVG progress offset (Circumference ~ 597)
    const progressCircle = document.getElementById("timer-progress");
    if (progressCircle) {
        const ratio = time / maxTime;
        const offset = 597 * (1 - ratio);
        progressCircle.style.strokeDashoffset = offset;
    }
}

// Start focus countdown
function startTimer() {
    if (timer) return;

    // Play ambient sound if active
    const audioEl = document.getElementById("ambient-audio");
    if (audioEl && activeSoundKey !== "none" && audioEl.src) {
        audioEl.play().catch(e => console.log("Audio play blocked:", e));
    }

    timer = setInterval(() => {
        if (time > 0) {
            time--;
            updateDisplay();
        } else {
            clearInterval(timer);
            timer = null;
            playAlarmSound();
            if (audioEl) audioEl.pause();
            
            // Visual alert
            setTimeout(() => {
                alert("🎉 Focus session complete! Time to take a breather.");
                resetTimer();
            }, 100);
        }
    }, 1000);

    // Update UI controls
    document.getElementById("startBtn").style.background = "rgba(124, 58, 237, 0.4)";
}

// Pause focus timer
function pauseTimer() {
    clearInterval(timer);
    timer = null;

    // Pause ambient sound
    const audioEl = document.getElementById("ambient-audio");
    if (audioEl) audioEl.pause();

    // Restore UI controls
    document.getElementById("startBtn").style.background = "var(--primary)";
}

// Reset focus session timer
function resetTimer() {
    clearInterval(timer);
    timer = null;
    time = maxTime;

    // Pause ambient sound
    const audioEl = document.getElementById("ambient-audio");
    if (audioEl) {
        audioEl.pause();
        if (activeSoundKey !== "none") {
            audioEl.currentTime = 0; // rewind
        }
    }

    updateDisplay();

    // Restore UI controls
    document.getElementById("startBtn").style.background = "var(--primary)";
}

// Play premium synthetic digital chime
function playAlarmSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Chime note 1: A5 (880Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.6);
        
        // Chime note 2: E5 (659Hz) delayed slightly
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.7);
        }, 180);
    } catch(e) {
        console.error("Synthesizer failed to execute:", e);
    }
}