/* SketchOverflow — draw & guess party game server.
 * Zero-dependency: Node http + Server-Sent Events (server→client push)
 * + POST /api/send (client→server). No npm install required.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const W = require('./words');

const PORT = process.env.PORT || 3000;
const CHOOSE_TIME = 15;   // seconds to pick a word
const TURN_BREAK = 6;     // seconds between turns
const MAX_BODY = 6e6;

const STATIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const rooms = new Map();       // code -> room
const conns = new Map();       // connId -> {id, res}
const playerRoom = new Map();  // connId -> code

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rnd = n => Math.floor(Math.random() * n);
const cleanName = (n) => String(n || '').replace(/[<>&"'`]/g, '').trim().slice(0, 16);

function newCode() {
  let c;
  do {
    c = Array.from({ length: 4 }, () => CODE_CHARS[rnd(CODE_CHARS.length)]).join('');
  } while (rooms.has(c));
  return c;
}

function makeRoom(hostId) {
  const code = newCode();
  const room = {
    code,
    hostId,
    settings: { rounds: 3, drawTime: 60 },
    players: new Map(),        // connId -> {id,name,score,guessed}
    queue: [],
    phase: 'lobby',            // lobby | choosing | drawing | turnend | end
    round: 0,
    drawerId: null,
    drawerName: '',
    word: '',
    wordMeta: null,
    revealed: new Set(),
    hintTimes: [],
    choices: [],
    chooseEndsAt: 0,
    turnEndsAt: 0,
    turnTotal: 0,
    bag: W.buildBag(new Set()),
    used: new Set(),           // every word drawn here — never repeats
    timer: null,
    lastScores: [],
    snapshot: null
  };
  rooms.set(code, room);
  return room;
}

function addPlayer(room, id, name) {
  room.players.set(id, { id, name, score: 0, guessed: false });
}

function state(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    round: room.round,
    totalRounds: room.settings.rounds,
    drawerId: room.drawerId,
    drawerName: room.drawerName,
    hintWord: room.phase === 'drawing' ? W.masked(room.word, room.revealed) : '',
    wordMeta: room.wordMeta ? { cat: room.wordMeta.cat, diff: room.wordMeta.diff } : null,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, guessed: p.guessed }))
  };
}

function broadcast(room, ev, d, exceptId) {
  const payload = `data: ${JSON.stringify({ ev, d })}\n\n`;
  for (const pid of room.players.keys()) {
    if (pid === exceptId) continue;
    const c = conns.get(pid);
    if (c) { try { c.res.write(payload); } catch { /* dropped */ } }
  }
}

function sendTo(id, ev, d) {
  const c = conns.get(id);
  if (c) { try { c.res.write(`data: ${JSON.stringify({ ev, d })}\n\n`); } catch { /* dropped */ } }
}

function sys(room, text) { broadcast(room, 'sys', { text }); }

function stopTimer(room) {
  if (room.timer) { clearInterval(room.timer); room.timer = null; }
}

function startTimer(room) {
  stopTimer(room);
  room.timer = setInterval(() => tick(room), 500);
}

function tick(room) {
  const now = Date.now();
  if (room.phase === 'choosing') {
    const left = Math.max(0, Math.ceil((room.chooseEndsAt - now) / 1000));
    broadcast(room, 'timer', { t: left, total: CHOOSE_TIME });
    if (left <= 0) pickWord(room, room.choices[rnd(room.choices.length)].word, true);
  } else if (room.phase === 'drawing') {
    const left = Math.max(0, Math.ceil((room.turnEndsAt - now) / 1000));
    broadcast(room, 'timer', { t: left, total: room.turnTotal });
    maybeHint(room, left);
    if (left <= 0) endTurn(room, 'Time is up!');
  } else if (room.phase === 'turnend') {
    const left = Math.max(0, Math.ceil((room.turnEndsAt - now) / 1000));
    broadcast(room, 'timer', { t: left, total: TURN_BREAK });
    if (left <= 0) nextTurn(room);
  } else {
    stopTimer(room);
  }
}

