// 定义音符数据
const notes = [
    { key: 'C', frequency: 261.63, label: 'C' },
    { key: 'C#', frequency: 277.18, label: 'C#' },
    { key: 'D', frequency: 293.66, label: 'D' },
    { key: 'D#', frequency: 311.13, label: 'D#' },
    { key: 'E', frequency: 329.63, label: 'E' },
    { key: 'F', frequency: 349.23, label: 'F' },
    { key: 'F#', frequency: 369.99, label: 'F#' },
    { key: 'G', frequency: 392.00, label: 'G' },
    { key: 'G#', frequency: 415.30, label: 'G#' },
    { key: 'A', frequency: 440.00, label: 'A' },
    { key: 'A#', frequency: 466.16, label: 'A#' },
    { key: 'B', frequency: 493.88, label: 'B' }
];

// 游戏状态
let gameState = {
    currentNotes: [],
    selectedNotes: [],
    isSelecting: false,
    consecutiveCorrect: 0,
    audioContext: null,
    gameMode: 'single', // 'single' 或 'multi'
    pressedKeys: new Set(), // 用于存储当前按下的琴键
    lastAnswer: true // 记录上一次答题是否正确
};

// DOM 元素
const piano = document.getElementById('piano');
const playButton = document.getElementById('playButton');
const selectButton = document.getElementById('selectButton');
const clearButton = document.getElementById('clearButton');
const submitButton = document.getElementById('submitButton');
const hintButton = document.getElementById('hintButton');
const noteCountSelect = document.getElementById('noteCount');
const gameModeSelect = document.getElementById('gameMode');
const messageDiv = document.getElementById('message');
const selectedNotesDiv = document.getElementById('selectedNotes');

