const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const overlay = document.getElementById('gameOverOverlay');
const finalScoreSpan = document.querySelector('.final-score span');
const restartBtn = document.getElementById('restartBtn');

// Game Constants
const GRID_SIZE = 30; // 600 canvas width / 30 = 20 cells
const TILE_COUNT = Math.floor(600 / GRID_SIZE);
const INITIAL_SPEED = 140; // ms per frame
const MIN_SPEED = 60; // Max speed threshold

// Colors
const COLOR_SNAKE = '#39FF14';
const COLOR_SNAKE_HEAD = '#66ff47';
const COLOR_FOOD = '#FF3131';
const COLOR_GRID = 'rgba(255, 255, 255, 0.04)';

// Game State
let snake = [];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let gameLoop;
let gameOver = false;
let isPaused = false;
let changingDirection = false;
let speed = INITIAL_SPEED;

// Food animation properties
let foodScale = 0;
let foodGrow = true;

// Initialize Game
function initGame() {
    // Setup snake (start length 3, in middle of board)
    const startX = Math.floor(TILE_COUNT / 2);
    const startY = Math.floor(TILE_COUNT / 2);

    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];

    // Setup movement (moving right initially)
    dx = 1;
    dy = 0;

    score = 0;
    speed = INITIAL_SPEED;
    gameOver = false;
    isPaused = false;
    changingDirection = false;
    scoreElement.innerText = score;

    if (typeof btnStop !== 'undefined' && btnStop) btnStop.classList.remove('paused');

    overlay.classList.remove('active');

    spawnFood();

    if (gameLoop) clearTimeout(gameLoop);
    requestAnimationFrame(render);
    main();
}

// Main game logic loop (fixed timestep for movement)
function main() {
    if (gameOver) return;

    gameLoop = setTimeout(function onTick() {
        if (!isPaused) {
            changingDirection = false;
            advanceSnake();
            if (checkCollision()) {
                handleGameOver();
                return;
            }
        }
        main();
    }, speed);
}

