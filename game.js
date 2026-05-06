// =============================================
//  BATALLA NAVAL - game.js
// =============================================

const GRID_SIZE = 10;
const COLS = 'ABCDEFGHIJ';

const SHIPS = [
  { id: 'portaaviones', name: 'Portaaviones', size: 5 },
  { id: 'acorazado',   name: 'Acorazado',    size: 4 },
  { id: 'crucero',     name: 'Crucero',       size: 3 },
  { id: 'submarino',   name: 'Submarino',     size: 3 },
  { id: 'destructor',  name: 'Destructor',    size: 2 },
];

// ---- State ----
let state = {
  phase: 'start',          // start | place | game | result
  playerBoard: null,       // 10x10 grid
  enemyBoard: null,
  playerShips: [],         // { id, cells[], sunk }
  enemyShips: [],
  selectedShip: null,      // ship def being placed
  orientation: 'H',        // H | V
  placedShips: [],          // ids already placed
  currentTurn: 'player',
  playerHits: 0,
  enemyHits: 0,
  shots: 0,
  winner: null,
  aiLastHit: null,
  aiHitQueue: [],           // cells to try after a hit
};

// ---- Screens ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
}

// ---- Board Helpers ----
function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cellId(r, c) { return `${r}-${c}`; }

function coordLabel(r, c) { return `${COLS[c]}${r + 1}`; }

function getCellEl(boardEl, r, c) {
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

// ---- Build DOM Board ----
function buildBoard(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';

  // Row number overlay
  const nums = document.createElement('div');
  nums.className = 'board-row-nums';
  for (let r = 0; r < GRID_SIZE; r++) {
    const n = document.createElement('div');
    n.className = 'row-num';
    n.textContent = r + 1;
    nums.appendChild(n);
  }
  el.parentElement.style.position = 'relative';
  el.parentElement.appendChild(nums);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      el.appendChild(cell);
    }
  }
}

// ---- Placement Phase ----
function initPlacement() {
  state.playerBoard = createEmptyBoard();
  state.placedShips = [];
  state.orientation = 'H';
  state.selectedShip = null;
  state.playerShips = [];

  buildBoard('player-board');
  renderShipsPanel();
  attachPlacementEvents();
  updateReadyBtn();
}

function renderShipsPanel() {
  const container = document.getElementById('ships-to-place');
  container.innerHTML = '';

  SHIPS.forEach(ship => {
    const placed = state.placedShips.includes(ship.id);
    const isSelected = state.selectedShip && state.selectedShip.id === ship.id;

    const item = document.createElement('div');
    item.className = `ship-item${placed ? ' placed' : ''}${isSelected ? ' selected' : ''}`;
    item.dataset.shipId = ship.id;

    const cells = document.createElement('div');
    cells.className = 'ship-item-cells';
    for (let i = 0; i < ship.size; i++) {
      const dot = document.createElement('div');
      dot.className = 'ship-cell-dot';
      cells.appendChild(dot);
    }

    const name = document.createElement('div');
    name.className = 'ship-item-name';
    name.textContent = `${ship.name} (${ship.size})`;

    item.appendChild(cells);
    item.appendChild(name);

    if (!placed) {
      item.addEventListener('click', () => selectShip(ship));
    }

    container.appendChild(item);
  });
}

function selectShip(ship) {
  state.selectedShip = ship;
  renderShipsPanel();
  clearPreview('player-board');
}

function attachPlacementEvents() {
  const board = document.getElementById('player-board');

  board.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !state.selectedShip) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    showPreview(r, c);
  });

  board.addEventListener('mouseleave', () => {
    clearPreview('player-board');
  });

  board.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !state.selectedShip) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    placeShip(r, c);
  });

  board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.orientation = state.orientation === 'H' ? 'V' : 'H';
    const hovered = board.querySelector('.cell.ship-preview, .cell.ship-invalid');
    if (hovered) {
      const r = +hovered.dataset.r, c = +hovered.dataset.c;
      clearPreview('player-board');
      showPreview(r, c);
    }
    updateRotateBtn();
  });

  document.getElementById('btn-rotate').addEventListener('click', () => {
    state.orientation = state.orientation === 'H' ? 'V' : 'H';
    updateRotateBtn();
  });

  document.getElementById('btn-random').addEventListener('click', randomPlacement);
  document.getElementById('btn-ready').addEventListener('click', startGame);
}

