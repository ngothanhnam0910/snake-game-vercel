(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const btnStart = document.getElementById('btnStart');
  const btnRestart = document.getElementById('btnRestart');

  const GRID = 20;
  const SIZE = canvas.width;
  const CELL = SIZE / GRID;

  const COLORS = {
    bg: '#0b1220',
    grid: 'rgba(255,255,255,0.06)',
    snake: '#5eead4',
    snakeHead: '#a7f3d0',
    food: '#fb7185',
    text: 'rgba(230,237,247,0.9)'
  };

  const clamp = (n, max) => (n + max) % max;
  const eq = (a, b) => a.x === b.x && a.y === b.y;

  let state;
  let running = false;
  let lastTime = 0;
  let stepMs = 140; // base speed

  const readBest = () => {
    const v = Number(localStorage.getItem('snake_best') || 0);
    return Number.isFinite(v) ? v : 0;
  };
  const writeBest = (v) => localStorage.setItem('snake_best', String(v));

  function reset() {
    state = {
      snake: [
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 14, y: 10 },
      score: 0,
      speedLevel: 1,
      over: false,
      message: 'Nhấn Space để bắt đầu',
    };
    stepMs = 140;
    speedEl.textContent = `${state.speedLevel}x`;
    scoreEl.textContent = '0';
    bestEl.textContent = String(readBest());
    spawnFood();
    draw();
  }

  function spawnFood() {
    const occupied = new Set(state.snake.map(p => `${p.x},${p.y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
    } while (occupied.has(`${x},${y}`));
    state.food = { x, y };
  }

  function setDir(dx, dy) {
    // prevent reversing
    if (state.dir.x === -dx && state.dir.y === -dy) return;
    state.nextDir = { x: dx, y: dy };
  }

  function tick() {
    if (state.over) return;

    state.dir = state.nextDir;

    const head = state.snake[0];
    const newHead = {
      x: clamp(head.x + state.dir.x, GRID),
      y: clamp(head.y + state.dir.y, GRID)
    };

    // self collision
    for (let i = 0; i < state.snake.length; i++) {
      if (eq(state.snake[i], newHead)) {
        gameOver();
        return;
      }
    }

    state.snake.unshift(newHead);

    if (eq(newHead, state.food)) {
      state.score += 10;
      scoreEl.textContent = String(state.score);

      // speed up every 50 points
      const lvl = 1 + Math.floor(state.score / 50);
      if (lvl !== state.speedLevel) {
        state.speedLevel = lvl;
        speedEl.textContent = `${lvl}x`;
        stepMs = Math.max(60, 140 - (lvl - 1) * 12);
      }

      spawnFood();
    } else {
      state.snake.pop();
    }
  }

  function gameOver() {
    state.over = true;
    running = false;
    const best = readBest();
    if (state.score > best) writeBest(state.score);
    bestEl.textContent = String(readBest());
    state.message = 'Game over — nhấn R để chơi lại';
    draw();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // subtle grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }
  }

  function drawCell(x, y, color, pad = 2, radius = 6) {
    const px = x * CELL + pad;
    const py = y * CELL + pad;
    const w = CELL - pad * 2;
    const h = CELL - pad * 2;

    ctx.fillStyle = color;
    roundRect(ctx, px, py, w, h, radius);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function draw() {
    drawGrid();

    // food
    drawCell(state.food.x, state.food.y, COLORS.food, 3, 10);

    // snake
    state.snake.forEach((p, idx) => {
      drawCell(p.x, p.y, idx === 0 ? COLORS.snakeHead : COLORS.snake, 3, 10);
    });

    if (!running || state.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, SIZE, SIZE);

      ctx.fillStyle = COLORS.text;
      ctx.font = '700 20px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, SIZE / 2, SIZE / 2 - 6);

      ctx.font = '500 14px ui-sans-serif, system-ui';
      ctx.fillText('Điều khiển: WASD / Arrow Keys', SIZE / 2, SIZE / 2 + 22);
    }
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!running) return;
    if (!lastTime) lastTime = ts;

    const delta = ts - lastTime;
    if (delta >= stepMs) {
      lastTime = ts;
      tick();
      draw();
    }
  }

  function toggleRun() {
    if (state.over) return;
    running = !running;
    state.message = running ? '' : 'Tạm dừng — nhấn Space để tiếp tục';
    draw();
  }

  // Input
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDir(0, -1);
    else if (k === 'arrowdown' || k === 's') setDir(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDir(1, 0);
    else if (k === ' ') toggleRun();
    else if (k === 'r') { reset(); running = true; state.message = ''; }
  });

  btnStart.addEventListener('click', toggleRun);
  btnRestart.addEventListener('click', () => { reset(); running = true; state.message = ''; });

  reset();
  requestAnimationFrame(loop);
})();
