/* SketchOverflow client */
const $ = (s) => document.querySelector(s);
// captured BEFORE the socket constructor writes its id — non-null only when
// THIS tab is reloading (a brand-new tab has no stored id yet)
const PRIOR_TAB_ID = sessionStorage.getItem('so_id');

/* ---- tiny realtime transport: SSE (server→client) + POST (client→server) ---- */
class MiniSock {
  constructor() {
    // survive page reloads: same tab keeps the same id, so the server
    // recognizes the player and restores score/turn state
    this.id = sessionStorage.getItem('so_id')
      || (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    sessionStorage.setItem('so_id', this.id);
    this.code = null;
    this.handlers = {};
    this.es = null;
    this.errStreak = 0;
    this.autoJoin = false;
  }
  connect(params) {
    this.code = params.code || null;
    if (this.es) { try { this.es.close(); } catch { /* was closed */ } }
    const qs = new URLSearchParams({ action: params.action, name: params.name || '', id: this.id });
    if (params.code) qs.set('code', params.code);
    const es = new EventSource('/api/stream?' + qs.toString());
    this.es = es;
    es.onmessage = (e) => {
      this.errStreak = 0;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      (this.handlers[m.ev] || []).forEach(fn => { try { fn(m.d); } catch (err) { console.error(err); } });
    };
    es.onerror = () => {
      // brief drops heal via the server's 20s grace window + auto-resume here
      this.errStreak++;
      if (this.errStreak >= 5) {
        try { es.close(); } catch { /* already closed */ }
        if (this.code && localStorage.getItem('so_name')) {
          setTimeout(() => {
            this.connect({ action: 'resume', code: this.code, name: localStorage.getItem('so_name') });
          }, 2000);
        }
      }
    };
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, data) {
    return fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: this.code, id: this.id, ev, d: data })
    }).catch(() => {});
  }
}
const socket = new MiniSock();
socket.on('roomGone', () => { alert('This room has closed.'); location.href = '/'; });

/* ---- sound effects: synthesized with WebAudio, no audio files ---- */
const Sfx = (() => {
  let actx = null;
  let muted = localStorage.getItem('so_mute') === '1';
  const ac = () => (actx ||= new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, dur, { type = 'sine', vol = 0.14, delay = 0, slide = 0 } = {}) {
    if (muted) return;
    try {
      const c = ac();
      if (c.state === 'suspended') c.resume();
      const t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch { /* audio unavailable */ }
  }
  return {
    toggle() { muted = !muted; localStorage.setItem('so_mute', muted ? '1' : '0'); return muted; },
    get muted() { return muted; },
    unlock() { try { ac(); if (actx.state === 'suspended') actx.resume(); } catch { /* no audio */ } },
    yourTurn()  { tone(523, .12); tone(659, .12, { delay: .12 }); tone(784, .28, { delay: .24 }); },
    wordChosen(){ tone(440, .1, { type: 'triangle' }); tone(660, .16, { delay: .1 }); },
    guessed()   { tone(880, .1, { type: 'triangle', vol: .12 }); tone(1175, .2, { delay: .1, vol: .12 }); },
    youGotIt()  { tone(660, .1); tone(880, .1, { delay: .1 }); tone(1318, .3, { delay: .2 }); },
    close()     { tone(330, .12, { type: 'square', vol: .05 }); },
    tick()      { tone(1000, .04, { type: 'square', vol: .045 }); },
    timeUp()    { tone(240, .5, { type: 'sawtooth', vol: .09, slide: -140 }); },
    reveal()    { tone(392, .15); tone(523, .3, { delay: .15 }); },
    gameOver()  { [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, { delay: i * .16 })); },
    roundStart(){ tone(587, .1); tone(587, .18, { delay: .12 }); },
    join()      { tone(700, .08, { vol: .08 }); tone(900, .12, { delay: .08, vol: .08 }); }
  };
})();

const CAT_LABEL = { cse: 'CSE', engg: 'Engineering', general: 'General', friends: 'Classmate' };
const COLORS = ['#111111', '#7f8c8d', '#ffffff', '#e74c3c', '#e67e22', '#f1c40f',
  '#2ecc71', '#16a085', '#3498db', '#274690', '#7c5cff', '#e84393', '#8b5a2b'];

