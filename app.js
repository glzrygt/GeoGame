// Course: GMT 458 - Internet Based Geographical Information Systems
// Project: Hometown Game (Turkey Trip)
// Description: Main game logic handling map interactions, scoring, and timers.

// --- GLOBAL VARIABLES ---
let map;
let allProvincesData = []; 
let availableQuestions = []; 
let geoJsonLayer;       
let isGameActive = false;
let currentQuestion = null;
let isProcessingAnswer = false; // LOCK: Prevents double clicking

// Game State Variables
let gameTimer;          
let timeLeft = 10;      
let score = 0;          
let lives = 3;          
let gameAudio;          
let introMusic;         
let isMuted = false;    

// --- 1. ASSETS ---
const badgeAssets = [
    'images/rozet1.png', 'images/rozet2.png', 'images/rozet3.png',
    'images/rozet4.png', 'images/rozet5.png', 'images/rozet6.png', 'images/rozet7.png'
];

const transitionAssets = [
    { type: 'img', src: 'images/karadeniz.png' },
    { type: 'img', src: 'images/ege.png' },
    { type: 'img', src: 'images/anitkabir.png' }, 
    { type: 'img', src: 'images/ege-peri.png' },
    { type: 'img', src: 'images/peri.png' }
];

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadProvinceData();
    createFunStartScreen();
});

// --- 3. START SCREEN LOGIC (Phase 1 & 2) ---

function createFunStartScreen() {
    const body = document.body;
    
    // Clean up old elements
    const existing = document.getElementById('pre-start-screen');
    if(existing) existing.remove();
    const goScreen = document.getElementById('game-over-screen');
    if(goScreen) goScreen.remove();

    // PHASE 1: Title and Button over 'ege-peri.png'
    const screen = document.createElement('div');
    screen.id = 'pre-start-screen';
    
    // Inner HTML with Title, Subtitle, and Button
    screen.innerHTML = `
        <div id="start-content-wrapper" style="text-align:center;">
            <h1 class="pre-start-title">TURKEY TRIP</h1>
            <div class="pre-start-subtitle">GEO GAME ADVENTURE 🌍</div>
            <button id="init-btn">START JOURNEY ▶</button>
        </div>
        
        <div id="instruction-text-box" class="instruction-text-overlay">
            Please ensure your speaker is on 🔊<br><br>
            Guess which city is the next stop?<br>
            Can you guess by plate or local melody?<br><br>
            We'll see who's the Anatolian star in this game...
        </div>
    `;
    body.appendChild(screen);

    // Event Listener for the Button
    document.getElementById('init-btn').addEventListener('click', () => {
        // Switch to PHASE 2
        document.getElementById('start-content-wrapper').style.display = 'none';
        const instructions = document.getElementById('instruction-text-box');
        instructions.style.display = 'block';

        // Wait for reading time, then start Video Intro
        setTimeout(() => {
            screen.style.opacity = '0'; // Fade out image
            setTimeout(() => {
                screen.remove();
                runCinematicIntro(); // Start Video
            }, 1000);
        }, 6000); // Reading time: 6 seconds
    });
}

