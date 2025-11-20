const menu = document.getElementById('menu');
const title = document.getElementById('title');
const game = document.getElementById('game');
const answerInput = document.getElementById('answer');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOver = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart');
const timerSetting = document.getElementById('timer-setting');
const scoreboardDiv = document.getElementById('scoreboard');
const scoreList = document.getElementById('score-list');
const logo = document.getElementById('logo');

let previousScores = [];
let score = 0;
let timeLeft = 30;
let gameInterval;
let fallInterval;
let currentTimerLength = 30;
let currentDifficulty = 'easy';
let activeQuestions = [];
let currentElement = null;
let currentAnswer = null;

// Difficulty to SPM (squats per minutes) mapping
const spmByLevel = {
    easy: 20,
    medium: 35,
    hard: 60
};

const baseFallingDurationByLevel = {
    easy: 20,
    medium: 10,
    hard: 5
};  

const variableFallingDurationByLevel = {
    easy: 5,
    medium: 4,
    hard: 3
};  

document.querySelectorAll('.difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
        currentDifficulty = btn.dataset.level;
        currentTimerLength = parseInt(timerSetting.value, 10) || 30;
        timeLeft = currentTimerLength;
        startGame();
    });
});


function startGame() {
    menu.classList.add('hidden');
    title.classList.add('hidden');

    game.classList.remove('hidden');

    // reset state
    score = 0;
    timeLeft = currentTimerLength;
    activeQuestions.forEach(q => { clearTimeout(q.to); q.el.remove(); });
    activeQuestions = [];
    updateScore();
    updateTimer();
    answerInput.value = '';
    answerInput.focus();

    gameInterval = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 0) endGame();
    }, 1000);

    spawnQuestion(currentDifficulty);
    fallInterval = setInterval(() => spawnQuestion(currentDifficulty), 2000);
}

function spawnQuestion(level) {
    const el = document.createElement('div');
    const [question, answer] = generateQuestion(level);
    el.textContent = question;
    el.className = 'falling text-2xl text-white';
    const left = 30 + Math.random() * 40;
    el.style.left = `${left}%`;
    el.dataset.answer = answer;

    game.appendChild(el);

    // add to active list
    activeQuestions.push(el);

    // first question = current
    if (activeQuestions.length === 1) {
        setCurrent(el);
    }

    // auto remove after duration
    const duration = Math.random() * variableFallingDurationByLevel[level] + baseFallingDurationByLevel[level];
    el.style.animationDuration = `${duration}s`;

    setTimeout(() => {
        // remove from list safely
        activeQuestions = activeQuestions.filter(q => q !== el);
        if (el === currentElement) pickNext();
        el.remove();
    }, duration * 1000 + 100);
}

function setCurrent(el) {
    if (currentElement) currentElement.classList.remove('current');
    if (!el) return (currentElement = currentAnswer = null);

    el.classList.add('current');
    currentElement = el;
    currentAnswer = Number(el.dataset.answer);
}

function pickNext() {
    const next = activeQuestions[0];
    setCurrent(next);
}


answerInput.addEventListener('input', () => {
    const raw = answerInput.value.trim();

    // limit to 2 digits for easy + medium
    if (currentDifficulty === 'easy' || currentDifficulty === 'medium') {
        const digits = raw.replace(/[^\d]/g, '');
        if (digits.length > 2) {
            answerInput.value = '';
            skipCurrentQuestion();
            return;
        }
    }

    const intRegex = /^[+-]?\d+$/;
    if (!intRegex.test(raw)) return;

    const val = Number(raw);
    if (val === currentAnswer) {
        score++;
        updateScore();
        answerInput.value = '';
        answerInput.classList.add('bg-emerald-200');
        setTimeout(() => answerInput.classList.remove('bg-emerald-200'), 120);

        if (currentElement) {
            currentElement.style.opacity = '0.4';
            currentElement.classList.remove('current');
            activeQuestions = activeQuestions.filter(q => q !== currentElement);
            currentElement.remove();
        }

        if (activeQuestions.length === 0 && timeLeft > 0) {
            spawnQuestion(currentDifficulty);
        }

        pickNext();
    }
});


