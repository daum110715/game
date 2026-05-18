/* ===== Memory 记忆翻牌 ===== */

const SYMBOLS = [
  { color: 'c-red', shape: 'solid' }, { color: 'c-orange', shape: 'solid' },
  { color: 'c-yellow', shape: 'solid' }, { color: 'c-green', shape: 'solid' },
  { color: 'c-teal', shape: 'solid' }, { color: 'c-blue', shape: 'solid' },
  { color: 'c-purple', shape: 'solid' }, { color: 'c-slate', shape: 'solid' },
  { color: 'c-pink', shape: 'solid' }, { color: 'c-cyan', shape: 'solid' },
  { color: 'c-lime', shape: 'solid' }, { color: 'c-amber', shape: 'solid' },
  { color: 'c-red', shape: 'hollow' }, { color: 'c-orange', shape: 'hollow' },
  { color: 'c-yellow', shape: 'hollow' }, { color: 'c-green', shape: 'hollow' },
  { color: 'c-teal', shape: 'hollow' }, { color: 'c-blue', shape: 'hollow' },
  { color: 'c-purple', shape: 'hollow' }, { color: 'c-slate', shape: 'hollow' },
  { color: 'c-pink', shape: 'hollow' }, { color: 'c-cyan', shape: 'hollow' },
  { color: 'c-lime', shape: 'hollow' }, { color: 'c-amber', shape: 'hollow' }
];

const DIFFICULTIES = {
  easy:   { name: '简单', rows: 4, cols: 4, pairs: 8 },
  medium: { name: '中等', rows: 4, cols: 5, pairs: 10 },
  hard:   { name: '困难', rows: 6, cols: 6, pairs: 18 }
};

/* ---------- 状态 ---------- */
let cards = [];
let firstPick = null;
let secondPick = null;
let isLocked = false;
let moves = 0;
let matchedPairs = 0;
let totalPairs = 8;
let difficulty = 'easy';
let gameWon = false;
let history = [];

const $ = GameUtils.$;
const storage = new GameStorage('game_memory');
const statsMgr = new GameStats(storage, 'stats_v1', { version: 2, started: 0, won: 0, sessions: [], bestMoves: 0, bestTimeMs: 0 });
const timer = new GameTimer(ms => {
  $('stat-time').textContent = GameUtils.formatTime(Math.floor(ms / 1000));
});

/* ---------- 初始化 ---------- */
function init() {
  GameOverlay.bindEscToClose('win-overlay', 'help-overlay', 'confirm-overlay');

  $('btn-new').addEventListener('click', askNewGame);
  $('btn-undo').addEventListener('click', undo);
  $('btn-help').addEventListener('click', showHelp);
  $('help-close').addEventListener('click', hideHelp);
  $('win-new').addEventListener('click', () => { hideWin(); newGame(); });

  $('difficulty').addEventListener('change', () => {
    if (gameWon || matchedPairs === 0) {
      newGame($('difficulty').value);
    } else {
      GameOverlay.showConfirm('切换难度将开始新游戏，当前进度将丢失。').then(ok => {
        if (ok) newGame($('difficulty').value);
        else { $('difficulty').value = difficulty; syncDropdown($('difficulty')); }
      });
    }
  });

  document.addEventListener('keydown', onKeyDown);

  if (!loadGame()) {
    newGame();
  }

  if (typeof window.buildCustomDropdown === 'function') {
    window.buildCustomDropdown($('difficulty'));
  }
}

function syncDropdown(sel) {
  if (sel._updateCustomDropdown) sel._updateCustomDropdown();
}

/* ---------- 新游戏 ---------- */
function newGame(diff) {
  if (diff) difficulty = diff;
  const cfg = DIFFICULTIES[difficulty];
  totalPairs = cfg.pairs;

  // 生成配对
  const pool = SYMBOLS.slice(0, totalPairs);
  const deck = [...pool, ...pool];
  shuffle(deck);

  cards = deck.map((symbol, i) => ({
    id: i,
    symbol,
    flipped: false,
    matched: false
  }));

  firstPick = null;
  secondPick = null;
  isLocked = false;
  moves = 0;
  matchedPairs = 0;
  gameWon = false;
  history = [];

  timer.reset();
  timer.start();
  render();
  updateStatsDisplay();
  safeSaveGame();
}