function initializeMap() {
    if(map) return;
    map = L.map('map', { center: [39.0, 35.0], zoom: 6, zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { opacity: 0 }).addTo(map);
    map.setMaxBounds([[35, 25], [43, 45]]);
    map.setMinZoom(5);
}

function loadProvinceData() {
    if(allProvincesData.length > 0) return;
    d3.json('data/turkey_provinces.geojson').then(geo => addGeoJsonToMap(geo)).catch(e => console.error("GeoJSON Error", e));
    d3.json('data/provinces.json').then(data => { allProvincesData = data; }).catch(e => console.error("Data Error", e));
}

function addGeoJsonToMap(geojson) {
    if(geoJsonLayer) map.removeLayer(geoJsonLayer);
    geoJsonLayer = L.geoJson(geojson, {
        onEachFeature: (feature, layer) => {
            layer.provinceName = feature.properties.name; 
            layer.on({ click: handlePolygonClick });
        }
    }).addTo(map);
}

// --- 4. CINEMATIC INTRO (VIDEO) ---

function runCinematicIntro() {
    const body = document.body;
    
    const videoLayer = document.createElement('div');
    videoLayer.id = 'intro-video-layer';
    videoLayer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; z-index:5000; opacity:0; transition:opacity 1s;";
    videoLayer.innerHTML = `<video id="intro-video" src="images/video1.mp4" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>`;
    body.appendChild(videoLayer);

    const overlayText = document.createElement('div');
    overlayText.id = 'overlay-text-layer';
    overlayText.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:5600; opacity:0; transition:opacity 1s; pointer-events:none;";
    overlayText.innerHTML = `
        <div style="font-size: 3em;">ARE YOU READY FOR THE</div>
        <div style="font-size: 6em; margin-top: -20px;">TÜRKİYE TRIP?</div>
    `;
    body.appendChild(overlayText);

    const menuLayer = document.createElement('div');
    menuLayer.id = 'menu-layer';
    menuLayer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:black; color:white; z-index:7000; transition:opacity 1s;";
    menuLayer.innerHTML = `<button id="start-game-btn">START GAME</button>`;
    body.appendChild(menuLayer);

    setTimeout(() => {
        introMusic = new Audio('audio/intro.mp3');
        introMusic.volume = 0.6;
        introMusic.loop = true; 

        const videoEl = document.getElementById('intro-video');
        videoEl.play();
        introMusic.play().catch(e => console.log("Audio blocked"));
        
        videoLayer.style.opacity = 1;

        let playCount = 0;
        videoEl.onended = () => {
            playCount++;
            if (playCount === 1) {
                videoEl.currentTime = 0;
                videoEl.play();
                overlayText.style.opacity = 1;
                setTimeout(() => { finishIntroSequence(); }, 4000); 
            }
        };
        
        setTimeout(() => {
            if(document.getElementById('intro-video-layer').style.opacity !== '0') finishIntroSequence();
        }, 15000);

    }, 1000);

    function finishIntroSequence() {
        const vLayer = document.getElementById('intro-video-layer');
        const tLayer = document.getElementById('overlay-text-layer');
        const mLayer = document.getElementById('menu-layer');

        if(vLayer) vLayer.style.opacity = 0;
        if(tLayer) tLayer.style.opacity = 0;

        if(introMusic && !isMuted) {
            const fadeAudio = setInterval(() => {
                if(introMusic.volume > 0.2) introMusic.volume -= 0.05;
                else { clearInterval(fadeAudio); introMusic.volume = 0.2; }
            }, 100);
        }

        if(mLayer) mLayer.style.display = 'flex';

        setTimeout(() => {
            if(vLayer) vLayer.remove();
            if(tLayer) tLayer.remove();
        }, 1000);
    }

    document.getElementById('start-game-btn').addEventListener('click', () => {
        const menu = document.getElementById('menu-layer');
        menu.style.opacity = 0;
        setTimeout(() => {
            menu.remove();
            document.getElementById('game-ui').style.display = 'block';
            realGameStart();
        }, 1000);
    });
}

// --- 5. GAMEPLAY LOGIC ---

function realGameStart() {
    score = 0; 
    lives = 3; 
    isGameActive = true;
    
    // Reset Question Pool
    availableQuestions = [...allProvincesData.filter(p => p.gameMode === 'audio' || p.gameMode === 'plate')];
    
    if (geoJsonLayer) geoJsonLayer.resetStyle();
    document.body.classList.remove('earthquake-mode');
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if(gameOverScreen) gameOverScreen.remove();

    document.getElementById('badge-collection').innerHTML = '';
    
    loadNewQuestion();
    updateStatsDisplay();
}

function updateStatsDisplay() {
    document.getElementById('timer').innerText = `TIME: ${timeLeft}`;
    document.getElementById('score').innerText = `SCORE: ${score}`;
    document.getElementById('lives').innerText = `LIVES: ${"❤️ ".repeat(lives)}`;
    document.getElementById('lives').classList.remove('life-lost-text');
}

function startTimer() {
    clearInterval(gameTimer);
    timeLeft = 10; 
    updateStatsDisplay();
    
    gameTimer = setInterval(() => {
        timeLeft--;
        updateStatsDisplay();
        if (timeLeft <= 0) { 
            clearInterval(gameTimer); 
            triggerGameOver('TOO SLOW! TRIP CANCELLED!'); 
        }
    }, 1000);
}

function stopTimer() { clearInterval(gameTimer); }

function loadNewQuestion() {
    if (!isGameActive) return;
    if (lives <= 0) { triggerGameOver('NO LIVES LEFT!'); return; }
    if (availableQuestions.length === 0) { triggerGameOver('VICTORY! ALL CITIES VISITED!'); return; }

    isProcessingAnswer = false; // Unlock map

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[randomIndex];
    availableQuestions.splice(randomIndex, 1);
    
    if (currentQuestion.gameMode === 'audio') {
        if (introMusic) introMusic.pause();
    } else {
        if (introMusic && introMusic.paused && !isMuted) {
            introMusic.volume = 0.2;
            introMusic.play();
        }
    }

    let container = document.getElementById('question-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'question-container';
        document.body.appendChild(container);
    }
    container.className = ''; 
    
    let contentHTML = '';
    if (currentQuestion.gameMode === 'plate') {
        contentHTML = `
            <div class="plate-wrapper">
                <img src="images/plaka.jpg" class="plate-img" alt="Plate">
                <span class="plate-number">${currentQuestion.plaka}</span>
            </div>
            <div class="instruction-text"><h2>Which city has this plate?</h2></div>
        `;
    } else {
        contentHTML = `
            <div class="instruction-text"><h2>Which city is known for this song?</h2><p>Please play the song</p></div>
            <button id="play-melody-button">PLAY SONG 🎵</button>
        `;
    }
    container.innerHTML = contentHTML;

    if(currentQuestion.gameMode === 'audio') {
        const btn = document.getElementById('play-melody-button');
        if(btn) btn.addEventListener('click', () => {
            if(gameAudio) gameAudio.pause();
            gameAudio = new Audio(currentQuestion.audioUrl);
            gameAudio.play();
        });
    }

    setTimeout(() => { 
        if(isGameActive) container.classList.add('minimized'); 
    }, 2500);

    startTimer();
}

function handlePolygonClick(e) {
    // PREVENT DOUBLE CLICK
    if (!isGameActive || !currentQuestion || isProcessingAnswer) return;
    
    isProcessingAnswer = true; 
    stopTimer();

    const clickedLatLng = e.latlng;
    const x = e.originalEvent.clientX;
    const y = e.originalEvent.clientY;

    const targetData = allProvincesData.find(p => p.il === currentQuestion.il);
    if (!targetData) return; 

    const centerLatLng = L.latLng(targetData.lat, targetData.lon);
    const distanceMeters = clickedLatLng.distanceTo(centerLatLng);
    const distanceKm = Math.round(distanceMeters / 1000);

    let isCorrect = false;
    let pointsEarned = 0;
    let color = '';

    if (distanceKm <= 50) {
        isCorrect = true; pointsEarned = 500; color = '#2ecc71';
        triggerShockwave(x, y, color);
        showFloatingPoints(x, y, `PERFECT! +${pointsEarned}`);
    } 
    else if (distanceKm <= 150) {
        isCorrect = true; pointsEarned = 250; color = '#f1c40f';
        triggerShockwave(x, y, color);
        showFloatingPoints(x, y, `CLOSE! +${pointsEarned}`);
    }
    else {
        isCorrect = false;
        lives--;
        score = Math.max(0, score - 50); 
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);
        document.getElementById('lives').classList.add('life-lost-text');
    }

    if (isCorrect) {
        score += pointsEarned;
        e.target.setStyle({ fill: color, fillColor: color });
        showBadgeThenFeedback(pointsEarned); // Show badge
    } else {
        e.target.setStyle({ fill: '#e74c3c', fillColor: '#e74c3c' });
        showFeedbackSequence('images/false.png', false); // Wrong Answer
    }
    
    if(gameAudio) gameAudio.pause();
    updateStatsDisplay();
}