function skipCurrentQuestion() {
    if (currentElement) {
        // fade out + unmark current
        currentElement.style.opacity = '0.4';
        currentElement.classList.remove('current');

        // remove from active list + DOM
        activeQuestions = activeQuestions.filter(q => q !== currentElement);
        currentElement.remove();
    }

    // if all cleared: spawn a new one immediately
    if (activeQuestions.length === 0 && timeLeft > 0) {
        spawnQuestion(currentDifficulty);
    }

    // pick next
    pickNext();
}


function generateQuestion(level) {
    const rand = max => Math.floor(Math.random() * max);

    let a, b, question, answer;

    if (level === 'easy') {
        // integers 1–10
        let a = rand(10) + 1;
        let b = rand(10) + 1;

        // enforce: at most one operand ≥10
        if (a >= 10 && b >= 10) {
            // force b to be single digit
            b = rand(9) + 1;  // 1–9
        }

        // choose operator: +, -, * (but * only allowed up to 6×6)
        const ops = ["+", "-", "*"];
        let op = ops[rand(3)];

        // if multiplication chosen, enforce <= 6×6
        if (op === "*" && (a > 6 || b > 6)) {
            a = rand(6) + 1;   // 1–6
            b = rand(6) + 1;   // 1–6
        }

        // build question + answer
        if (op === "+") {
            question = `${a} + ${b}`;
            answer = a + b;

        } else if (op === "-") {
            // ensure positive result
            if (b > a) [a, b] = [b, a];
            question = `${a} - ${b}`;
            answer = a - b;

        } else { // "*"
            question = `${a} × ${b}`;
            answer = a * b;
        }
    }


    else if (level === 'medium') {
        // helper for inclusive random integers
        const randBetween = (min, max) =>
            Math.floor(Math.random() * (max - min + 1)) + min;

        const op = ['+', '-', '×'][Math.floor(Math.random() * 3)];

        switch (op) {
            case '+': {
                const a = randBetween(0, 30);
                const b = randBetween(0, 30);
                        
                // enforce: at most one operand ≥10
                if (a >= 10 && b >= 10) {
                    // force b to be single digit
                    b = rand(9) + 1;  // 1–9
                }

                question = `${a} + ${b}`;
                answer = a + b;
                break;
            }

            case '-': {
                const a = randBetween(0, 15);
                const b = randBetween(0, 15);
                question = `${a} - ${b}`;
                answer = a - b; // may be negative
                break;
            }

            case '×': {
                // single-digit × single-digit (up to 7×7)
                const a = randBetween(2, 7);
                const b = randBetween(2, 7);
                question = `${a} × ${b}`;
                answer = a * b;
                break;
            }

            
        }
    }


    else if (level === 'hard') {
        // go wild: wider ranges and random ops
        const ops = ['+', '-', '×', '÷'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        a = rand(101) - 50; // can be negative
        b = rand(101) - 50;
        if (b === 0) b = 1;

        switch (op) {
            case '+':
                question = `${a} + ${b}`;
                answer = a + b;
                break;
            case '-':
                question = `${a} - ${b}`;
                answer = a - b;
                break;
            case '×':
                question = `${a} × ${b}`;
                answer = a * b;
                break;
            case '÷':
                // ensure clean integer result and both sides ≤ 2 digits
                const divisor = randBetween(2, 7);
                const quotient = randBetween(2, 7);
                const dividend = divisor * quotient;
                question = `${dividend} / ${divisor}`;
                answer = quotient;
                break;
        }
    }

    return [question, answer];
}


answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        answerInput.value = '';
        skipCurrentQuestion();
    }
});


function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
}

