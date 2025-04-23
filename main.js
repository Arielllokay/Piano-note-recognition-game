// 音符数据
const notes = [
    { note: 'C4', frequency: 261.63 },
    { note: 'C#4', frequency: 277.18 },
    { note: 'D4', frequency: 293.66 },
    { note: 'D#4', frequency: 311.13 },
    { note: 'E4', frequency: 329.63 },
    { note: 'F4', frequency: 349.23 },
    { note: 'F#4', frequency: 369.99 },
    { note: 'G4', frequency: 392.00 },
    { note: 'G#4', frequency: 415.30 },
    { note: 'A4', frequency: 440.00 },
    { note: 'A#4', frequency: 466.16 },
    { note: 'B4', frequency: 493.88 }
];

// 音频上下文
let audioContext = null;

// 游戏状态
let currentSequence = [];
let playerSequence = [];
let isPlaying = false;
let canSelect = false;
let canPlay = true; // 控制播放按钮是否可用
let selectedNoteCount = 1; // 用户选择的音符数量
let playCount = 0; // 播放次数计数器

// DOM 元素
const playButton = document.getElementById('playButton');
const selectButton = document.getElementById('selectButton');
const previewButton = document.getElementById('previewButton');
const submitButton = document.getElementById('submitButton');
const resultDiv = document.getElementById('result');
const keys = document.querySelectorAll('.key');
const selectedNotesDiv = document.getElementById('selectedNotes');
const lockedNotesDiv = document.getElementById('lockedNotes');

// 创建音符数量选择器
const noteCountSelector = document.createElement('select');
noteCountSelector.id = 'noteCountSelector';
for (let i = 1; i <= 8; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.text = `${i}个音符`;
    noteCountSelector.appendChild(option);
}
const selectorLabel = document.createElement('label');
selectorLabel.htmlFor = 'noteCountSelector';
selectorLabel.textContent = '选择音符数量：';
document.querySelector('.game-controls').insertBefore(selectorLabel, playButton);
document.querySelector('.game-controls').insertBefore(noteCountSelector, playButton);

// 音符数量选择事件
noteCountSelector.addEventListener('change', (e) => {
    selectedNoteCount = parseInt(e.target.value);
});

// 初始化音频上下文
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// 播放单个音符
function playNote(frequency, duration = 0.5) {
    const now = audioContext.currentTime;
    
    // 创建主振荡器和增益节点
    const mainOscillator = audioContext.createOscillator();
    const mainGain = audioContext.createGain();
    
    // 创建谐波振荡器和增益节点
    const harmonics = [
        { frequency: 2, gain: 0.5 },    // 第一泛音
        { frequency: 3, gain: 0.25 },   // 第二泛音
        { frequency: 4, gain: 0.125 }   // 第三泛音
    ];
    
    const harmonicOscillators = harmonics.map(h => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.frequency.value = frequency * h.frequency;
        gain.gain.value = h.gain;
        osc.connect(gain);
        gain.connect(mainGain);
        return osc;
    });
    
    // 设置主音色
    mainOscillator.type = 'triangle';
    mainOscillator.frequency.value = frequency;
    mainOscillator.connect(mainGain);
    mainGain.connect(audioContext.destination);
    
    // ADSR包络控制
    const attack = 0.02;  // 起音时间
    const decay = 0.1;    // 衰减时间
    const sustain = 0.7;  // 持续音量
    const release = 0.3;  // 释音时间
    
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(1, now + attack);
    mainGain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    mainGain.gain.setValueAtTime(sustain, now + duration - release);
    mainGain.gain.linearRampToValueAtTime(0, now + duration);
    
    // 启动所有振荡器
    mainOscillator.start(now);
    harmonicOscillators.forEach(osc => osc.start(now));
    
    // 停止所有振荡器
    mainOscillator.stop(now + duration);
    harmonicOscillators.forEach(osc => osc.stop(now + duration));
}

// 生成随机音符序列
function generateSequence() {
    currentSequence = [];
    for (let i = 0; i < selectedNoteCount; i++) {
        currentSequence.push(notes[Math.floor(Math.random() * notes.length)]);
    }
}

