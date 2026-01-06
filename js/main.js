const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const boardEl = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');
const scoreEl = document.getElementById('score');
const newWordBtn = document.getElementById('new-word');
const themeToggle = document.getElementById('theme-toggle');

let dictionary = [];
let dictionarySet = new Set();
let solution = '';
let currentRow = 0;
let currentCol = 0;
let board = Array.from({length: MAX_GUESSES}, () => Array(WORD_LENGTH).fill(''));

function init() {
    buildBoard();
    buildKeyboard();
    loadDictionary().then(()=>{
        pickNewWord();
    });
    attachListeners();
    // apply saved theme
    if(localStorage.getItem('theme') === 'dark'){
        document.documentElement.classList.add('dark');
        themeToggle.checked = true;
    }
}

function loadDictionary(){
    return fetch('dictionary.txt')
        .then(r=>r.text())
        .then(text=>{
            dictionary = text.split(/\r?\n/)
                .map(w=>w.trim())
                .filter(w=>w.length===WORD_LENGTH)
                .map(w=>w.toLowerCase());
            dictionarySet = new Set(dictionary);
            if(dictionary.length===0) console.warn('Dictionary loaded empty.');
        })
        .catch(err=>{
            console.error('Failed to load dictionary.txt', err);
        });
}

function pickNewWord(){
    if(dictionary.length===0){
        solution = 'crane';
    } else {
        solution = dictionary[Math.floor(Math.random()*dictionary.length)];
    }
    resetBoard();
    updateScore();
}

function resetBoard(){
    currentRow = 0; currentCol = 0;
    board = Array.from({length: MAX_GUESSES}, () => Array(WORD_LENGTH).fill(''));
    for(let r=0;r<MAX_GUESSES;r++){
        for(let c=0;c<WORD_LENGTH;c++){
            const tile = document.querySelector(`#tile-${r}-${c}`);
            tile.textContent='';
            tile.className='tile';
        }
    }
    for(const key of document.querySelectorAll('.key')){
        key.classList.remove('correct','present','absent');
    }
}

function updateScore(){
    let display = `${currentRow}/${MAX_GUESSES}`;
    scoreEl.textContent = display;
}

function buildBoard(){
    boardEl.innerHTML='';
    for(let r=0;r<MAX_GUESSES;r++){
        const row = document.createElement('div');
        row.className='row';
        for(let c=0;c<WORD_LENGTH;c++){
            const tile = document.createElement('div');
            tile.className='tile';
            tile.id = `tile-${r}-${c}`;
            row.appendChild(tile);
        }
        boardEl.appendChild(row);
    }
}

const KEYS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['Enter','z','x','c','v','b','n','m','Backspace']
];

function buildKeyboard(){
    keyboardEl.innerHTML='';
    for(const row of KEYS){
        const rowEl = document.createElement('div');
        rowEl.className='key-row';
        for(const k of row){
            const key = document.createElement('div');
            key.className='key';
            key.textContent = k === 'Backspace' ? '⌫' : (k === 'Enter' ? 'Enter' : k.toUpperCase());
            if(k==='Enter' || k==='Backspace') key.classList.add('wide');
            key.dataset.key = k;
            key.addEventListener('click', ()=>handleKey(k));
            rowEl.appendChild(key);
        }
        keyboardEl.appendChild(rowEl);
    }
}

function attachListeners(){
    window.addEventListener('keydown', (e)=>{
        const k = e.key;
        if(k.length===1 && /[a-zA-Z]/.test(k)){
            handleKey(k.toLowerCase());
        } else if(k === 'Enter') handleKey('Enter');
        else if(k === 'Backspace') handleKey('Backspace');
    });
    newWordBtn.addEventListener('click', ()=>{
        pickNewWord();
    });
    themeToggle.addEventListener('change', (e)=>{
        if(e.target.checked){
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme','dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme','light');
        }
    });
}

function handleKey(k){
    if(k === 'Enter') return submitGuess();
    if(k === 'Backspace') return deleteLetter();
    if(currentRow >= MAX_GUESSES) return;
    if(currentCol >= WORD_LENGTH) return;
    board[currentRow][currentCol] = k;
    const tile = document.querySelector(`#tile-${currentRow}-${currentCol}`);
    tile.textContent = k.toUpperCase();
    tile.classList.add('filled');
    currentCol++;
}

function deleteLetter(){
    if(currentCol === 0) return;
    currentCol--;
    board[currentRow][currentCol] = '';
    const tile = document.querySelector(`#tile-${currentRow}-${currentCol}`);
    tile.textContent='';
    tile.className='tile';
}

function submitGuess(){
    if(currentCol !== WORD_LENGTH) return; // not enough letters
    const guess = board[currentRow].join('');
    // validate guess exists in dictionary
    if(!dictionarySet.has(guess)){
        alert('Not in word list');
        return;
    }
    evaluateGuess(guess);
}

function evaluateGuess(guess){
    const guessNumber = currentRow + 1; // capture the guess number before any changes
    const solutionChars = solution.split('');
    const guessChars = guess.split('');
    const result = Array(WORD_LENGTH).fill('absent');

    // first pass for correct
    const solMarked = Array(WORD_LENGTH).fill(false);
    for(let i=0;i<WORD_LENGTH;i++){
        if(guessChars[i] === solutionChars[i]){
            result[i] = 'correct';
            solMarked[i] = true;
        }
    }
    // second pass for present (wrong position)
    for(let i=0;i<WORD_LENGTH;i++){
        if(result[i] === 'correct') continue;
        const idx = solutionChars.findIndex((ch, j)=> ch === guessChars[i] && !solMarked[j]);
        if(idx !== -1){
            result[i] = 'present';
            solMarked[idx] = true;
        }
    }

    // apply classes to tiles and update keyboard
    for(let i=0;i<WORD_LENGTH;i++){
        const tile = document.querySelector(`#tile-${currentRow}-${i}`);
        tile.classList.add(result[i]);
        // update key
        const keyEl = Array.from(document.querySelectorAll('.key')).find(k=>k.dataset.key === guessChars[i] || k.dataset.key === guessChars[i].toLowerCase());
        if(keyEl){
            // priorities: correct > present > absent
            if(result[i] === 'correct'){
                keyEl.classList.remove('present','absent');
                keyEl.classList.add('correct');
            } else if(result[i] === 'present'){
                if(!keyEl.classList.contains('correct')){
                    keyEl.classList.remove('absent');
                    keyEl.classList.add('present');
                }
            } else {
                if(!keyEl.classList.contains('correct') && !keyEl.classList.contains('present')){
                    keyEl.classList.add('absent');
                }
            }
        }
    }

    if(guess === solution){
        setTimeout(()=>{
            alert(`Nice! You got it in ${guessNumber}/${MAX_GUESSES} guesses.`);
        },100);
        currentRow = MAX_GUESSES; // lock further input
        return;
    }

    currentRow++;
    currentCol=0;
    updateScore();

    if(currentRow >= MAX_GUESSES){
        setTimeout(()=>{
            alert(`Out of guesses — the word was: ${solution.toUpperCase()}`);
        },100);
    }
}

init();