// Render loop (decoupled from logic for smoother animations if needed)
function render() {
    if (gameOver) return;

    clearCanvas();
    drawGrid();
    drawFood();
    drawSnake();

    requestAnimationFrame(render);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;

    for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function drawSnake() {
    if (snake.length === 0) return;

    // Draw snake body with a contiguous line
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = GRID_SIZE - 4;
    ctx.strokeStyle = COLOR_SNAKE;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_SNAKE;

    // Draw path through centers of all snake segments
    ctx.moveTo(snake[0].x * GRID_SIZE + GRID_SIZE / 2, snake[0].y * GRID_SIZE + GRID_SIZE / 2);
    for (let i = 1; i < snake.length; i++) {
        const prev = snake[i - 1];
        const curr = snake[i];

        if (Math.abs(prev.x - curr.x) > 1 || Math.abs(prev.y - curr.y) > 1) {
            let splitX1, splitY1, splitX2, splitY2;
            if (prev.x === 0 && curr.x === TILE_COUNT - 1) {
                splitX1 = -0.5; splitY1 = prev.y;
                splitX2 = TILE_COUNT - 0.5; splitY2 = curr.y;
            } else if (prev.x === TILE_COUNT - 1 && curr.x === 0) {
                splitX1 = TILE_COUNT - 0.5; splitY1 = prev.y;
                splitX2 = -0.5; splitY2 = curr.y;
            } else if (prev.y === 0 && curr.y === TILE_COUNT - 1) {
                splitX1 = prev.x; splitY1 = -0.5;
                splitX2 = curr.x; splitY2 = TILE_COUNT - 0.5;
            } else if (prev.y === TILE_COUNT - 1 && curr.y === 0) {
                splitX1 = prev.x; splitY1 = TILE_COUNT - 0.5;
                splitX2 = curr.x; splitY2 = -0.5;
            }

            if (splitX1 !== undefined) {
                ctx.lineTo(splitX1 * GRID_SIZE + GRID_SIZE / 2, splitY1 * GRID_SIZE + GRID_SIZE / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(splitX2 * GRID_SIZE + GRID_SIZE / 2, splitY2 * GRID_SIZE + GRID_SIZE / 2);
                ctx.lineTo(curr.x * GRID_SIZE + GRID_SIZE / 2, curr.y * GRID_SIZE + GRID_SIZE / 2);
            } else {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(curr.x * GRID_SIZE + GRID_SIZE / 2, curr.y * GRID_SIZE + GRID_SIZE / 2);
            }
        } else {
            ctx.lineTo(curr.x * GRID_SIZE + GRID_SIZE / 2, curr.y * GRID_SIZE + GRID_SIZE / 2);
        }
    }
    ctx.stroke();

    // Draw head slightly larger
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    const headX = snake[0].x * GRID_SIZE + GRID_SIZE / 2;
    const headY = snake[0].y * GRID_SIZE + GRID_SIZE / 2;
    const headRadius = (GRID_SIZE - 4) / 2 + 2;
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw eyes based on direction
    ctx.fillStyle = '#0f172a';
    ctx.shadowBlur = 0;
    const eyeOffset = 4;
    let ex1, ey1, ex2, ey2;

    if (dx === 1) { // Right
        ex1 = headX + 2; ey1 = headY - eyeOffset;
        ex2 = headX + 2; ey2 = headY + eyeOffset;
    } else if (dx === -1) { // Left
        ex1 = headX - 2; ey1 = headY - eyeOffset;
        ex2 = headX - 2; ey2 = headY + eyeOffset;
    } else if (dy === 1) { // Down
        ex1 = headX - eyeOffset; ey1 = headY + 2;
        ex2 = headX + eyeOffset; ey2 = headY + 2;
    } else { // Up
        ex1 = headX - eyeOffset; ey1 = headY - 2;
        ex2 = headX + eyeOffset; ey2 = headY - 2;
    }

    ctx.beginPath();
    ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2);
    ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function advanceSnake() {
    let newX = snake[0].x + dx;
    let newY = snake[0].y + dy;

    // Wrap around logic
    if (newX < 0) newX = TILE_COUNT - 1;
    else if (newX >= TILE_COUNT) newX = 0;

    if (newY < 0) newY = TILE_COUNT - 1;
    else if (newY >= TILE_COUNT) newY = 0;

    const head = { x: newX, y: newY };
    snake.unshift(head);

    // Reached food
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreElement.innerText = score;

        // Score pop animation
        scoreElement.style.transform = 'scale(1.4)';
        setTimeout(() => scoreElement.style.transform = 'scale(1)', 150);

        // Board pop animation
        canvas.style.transform = 'scale(1.02)';
        setTimeout(() => canvas.style.transform = 'scale(1)', 120);

        if (speed > MIN_SPEED) speed -= 3;
        spawnFood();
    } else {
        snake.pop();
    }
}

function spawnFood() {
    let validSpawn = false;
    foodScale = 0; // Reset animation scale
    while (!validSpawn) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };

        validSpawn = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                validSpawn = false;
                break;
            }
        }
    }
}

function drawFood() {
    // Food pulsating animation logic
    if (foodGrow) {
        foodScale += 0.05;
        if (foodScale >= 1) foodGrow = false;
    } else {
        foodScale -= 0.05;
        if (foodScale <= 0.8) foodGrow = true;
    }

    // Cap initial spawn animation
    if (foodScale === 0) foodScale = 0.5;

    const x = food.x * GRID_SIZE;
    const y = food.y * GRID_SIZE;
    const size = GRID_SIZE - 2;
    const centerOffset = (size - (size * foodScale)) / 2;
    const drawSize = size * foodScale;
    const radius = 8;

    ctx.shadowBlur = 20 * foodScale;
    ctx.shadowColor = COLOR_FOOD;
    ctx.fillStyle = COLOR_FOOD;

    ctx.beginPath();
    ctx.moveTo(x + 1 + centerOffset + radius, y + 1 + centerOffset);
    ctx.lineTo(x + 1 + centerOffset + drawSize - radius, y + 1 + centerOffset);
    ctx.quadraticCurveTo(x + 1 + centerOffset + drawSize, y + 1 + centerOffset, x + 1 + centerOffset + drawSize, y + 1 + centerOffset + radius);
    ctx.lineTo(x + 1 + centerOffset + drawSize, y + 1 + centerOffset + drawSize - radius);
    ctx.quadraticCurveTo(x + 1 + centerOffset + drawSize, y + 1 + centerOffset + drawSize, x + 1 + centerOffset + drawSize - radius, y + 1 + centerOffset + drawSize);
    ctx.lineTo(x + 1 + centerOffset + radius, y + 1 + centerOffset + drawSize);
    ctx.quadraticCurveTo(x + 1 + centerOffset, y + 1 + centerOffset + drawSize, x + 1 + centerOffset, y + 1 + centerOffset + drawSize - radius);
    ctx.lineTo(x + 1 + centerOffset, y + 1 + centerOffset + radius);
    ctx.quadraticCurveTo(x + 1 + centerOffset, y + 1 + centerOffset, x + 1 + centerOffset + radius, y + 1 + centerOffset);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
}

