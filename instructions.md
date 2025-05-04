# Mini-Games-on-a-Map – README

## 1. What’s inside?
A single-page web application (HTML + CSS + vanilla JS) that renders an interactive world map (from **world.svg**) onto an HTML5 `<canvas>`.  
The site will host several mini-games; only **one** (“Country Path”) is required for v1. Everything must follow an **MVC** pattern and sport a **cartoon / pixel-art** look-and-feel.

project/
│
├─ assets/
│  └─ world.svg          # vector map used as the game board
│
├─ src/
│  ├─ controllers/
│  │   └─ GameController.js
│  ├─ models/
│  │   └─ MapModel.js
│  ├─ views/
│  │   ├─ CanvasView.js
│  │   └─ MenuView.js
│  ├─ main.js            # entry point – wires MVC together
│  └─ style.css
│
└─ index.html

## 2. Functional specification

### 2.1 Landing page
* Displays a full-screen **pixel / 16-bit style** menu.
* A single button **“Play Country Path”** starts the game.
* Menu and game share the same canvas element; switching states hides/shows the right UI.

### 2.2 Game rules (Country Path)
1. **Random start & end**  
   *Select two distinct countries that are on the same continent **or** have a land connection path (e.g., France–Egypt is legal).*
2. Display both names to the player and flash them on the map.
3. Player types intermediary countries, one per **Enter**.  
   * Input is case-insensitive; allow diacritics or not, but be consistent.
4. Each valid country is:
   * Highlighted **red** on the canvas.
   * Added to a list under the input.
5. Victory = the player reaches the destination country with a correct contiguous path.
6. Errors (invalid country, already used, breaks adjacency) trigger a small shake animation + sound.

### 2.3 Map interaction
* Parse **world.svg** into individual countries (use path IDs / classes).
* Maintain an adjacency graph — pre-process offline or at runtime.
* Ray-cast click events if you later add mouse support (not needed for v1).

## 3. Non-functional requirements

| Topic                 | Requirement                                                             |
|-----------------------|--------------------------------------------------------------------------|
| **Architecture**      | Pure **MVC** modules in ES Modules syntax                               |
| **State management**  | No global vars; the Model owns data, Controller mutates, View renders   |
| **Styling**           | CSS variables, pixel fonts, big chunky buttons, pastel palette          |
| **Tooling**           | No build step required; optional ESLint + Prettier config               |
| **Browser support**   | Evergreen browsers (Chrome, Firefox, Edge, Safari). Mobile nice-to-have |
| **Accessibility**     | ARIA-labels on inputs; high-contrast mode (toggle)                      |

## 4. How to run
```bash
git clone <repo>
cd <repo>/project
live-server      # or any static-server; then open http://localhost:8080

5. Tasks for the LLM (you!)
	1.	Scaffold the directory structure above.
	2.	index.html
	•	include a <canvas id="mapCanvas">, hidden input area, and a menu container.
	3.	style.css
	•	implement the cartoon / pixel theme; use a Google font like Press Start 2P.
	4.	MapModel.js
	•	load and parse world.svg; expose getRandomCountryPair() and isAdjacent(a,b).
	5.	CanvasView.js
	•	draw SVG paths onto the canvas; colour countries; resize responsively.
	6.	MenuView.js
	•	render landing page; animate menu → game transition.
	7.	GameController.js
	•	orchestrate game flow, user input, win/loss logic; update Model & View.
	8.	main.js
	•	bootstrap MVC, attach event listeners.
	9.	Add concise README badges once the project builds/links.

6. Stretch goals
	•	Timer + score board
	•	Multiple difficulty levels (same continent only, worldwide, island hops, etc.)
	•	Sound effects & background chiptune
	•	Save best times in localStorage
	•	Extra mini-games: “Capital Quiz”, “Border Rush”, etc.


⸻

Happy coding!