function startGame(room) {
  if (room.phase !== 'lobby') return;
  if (room.players.size < 2) { sys(room, '⚠️ Need at least 2 players to start.'); return; }
  room.round = 1;
  for (const p of room.players.values()) p.score = 0;
  room.queue = [...room.players.keys()];
  broadcast(room, 'roundStart', { round: room.round, totalRounds: room.settings.rounds });
  beginTurn(room);
}

function beginTurn(room) {
  room.queue = room.queue.filter(id => room.players.has(id));
  if (!room.queue.length) room.queue = [...room.players.keys()];
  if (!room.queue.length) return endGame(room);

  const drawerId = room.queue.shift();
  const drawer = room.players.get(drawerId);
  room.drawerId = drawerId;
  room.drawerName = drawer.name;
  room.word = '';
  room.wordMeta = null;
  room.revealed = new Set();
  room.snapshot = null;
  room.lastScores = [];
  room.phase = 'choosing';
  room.choices = W.choicesFrom(room.bag, 5);
  room.chooseEndsAt = Date.now() + CHOOSE_TIME * 1000;

  broadcast(room, 'state', state(room));
  sendTo(drawerId, 'yourWords', { choices: room.choices });
  startTimer(room);
}

function pickWord(room, word, auto = false) {
  if (room.phase !== 'choosing') return;
  word = W.norm(word);
  const choice = room.choices.find(c => c.word === word);
  if (!choice) return;
  // unchosen options go back into the bag at random spots — never the tail,
  // so the same words don't resurface for the next players
  for (const c of room.choices) if (c.word !== word) room.bag.splice(rnd(room.bag.length + 1), 0, c);
  room.choices = [];

  room.word = word;
  room.wordMeta = choice;
  room.used.add(word);
  room.revealed = new Set();
  const letters = word.replace(/ /g, '').length;
  room.hintTimes = [];
  if (letters >= 4) room.hintTimes.push(Math.floor(room.settings.drawTime * 0.65));
  if (letters >= 7) room.hintTimes.push(Math.floor(room.settings.drawTime * 0.35));
  if (letters >= 11) room.hintTimes.push(Math.floor(room.settings.drawTime * 0.15));

  room.turnTotal = room.settings.drawTime;
  room.turnEndsAt = Date.now() + room.turnTotal * 1000;
  room.phase = 'drawing';

  broadcast(room, 'wordChosen', {
    hintWord: W.masked(word, room.revealed),
    meta: { cat: choice.cat, diff: choice.diff },
    length: word.length,
    auto
  });
  sendTo(room.drawerId, 'yourWord', { word });
  broadcast(room, 'state', state(room));
}

function maybeHint(room, left) {
  if (!room.hintTimes.includes(left)) return;
  const idxs = [];
  for (let i = 0; i < room.word.length; i++) {
    if (room.word[i] !== ' ' && !room.revealed.has(i)) idxs.push(i);
  }
  if (!idxs.length) return;
  room.revealed.add(idxs[rnd(idxs.length)]);
  broadcast(room, 'hint', { hintWord: W.masked(room.word, room.revealed) });
}

function endTurn(room, reason) {
  if (room.phase !== 'drawing') return;
  room.phase = 'turnend';
  room.turnEndsAt = Date.now() + TURN_BREAK * 1000;
  broadcast(room, 'turnEnd', {
    word: room.word,
    meta: room.wordMeta,
    reason,
    deltas: room.lastScores
  });
  broadcast(room, 'state', state(room));
}

function nextTurn(room) {
  if (!room.queue.length) {
    room.round++;
    if (room.round > room.settings.rounds) return endGame(room);
    room.queue = [...room.players.keys()];
    broadcast(room, 'roundStart', { round: room.round, totalRounds: room.settings.rounds });
  }
  room.queue = room.queue.filter(id => room.players.has(id));
  if (!room.queue.length) return endGame(room);
  beginTurn(room);
}