function askNewGame() {
  if (gameWon || matchedPairs === 0) {
    newGame();
  } else {
    GameOverlay.showConfirm('当前对局尚未结束，确定要重新开始吗？').then(ok => {
      if (ok) newGame();
    });
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/* ---------- 渲染 ---------- */
function render() {
  const cfg = DIFFICULTIES[difficulty];
  $('stat-difficulty').textContent = cfg.name;
  $('stat-moves').textContent = moves;
  $('stat-remaining').textContent = totalPairs - matchedPairs;
  $('btn-undo').disabled = history.length === 0;

  const board = $('board');
  board.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'memory-grid ' + difficulty;

  cards.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'memory-card';
    if (card.flipped || card.matched) el.classList.add('flipped');
    if (card.matched) el.classList.add('matched', 'disabled');
    if (isLocked && !card.matched) el.classList.add('disabled');

    el.innerHTML =
      '<div class="memory-card-inner">' +
        '<div class="memory-card-back"></div>' +
        '<div class="memory-card-face ' + card.symbol.color + '">' +
          '<div class="memory-shape ' + card.symbol.shape + '"></div>' +
        '</div>' +
      '</div>';

    el.addEventListener('click', () => onCardClick(idx));
    grid.appendChild(el);
  });

  board.appendChild(grid);
}

/* ---------- 交互 ---------- */
function onCardClick(idx) {
  if (isLocked || gameWon) return;
  const card = cards[idx];
  if (card.flipped || card.matched) return;

  // 记录历史（用于撤销）
  pushHistory();

  card.flipped = true;

  if (firstPick === null) {
    firstPick = idx;
    render();
    safeSaveGame();
    return;
  }

  if (firstPick === idx) return;

  secondPick = idx;
  moves++;
  isLocked = true;
  render();

  const firstCard = cards[firstPick];
  const secondCard = cards[secondPick];

  if (firstCard.symbol.color === secondCard.symbol.color && firstCard.symbol.shape === secondCard.symbol.shape) {
    // 匹配成功
    setTimeout(() => {
      firstCard.matched = true;
      secondCard.matched = true;
      matchedPairs++;
      firstPick = null;
      secondPick = null;
      isLocked = false;
      render();
      safeSaveGame();
      checkWin();
    }, 400);
  } else {
    // 匹配失败，翻回
    setTimeout(() => {
      firstCard.flipped = false;
      secondCard.flipped = false;
      firstPick = null;
      secondPick = null;
      isLocked = false;
      render();
      safeSaveGame();
    }, 800);
  }
}

/* ---------- 撤销 ---------- */
function pushHistory() {
  // 只记录翻牌前的状态
  history.push({
    cards: cards.map(c => ({ ...c, symbol: { ...c.symbol } })),
    firstPick,
    secondPick,
    isLocked,
    moves,
    matchedPairs
  });
  if (history.length > 100) history.shift();
}

function undo() {
  if (gameWon || history.length === 0 || isLocked) return;
  const s = history.pop();
  cards = s.cards;
  firstPick = s.firstPick;
  secondPick = s.secondPick;
  isLocked = s.isLocked;
  moves = s.moves;
  matchedPairs = s.matchedPairs;
  render();
  safeSaveGame();
}

/* ---------- 胜利 ---------- */
function checkWin() {
  if (matchedPairs < totalPairs) return;
  gameWon = true;
  timer.stop();
  updateStats(true);
  clearSave();
  setTimeout(() => {
    showWin();
    fireConfetti();
  }, 300);
}

function showWin() {
  $('win-difficulty').textContent = DIFFICULTIES[difficulty].name;
  $('win-moves').textContent = moves;
  $('win-time').textContent = GameUtils.formatTime(Math.floor(timer.getElapsedMs() / 1000));
  const winStats = $('win-stats');
  if (winStats) winStats.innerHTML = generateStatsHTML();
  GameOverlay.show('win-overlay');
}
function hideWin() { GameOverlay.hide('win-overlay'); }

