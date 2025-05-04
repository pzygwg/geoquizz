# GeoQuizz - Country Path Game

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML-5-orange.svg)
![CSS3](https://img.shields.io/badge/CSS-3-blue.svg)
![MVC](https://img.shields.io/badge/Architecture-MVC-green.svg)
![Accessibility](https://img.shields.io/badge/Accessibility-ARIA-purple.svg)

A single-page web application with an interactive world map and mini-games. The first game implemented is "Country Path," where players must find valid paths between randomly selected countries.

## Features

- 🗺️ Interactive SVG world map rendered on HTML5 Canvas
- 🎮 Country Path mini-game with adjacency checking
- 🎨 Pixel-art / 16-bit style interface
- 📱 Responsive design for different screen sizes
- ♿ Accessibility support with ARIA labels and high contrast mode
- 🏗️ Clean MVC architecture using ES Modules

## How to Play

1. Click the "Play Country Path" button to start a new game
2. Two countries will be selected: a starting point and a destination
3. Type in countries one by one to create a valid path between them
4. Each country must be adjacent to the previous one
5. Reach the destination country to win!

## Running Locally

```bash
# Clone the repository
git clone <repo-url>
cd geoquizz

# If you have Python installed
python -m http.server

# Or using Node.js's http-server (needs installation)
npx http-server

# Or any other static file server
live-server
```

Then open your browser to http://localhost:8000 (or the port provided by your server).

## Project Structure

```
project/
│
├─ assets/
│  └─ world.svg        # Vector map used as the game board
│
├─ src/
│  ├─ controllers/
│  │   └─ GameController.js
│  ├─ models/
│  │   └─ MapModel.js
│  ├─ views/
│  │   ├─ CanvasView.js
│  │   └─ MenuView.js
│  ├─ main.js          # Entry point – wires MVC together
│  └─ style.css
│
├─ index.html
├─ README.md
└─ instructions.md
```

## Technical Implementation

- **Pure MVC Architecture**: Clean separation of concerns with ES Modules
- **Canvas Rendering**: Efficient SVG-to-Canvas rendering with 2D path operations
- **Adjacency Graph**: Country connectivity logic for validating paths
- **Responsive Design**: Adapts to different screen sizes and device types
- **Accessibility**: ARIA labels and high-contrast mode support

## Future Enhancements

- Timer and score tracking
- Multiple difficulty levels
- Sound effects and background music
- Best times saved in localStorage
- Additional mini-games (Capital Quiz, Border Rush, etc.)

## License

The world map SVG is provided by Simplemaps.com under MIT license.
The application code is available under the MIT License.

---

Developed with vanilla JavaScript, HTML5, and CSS3.
