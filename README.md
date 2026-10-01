# SketchOverflow 🎨⌨️

A Skribbl-style draw & guess party game with a **CSE / Engineering word bank** — 877 words (CSE · engineering · general · classmates), difficulty-tagged, beginner-friendly (every turn offers at least 2 easy words), and **never repeating** within a session.

Zero npm dependencies — pure Node.js (http + Server-Sent Events). No install step.

## Run it

```bash
node server.js
# → http://localhost:3000
```

That's it. Requires Node 18+ (built and tested on Node 24).

## Host it on the internet (free)

GitHub Pages won't work here — the game needs a live server process, and Pages only serves static files.
Use **Render.com's free tier** instead (no credit card, no Docker needed):

1. Push this folder to a GitHub repo (see below).
2. Go to [render.com](https://render.com) → sign up with GitHub → **New + → Blueprint** → pick the repo.
   Render reads `render.yaml` and deploys automatically.
3. Share your URL: `https://<your-app>.onrender.com`

Notes on the free tier: the server sleeps after ~15 minutes idle; the next player to open the link
waits ~50 seconds while it wakes. Every deploy restarts and clears rooms.

Push to GitHub (repo `labib-morol/sketch-overflow` already exists — this is for a fresh copy):

```bash
cd sketch-overflow
git init -b main
git add -A
git commit -m "SketchOverflow: draw & guess party game"
git remote add origin https://github.com/<you>/sketch-overflow.git
git push -u origin main
```

## Play with friends

| Where friends are | What to share |
|---|---|
| Same Wi-Fi / LAN | `http://<your-ip>:3000` — find it with `ipconfig` (Wi-Fi adapter IPv4) |
| Over the internet | Run a tunnel, e.g. `npx localtunnel --port 3000` or `ngrok http 3000`, and share the URL |

- First LAN connect may trigger a Windows Firewall prompt — allow Node on private networks.
- Anyone opens the link, picks a nickname, and joins with the 4-letter room code (or the invite link — the host tab's room chip copies it).
- 2–12 players. Host controls rounds (1–8) and draw time (30–150s) in the lobby.

## Game rules

- Each round, every player takes a turn drawing; they pick 1 of 5 words (CSE · Engineering · General · Classmates, easy/medium/hard — at least 2 easy per turn).
- Guessers type guesses in chat. Wrong guesses are visible; a typo close to the word shows "💡 is close!".
- Points: guessers get `100 + time bonus`; the drawer gets +35 per correct guesser.
- Letter hints auto-reveal at 65%, 35% (and 15% for very long words) of the countdown.
- If everyone guesses early, the turn ends early.
- Words are drawn from a shuffled bag at random positions and tracked per room — a word never comes back until the whole bank is exhausted.

## Drawing tools

13 colors · 4 brush sizes · eraser · undo · clear. Drawing syncs live to everyone; late joiners get a canvas snapshot.

## Files

```
server.js        game server + SSE realtime transport (zero deps)
words.js         726-word bank + shuffle bag + close-guess (Levenshtein) logic
public/          index.html · style.css · app.js (vanilla JS client)
```