function updateRotateBtn() {
  const btn = document.getElementById('btn-rotate');
  btn.textContent = state.orientation === 'H' ? '🔄 ROTAR (→)' : '🔄 ROTAR (↓)';
}

function getShipCells(r, c, size, orientation) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    const nr = orientation === 'V' ? r + i : r;
    const nc = orientation === 'H' ? c + i : c;
    cells.push([nr, nc]);
  }
  return cells;
}

function isValidPlacement(cells) {
  for (const [r, c] of cells) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (state.playerBoard[r][c] !== null) return false;
    // Check adjacency
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (state.playerBoard[nr][nc] !== null) return false;
        }
      }
    }
  }
  return true;
}

function showPreview(r, c) {
  clearPreview('player-board');
  if (!state.selectedShip) return;
  const cells = getShipCells(r, c, state.selectedShip.size, state.orientation);
  const valid = isValidPlacement(cells);
  const board = document.getElementById('player-board');
  cells.forEach(([nr, nc]) => {
    const el = getCellEl(board, nr, nc);
    if (el) el.classList.add(valid ? 'ship-preview' : 'ship-invalid');
  });
}

function clearPreview(boardId) {
  document.getElementById(boardId)
    .querySelectorAll('.ship-preview, .ship-invalid')
    .forEach(el => el.classList.remove('ship-preview', 'ship-invalid'));
}

function placeShip(r, c) {
  if (!state.selectedShip) return;
  const cells = getShipCells(r, c, state.selectedShip.size, state.orientation);
  if (!isValidPlacement(cells)) return;

  cells.forEach(([nr, nc]) => {
    state.playerBoard[nr][nc] = state.selectedShip.id;
    const el = getCellEl(document.getElementById('player-board'), nr, nc);
    if (el) el.classList.add('ship');
  });

  state.playerShips.push({ id: state.selectedShip.id, cells, sunk: false });
  state.placedShips.push(state.selectedShip.id);

  const remaining = SHIPS.filter(s => !state.placedShips.includes(s.id));
  state.selectedShip = remaining.length > 0 ? remaining[0] : null;

  renderShipsPanel();
  updateReadyBtn();
}

function updateReadyBtn() {
  const btn = document.getElementById('btn-ready');
  btn.disabled = state.placedShips.length < SHIPS.length;
}

function randomPlacement() {
  // Clear board
  state.playerBoard = createEmptyBoard();
  state.placedShips = [];
  state.playerShips = [];
  const board = document.getElementById('player-board');
  board.querySelectorAll('.cell').forEach(el => el.classList.remove('ship', 'ship-preview', 'ship-invalid'));

  SHIPS.forEach(ship => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const orientation = Math.random() < 0.5 ? 'H' : 'V';
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      const cells = getShipCells(r, c, ship.size, orientation);
      if (isValidPlacement(cells)) {
        cells.forEach(([nr, nc]) => {
          state.playerBoard[nr][nc] = ship.id;
          const el = getCellEl(board, nr, nc);
          if (el) el.classList.add('ship');
        });
        state.playerShips.push({ id: ship.id, cells, sunk: false });
        state.placedShips.push(ship.id);
        placed = true;
      }
    }
  });

  state.selectedShip = null;
  renderShipsPanel();
  updateReadyBtn();
}

function placeEnemyShips() {
  state.enemyBoard = createEmptyBoard();
  state.enemyShips = [];

  SHIPS.forEach(ship => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const orientation = Math.random() < 0.5 ? 'H' : 'V';
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      const cells = getShipCells(r, c, ship.size, orientation);

      let valid = true;
      for (const [nr, nc] of cells) {
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || state.enemyBoard[nr][nc] !== null) {
          valid = false; break;
        }
      }
      if (valid) {
        cells.forEach(([nr, nc]) => { state.enemyBoard[nr][nc] = ship.id; });
        state.enemyShips.push({ id: ship.id, cells, sunk: false });
        placed = true;
      }
    }
  });
}