/* ---------- 统计 ---------- */
function updateStats(won) {
  const stats = statsMgr.get();
  stats.started++;
  if (won) {
    stats.won++;
    const session = {
      difficulty,
      won: true,
      moves,
      timeMs: timer.getElapsedMs(),
      completedAt: Date.now()
    };
    stats.sessions.unshift(session);
    if (stats.sessions.length > 50) stats.sessions.pop();

    if (stats.bestMoves === 0 || moves < stats.bestMoves) stats.bestMoves = moves;
    const timeMs = timer.getElapsedMs();
    if (stats.bestTimeMs === 0 || timeMs < stats.bestTimeMs) stats.bestTimeMs = timeMs;
  }
  statsMgr.set(stats);
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const s = statsMgr.get();
  $('stats-started').textContent = s.started || 0;
  $('stats-won').textContent = s.won || 0;
  const winRate = s.started ? Math.round((s.won / s.started) * 100) : 0;
  $('stats-win-rate').textContent = winRate + '%';
  $('stats-best-moves').textContent = s.bestMoves || '-';
  $('stats-best-time').textContent = s.bestTimeMs ? GameUtils.formatTime(Math.floor(s.bestTimeMs / 1000)) : '-';

  const wonSessions = (s.sessions || []).filter(x => x.won);
  const avgMoves = wonSessions.length ? Math.round(wonSessions.reduce((sum, x) => sum + x.moves, 0) / wonSessions.length) : 0;
  $('stats-avg-moves').textContent = avgMoves || '-';

  renderRecentList(s.sessions || []);
}

function generateStatsHTML() {
  const s = statsMgr.get();
  const winRate = s.started ? Math.round((s.won / s.started) * 100) : 0;
  return '<div>胜率 <strong>' + winRate + '%</strong></div>' +
    '<div>最佳步数 <strong>' + (s.bestMoves || '-') + '</strong></div>' +
    '<div>最快时间 <strong>' + (s.bestTimeMs ? GameUtils.formatTime(Math.floor(s.bestTimeMs / 1000)) : '-') + '</strong></div>';
}

function renderRecentList(sessions) {
  const list = $('recent-list');
  const wonSessions = sessions.filter(s => s.won);
  if (!wonSessions.length) {
    list.innerHTML = '<div class="recent-empty">暂无记录</div>';
    return;
  }
  list.innerHTML = wonSessions.slice(0, 10).map(s => {
    const diffName = DIFFICULTIES[s.difficulty]?.name || s.difficulty;
    return '<div class="recent-item">' +
      '<span>' + diffName + '</span>' +
      '<span>' + s.moves + ' 步</span>' +
      '<span>' + GameUtils.formatTime(Math.floor(s.timeMs / 1000)) + '</span>' +
      '</div>';
  }).join('');
}

/* ---------- 保存/加载 ---------- */
function saveGame() {
  const data = {
    cards,
    firstPick,
    secondPick,
    isLocked,
    moves,
    matchedPairs,
    totalPairs,
    difficulty,
    gameWon,
    elapsedMs: timer.getElapsedMs()
  };
  storage.save('save_v1', data);
}

function loadGame() {
  try {
    const data = storage.load('save_v1');
    if (!data || !Array.isArray(data.cards)) return false;
    if (data.gameOver) { clearSave(); return false; }
    // 丢弃旧格式存档（symbol 为字符串）
    if (data.cards.length > 0 && typeof data.cards[0].symbol === 'string') {
      clearSave(); return false;
    }
    cards = data.cards;
    firstPick = data.firstPick;
    secondPick = data.secondPick;
    isLocked = data.isLocked || false;
    moves = data.moves || 0;
    matchedPairs = data.matchedPairs || 0;
    totalPairs = data.totalPairs || DIFFICULTIES[data.difficulty]?.pairs || 8;
    difficulty = data.difficulty || 'easy';
    gameWon = data.gameOver || false;
    history = [];
    const elapsed = data.elapsedMs || 0;
    timer.setElapsedMs(elapsed);
    $('difficulty').value = difficulty;
    syncDropdown($('difficulty'));
    updateStatsDisplay();
    render();
    if (!gameWon) timer.start();
    return true;
  } catch { return false; }
}

function safeSaveGame() {
  try { saveGame(); } catch {}
}

function clearSave() {
  storage.remove('save_v1');
}

/* ---------- 弹窗 ---------- */
function showHelp() { GameOverlay.show('help-overlay'); }
function hideHelp() { GameOverlay.hide('help-overlay'); }

/* ---------- 键盘 ---------- */
function onKeyDown(e) {
  if (e.key === '?') { showHelp(); return; }
  if (isLocked) return;
  const key = e.key.toLowerCase();
  if (key === 'r') {
    e.preventDefault();
    askNewGame();
  } else if (key === 'u' || (e.ctrlKey && key === 'z')) {
    e.preventDefault(); undo();
  }
}

/* ---------- 启动 ---------- */
init();