function updateTimer() {
    timerDisplay.textContent = `Time: ${timeLeft}`;
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(fallInterval);
    activeQuestions.forEach(q => { clearTimeout(q.to); q.el?.remove(); });
    activeQuestions = [];

    previousScores.unshift({
        level: currentDifficulty,
        score: score,
        timer: currentTimerLength,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (previousScores.length > 5) previousScores.pop(); // keep last 5

    updateScoreboard();

    game.classList.add('hidden');
    menu.classList.remove('hidden');
    title.classList.remove('hidden');
}


function updateScoreboard() {
    scoreboardDiv.classList.remove('hidden');
    scoreList.innerHTML = previousScores
        .map(s =>
            `<li><span class="text-epflRed font-bold">${s.level}</span> (${s.timer}s): ${s.score} pts</li>`
        )
        .join('');
}


// ============================================
// SQUAT APP
// ============================================

const squatMenu = document.getElementById('squat-menu');
const squatGame = document.getElementById('squat-game');
const squatTimerSetting = document.getElementById('squat-timer-setting');
const squatTimerDisplay = document.getElementById('squat-timer-display');
const squatCue = document.getElementById('squat-cue');
const squatScoreboardDiv = document.getElementById('squat-scoreboard');
const squatScoreList = document.getElementById('squat-score-list');

let squatPreviousScores = [];
let squatInterval;
let squatTimeLeft = 60;
let squatCurrentDifficulty = 'easy';
let squatCurrentTimerLength = 60;
let squatBPM = 40;
let squatCount = 0;
let squatBeatInterval;

logo.addEventListener('click', () => {
    // Check if math game is active
    if (!game.classList.contains('hidden')) {
        endGame();
    }
    // Check if squat game is active
    if (!squatGame.classList.contains('hidden')) {
        endSquatGame();
    }
});



document.querySelectorAll('.squat-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
        squatCurrentDifficulty = btn.dataset.level;
        squatCurrentTimerLength = parseInt(squatTimerSetting.value, 10) || 60;
        squatBPM = spmByLevel[squatCurrentDifficulty] * 2;
        startSquatGame();
    });
});

function startSquatGame() {
    menu.classList.add('hidden');
    title.classList.add('hidden');
    squatGame.classList.remove('hidden');

    // Reset state
    squatTimeLeft = squatCurrentTimerLength;
    squatCount = 0;
    updateSquatTimer();

    // Show ready message
    squatCue.textContent = 'Prêt';
    squatCue.style.color = '#E2001A';

    // Start countdown timer
    squatInterval = setInterval(() => {
        squatTimeLeft--;
        updateSquatTimer();
        if (squatTimeLeft <= 0) endSquatGame();
    }, 1000);

    // Start beat cues
    const beatInterval = 60000 / squatBPM; // milliseconds per beat
    let isDown = true;

    squatBeatInterval = setInterval(() => {
        squatCount++;
        if (isDown) {
            squatCue.textContent = '⬇ DESCENDS';
            squatCue.style.color = '#E2001A';
        } else {
            squatCue.textContent = '⬆ MONTE';
            squatCue.style.color = '#ffffff';
        }
        isDown = !isDown;

        // Flash effect
        squatCue.style.transform = 'scale(1.2)';
        setTimeout(() => {
            squatCue.style.transform = 'scale(1)';
        }, 100);
    }, beatInterval);
}

function updateSquatTimer() {
    squatTimerDisplay.textContent = `Temps: ${squatTimeLeft}`;
}



function endSquatGame() {
    clearInterval(squatInterval);
    clearInterval(squatBeatInterval);

    squatCue.textContent = 'Terminé!';
    squatCue.style.color = '#E2001A';

    // Calculate total squats (count / 2 since we count both down and up)
    const totalSquats = Math.floor(squatCount / 2);

    squatPreviousScores.unshift({
        level: squatCurrentDifficulty,
        squats: totalSquats,
        timer: squatCurrentTimerLength,
        bpm: squatBPM,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (squatPreviousScores.length > 5) squatPreviousScores.pop();

    updateSquatScoreboard();

    // Return to menu after 2 seconds
    setTimeout(() => {
        squatGame.classList.add('hidden');
        menu.classList.remove('hidden');
        title.classList.remove('hidden');
    }, 2000);
}

function updateSquatScoreboard() {
    squatScoreboardDiv.classList.remove('hidden');
    squatScoreList.innerHTML = squatPreviousScores
        .map(s =>
            `<li><span class="text-epflRed">${s.level}</span> (${s.timer}s): ${s.squats} squats</li>`
        )
        .join('');
}