function checkCollision() {
    const head = snake[0];

    // Wall collisions are no longer checked since we wrap around.
    // We only check for self-collision now.
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

function handleGameOver() {
    gameOver = true;
    finalScoreSpan.innerText = score;
    overlay.classList.add('active');
    clearTimeout(gameLoop);
}

// Event Listeners
document.addEventListener('keydown', (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
    }

    if (event.key === ' ' || event.key === 'Escape') {
        triggerDir('stop');
        return;
    }

    if (isPaused) {
        isPaused = false;
        if (typeof btnStop !== 'undefined' && btnStop) btnStop.classList.remove('paused');
    }

    if (changingDirection) return;

    const key = event.key;
    const up = dy === -1;
    const down = dy === 1;
    const right = dx === 1;
    const left = dx === -1;

    if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && !right) {
        dx = -1;
        dy = 0;
        changingDirection = true;
    }
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && !down) {
        dx = 0;
        dy = -1;
        changingDirection = true;
    }
    if ((key === 'ArrowRight' || key === 'd' || key === 'D') && !left) {
        dx = 1;
        dy = 0;
        changingDirection = true;
    }
    if ((key === 'ArrowDown' || key === 's' || key === 'S') && !up) {
        dx = 0;
        dy = 1;
        changingDirection = true;
    }
});

// Touch swipe controls
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
    if (changingDirection) return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Require minimum swipe distance
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) return;

    if (isPaused) {
        isPaused = false;
        if (typeof btnStop !== 'undefined' && btnStop) btnStop.classList.remove('paused');
    }

    if (changingDirection) return;

    const up = dy === -1;
    const down = dy === 1;
    const right = dx === 1;
    const left = dx === -1;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && !left) {
            dx = 1; dy = 0; changingDirection = true;
        } else if (deltaX < 0 && !right) {
            dx = -1; dy = 0; changingDirection = true;
        }
    } else {
        if (deltaY > 0 && !up) {
            dx = 0; dy = 1; changingDirection = true;
        } else if (deltaY < 0 && !down) {
            dx = 0; dy = -1; changingDirection = true;
        }
    }
}, { passive: true });

// On-screen D-Pad Controls
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnStop = document.getElementById('btn-stop');

function triggerDir(direction) {
    if (direction === 'stop') {
        isPaused = !isPaused;
        if (isPaused) {
            btnStop.classList.add('paused');
        } else {
            btnStop.classList.remove('paused');
        }
        return;
    }

    if (isPaused) {
        isPaused = false;
        btnStop.classList.remove('paused');
    }

    if (changingDirection) return;

    const up = dy === -1;
    const down = dy === 1;
    const right = dx === 1;
    const left = dx === -1;

    if (direction === 'left' && !right) { dx = -1; dy = 0; changingDirection = true; }
    if (direction === 'up' && !down) { dx = 0; dy = -1; changingDirection = true; }
    if (direction === 'right' && !left) { dx = 1; dy = 0; changingDirection = true; }
    if (direction === 'down' && !up) { dx = 0; dy = 1; changingDirection = true; }
}

const addControl = (el, dir) => {
    // Handling visual state
    const highlight = () => el.classList.add('active');
    const unhighlight = () => el.classList.remove('active');

    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerDir(dir);
        highlight();
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        unhighlight();
    });

    el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        triggerDir(dir);
        highlight();
    });

    el.addEventListener('mouseup', (e) => {
        e.preventDefault();
        unhighlight();
    });

    el.addEventListener('mouseleave', (e) => {
        unhighlight();
    });
};

addControl(btnUp, 'up');
addControl(btnDown, 'down');
addControl(btnLeft, 'left');
addControl(btnRight, 'right');
if (btnStop) addControl(btnStop, 'stop');

restartBtn.addEventListener('click', initGame);

// Bootstrap on load
window.addEventListener('load', () => {
    // Draw initial grid before starting
    drawGrid();
    initGame();
});