// 播放当前序列
async function playSequence() {
    if (!audioContext) initAudio();
    isPlaying = true;
    playButton.disabled = true;

    for (const note of currentSequence) {
        playNote(note.frequency);
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    isPlaying = false;
    playButton.disabled = false;
}

// 处理键盘点击
function handleKeyClick(event) {
    if (isPlaying) return;

    const key = event.target;
    const note = notes.find(n => n.note === key.dataset.note);

    if (note) {
        // 移除其他键的active状态
        keys.forEach(k => k.classList.remove('active'));
        // 添加当前键的active状态
        key.classList.add('active');
        
            if (!audioContext) initAudio();
        playNote(note.frequency, 0.8);

        // 更新玩家序列
        playerSequence = [];
        playerSequence.push(note);
        // 更新试弹音符显示
        selectedNotesDiv.textContent = '当前音符：' + note.note.replace('4', '');
    }
}

// 选择当前音符
function selectCurrentNote() {
    const currentNotes = lockedNotesDiv.textContent.split('：')[1] || '';
    const selectedCount = currentNotes ? currentNotes.split(' ').filter(n => n).length : 0;
    
    // 如果已经选择了足够的音符，则清除所有选择
    if (selectedCount === currentSequence.length) {
        lockedNotesDiv.textContent = '已选择的音符：';
        selectedNotesDiv.textContent = '当前音符：';
        selectButton.textContent = '选择';
        canSelect = true;
        selectButton.disabled = false;
        return;
    }
    
    // 否则添加新的音符
    if (playerSequence.length === 0) return;
    
    const selectedNote = playerSequence[0];
    const updatedNotes = currentNotes ? currentNotes + ' ' + selectedNote.note.replace('4', '') : selectedNote.note.replace('4', '');
    
    // 更新已选择音符显示
    lockedNotesDiv.textContent = '已选择的音符：' + updatedNotes;
    selectedNotesDiv.textContent = '当前音符：';
    playerSequence = [];
    
    // 检查是否已选择足够的音符
    if (updatedNotes.split(' ').filter(n => n).length === currentSequence.length) {
        selectButton.textContent = '清除';
    }
}

// 检查答案
function checkAnswer() {
    const selectedNotes = lockedNotesDiv.textContent.split('：')[1].split(' ');
    
    if (selectedNotes.length !== currentSequence.length) {
        resultDiv.textContent = '请选择正确数量的音符！';
        resultDiv.style.color = 'red';
        return;
    }

    const correct = selectedNotes.every((note, index) => 
        note === currentSequence[index].note.replace('4', '')
    );

    if (correct) {
        resultDiv.textContent = '答对了！';
        resultDiv.style.color = 'green';
        // 答对时才重新启用播放按钮，允许开始新的游戏
        canPlay = true;
        playButton.disabled = false;
    } else {
        resultDiv.textContent = '答错了，请重试！';
        resultDiv.style.color = 'red';
        // 答错时重置选择状态，允许重新选择
        canSelect = true;
        selectButton.disabled = false;
        lockedNotesDiv.textContent = '已选择的音符：';
        // 答错时允许重新播放当前序列
        playButton.disabled = false;
    }

    // 重置玩家当前选择状态
    playerSequence = [];
    selectedNotesDiv.textContent = '当前音符：';
    keys.forEach(key => key.classList.remove('active'));
}

// 事件监听器
// 创建播放次数显示元素
const playCountDiv = document.createElement('div');
playCountDiv.style.position = 'absolute';
playCountDiv.style.top = '-10px';
playCountDiv.style.right = '-10px';
playCountDiv.style.backgroundColor = 'red';
playCountDiv.style.color = 'white';
playCountDiv.style.borderRadius = '50%';
playCountDiv.style.width = '20px';
playCountDiv.style.height = '20px';
playCountDiv.style.display = 'none';
playCountDiv.style.justifyContent = 'center';
playCountDiv.style.alignItems = 'center';
playCountDiv.style.fontSize = '12px';
playButton.style.position = 'relative';
playButton.appendChild(playCountDiv);

playButton.addEventListener('click', () => {
    if (!canPlay) {
        // 如果不能开始新游戏，则重新播放当前序列
        playCount++;
        playCountDiv.textContent = playCount;
        playCountDiv.style.display = 'flex';
        playSequence();
        return;
    }
    // 重置播放次数
    playCount = 0;
    playCountDiv.style.display = 'none';
    generateSequence();
    playerSequence = [];
    canSelect = false;
    selectButton.disabled = false;
    keys.forEach(key => key.classList.remove('active'));
    resultDiv.textContent = '';
    selectedNotesDiv.textContent = '当前音符：';
    lockedNotesDiv.textContent = '已选择的音符：';
    canPlay = false; // 禁用播放按钮
    playButton.disabled = true;
    playSequence().then(() => {
        canSelect = true;
    });
});

selectButton.addEventListener('click', () => {
    if (canSelect) {
        selectCurrentNote();
    }
});

// 播放已选择的音符序列
async function playSelectedNotes() {
    if (!audioContext) initAudio();
    const selectedNotes = lockedNotesDiv.textContent.split('：')[1];
    if (!selectedNotes) return;
    
    const noteArray = selectedNotes.split(' ').filter(n => n);
    isPlaying = true;
    previewButton.disabled = true;
    
    for (const noteName of noteArray) {
        const note = notes.find(n => n.note.replace('4', '') === noteName);
        if (note) {
            playNote(note.frequency);
            await new Promise(resolve => setTimeout(resolve, 700));
        }
    }
    
    isPlaying = false;
    previewButton.disabled = false;
}

submitButton.addEventListener('click', checkAnswer);

previewButton.addEventListener('click', () => {
    if (!isPlaying) {
        playSelectedNotes();
    }
});

keys.forEach(key => {
    key.addEventListener('click', handleKeyClick);
});