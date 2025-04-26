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
    const ctx = gameState.audioContext;
    const now = ctx.currentTime;

    // 创建主音色和谐波
    const oscillators = [];
    const gains = [];
    
    // 谐波比例
    const harmonics = [
        { freq: 1, gain: 0.7 },    // 基频
        { freq: 2, gain: 0.15 },   // 第一泛音
        { freq: 3, gain: 0.1 },    // 第二泛音
        { freq: 4, gain: 0.05 }    // 第三泛音
    ];

    // 创建主音色和谐波
    harmonics.forEach(({ freq, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = frequency * freq;
        
        // 音量包络
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);  // 快速起音
        gainNode.gain.exponentialRampToValueAtTime(gain * 0.3, now + 0.1);  // 快速衰减
        gainNode.gain.exponentialRampToValueAtTime(gain * 0.15, now + 0.2); // 延音
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);  // 释音

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillators.push(osc);
        gains.push(gainNode);
    });

    // 添加轻微的噪声模拟琴弦振动
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseBuffer.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 启动所有音频源
    oscillators.forEach(osc => osc.start(now));
    noise.start(now);

    // 停止所有音频源
    oscillators.forEach(osc => osc.stop(now + duration));
    noise.stop(now + duration);

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