let st = null;              // latest server state
let myId = socket.id;
let myWord = '';            // full word (drawer or solved guesser)
let pendingChoices = null;  // drawer's word options
let lastTurnEnd = null;
let lastGameEnd = null;
let lastTickT = -1;

/* ================= canvas ================= */
const board = $('#board');
const ctx = board.getContext('2d');
let strokes = [];
let cur = null;
let pointBuf = [];          // batched stroke points (~50ms) to keep POSTs light
let flushT = null;
const tool = { color: '#111111', size: 8, eraser: false };

function strokeStyle(s) {
  ctx.strokeStyle = s.eraser ? '#ffffff' : s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
function drawFull(s) {
  strokeStyle(s);
  ctx.beginPath();
  s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.01, s.points[0].y);
  ctx.stroke();
}
function seg(a, b, s) {
  strokeStyle(s);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.01, b.y + 0.01);
  ctx.stroke();
}
function redraw() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 800, 600);
  strokes.forEach(drawFull);
}
redraw();

function pos(e) {
  const r = board.getBoundingClientRect();
  return { x: (e.clientX - r.left) * 800 / r.width, y: (e.clientY - r.top) * 600 / r.height };
}
function canDraw() {
  return !!st && st.phase === 'drawing' && st.drawerId === myId;
}

board.addEventListener('pointerdown', (e) => {
  if (!canDraw()) return;
  try { board.setPointerCapture(e.pointerId); } catch { /* synthetic/edge pointer ids */ }
  const p = pos(e);
  cur = {
    points: [p],
    color: tool.color,
    size: tool.eraser ? Math.max(16, tool.size * 2.2) : tool.size,
    eraser: tool.eraser
  };
  strokes.push(cur);
  pointBuf = [];
  drawFull(cur);
  socket.emit('strokeStart', { x: p.x, y: p.y, color: cur.color, size: cur.size, eraser: cur.eraser });
});
board.addEventListener('pointermove', (e) => {
  if (!cur) return;
  const p = pos(e);
  const prev = cur.points[cur.points.length - 1];
  if (Math.abs(p.x - prev.x) < 0.6 && Math.abs(p.y - prev.y) < 0.6) return;
  cur.points.push(p);
  pointBuf.push(p);
  seg(prev, p, cur);
  if (!flushT) flushT = setTimeout(flushPoints, 50);
});
function flushPoints() {
  flushT = null;
  if (!pointBuf.length) return;
  socket.emit('strokePoints', { pts: pointBuf });
  pointBuf = [];
}
function endStroke() {
  if (!cur) return;
  cur = null;
  clearTimeout(flushT); flushT = null;
  flushPoints();
  socket.emit('strokeEnd', {});
  socket.emit('snapshot', { data: board.toDataURL('image/webp', 0.7) });
}
board.addEventListener('pointerup', endStroke);
board.addEventListener('pointercancel', endStroke);

socket.on('strokeStart', (d) => {
  strokes.push({ points: [{ x: d.x, y: d.y }], color: d.color, size: d.size, eraser: d.eraser });
});
socket.on('strokePoints', (d) => {
  const s = strokes[strokes.length - 1];
  if (!s || !d.pts || !d.pts.length) return;
  let prev = s.points[s.points.length - 1];
  for (const p of d.pts) {
    s.points.push(p);
    seg(prev, p, s);
    prev = p;
  }
});
socket.on('undo', () => { strokes.pop(); redraw(); });
socket.on('clear', () => { strokes = []; redraw(); });
socket.on('snapshot', ({ data } = {}) => {
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, 800, 600);
  img.src = data;
});

/* ================= tools ================= */
const colorsEl = $('#colors');
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 0 ? ' active' : '');
  b.style.background = c;
  b.title = c;
  b.onclick = () => {
    tool.color = c;
    tool.eraser = false;
    $('#btnEraser').classList.remove('active');
    colorsEl.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  };
  colorsEl.appendChild(b);
});
document.querySelectorAll('.size').forEach(b => {
  b.onclick = () => {
    tool.size = parseInt(b.dataset.s, 10);
    document.querySelectorAll('.size').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  };
  if (b.dataset.s === '8') b.classList.add('active');
});
$('#btnEraser').onclick = () => {
  tool.eraser = !tool.eraser;
  $('#btnEraser').classList.toggle('active', tool.eraser);
};
$('#btnUndo').onclick = () => { if (!canDraw()) return; strokes.pop(); redraw(); socket.emit('undo'); };
$('#btnClear').onclick = () => { if (!canDraw()) return; strokes = []; redraw(); socket.emit('clear'); };