function endGame(room) {
  stopTimer(room);
  room.phase = 'end';
  const podium = [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
  broadcast(room, 'gameEnd', { podium });
  broadcast(room, 'state', state(room));
}

function handleChat(room, senderId, text) {
  text = String(text || '').trim().slice(0, 120);
  if (!text) return;
  const p = room.players.get(senderId);
  if (!p) return;

  if (room.phase !== 'drawing') {
    broadcast(room, 'chat', { id: senderId, name: p.name, text, kind: 'chat' });
    return;
  }

  const wn = W.norm(room.word);
  const guess = W.norm(text);

  if (senderId === room.drawerId) {
    if (guess && wn.includes(guess)) {
      return sendTo(senderId, 'sys', { text: '⚠️ That would reveal the word!' });
    }
    broadcast(room, 'chat', { id: senderId, name: p.name, text, kind: 'drawer' });
    return;
  }

  if (p.guessed) {
    // solved players chat only with the drawer and other solvers
    for (const x of room.players.values()) {
      if (x.guessed || x.id === room.drawerId) sendTo(x.id, 'chat', { id: senderId, name: p.name, text, kind: 'room' });
    }
    return;
  }

  if (guess === wn) {
    p.guessed = true;
    const timeLeft = Math.max(0, Math.ceil((room.turnEndsAt - Date.now()) / 1000));
    const pts = 100 + Math.round(150 * timeLeft / Math.max(1, room.turnTotal));
    p.score += pts;
    const drawer = room.players.get(room.drawerId);
    if (drawer) {
      drawer.score += 35;
      room.lastScores.push({ name: drawer.name, pts: 35, kind: 'drawer' });
    }
    room.lastScores.push({ name: p.name, pts, kind: 'guess' });
    broadcast(room, 'playerGuessed', { id: p.id, name: p.name, pts });
    sendTo(senderId, 'youGuessed', { word: room.word });
    broadcast(room, 'state', state(room));
    const pending = [...room.players.values()].filter(x => x.id !== room.drawerId && !x.guessed);
    if (!pending.length) endTurn(room, 'Everyone guessed it! 🎉');
    return;
  }

  if (guess.length >= 3 && W.isClose(guess, wn)) {
    sys(room, `💡 ${p.name} is close!`);
    return;
  }

  const msg = { id: senderId, name: p.name, text, kind: 'guess' };
  broadcast(room, 'chat', msg, senderId);
  sendTo(senderId, 'chat', msg);
}

function relayDraw(room, senderId, ev, d) {
  if (senderId !== room.drawerId) return;
  broadcast(room, ev, d, senderId);
}

function handleMessage(room, senderId, ev, d) {
  switch (ev) {
    case 'settings': {
      if (room.hostId !== senderId || room.phase !== 'lobby') return;
      const r = parseInt(d && d.rounds, 10), t = parseInt(d && d.drawTime, 10);
      if (r >= 1 && r <= 8) room.settings.rounds = r;
      if (t >= 20 && t <= 150) room.settings.drawTime = t;
      broadcast(room, 'state', state(room));
      return;
    }
    case 'startGame':
      if (room.hostId === senderId) startGame(room);
      return;
    case 'chooseWord':
      if (room.phase === 'choosing' && senderId === room.drawerId) pickWord(room, d && d.word);
      return;
    case 'chat':
      handleChat(room, senderId, d);
      return;
    case 'strokeStart':
    case 'strokePoints':
    case 'strokeEnd':
    case 'undo':
    case 'clear':
      if (room.phase === 'drawing') relayDraw(room, senderId, ev, d);
      return;
    case 'snapshot':
      if (senderId === room.drawerId && d && typeof d.data === 'string' && d.data.length < 5e6) {
        room.snapshot = d.data;
      }
      return;
    case 'playAgain': {
      if (room.hostId !== senderId || room.phase !== 'end') return;
      room.round = 0;
      room.queue = [];
      room.phase = 'lobby';
      room.lastScores = [];
      for (const p of room.players.values()) p.score = 0;
      broadcast(room, 'backToLobby', {});
      broadcast(room, 'state', state(room));
      return;
    }
  }
}

function leave(id) {
  const code = playerRoom.get(id);
  if (!code) return;
  playerRoom.delete(id);
  const room = rooms.get(code);
  if (!room) return;

  const p = room.players.get(id);
  room.players.delete(id);
  room.queue = room.queue.filter(x => x !== id);
  if (p) sys(room, `👋 ${p.name} left.`);

  if (!room.players.size) {
    stopTimer(room);
    rooms.delete(code);
    return;
  }

  if (room.hostId === id) {
    room.hostId = [...room.players.keys()][0];
    sys(room, `👑 ${room.players.get(room.hostId).name} is the new host.`);
  }

  if ((room.phase === 'drawing' || room.phase === 'choosing') && room.drawerId === id) {
    if (room.phase === 'drawing') {
      endTurn(room, 'The artist left the game!');
    } else {
      room.phase = 'turnend';
      room.turnEndsAt = Date.now() + 1500;
    }
  }
  broadcast(room, 'state', state(room));
}

/* ---------------- http plumbing ---------------- */

function resEnd(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function serveStatic(pathname, res) {
  if (pathname === '/') pathname = '/index.html';
  const fp = path.normalize(path.join(STATIC, pathname));
  if (!fp.startsWith(STATIC)) return resEnd(res, 403, 'forbidden');
  fs.readFile(fp, (err, buf) => {
    if (err) return resEnd(res, 404, 'not found');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}

function openStream(req, res, q) {
  const id = String(q.get('id') || '');
  const action = q.get('action');
  const name = cleanName(q.get('name'));
  const code = String(q.get('code') || '').toUpperCase().trim();
  if (!id) return resEnd(res, 400, 'missing id');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write(':ok\n\n');

  // a reconnecting client reuses its id — replace its old stream, keep membership
  const old = conns.get(id);
  if (old) { try { old.res.end(); } catch { /* already gone */ } }
  conns.set(id, { id, res });

  const hb = setInterval(() => { try { res.write(':hb\n\n'); } catch { /* drop */ } }, 25000);
  req.on('close', () => {
    clearInterval(hb);
    if (conns.get(id) && conns.get(id).res === res) {
      conns.delete(id);
      leave(id);
    }
  });

  const resume = (room) => {
    playerRoom.set(id, room.code);
    sendTo(id, 'joined', { code: room.code });
    if (room.phase === 'drawing' && room.snapshot) sendTo(id, 'snapshot', { data: room.snapshot });
    sendTo(id, 'state', state(room));
    broadcast(room, 'state', state(room));
  };

  if (action === 'create') {
    const existing = rooms.get(playerRoom.get(id));
    if (existing) return resume(existing);
    if (!name) { sendTo(id, 'errMsg', 'Enter a nickname first.'); return res.end(); }
    const room = makeRoom(id);
    addPlayer(room, id, name);
    return resume(room);
  }

  if (action === 'join') {
    const room = rooms.get(code);
    if (!room) { sendTo(id, 'errMsg', 'Room not found — check the code.'); return res.end(); }
    if (playerRoom.get(id) === code && room.players.has(id)) return resume(room);
    if (!name) { sendTo(id, 'errMsg', 'Enter a nickname first.'); return res.end(); }
    if (room.players.size >= 12) { sendTo(id, 'errMsg', 'Room is full (12 players max).'); return res.end(); }
    addPlayer(room, id, name);
    sys(room, `👋 ${name} joined the game!`);
    return resume(room);
  }

  if (action === 'resume') {
    const room = rooms.get(code);
    if (!room || !room.players.has(id)) {
      sendTo(id, 'roomGone', {});
      return res.end();
    }
    return resume(room);
  }

  res.end();
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const pathname = u.pathname;

  if (pathname === '/api/stream' && req.method === 'GET') {
    return openStream(req, res, u.searchParams);
  }

  if (pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', (ch) => {
      size += ch.length;
      if (size > MAX_BODY) { req.destroy(); return; }
      body += ch;
    });
    req.on('end', () => {
      let m;
      try { m = JSON.parse(body); } catch { return resEnd(res, 400, 'bad json'); }
      const code = String(m.code || '').toUpperCase();
      const room = rooms.get(code);
      if (room && conns.has(m.id) && playerRoom.get(m.id) === code) {
        handleMessage(room, m.id, String(m.ev || ''), m.d);
      }
      res.writeHead(204);
      res.end();
    });
    return;
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      words: W.WORDS.length,
      cse: W.WORDS.filter(w => w.cat === 'cse').length,
      engg: W.WORDS.filter(w => w.cat === 'engg').length,
      general: W.WORDS.filter(w => w.cat === 'general').length,
      friends: W.WORDS.filter(w => w.cat === 'friends').length
    }));
  }

  serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`SketchOverflow running → http://localhost:${PORT}  (${W.WORDS.length} words loaded, zero deps)`);
});
