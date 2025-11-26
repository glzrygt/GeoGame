// --- VARIABLES ---
let map;
let allProvincesData = []; 
let geoJsonLayer;       
let isGameActive = false;
let currentQuestion = null;
let feedbackMarker = null;

let gameTimer;          
let timeLeft = 60;      
let score = 0;          
let lives = 3;          
let roadTripAudio;      
let isMuted = false;    

const introScreen = document.getElementById('intro-screen');
const introContent = document.getElementById('intro-content');


// --- INITIALIZATION ---

function initializeMap() {
    // Initialize Leaflet Map
    map = L.map('map', {
        center: [39.0, 35.0],
        zoom: 6,
        zoomControl: false,
        attributionControl: false
    });

    // Invisible tile layer for technical stability
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        opacity: 0 
    }).addTo(map);

    // Restrict map to Turkey
    map.setMaxBounds([[35, 25], [43, 45]]);
    map.setMinZoom(5);
}

function loadProvinceData() {
    // 1. Load GeoJSON
    d3.json('data/turkey_provinces.geojson')
        .then(geojson => {
            console.log("GeoJSON Loaded.");
            addGeoJsonToMap(geojson);
        })
        .catch(err => {
            console.error("GeoJSON Failed!", err);
            alert("Map data failed to load. Check console.");
        });

    // 2. Load Game Data
    d3.json('data/provinces.json') 
        .then(data => {
            allProvincesData = data;
            console.log("Game Data Loaded.");
        })
        .catch(err => console.error("provinces.json failed!", err));
}

function addGeoJsonToMap(geojson) {
    function onEachFeature(feature, layer) {
        // Store name from GeoJSON properties
        layer.provinceName = feature.properties.name || feature.properties.NAME_1 || feature.properties.ad; 
        layer.on({ click: handlePolygonClick });
    }

    geoJsonLayer = L.geoJson(geojson, {
        onEachFeature: onEachFeature
    }).addTo(map);
    
    // Start Intro
    startIntroSequence();
}


// --- INTRO & FLOW ---

function startIntroSequence() {
    if(introContent) {
        introContent.innerHTML = `<div style="font-size:3em;">🔊 <br>Please turn on your sound</div>`;
    }
    
    // Audio Setup
    roadTripAudio = new Audio('audio/road_trip_song.mp3');
    roadTripAudio.volume = 0.3;
    roadTripAudio.loop = true;
    roadTripAudio.play().catch(() => console.log("Autoplay blocked."));

    // Transition to Start Screen
    setTimeout(() => {
        if(introScreen) introScreen.classList.add('hidden');
        const modal = document.getElementById('modal');
        if(modal) modal.classList.add('active');
        const promptBar = document.getElementById('prompt-bar');
        if(promptBar) promptBar.innerHTML = "Game Ready...";
    }, 3000);
}

function startCountdown() {
    document.getElementById('modal').classList.remove('active');
    
    if(introScreen) {
        introScreen.classList.remove('hidden');
        introScreen.style.background = "rgba(0,0,0,0.8)"; 
    }
    
    let count = 3;
    if(introContent) introContent.innerHTML = `<div class="countdown-number">${count}</div>`;
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            if(introContent) introContent.innerHTML = `<div class="countdown-number">${count}</div>`;
        } else {
            clearInterval(countdownInterval);
            if(introScreen) introScreen.classList.add('hidden');
            realGameStart(); 
        }
    }, 1000);
}


// --- GAME LOGIC ---

function triggerGameStart() {
    // Fade out music
    if(roadTripAudio) {
        let vol = roadTripAudio.volume;
        let fade = setInterval(() => {
            if(vol > 0.05) { vol -= 0.05; roadTripAudio.volume = vol; }
            else { clearInterval(fade); roadTripAudio.pause(); }
        }, 100);
    }
    startCountdown();
}