// ---- Game Phase ----
function startGame() {
  placeEnemyShips();
  state.currentTurn = 'player';
  state.playerHits = 0;
  state.enemyHits = 0;
  state.shots = 0;
  state.winner = null;
  state.aiLastHit = null;
  state.aiHitQueue = [];

  buildBoard('enemy-board');
  buildBoard('player-game-board');
  renderPlayerGameBoard();
  attachGameEvents();

  document.getElementById('player-hits').textContent = '0';
  document.getElementById('enemy-hits').textContent = '0';
  document.getElementById('message-log').innerHTML = '';
  document.getElementById('turn-indicator').textContent = 'TU TURNO';
  document.getElementById('turn-indicator').classList.remove('enemy-turn');

  markAttackableCells();
  showScreen('screen-game');
}

function renderPlayerGameBoard() {
  const board = document.getElementById('player-game-board');
  state.playerShips.forEach(ship => {
    ship.cells.forEach(([r, c]) => {
      const el = getCellEl(board, r, c);
      if (el) el.classList.add('ship');
    });
  });
}

function markAttackableCells() {
  const board = document.getElementById('enemy-board');
  board.querySelectorAll('.cell').forEach(cell => {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (!cell.classList.contains('hit') && !cell.classList.contains('miss') && !cell.classList.contains('sunk')) {
      cell.classList.add('attackable');
    }
  });
}

function attachGameEvents() {
  const board = document.getElementById('enemy-board');
  board.addEventListener('click', (e) => {
    if (state.currentTurn !== 'player') return;
    const cell = e.target.closest('.cell');
    if (!cell || !cell.classList.contains('attackable')) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    playerAttack(r, c);
  });
}

function playerAttack(r, c) {
  const result = processAttack(r, c, state.enemyBoard, state.enemyShips, 'enemy-board');
  state.shots++;

  if (result.hit) {
    state.playerHits++;
    document.getElementById('player-hits').textContent = state.playerHits;
    logMessage(`Tu ataque en ${coordLabel(r, c)} — ¡IMPACTO!`, result.sunk ? 'sunk' : 'hit');
    if (result.sunk) logMessage(`¡Hundiste el ${result.shipName}! 🔥`, 'sunk');
    document.getElementById('enemy-status').textContent = result.sunk ? `¡HUNDIDO! ${result.shipName}` : '¡IMPACTO!';
    flashStatus('enemy-status', 'hit');
  } else {
    logMessage(`Tu ataque en ${coordLabel(r, c)} — agua`, 'miss');
    document.getElementById('enemy-status').textContent = 'AGUA';
    flashStatus('enemy-status', 'miss');
  }

  if (checkWin(state.enemyShips)) {
    endGame('player');
    return;
  }

  setTurn('enemy');
  setTimeout(enemyTurn, 800 + Math.random() * 600);
}

function enemyTurn() {
  const [r, c] = aiPickCell();
  const result = processAttack(r, c, state.playerBoard, state.playerShips, 'player-game-board');

  if (result.hit) {
    state.enemyHits++;
    document.getElementById('enemy-hits').textContent = state.enemyHits;
    logMessage(`Enemigo atacó ${coordLabel(r, c)} — ¡TE IMPACTARON!`, result.sunk ? 'sunk' : 'hit');
    if (result.sunk) logMessage(`¡Hundieron tu ${result.shipName}! 💀`, 'sunk');
    document.getElementById('player-status').textContent = result.sunk ? `¡HUNDIDO! ${result.shipName}` : '¡IMPACTADO!';
    flashStatus('player-status', 'hit');

    if (!result.sunk) {
      state.aiLastHit = [r, c];
      // Add adjacent cells to queue
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (state.playerBoard[nr][nc] !== 'hit' && state.playerBoard[nr][nc] !== 'miss') {
            state.aiHitQueue.push([nr, nc]);
          }
        }
      });
    } else {
      state.aiLastHit = null;
      state.aiHitQueue = [];
    }
  } else {
    logMessage(`Enemigo atacó ${coordLabel(r, c)} — agua`, 'miss');
    document.getElementById('player-status').textContent = 'FALLARON';
    flashStatus('player-status', 'miss');
  }

  if (checkWin(state.playerShips)) {
    endGame('enemy');
    return;
  }

  setTurn('player');
  markAttackableCells();
}