// --- 6. BADGE & FEEDBACK LOGIC (FIXED) ---

function showBadgeThenFeedback(points) {
    const randomBadge = badgeAssets[Math.floor(Math.random() * badgeAssets.length)];
    
    let badgeOverlay = document.getElementById('badge-overlay');
    if (!badgeOverlay) {
        badgeOverlay = document.createElement('div');
        badgeOverlay.id = 'badge-overlay';
        badgeOverlay.innerHTML = `<img class="badge-img-large" src=""><div class="badge-text"></div>`;
        document.body.appendChild(badgeOverlay);
    }
    
    // 1. Show Large Badge
    badgeOverlay.querySelector('.badge-img-large').src = randomBadge;
    badgeOverlay.querySelector('.badge-text').innerText = `EARNED: +${points}`;
    badgeOverlay.className = 'active';
    
    // 2. Wait 2 seconds (Display time)
    setTimeout(() => {
        // 3. Hide Overlay and Start Flying Animation
        badgeOverlay.className = ''; 
        flyBadgeToBar(randomBadge);
        
        // 4. Wait for flight (1s) then show Happy People (Correct.png)
        setTimeout(() => {
            showFeedbackSequence('images/correct.png', true); 
        }, 1000); 
        
    }, 2000); // <-- Badge visible for 2 seconds
}

