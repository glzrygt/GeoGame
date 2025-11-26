# Hometown Game - Turkey Trip 🇹🇷 🚐

**🔴 PLAYABLE GAME LINK:** 👉 
**[CLICK HERE TO PLAY THE GAME] https://glzrygt.github.io/GeoGame/**
💡💡 Pro Tip: 💡💡The map is interactive! 💡💡Just drag & zoom if the pop-up blocks your view.💡💡
*(Note: Since this is a private repository, GitHub Pages is hosted on a separate public mirror for accessibility.)*

---

**Course:** GMT 458 – Web GIS  
**Assignment:** 2 - GeoGame  

## Game Description
"Turkey Trip" is an interactive Web GIS game designed to test users' knowledge of Turkey's geography through license plates and local melodies. The game features a cinematic intro, an "adventure" theme, and a high-tension "Survivor Mode."

## Requirements

### Functional Requirements
**User:**
* The user starts the game with a "Start Journey" button.
* The user sees an interactive map of Turkey.
* The user sees a **10-second countdown timer** for each question.
* The user sees their current score and remaining lives (Hearts).
* **Two Game Modes:**
    * **Plate Mode:** "Find Plate: 34" -> Click Istanbul.
    * **Melody Mode:** "Play Song 🎵" -> Listen and click the correct city.
* The user receives immediate visual feedback (Badges, Shockwaves, Shake effects).
* The user can mute/unmute audio.

**System:**
* The system loads an interactive **Leaflet** map.
* The system uses **D3.js** to fetch and parse `provinces.json` and GeoJSON data.
* The system calculates the distance between the click and the target city center.
* **Survivor Mechanic:** Instead of a total time limit, the user has **10 seconds per question**.
* **Non-Repetitive Logic:** Once a city is asked, it is removed from the pool to prevent duplicates.
* The game ends when lives hit 0 or the user fails to answer in time.

### Non-Functional Requirements
* Responsive single-page web application.
* Fast loading audio and map tiles.
* Intuitive "Wild/Adventure" UI theme with custom fonts (Rye).

## Frontend Layout

The application is a Single Page Application (SPA) focused on the map.

* **Intro Screen:** Cinematic video intro with "Are You Ready?" animation.
* **Stats Bar (Top):** Displays Timer (10s), Score, and Lives.
* **Map Container:** Full-screen interactive map.
* **Question Box (Center/Top):** Dynamic box displaying the Plate or Play Button.
* **Feedback Overlays:** Large badges for correct answers, visual shake effects for wrong answers.

## Game Progression & Rules

* **Progression:** The game follows a **"Survivor"** concept. Instead of a global time limit, the user is challenged with a **10-second countdown for each question**. This creates continuous tension.
* **Difficulty:** The difficulty is driven by the time pressure (10s) and the random alternation between **Plate** and **Melody** modes.
* **Unique Gameplay:** An algorithm ensures **no question is asked twice**. The game continues until the user loses all lives or visits all 81 provinces.
* **Lives:** The user has **3 lives**. A life is lost if the user's click is incorrect or if time runs out.

## Technologies Used

1.  **Leaflet.js:**
    * Used for the core interactive map component.
    * Handling `map.on('click')` events and coordinate management.
    * Calculating distances (`distanceTo()`) for scoring logic.

2.  **D3.js (Bonus Library):** 🌟
    * Used for efficient asynchronous data loading (`d3.json`).
    * Parsing the `turkey_provinces.geojson` and game data.

3.  **HTML5 Audio API:**
    * Controlling background music and local melody snippets dynamically.

## Data Model

A custom `provinces.json` dataset was created instead of NYC Taxi data to fit the "Hometown Game" concept.

**Structure:**
```json
[
  {
    "plaka": 6,
    "il": "Ankara",
    "lat": 39.9255,
    "lon": 32.8663,
    "audioUrl": "audio/ankara.mp3",
    "gameMode": "audio"
  },
  ...
]
