// --- CORE GAME VARIABLES ---
let map;
let allProvincesData = []; 
let geoJsonLayer;       // To store and manipulate the GeoJSON layer
let isGameActive = false;
let currentQuestion = null;
let feedbackMarker = null;

// Game State Variables
let gameTimer;          
let timeLeft = 60;      // Total time for the game (Temporal Component)
let score = 0;          
let lives = 3;          // Total lives as per Assignment Design
let roadTripAudio;      
let blinkingInterval;   // For the calm blinking effect (UX/Interactivity)
let isMuted = false;    // State for mute functionality

// DOM Elements for Intro Sequence
const introScreen = document.getElementById('intro-screen');
const introContent = document.getElementById('intro-content');


// --- INITIALIZATION ---

/**
 * Initializes the Leaflet map, focusing on Turkey.
 */
function initializeMap() {
    // Zoom set to 6 for better boundary visibility 
    map = L.map('map').setView([39.0, 35.0], 6); 

    // Add OpenStreetMap tile layer (Base Map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 5, 
        maxZoom: 10 
    }).addTo(map);

    console.log("GIS Core: Leaflet Map Initialized.");
}

/**
 * Loads province center data (game logic) and GeoJSON (polygons).
 */
function loadProvinceData() {
    // 1. Load GeoJSON (Polygon Boundaries)
    d3.json('data/turkey_provinces.geojson')
        .then(geojson => {
            console.log(`GIS Data Loaded: Found ${geojson.features.length} GeoJSON features.`);
            addGeoJsonToMap(geojson);
        })
        .catch(error => {
            console.error('ERROR: Could not load turkey_provinces.geojson. Check file path.', error);
        });

    // 2. Load center and mode data (required for plaka/audio mode coordinates)
    d3.json('data/provinces.json') 
        .then(data => {
            allProvincesData = data;
            console.log(`Game Data Loaded: Found ${allProvincesData.length} province centers/modes.`);
        })
        .catch(error => {
            console.error('ERROR: Could not load provinces.json. Check file path.', error);
        });
}

/**
 * Adds the GeoJSON boundaries to the map and defines interaction.
 */
function addGeoJsonToMap(geojson) {
    // Default styling for provinces
    function style(feature) {
        return {
            fillColor: '#3498db', // Default blue fill
            weight: 1.5,
            opacity: 1,
            color: 'white', // White border between provinces
            fillOpacity: 0.5
        };
    }
    
    // Defines events when interacting with a GeoJSON feature (polygon)
    function onEachFeature(feature, layer) {
        layer.provinceName = feature.properties.name; 
        
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: handlePolygonClick // Call the specific click handler
        });
    }

    geoJsonLayer = L.geoJson(geojson, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    startBlinkingAnimation(); 
}

// --- INTERACTION HANDLERS (Highlighting/Blinking) ---

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3, 
        color: '#666',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    if (geoJsonLayer) {
        geoJsonLayer.resetStyle(e.target);
    }
}

function startBlinkingAnimation() {
    const provinceLayers = geoJsonLayer.getLayers();
    if (provinceLayers.length === 0) return;
    
    if (blinkingInterval) {
        clearInterval(blinkingInterval);
        provinceLayers.forEach(layer => geoJsonLayer.resetStyle(layer)); 
    }

    // Select a random province to blink
    const randomIndex = Math.floor(Math.random() * provinceLayers.length);
    const blinkingLayer = provinceLayers[randomIndex];
    let isBlinking = false;

    blinkingInterval = setInterval(() => {
        if (isBlinking) {
            geoJsonLayer.resetStyle(blinkingLayer); 
        } else {
            blinkingLayer.setStyle({
                fillColor: '#f39c12', // Orange/yellow for blinking
                fillOpacity: 0.7,
                weight: 2
            });
        }
        isBlinking = !isBlinking;
    }, 800); 
}


// --- INTRO & CINEMATIC SEQUENCE ---

function startIntroSequence() {
    // Step 1: Speaker Warning 
    introContent.innerHTML = `
        <span class="speaker-text">🔊</span>
        <p style="opacity: 0; animation: fade-in-grow 1.5s forwards 0.5s;">Please ensure your speaker is on.</p>
    `;
    
    roadTripAudio = new Audio('audio/road_trip_song.mp3'); 
    roadTripAudio.volume = isMuted ? 0 : 0.3; // Respect mute state
    roadTripAudio.loop = true;
    roadTripAudio.play().catch(e => console.error("Audio Play Error: Road trip song not found or blocked."));

    setTimeout(() => {
        // Step 2: Fade to road view/image
        introContent.innerHTML = `
            <img id="desert-view" src="images/desert_view.jpg" alt="Desert Road Trip" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8; transition: opacity 1s;">
            <div id="road-sign-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0;"></div>
        `;
        document.getElementById('desert-view').style.opacity = 1; 

        // Fade out music
        let volumeLevel = roadTripAudio.volume;
        if (!isMuted) {
            const fadeInterval = setInterval(() => {
                volumeLevel = Math.max(0, volumeLevel - 0.03); 
                roadTripAudio.volume = volumeLevel;
                if (volumeLevel <= 0) {
                    clearInterval(fadeInterval);
                    roadTripAudio.pause();
                    showRoadSign(); 
                }
            }, 200);
        } else {
             roadTripAudio.pause();
             showRoadSign();
        }

    }, 3000); 
}