// 初始化音频上下文
function initAudioContext() {
    if (!gameState.audioContext) {
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 创建钢琴键盘
function createPianoKeys() {
    const whiteKeys = notes.filter(note => !note.key.includes('#'));
    const blackKeys = notes.filter(note => note.key.includes('#'));

    // 创建白键
    whiteKeys.forEach((note, index) => {
        const key = document.createElement('div');
        key.className = 'white-key';
        key.dataset.note = note.key;
        key.innerHTML = `<div class="key-label">${note.label}</div>`;
        key.addEventListener('click', () => handleKeyClick(note));
        piano.appendChild(key);
    });

    // 创建黑键
    blackKeys.forEach((note, index) => {
        const key = document.createElement('div');
        key.className = 'black-key';
        key.dataset.note = note.key;
        // 计算黑键的位置，使其位于对应白键的连接处中间，并向右偏移半个黑键宽度
        const whiteKeyWidth = document.querySelector('.white-key').offsetWidth;
        const blackKeyWidth = document.querySelector('.black-key')?.offsetWidth || whiteKeyWidth * 0.6;
        let leftPosition;
        if (index === 0) leftPosition = whiteKeyWidth * 0.75 + blackKeyWidth / 2;  // C#
        else if (index === 1) leftPosition = whiteKeyWidth * 1.75 + blackKeyWidth / 2;  // D#
        else if (index === 2) leftPosition = whiteKeyWidth * 3.75 + blackKeyWidth / 2;  // F#
        else if (index === 3) leftPosition = whiteKeyWidth * 4.75 + blackKeyWidth / 2;  // G#
        else leftPosition = whiteKeyWidth * 5.75 + blackKeyWidth / 2;  // A#
        key.style.left = `${leftPosition}px`;
        key.innerHTML = `<div class="key-label">${note.label}</div>`;
        key.addEventListener('click', () => handleKeyClick(note));
        piano.appendChild(key);
    });
}

// 生成随机音符
function generateRandomNotes() {
    if (!gameState.lastAnswer) return; // 如果上一次答错，不生成新音符
    
    const count = parseInt(noteCountSelect.value);
    gameState.currentNotes = [];
    gameState.selectedNotes = [];
    
    for (let i = 0; i < count; i++) {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        gameState.currentNotes.push(randomNote);
    }
}

// 播放音符
async function playNote(frequency, duration = 1) {
    initAudioContext();
    const oscillator = gameState.audioContext.createOscillator();
    const gainNode = gameState.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(gameState.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.5, gameState.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, gameState.audioContext.currentTime + duration);

    oscillator.start();
    oscillator.stop(gameState.audioContext.currentTime + duration);

    return new Promise(resolve => setTimeout(resolve, duration * 1000));
}

// 播放当前音符序列
async function playCurrentNotes() {
    playButton.disabled = true;
    if (gameState.gameMode === 'single') {
        // 单音符模式：逐个播放
        for (const note of gameState.currentNotes) {
            await playNote(note.frequency);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    } else {
        // 多音符模式：同时播放
        await Promise.all(gameState.currentNotes.map(note => playNote(note.frequency)));
    }
    playButton.disabled = false;
}

// 处理琴键点击
function handleKeyClick(note) {
    const keyElement = document.querySelector(`[data-note="${note.key}"]`);

    // 无论是否在选择模式下都播放音符
    keyElement.classList.add('pressed');
    playNote(note.frequency, 0.5);
    setTimeout(() => {
        keyElement.classList.remove('pressed');
    }, 200);

    if (!gameState.isSelecting) {
        return;
    }

    // 选择模式
    const currentIndex = gameState.selectedNotes.length;
    if (currentIndex < gameState.currentNotes.length) {
        gameState.selectedNotes.push(note);
        keyElement.classList.add('selected');
        updateSelectedNotesDisplay();
        updateSelectButtonState();
    }
}

// 更新已选音符显示
function updateSelectedNotesDisplay() {
    selectedNotesDiv.textContent = `当前已选音符：${gameState.selectedNotes.map(note => note.label).join(', ')}`;
}

// 清除选择
function clearSelection() {
    gameState.selectedNotes = [];
    gameState.isSelecting = false;
    document.querySelectorAll('.white-key, .black-key').forEach(key => {
        key.classList.remove('selected');
    });
    selectButton.classList.remove('active');
    selectButton.disabled = false;
    selectedNotesDiv.textContent = '';
}

// 检查答案
function checkAnswer() {
    if (gameState.selectedNotes.length !== gameState.currentNotes.length) return;

    // 多音符模式下，不考虑顺序
    let isCorrect;
    if (gameState.gameMode === 'multi') {
        const currentNoteKeys = new Set(gameState.currentNotes.map(note => note.key));
        const selectedNoteKeys = new Set(gameState.selectedNotes.map(note => note.key));
        isCorrect = currentNoteKeys.size === selectedNoteKeys.size && 
            [...currentNoteKeys].every(key => selectedNoteKeys.has(key));
    } else {
        isCorrect = gameState.selectedNotes.every((note, index) => 
            note.key === gameState.currentNotes[index].key
        );
    }

    gameState.lastAnswer = isCorrect;

    if (isCorrect) {
        gameState.consecutiveCorrect++;
        messageDiv.textContent = gameState.consecutiveCorrect > 1 
            ? `连续答对${gameState.consecutiveCorrect}次！` 
            : '答对了！';
        generateRandomNotes();
    } else {
        gameState.consecutiveCorrect = 0;
        messageDiv.textContent = '答错了，请重试！';
    }

    clearSelection();
}

// 事件监听器
playButton.addEventListener('click', () => {
    initAudioContext();
    playCurrentNotes();
});

selectButton.addEventListener('click', () => {
    gameState.isSelecting = true;
    selectButton.classList.add('active');
});

clearButton.addEventListener('click', clearSelection);

// 在选择完所有音符后禁用选择按钮
function updateSelectButtonState() {
    if (gameState.selectedNotes.length === gameState.currentNotes.length) {
        selectButton.disabled = true;
        selectButton.classList.remove('active');
    }
}

// 添加键盘释放事件监听
piano.addEventListener('mouseup', () => {
    if (gameState.gameMode === 'multi' && !gameState.isSelecting) {
        // 清除所有按下的琴键状态
        gameState.pressedKeys.clear();
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.classList.remove('pressed');
        });
    }
});

// 显示提示
async function showHint() {
    const keys = document.querySelectorAll('.white-key, .black-key');
    keys.forEach(key => {
        const isCorrect = gameState.currentNotes.some(note => note.key === key.dataset.note);
        if (isCorrect) {
            key.style.backgroundColor = '#ffd700';
        }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    keys.forEach(key => {
        key.style.backgroundColor = '';
    });
}

// 添加游戏模式切换事件监听
gameModeSelect.addEventListener('change', (e) => {
    gameState.gameMode = e.target.value;
    clearSelection();
    gameState.lastAnswer = true; // 重置答题状态
    generateRandomNotes();
    messageDiv.textContent = '';
    gameState.consecutiveCorrect = 0;

    // 根据游戏模式显示/隐藏提示按钮和调整音符数量
    if (gameState.gameMode === 'multi') {
        hintButton.style.display = 'inline-block';
        if (noteCountSelect.value === '1') {
            noteCountSelect.value = '2';
        }
    } else {
        hintButton.style.display = 'none';
    }
});

// 添加提示按钮事件监听
hintButton.addEventListener('click', showHint);

submitButton.addEventListener('click', () => {
    if (gameState.selectedNotes.length === gameState.currentNotes.length) {
        checkAnswer();
    }
});

noteCountSelect.addEventListener('change', () => {
    clearSelection();
    generateRandomNotes();
    messageDiv.textContent = '';
    gameState.consecutiveCorrect = 0;
});

// 初始化游戏
createPianoKeys();
generateRandomNotes();