/* ================= chat ================= */
const chatLog = $('#chatLog');
function addMsg(html, cls) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.innerHTML = html;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function addChat(d) { addMsg(`<b>${esc(d.name)}:</b> ${esc(d.text)}`, 'kind-' + d.kind); }
function addSys(t) { addMsg(esc(t), 'kind-sys' + (t.includes('⚠') ? ' warn' : '')); }

$('#chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#chatIn').value.trim();
  if (!v) return;
  socket.emit('chat', v);
  $('#chatIn').value = '';
});

/* ================= toast ================= */
let toastTimer;
function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

/* ================= rendering ================= */
const selfP = () => (st ? st.players.find(p => p.id === myId) : null);

function renderPlayers() {
  const list = [...st.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  $('#players').innerHTML = list.map(p => `
    <div class="player ${p.id === myId ? 'me' : ''} ${p.guessed ? 'guessed' : ''} ${p.id === st.drawerId ? 'drawing' : ''}">
      <span class="badge">${p.id === st.hostId ? '👑' : (p.id === st.drawerId ? '✏️' : '•')}</span>
      <span class="pname">${esc(p.name)}</span>
      ${p.guessed ? '<span class="badge">✅</span>' : ''}
      <span class="pscore">${p.score}</span>
    </div>`).join('');
}

function renderLobby() {
  $('#bigCode').textContent = st.code;
  const isHost = st.hostId === myId;
  $('#btnStart').classList.toggle('hidden', !isHost);
  $('#waitTxt').classList.toggle('hidden', isHost);
  $('#setRounds').value = st.settings.rounds;
  $('#setTime').value = st.settings.drawTime;
  $('#setRounds').disabled = !isHost;
  $('#setTime').disabled = !isHost;
}

function renderWordBox() {
  const wb = $('#wordBox');
  const me = selfP();
  const meta = st.wordMeta && (st.phase === 'drawing' || st.phase === 'turnend')
    ? `<span class="cat">${CAT_LABEL[st.wordMeta.cat] || ''} · ${st.wordMeta.diff}</span>` : '';
  if (st.phase === 'drawing') {
    const showFull = st.drawerId === myId || (me && me.guessed);
    wb.innerHTML = (showFull ? esc(myWord || '?') : esc(st.hintWord)) + meta;
  } else if (st.phase === 'turnend' && lastTurnEnd) {
    wb.innerHTML = esc(lastTurnEnd.word) + meta;
  } else {
    wb.textContent = '';
  }
}

function renderStatus() {
  const me = selfP();
  let s = '';
  if (st.phase === 'choosing') s = `✏️ ${st.drawerName} is picking a word…`;
  else if (st.phase === 'drawing') {
    if (st.drawerId === myId) s = `🎨 You are drawing "${myWord}"`;
    else if (me && me.guessed) s = '✅ You got it! Wait for the others…';
    else s = '🔎 Type your guess in the chat →';
  } else if (st.phase === 'turnend' && lastTurnEnd) {
    s = lastTurnEnd.reason;
  }
  $('#statusLine').textContent = s;
  const inp = $('#chatIn');
  if (st.phase === 'drawing') {
    inp.placeholder = st.drawerId === myId ? 'chat as the artist…'
      : (me && me.guessed) ? 'you guessed it! chat with the solvers…' : 'type your guess…';
  } else {
    inp.placeholder = 'chat with the room…';
  }
}

function showOverlay(html) {
  $('#overlay').classList.remove('hidden');
  $('#overlayCard').innerHTML = html;
}
function hideOverlay() { $('#overlay').classList.add('hidden'); }

function renderOverlay() {
  const card = $('#overlayCard');
  if (st.phase === 'choosing') {
    if (st.drawerId === myId && pendingChoices) {
      showOverlay(`
        <h2>Pick a word to draw</h2>
        <div class="word-choices">
          ${pendingChoices.choices.map(w =>
            `<button class="btn choice" data-w="${esc(w.word)}"><span>${esc(w.word)}</span><span class="meta">${CAT_LABEL[w.cat] || ''} · ${w.diff}</span></button>`).join('')}
        </div>
        <p class="muted" style="margin-top:10px" id="chooseTimer"></p>`);
      card.querySelectorAll('.choice').forEach(b => {
        b.onclick = () => {
          socket.emit('chooseWord', { word: b.dataset.w });
          pendingChoices = null;
          renderAll();
        };
      });
    } else {
      showOverlay(`<h2>✏️ ${esc(st.drawerName)} is picking a word…</h2><p class="muted" id="chooseTimer"></p>`);
    }
  } else if (st.phase === 'turnend' && lastTurnEnd) {
    const d = lastTurnEnd;
    showOverlay(`
      ${d.word ? `<h2>The word was</h2><div class="big-word">${esc(d.word)}</div>` : `<h2>Turn skipped</h2>`}
      ${d.deltas && d.deltas.length
        ? `<div class="deltas">${d.deltas.map(x =>
            `<div>${x.kind === 'drawer' ? '🎨' : '✅'} ${esc(x.name)} <b style="color:var(--green)">+${x.pts}</b></div>`).join('')}</div>`
        : '<p class="muted">No one guessed it 😬</p>'}
      <p class="muted" style="margin-top:8px">Next player in <b id="teTimer"></b>s</p>`);
  } else if (st.phase === 'end' && lastGameEnd) {
    const medals = ['🥇', '🥈', '🥉'];
    const isHost = st.hostId === myId;
    showOverlay(`
      <h2>🏁 Game over!</h2>
      <div class="podium">
        ${lastGameEnd.podium.map(p =>
          `<div class="row"><span>${medals[p.rank - 1] || '🎗️'} ${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}
      </div>
      ${isHost
        ? '<button id="btnAgain" class="btn primary big">🔁 Play Again</button>'
        : '<p class="muted">Waiting for the host to start the next game…</p>'}`);
    const again = $('#btnAgain');
    if (again) again.onclick = () => socket.emit('playAgain');
  } else {
    hideOverlay();
  }
}

function renderAll() {
  if (!st) return;
  $('#lobbyPanel').classList.toggle('hidden', st.phase !== 'lobby');
  $('#gamePanel').classList.toggle('hidden', st.phase === 'lobby');
  $('#roundTxt').textContent = st.round > 0 ? `Round ${st.round}/${st.totalRounds}` : '';
  renderPlayers();
  if (st.phase === 'lobby') renderLobby();
  renderWordBox();
  renderStatus();
  renderOverlay();
  const drawing = st.phase === 'drawing' && st.drawerId === myId;
  $('#tools').classList.toggle('hidden', !drawing);
  board.style.cursor = drawing ? 'crosshair' : 'default';
}

/* ================= socket events ================= */
socket.on('joined', ({ code }) => {
  socket.code = code;
  $('#home').classList.add('hidden');
  $('#room').classList.remove('hidden');
  $('#homeErr').textContent = '';
  $('#codeTxt').textContent = code;
  chatLog.innerHTML = '';
  history.replaceState(null, '', '/?room=' + code);
  toast(`🎉 Joined room ${code} — share the link!`);
});

socket.on('state', (s) => { st = s; socket.autoJoin = false; renderAll(); });
socket.on('yourWords', (d) => { pendingChoices = d; Sfx.yourTurn(); renderAll(); });
socket.on('wordChosen', (d) => {
  pendingChoices = null;
  myWord = '';
  strokes = [];
  redraw();
  lastTickT = -1;
  if (st) st.hintWord = d.hintWord;
  Sfx.wordChosen();
  renderAll();
});
socket.on('yourWord', (d) => { myWord = d.word; renderAll(); });
socket.on('hint', (d) => { if (st) { st.hintWord = d.hintWord; renderWordBox(); } });
socket.on('youGuessed', (d) => { myWord = d.word; Sfx.youGotIt(); renderAll(); });
socket.on('playerGuessed', (d) => { Sfx.guessed(); addSys(`🎉 ${d.name} guessed the word! +${d.pts}`); });
socket.on('turnEnd', (d) => { lastTurnEnd = d; Sfx.reveal(); renderAll(); });
socket.on('gameEnd', (d) => { lastGameEnd = d; Sfx.gameOver(); renderAll(); });
socket.on('roundStart', (d) => { Sfx.roundStart(); addSys(`🔔 Round ${d.round} of ${d.totalRounds}`); });
socket.on('backToLobby', () => {
  lastTurnEnd = null; lastGameEnd = null; pendingChoices = null;
  strokes = []; redraw();
  toast('Back to the lobby');
  renderAll();
});
socket.on('chat', addChat);
socket.on('sys', (d) => {
  addSys(d.text);
  if (/joined the game/.test(d.text)) Sfx.join();
  else if (/is close/.test(d.text)) Sfx.close();
});
socket.on('errMsg', (t) => {
  if (socket.autoJoin && /not found/i.test(t)) { location.href = '/'; return; }
  if ($('#home').classList.contains('hidden')) toast('⚠️ ' + t);
  else $('#homeErr').textContent = t;
});

socket.on('timer', ({ t, total }) => {
  $('#timerTxt').textContent = t;
  if (st && st.phase === 'drawing' && t !== lastTickT && t >= 0 && t <= 10) {
    lastTickT = t;
    if (t === 0) Sfx.timeUp(); else Sfx.tick();
  }
  const pct = total ? Math.max(0, Math.min(100, (t / total) * 100)) : 0;
  const bar = $('#timerBar');
  bar.style.width = pct + '%';
  bar.style.background = t <= 10
    ? 'linear-gradient(90deg,#f87171,#fbbf24)'
    : 'linear-gradient(90deg,#34d399,#22d3ee)';
  const ct = $('#chooseTimer');
  if (ct && st && st.phase === 'choosing') ct.textContent = t > 0 ? `auto-pick in ${t}s` : '';
  const te = $('#teTimer');
  if (te && st && st.phase === 'turnend') te.textContent = t;
});

/* ================= home / lobby actions ================= */
const savedName = localStorage.getItem('so_name');
if (savedName) $('#name').value = savedName;
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) $('#code').value = urlRoom.toUpperCase();
$('#name').focus();

// auto-rejoin after a page reload — the tab kept its player id in sessionStorage,
// so the server restores score and seat instead of kicking the player
if (urlRoom && savedName && PRIOR_TAB_ID) {
  socket.autoJoin = true;
  socket.connect({ action: 'join', code: urlRoom.toUpperCase(), name: savedName });
}

/* ================= sound toggle ================= */
const soundBtn = $('#btnSound');
const paintSound = () => { soundBtn.textContent = Sfx.muted ? '🔇' : '🔊'; };
paintSound();
soundBtn.onclick = () => { Sfx.toggle(); paintSound(); };
document.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });

function requireName() {
  const name = $('#name').value.trim();
  if (!name) { $('#homeErr').textContent = 'Enter a nickname first.'; return null; }
  localStorage.setItem('so_name', name);
  return name;
}
$('#btnCreate').onclick = () => {
  const name = requireName();
  if (name) socket.connect({ action: 'create', name });
};
$('#name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnCreate').click(); });
$('#btnJoin').onclick = () => {
  const name = requireName();
  const code = $('#code').value.trim().toUpperCase();
  if (!name) return;
  if (code.length !== 4) { $('#homeErr').textContent = 'Room code is 4 characters.'; return; }
  socket.connect({ action: 'join', code, name });
};
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnJoin').click(); });

$('#setRounds').onchange = (e) => socket.emit('settings', { rounds: e.target.value });
$('#setTime').onchange = (e) => socket.emit('settings', { drawTime: e.target.value });
$('#btnStart').onclick = () => socket.emit('startGame');

$('#roomChip').onclick = async () => {
  const link = location.origin + '/?room=' + st.code;
  try {
    await navigator.clipboard.writeText(link);
    toast('🔗 Invite link copied!');
  } catch {
    toast('Invite link: ' + link);
  }
};
$('#btnLeave').onclick = () => location.reload();

fetch('/api/stats').then(r => r.json()).then(d => {
  $('#wordStats').textContent =
    `${d.words} words loaded — ${d.cse} CSE · ${d.engg} engineering · ${d.general} general · ${d.friends} classmates`;
}).catch(() => {});