function flyBadgeToBar(badgeSrc) {
    const flyer = document.createElement('img');
    flyer.src = badgeSrc;
    flyer.classList.add('flying-badge');
    document.body.appendChild(flyer);

    const targetContainer = document.getElementById('badge-collection');
    const rect = targetContainer.getBoundingClientRect();
    
    // Start flight
    setTimeout(() => {
        flyer.style.top = (rect.top + 20) + 'px'; 
        flyer.style.left = (rect.right + 20) + 'px'; 
        flyer.style.width = '35px';
        flyer.style.height = '35px';
        flyer.style.opacity = '0.5';
    }, 50);

    // End flight and add to bar
    setTimeout(() => {
        flyer.remove();
        const miniBadge = document.createElement('img');
        miniBadge.src = badgeSrc;
        miniBadge.className = 'mini-badge';
        targetContainer.appendChild(miniBadge);
    }, 1000);
}

function showFeedbackSequence(imageSrc, isSuccess) {
    let overlay = document.getElementById('feedback-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'feedback-overlay';
        overlay.innerHTML = `<img id="feedback-image" src="">`;
        document.body.appendChild(overlay);
    }
    const img = document.getElementById('feedback-image');
    img.src = imageSrc;
    
    overlay.style.pointerEvents = 'auto'; 
    overlay.className = 'active'; 
    overlay.classList.remove('fading-out');

    setTimeout(() => {
        overlay.classList.add('fading-out');
        setTimeout(() => {
            overlay.className = ''; 
            overlay.style.pointerEvents = 'none'; 
            
            if (isSuccess && isGameActive) {
                triggerTransitionScreen();
            } else if (isGameActive) {
                loadNewQuestion(); // If wrong, load next question immediately after feedback
            }
        }, 1000);
    }, 2000); // Feedback shows for 2 seconds
}

function triggerTransitionScreen() {
    const body = document.body;
    let randomAsset = transitionAssets[Math.floor(Math.random() * transitionAssets.length)];
    
    // Force Anitkabir for the first win
    if (score <= 500 && score > 0) {
         randomAsset = { type: 'img', src: 'images/anitkabir.png' };
    }
    
    const tLayer = document.createElement('div');
    tLayer.id = 'transition-layer';
    tLayer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:5500; display:flex; justify-content:center; align-items:center;";
    
    let contentHTML = '';
    if (randomAsset.type === 'video') {
        contentHTML = `<video id="transition-media" src="${randomAsset.src}" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>`;
    } else {
        contentHTML = `<img id="transition-media" src="${randomAsset.src}" style="width:100%; height:100%; object-fit:cover;">`;
    }
    
    contentHTML += `<div style="position:absolute; bottom:10%; color:white; font-size:3em; text-shadow:2px 2px 4px black; font-family:'Rye', serif;">NEXT STOP... 🚌</div>`;

    tLayer.innerHTML = contentHTML;
    body.appendChild(tLayer);

    setTimeout(() => {
        tLayer.remove();
        if(isGameActive) loadNewQuestion();
    }, 3000);
}

// Utility
function showFloatingPoints(x, y, text) {
    const points = document.createElement('div');
    points.classList.add('floating-score');
    points.innerText = text;
    points.style.left = `${x}px`;
    points.style.top = `${y}px`;
    if(text.includes("PERFECT")) points.style.color = "#2ecc71";
    else points.style.color = "#f1c40f";
    document.body.appendChild(points);
    setTimeout(() => points.remove(), 1500);
}

function triggerShockwave(x, y, color) {
    const body = document.body;
    const ripple = document.createElement('div');
    ripple.classList.add('shockwave');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.background = color;
    ripple.style.boxShadow = `0 0 20px ${color}`;
    body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1500);
}

function triggerGameOver(reason) {
    isGameActive = false;
    stopTimer();
    
    if(introMusic) introMusic.pause();
    if(gameAudio) gameAudio.pause();
    
    const qContainer = document.getElementById('question-container');
    if(qContainer) qContainer.remove();
    
    document.body.classList.add('earthquake-mode');
    
    const goScreen = document.createElement('div');
    goScreen.id = 'game-over-screen';
    goScreen.style.display = 'flex'; 
    goScreen.innerHTML = `<h1>${reason}</h1><p>Final Score: <strong>${score}</strong></p><button id="restart-btn">TRY AGAIN 🔁</button>`;
    document.body.appendChild(goScreen);
    
    document.getElementById('restart-btn').addEventListener('click', () => {
        document.body.classList.remove('earthquake-mode');
        goScreen.remove();
        realGameStart(); 
    });
}

document.getElementById('mute-button').addEventListener('click', () => {
    isMuted = !isMuted;
    document.getElementById('mute-button').innerText = isMuted ? "🔇" : "🔊";
    if(introMusic) introMusic.muted = isMuted;
    if(gameAudio) gameAudio.muted = isMuted;
});