function realGameStart() {
    score = 0;
    lives = 3;
    timeLeft = 60;
    isGameActive = true;
    
    if (geoJsonLayer) geoJsonLayer.resetStyle();

    gameTimer = setInterval(updateTimer, 1000); 
    loadNewQuestion();
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');

    if(timerEl) timerEl.innerText = `Time: ${timeLeft}`;
    if(scoreEl) scoreEl.innerText = `Score: ${score}`;
    
    let hearts = "";
    for(let i=0; i<lives; i++) hearts += "❤️ ";
    if(livesEl) livesEl.innerText = `Lives: ${hearts}`;
}

function updateTimer() {
    timeLeft--;
    updateStatsDisplay();
    if (timeLeft <= 0) {
        clearInterval(gameTimer);
        endGame('Time is Up!');
    }
}

function loadNewQuestion() {
    if (!isGameActive || allProvincesData.length === 0) return;

    // Filter valid game modes
    const validProvinces = allProvincesData.filter(p => p.gameMode === 'audio' || p.gameMode === 'plate');
    if (validProvinces.length === 0) return;

    const randomIndex = Math.floor(Math.random() * validProvinces.length);
    currentQuestion = validProvinces[randomIndex]; 
    
    const promptBar = document.getElementById('prompt-bar');
    promptBar.style.backgroundColor = '#ecf0f1';
    promptBar.style.color = '#2c3e50';

    if (currentQuestion.gameMode === 'plate') {
        promptBar.innerHTML = `Question: Which province? <span class="question-data">PLATE: ${currentQuestion.plaka}</span>`;
    } else {
        promptBar.innerHTML = `Question: Whose melody is this? <button id="play-melody-button">PLAY 🎵</button>`;
        setTimeout(() => {
            const btn = document.getElementById('play-melody-button');
            if(btn) {
                btn.addEventListener('click', () => {
                    const audio = new Audio(currentQuestion.audioUrl);
                    if(!isMuted) audio.play();
                });
            }
        }, 0);
    }
}

function handlePolygonClick(e) {
    if (!isGameActive || !currentQuestion) return;
    
    const clickedName = e.target.provinceName;
    const isCorrect = (clickedName === currentQuestion.il);

    if (isCorrect) {
        score += 500;
        displayFeedback("✅ CORRECT!", "#27ae60");
        e.target.setStyle({ fill: '#2ecc71', fillColor: '#2ecc71' }); 
    } else {
        lives--;
        score -= 50;
        displayFeedback("❌ WRONG!", "#c0392b");
        e.target.setStyle({ fill: '#e74c3c', fillColor: '#e74c3c' });
        
        if (lives <= 0) endGame('Game Over!');
    }
    
    setTimeout(() => {
        if(isGameActive && geoJsonLayer) {
            geoJsonLayer.resetStyle(e.target);
            loadNewQuestion();
            updateStatsDisplay();
        }
    }, 1000);
}

function displayFeedback(msg, color) {
    const bar = document.getElementById('prompt-bar');
    if(bar) {
        bar.innerHTML = msg;
        bar.style.backgroundColor = color;
        bar.style.color = 'white';
    }
}

// --- FIXED END GAME FUNCTION ---
function endGame(reason) {
    isGameActive = false;
    clearInterval(gameTimer);
    
    const modal = document.getElementById('modal');
    if(modal) {
        modal.style.display = 'flex'; // Ensure flex display
        modal.classList.add('active');
        
        const h2 = modal.querySelector('h2');
        if(h2) h2.innerText = reason;
        
        const p = modal.querySelector('p');
        if(p) p.innerText = `Final Score: ${score}`;
        
        const btn = document.getElementById('start-button');
        if(btn) btn.innerText = "Play Again";
    }
}

// --- ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadProvinceData();
    
    // Start Button Listener
    const startBtn = document.getElementById('start-button');
    if(startBtn) {
        startBtn.addEventListener('click', triggerGameStart);
    }

    // Mute Button Listener
    const muteBtn = document.getElementById('mute-button');
    if(muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            muteBtn.innerText = isMuted ? "🔇" : "🔊";
            if(roadTripAudio) roadTripAudio.muted = isMuted;
        });
    }
});