function aiPickCell() {
  // Drain smart queue first
  while (state.aiHitQueue.length > 0) {
    const candidate = state.aiHitQueue.shift();
    const [r, c] = candidate;
    if (state.playerBoard[r][c] !== 'hit' && state.playerBoard[r][c] !== 'miss') {
      return [r, c];
    }
  }

  // Checkerboard random
  const available = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = state.playerBoard[r][c];
      if (v !== 'hit' && v !== 'miss' && (r + c) % 2 === 0) {
        available.push([r, c]);
      }
    }
  }
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Fallback: any available
  const any = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = state.playerBoard[r][c];
      if (v !== 'hit' && v !== 'miss') any.push([r, c]);
    }
  }
  return any[Math.floor(Math.random() * any.length)];
}

function processAttack(r, c, board, ships, boardId) {
  const boardEl = document.getElementById(boardId);
  const cellEl = getCellEl(boardEl, r, c);

  if (board[r][c] && board[r][c] !== 'hit' && board[r][c] !== 'miss') {
    const shipId = board[r][c];
    board[r][c] = 'hit';
    if (cellEl) {
      cellEl.classList.remove('ship', 'attackable');
      cellEl.classList.add('hit');
    }

    const ship = ships.find(s => s.id === shipId);
    const allHit = ship.cells.every(([sr, sc]) => board[sr][sc] === 'hit');

    if (allHit) {
      ship.sunk = true;
      ship.cells.forEach(([sr, sc]) => {
        board[sr][sc] = 'sunk';
        const el = getCellEl(boardEl, sr, sc);
        if (el) { el.classList.remove('hit'); el.classList.add('sunk'); }
      });
      const def = SHIPS.find(s => s.id === shipId);
      return { hit: true, sunk: true, shipName: def.name };
    }
    return { hit: true, sunk: false };
  } else {
    board[r][c] = 'miss';
    if (cellEl) {
      cellEl.classList.remove('attackable');
      cellEl.classList.add('miss');
    }
    return { hit: false, sunk: false };
  }
}

function checkWin(ships) {
  return ships.every(s => s.sunk);
}

function setTurn(who) {
  state.currentTurn = who;
  const indicator = document.getElementById('turn-indicator');
  if (who === 'player') {
    indicator.textContent = 'TU TURNO';
    indicator.classList.remove('enemy-turn');
  } else {
    indicator.textContent = 'TURNO ENEMIGO';
    indicator.classList.add('enemy-turn');
    // Remove attackable during enemy turn
    document.getElementById('enemy-board').querySelectorAll('.attackable').forEach(el => el.classList.remove('attackable'));
  }
}

function flashStatus(id, type) {
  const el = document.getElementById(id);
  el.classList.remove('flash-hit', 'flash-miss');
  void el.offsetWidth;
  el.classList.add(type === 'hit' ? 'flash-hit' : 'flash-miss');
}

function logMessage(text, type = '') {
  const log = document.getElementById('message-log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `> ${text}`;
  log.prepend(entry);
}

// ---- End Game ----
function endGame(winner) {
  state.winner = winner;
  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const msg = document.getElementById('result-message');
  const stats = document.getElementById('result-stats');

  if (winner === 'player') {
    icon.textContent = '🏆';
    title.textContent = '¡VICTORIA!';
    title.className = 'win-title';
    msg.textContent = '¡Hundiste toda la flota enemiga! Eres el almirante de los mares.';
  } else {
    icon.textContent = '💀';
    title.textContent = '¡DERROTA!';
    title.className = 'lose-title';
    msg.textContent = 'El enemigo hundió tu flota. ¡Reagrúpate y vuelve a intentarlo!';
  }

  stats.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${state.shots}</div>
      <div class="stat-label">DISPAROS</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${state.playerHits}</div>
      <div class="stat-label">IMPACTOS</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${state.shots > 0 ? Math.round((state.playerHits/state.shots)*100) : 0}%</div>
      <div class="stat-label">PRECISIÓN</div>
    </div>
  `;

  setTimeout(() => showScreen('screen-result'), 600);
}

// ---- Init ----
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('screen-place');
  initPlacement();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  showScreen('screen-start');
});

showScreen('screen-start');