function showRoadSign() {
    const roadSignContainer = document.getElementById('road-sign-container');
    roadSignContainer.innerHTML = `<img src="images/road_sign.png" alt="Plate Sign" style="width: 80vw; max-width: 600px; animation: approach-and-net 3s forwards;">`;
    roadSignContainer.style.opacity = 1; 
    
    setTimeout(startCountdown, 3000); 
}

function startCountdown() {
    let count = 3;
    introContent.innerHTML = `<span class="countdown-number">${count}</span>`;
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            introContent.innerHTML = `<span class="countdown-number">${count}</span>`;
        } else {
            clearInterval(countdownInterval);
            introContent.innerHTML = '';
            
            setTimeout(() => {
                introScreen.style.opacity = 0;
                setTimeout(() => {
                    introScreen.classList.remove('active');
                    document.getElementById('modal').classList.add('active'); 
                }, 1000); 
                
            }, 300); 
        }
    }, 1000);
}


// --- GAME LOGIC ---

/**
 * Resets stats, stops blinking, starts the timer, and loads the first question.
 */
function startGame() {
    if (blinkingInterval) {
        clearInterval(blinkingInterval);
        geoJsonLayer.eachLayer(layer => geoJsonLayer.resetStyle(layer));
    }
    
    score = 0;
    lives = 3;
    timeLeft = 60;
    
    document.getElementById('modal').classList.remove('active');
    isGameActive = true;
    
    gameTimer = setInterval(updateTimer, 1000); 

    loadNewQuestion();
    updateStatsDisplay();
    console.log("Game Started. Timer is running.");
}

/**
 * Updates the Timer, Score, and Lives display on the screen.
 */
function updateStatsDisplay() {
    document.getElementById('timer').textContent = `Time: ${timeLeft}`;
    document.getElementById('score').textContent = `Score: ${score}`;
    
    let livesDisplay = '';
    for (let i = 0; i < 3; i++) {
        livesDisplay += (i < lives) ? '♥ ' : '♡ ';
    }
    document.getElementById('lives').textContent = `Lives: ${livesDisplay}`;
}

/**
 * Decrements the timer every second and checks for game over condition.
 */
function updateTimer() {
    timeLeft--; 
    updateStatsDisplay(); 

    if (timeLeft <= 0) {
        clearInterval(gameTimer); 
        endGame('time');
    }
}

/**
 * Mute/Unmute toggle functionality.
 */
function toggleMute() {
    isMuted = !isMuted;
    const button = document.getElementById('mute-button');
    
    if (isMuted) {
        if (roadTripAudio) roadTripAudio.volume = 0;
        // Logic to mute other ongoing game audio if needed
        button.textContent = "🔊 Unmute"; 
    } else {
        if (roadTripAudio) roadTripAudio.volume = 0.3; // Restore volume
        button.textContent = "🔇 Mute"; 
    }
}

/**
 * Selects a random province only if its gameMode is defined.
 */
function loadNewQuestion() {
    if (!isGameActive || allProvincesData.length === 0) return;

    // Filter provinces to only include those where gameMode is explicitly set ('audio' or 'plate')
    const availableProvinces = allProvincesData.filter(p => p.gameMode === 'audio' || p.gameMode === 'plate');

    if (availableProvinces.length === 0) {
        document.getElementById('prompt-bar').innerHTML = "<p style='color:red;'>ERROR: No game modes defined in provinces.json!</p>";
        isGameActive = false;
        clearInterval(gameTimer);
        return;
    }

    // 1. Select a random province from the AVAILABLE list
    const randomIndex = Math.floor(Math.random() * availableProvinces.length);
    currentQuestion = availableProvinces[randomIndex]; 
    
    // Determine the mode from the data
    const mode = currentQuestion.gameMode; 
    const promptBar = document.getElementById('prompt-bar');

    // Reset prompt bar style
    promptBar.style.backgroundColor = '#ecf0f1';
    promptBar.style.color = 'black';


    if (mode === 'plate') {
        // --- PLATE MODE ---
        promptBar.innerHTML = `
            <p>Question: Which province has this plate number? </p>
            <span class="question-data">PLATE: ${currentQuestion.plaka}</span>
        `;
    } else if (mode === 'audio') {
        // --- MELODY (AUDIO) MODE ---
        promptBar.innerHTML = `
            <p>Question: Where is this melody from?</p> 
            <button id="play-melody-button" class="question-data">PLAY MELODY 🎵</button>
        `;
        
        // Add event listener for audio playback
        document.getElementById('play-melody-button').addEventListener('click', () => {
             const audio = new Audio(currentQuestion.audioUrl);
             audio.volume = isMuted ? 0 : 1; // Respect mute state for question audio
             audio.play().catch(e => console.error("Audio Play Error: Check audio file path."));
        });
    }
    
    console.log(`New Question: Mode: ${mode}, Correct Province: ${currentQuestion.il}`);
}


/**
 * Main handler for clicks on any province polygon (GeoJSON click).
 */
function handlePolygonClick(e) {
    if (!isGameActive || !currentQuestion) {
        document.getElementById('modal').classList.add('active'); 
        return;
    }
    
    const clickedProvinceName = e.target.provinceName;
    const clickedLatLng = e.latlng;
    
    const correctProvinceData = allProvincesData.find(p => p.il === currentQuestion.il);
    
    if (!correctProvinceData) {
        console.error("ERROR: Correct province data not found in provinces.json for comparison.");
        return;
    }

    const trueLatLon = L.latLng(correctProvinceData.lat, correctProvinceData.lon);
    const distanceMeters = clickedLatLng.distanceTo(trueLatLon);
    const correctThreshold = 100000; // 100 km limit

    // --- SCORING LOGIC ---
    if (clickedProvinceName === correctProvinceData.il) {
        
        // Score is inversely proportional to the error distance
        let points = Math.round(500 * (1 - (distanceMeters / correctThreshold)));
        points = Math.max(50, points); 
        score += points;

        // Visual feedback based on the mode
        if (currentQuestion.gameMode === 'audio') {
            // Success animation for Audio Mode
            showProvinceSuccess(correctProvinceData); 
        } else {
            // Simple feedback for Plate Mode
            displayFeedback(`✅ CORRECT! +${points} Points. Error: ${Math.round(distanceMeters / 1000)} km`, '#2ecc71');
            showFeedbackMarker(trueLatLon, true);
            // New question loads via displayFeedback()
        }

    } else {
        // Incorrect Answer
        lives--;
        score = Math.max(0, score - 50); 
        
        displayFeedback(`❌ INCORRECT! -1 Life. Error: ${Math.round(distanceMeters / 1000)} km. Try again.`, '#e74c3c'); 
        showFeedbackMarker(trueLatLon, false);
        
        if (lives <= 0) {
            endGame('lives');
            return;
        }
    }
    
    updateStatsDisplay();
}


/**
 * Displays the successful province name/plate with a growing animation.
 * Used for Audio Mode success visualization.
 */
function showProvinceSuccess(provinceData) {
    const provinceNamePlate = `${provinceData.plaka} ${provinceData.il}`;
    
    const successOverlay = document.createElement('div');
    successOverlay.id = 'success-overlay';
    successOverlay.innerHTML = `<span class="success-text">${provinceNamePlate}</span>`;
    
    document.body.appendChild(successOverlay);

    // After animation, remove the text and load the next question
    setTimeout(() => {
        if(document.getElementById('success-overlay')) {
             document.body.removeChild(successOverlay);
        }
        
        loadNewQuestion(); 
        
    }, 2500); // 2.5 seconds for the success animation
}


/**
 * Displays a temporary marker at the true location for feedback.
 */
function showFeedbackMarker(latlng, isCorrect) {
    if (feedbackMarker) {
        map.removeLayer(feedbackMarker);
    }
    
    const color = isCorrect ? '#2ecc71' : '#e74c3c';
    const iconHtml = `<div style="background-color:${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`;
    const customIcon = L.divIcon({
        className: 'custom-feedback-icon',
        html: iconHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    feedbackMarker = L.marker(latlng, {icon: customIcon}).addTo(map);

    setTimeout(() => {
        if (feedbackMarker) {
            map.removeLayer(feedbackMarker);
            feedbackMarker = null;
        }
    }, 2000);
}

/**
 * Temporarily displays feedback message in the prompt bar.
 */
function displayFeedback(message, color) {
    const promptBar = document.getElementById('prompt-bar');
    promptBar.style.backgroundColor = color;
    promptBar.style.color = 'white';
    promptBar.innerHTML = `<p>${message}</p>`;

    // After 1.5 seconds, remove the feedback and load the next question
    setTimeout(() => {
        if (currentQuestion.gameMode !== 'audio') { // If success animation didn't load the next question
            loadNewQuestion(); 
        }
    }, 1500); 
}


/**
 * Stops the game and displays the final score modal.
 */
function endGame(reason) {
    isGameActive = false;
    clearInterval(gameTimer);
    
    const modal = document.getElementById('modal');
    modal.querySelector('h2').textContent = (reason === 'time') ? "TIME'S UP! GAME OVER!" : "GAME OVER - LIVES DEPLETED!";
    modal.querySelector('p').innerHTML = `Your Final Score: <b>${score}</b>`;
    modal.querySelector('#start-button').textContent = "Play Again";
    
    modal.classList.add('active'); 
}


// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core GIS/Data Initialization
    initializeMap();
    loadProvinceData();
    
    // 2. Event Listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('mute-button').addEventListener('click', toggleMute); // MUTE EKLENDİ
    
    // 3. Start the cinematic Intro sequence
    startIntroSequence();
});