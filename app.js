/* Impostor de Futbolistas - MVP (pasar el móvil) */

const $ = (id) => document.getElementById(id);

/** Toggle global: deja el sistema de SVG en el código, pero no lo muestra. */
const SHOW_DEAL_ART = false; // <-- cambia a true cuando quieras volver a verlo

const screens = {
  setup: $("screenSetup"),
  online: $("screenOnline"),
  deal: $("screenDeal"),
  ready: $("screenReady"),
  timer: $("screenTimer"),
  vote: $("screenVote"),
  results: $("screenResults"),
};

const ui = {
  miniStatus: $("miniStatus"),

  // Setup
  playersCount: $("playersCount"),
  durationMin: $("durationMin"),
  difficulty: $("difficulty"),
  btnLocal: $("btnLocal"),
  btnOnline: $("btnOnline"),

  // Online
  onlineName: $("onlineName"),
  onlineRoomCode: $("onlineRoomCode"),
  onlineStatus: $("onlineStatus"),
  onlineCurrentCode: $("onlineCurrentCode"),
  onlinePlayersList: $("onlinePlayersList"),
  btnCreateRoom: $("btnCreateRoom"),
  btnJoinRoom: $("btnJoinRoom"),
  btnBackFromOnline: $("btnBackFromOnline"),
  btnCopyCode: $("btnCopyCode"),
  onlineStateBadge: $("onlineStateBadge"),
  onlinePlayersCount: $("onlinePlayersCount"),
  onlinePlayersMax: $("onlinePlayersMax"),
  onlinePlayersHint: $("onlinePlayersHint"),

  // Deal
  dealPlayerNum: $("dealPlayerNum"),
  dealProgress: $("dealProgress"),
  revealPlayerNum: $("revealPlayerNum"),
  roleTag: $("roleTag"),
  revealContent: $("revealContent"),
  btnReveal: $("btnReveal"),
  btnHide: $("btnHide"),
  btnNextPlayer: $("btnNextPlayer"),
  dealArt: $("dealArt"),

  // Ready
  readyDuration: $("readyDuration"),
  btnBeginTimer: $("btnBeginTimer"),
  btnRestartFromReady: $("btnRestartFromReady"),

  // Timer
  timerDisplay: $("timerDisplay"),
  timerPlayers: $("timerPlayers"),
  timerDifficulty: $("timerDifficulty"),
  btnEndEarly: $("btnEndEarly"),
  btnRestartFromTimer: $("btnRestartFromTimer"),

  // Vote
  voteTurn: $("voteTurn"),
  voteProgress: $("voteProgress"),
  voteSelect: $("voteSelect"),
  voteConfirmBox: $("voteConfirmBox"),
  btnConfirmVote: $("btnConfirmVote"),

  // Results
  resultsBadge: $("resultsBadge"),
  resultsTitle: $("resultsTitle"),
  resultsSubtitle: $("resultsSubtitle"),
  realImpostor: $("realImpostor"),
  realPlayerName: $("realPlayerName"),
  realClue: $("realClue"),
  votesList: $("votesList"),
  btnPlayAgain: $("btnPlayAgain"),
  btnPlaySame: $("btnPlaySame"),
};

let playersDB = [];

// State
let state = {
  config: {
    nPlayers: 4,
    durationSec: 10 * 60,
    difficulty: "normal",
  },
  game: {
    impostorIndex: 1, // 1..N
    target: null, // {id,name,pistas}
    clue: "",
    dealIndex: 1,
    timerRemaining: 10 * 60,
    timerInterval: null,
    voteTurn: 1,
    votes: [], // votes[i] = chosen player number
  },
};

function showScreen(key) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[key].classList.add("active");
}

function setMiniStatus(text) {
  ui.miniStatus.textContent = text || "";
}

function setOnlineStatus(text) {
  if (ui.onlineStatus) ui.onlineStatus.textContent = text || "";
}

/**
 * Render seguro de la ilustración (o la oculta por completo si SHOW_DEAL_ART=false).
 * Mantiene el código de SVG intacto para reactivarlo luego.
 */
function setDealArt(html) {
  if (!ui.dealArt) return;

  if (!SHOW_DEAL_ART) {
    ui.dealArt.innerHTML = "";
    ui.dealArt.style.display = "none";
    return;
  }

  ui.dealArt.style.display = "";
  ui.dealArt.innerHTML = html || "";
}

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem("impostor_fut_config");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.config.nPlayers = clampInt(parsed.nPlayers, 3, 12, 4);
      state.config.durationSec = clampInt(parsed.durationSec, 5 * 60, 15 * 60, 10 * 60);
      state.config.difficulty = ["easy", "normal", "hard"].includes(parsed.difficulty)
        ? parsed.difficulty
        : "normal";
    }
  } catch (_) {}
}

function saveConfigToStorage() {
  localStorage.setItem("impostor_fut_config", JSON.stringify(state.config));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTargetAndClue(difficulty) {
  for (let tries = 0; tries < 30; tries++) {
    const candidate = pickRandom(playersDB);
    const pistas = candidate?.pistas?.[difficulty];
    if (Array.isArray(pistas) && pistas.length > 0) {
      return { target: candidate, clue: pickRandom(pistas) };
    }
    const fallbackOrder = ["normal", "easy", "hard"];
    for (const d of fallbackOrder) {
      const p = candidate?.pistas?.[d];
      if (Array.isArray(p) && p.length > 0) {
        return { target: candidate, clue: pickRandom(p) };
      }
    }
  }
  return { target: { id: 0, name: "Futbolista desconocido", pistas: { normal: ["Sin pista"] } }, clue: "Sin pista" };
}

function resetGame(keepConfig) {
  if (!keepConfig) {
    state.config = {
      nPlayers: 4,
      durationSec: 10 * 60,
      difficulty: "normal",
    };
  }

  const n = state.config.nPlayers;
  const { target, clue } = pickTargetAndClue(state.config.difficulty);

  state.game = {
    impostorIndex: randInt(1, n),
    target,
    clue,
    dealIndex: 1,
    timerRemaining: state.config.durationSec,
    timerInterval: null,
    voteTurn: 1,
    votes: [],
  };
}

function renderSetup() {
  ui.playersCount.value = String(state.config.nPlayers);
  ui.durationMin.value = String(Math.floor(state.config.durationSec / 60));
  ui.difficulty.value = state.config.difficulty;
  setMiniStatus("Prepara el partido");
}

function applySetupInputs() {
  const nPlayers = clampInt(ui.playersCount.value, 3, 12, 4);
  const durationMin = clampInt(ui.durationMin.value, 5, 15, 10);
  const difficulty = ui.difficulty.value;

  state.config.nPlayers = nPlayers;
  state.config.durationSec = durationMin * 60;
  state.config.difficulty = ["easy", "normal", "hard"].includes(difficulty) ? difficulty : "normal";

  saveConfigToStorage();
}

function renderDeal() {
  const n = state.config.nPlayers;
  const i = state.game.dealIndex;

  ui.dealPlayerNum.textContent = String(i);
  ui.revealPlayerNum.textContent = String(i);
  ui.dealProgress.textContent = `${i}/${n}`;

  // Antes de revelar: arte neutro (si está habilitado)
  setDealArt(renderDealArtNeutral(`p${state.game.dealIndex}`));

  ui.roleTag.classList.remove("impostor", "player");
  ui.roleTag.textContent = "Listo";

  ui.revealContent.innerHTML = `
    <div class="locker">
      <div class="locker-icon">🔒</div>
      <div class="locker-text">Pulsa para ver tu rol</div>
      <button id="btnRevealInline" class="btn primary">Ver mi rol</button>
    </div>
  `;

  const btnRevealInline = document.getElementById("btnRevealInline");
  btnRevealInline.addEventListener("click", onReveal);

  ui.btnHide.disabled = true;
  ui.btnNextPlayer.disabled = true;

  setMiniStatus(`Reparto: Jugador ${i}/${n}`);
}

function onReveal() {
  const i = state.game.dealIndex;
  const impostor = (i === state.game.impostorIndex);

  // Actualiza ilustración según rol y futbolista (si está habilitado)
  const uid = `p${i}`;
  setDealArt(
    impostor
      ? renderImpostorArt(uid)
      : renderFootballerArtByName(state.game.target?.name || "", uid)
  );

  if (impostor) {
    ui.roleTag.textContent = "IMPOSTOR";
    ui.roleTag.classList.add("impostor");

    ui.revealContent.innerHTML = `
      <div class="rolebox">
        <div class="role-main">
          <div class="role-label">Tu rol</div>
          <div class="role-value">Impostor</div>
        </div>
        <div class="role-main">
          <div class="role-label">Pista</div>
          <div class="role-value" style="font-size:20px;">${escapeHtml(state.game.clue)}</div>
        </div>
        <div class="pill">No digas que eres el impostor. Intenta adivinar el futbolista.</div>
      </div>
    `;
  } else {
    ui.roleTag.textContent = "JUGADOR";
    ui.roleTag.classList.add("player");
    ui.revealContent.innerHTML = `
      <div class="rolebox">
        <div class="role-main">
          <div class="role-label">Tu rol</div>
          <div class="role-value">Jugador</div>
        </div>
        <div class="role-main">
          <div class="role-label">Futbolista</div>
          <div class="role-value">${escapeHtml(state.game.target.name)}</div>
        </div>
        <div class="pill">Habla sin decir el nombre directamente. Intentad descubrir al impostor.</div>
      </div>
    `;
  }

  ui.btnHide.disabled = false;
  ui.btnNextPlayer.disabled = true;
}

function onHide() {
  ui.roleTag.classList.remove("impostor", "player");
  ui.roleTag.textContent = "Oculto";
  ui.revealContent.innerHTML = `
    <div class="locker">
      <div class="locker-icon">🔒</div>
      <div class="locker-text">Rol oculto. Pasa el móvil.</div>
      <div class="pill">Pulsa “Siguiente jugador” para continuar.</div>
    </div>
  `;
  ui.btnHide.disabled = true;
  ui.btnNextPlayer.disabled = false;
}

function onNextPlayer() {
  const n = state.config.nPlayers;
  if (state.game.dealIndex < n) {
    state.game.dealIndex += 1;
    renderDeal();
    showScreen("deal");
  } else {
    renderReady();
    showScreen("ready");
  }
}

function renderReady() {
  ui.readyDuration.textContent = formatTime(state.config.durationSec);
  setMiniStatus("Que empiece el debate");
}

function startTimer() {
  stopTimer();
  state.game.timerRemaining = state.config.durationSec;

  ui.timerPlayers.textContent = String(state.config.nPlayers);
  ui.timerDifficulty.textContent = state.config.difficulty;
  ui.timerDisplay.textContent = formatTime(state.game.timerRemaining);

  setMiniStatus("El impostor está entre vosotros");

  state.game.timerInterval = setInterval(() => {
    state.game.timerRemaining -= 1;
    if (state.game.timerRemaining <= 0) {
      ui.timerDisplay.textContent = "00:00";
      stopTimer();
      goToVoting();
      return;
    }
    ui.timerDisplay.textContent = formatTime(state.game.timerRemaining);
  }, 1000);
}

function stopTimer() {
  if (state.game.timerInterval) {
    clearInterval(state.game.timerInterval);
    state.game.timerInterval = null;
  }
}

function buildVoteSelect(n) {
  ui.voteSelect.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Jugador ${i}`;
    ui.voteSelect.appendChild(opt);
  }
}

function renderVote() {
  const n = state.config.nPlayers;
  const t = state.game.voteTurn;

  ui.voteTurn.textContent = String(t);
  ui.voteProgress.textContent = `${t}/${n}`;

  buildVoteSelect(n);
  ui.voteSelect.value = "1";

  ui.voteConfirmBox.textContent = "Selecciona un jugador y confirma.";
  setMiniStatus(`Votación: Turno Jugador ${t}/${n}`);
}

function confirmVote() {
  const n = state.config.nPlayers;
  const chosen = clampInt(ui.voteSelect.value, 1, n, 1);

  const ok = window.confirm(`¿Confirmas tu voto? Has elegido: Jugador ${chosen}`);
  if (!ok) return;

  state.game.votes.push(chosen);
  ui.voteConfirmBox.textContent = `Voto registrado: Jugador ${chosen}`;

  if (state.game.voteTurn < n) {
    state.game.voteTurn += 1;
    renderVote();
  } else {
    renderResults();
    showScreen("results");
  }
}

function renderResults() {
  const n = state.config.nPlayers;
  const counts = Array.from({ length: n + 1 }, () => 0);
  for (const v of state.game.votes) counts[v]++;

  let max = -1;
  let top = 1;
  for (let i = 1; i <= n; i++) {
    if (counts[i] > max) {
      max = counts[i];
      top = i;
    }
  }

  const realImp = state.game.impostorIndex;
  const caught = (top === realImp);

  ui.realImpostor.textContent = `Jugador ${realImp}`;
  ui.realPlayerName.textContent = state.game.target.name;
  ui.realClue.textContent = state.game.clue;

  ui.votesList.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const row = document.createElement("div");
    row.className = "vote-row";
    row.innerHTML = `<span>Jugador ${i}</span><strong>${counts[i]} voto(s)</strong>`;
    ui.votesList.appendChild(row);
  }

  if (caught) {
    ui.resultsBadge.textContent = "🏆";
    ui.resultsTitle.textContent = "¡Habéis acertado!";
    ui.resultsSubtitle.textContent = `El más votado fue Jugador ${top}, que era el impostor.`;
  } else {
    ui.resultsBadge.textContent = "🕵️";
    ui.resultsTitle.textContent = "No habéis acertado";
    ui.resultsSubtitle.textContent = `El más votado fue Jugador ${top}, pero el impostor era Jugador ${realImp}.`;
  }

  setMiniStatus("La verdad sale a la luz");
}

function goToVoting() {
  stopTimer();
  state.game.voteTurn = 1;
  state.game.votes = [];
  renderVote();
  showScreen("vote");
}

function restart(confirmText = "¿Seguro que quieres reiniciar la partida?") {
  const ok = window.confirm(confirmText);
  if (!ok) return;

  stopTimer();
  resetGame(true);
  renderDeal();
  showScreen("deal");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normName(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function renderDealArtNeutral(uid) {
  // Antes de revelar: un “momento estadio” neutro
  return `
    <div class="deal-art-wrap">
      ${svgNeutralStadium(uid)}
      <div class="cap">Pulsa “Ver mi rol”. No dejes que nadie mire tu pantalla.</div>
    </div>
  `;
}

function renderImpostorArt(uid) {
  return `
    <div class="deal-art-wrap">
      ${svgImpostorSilhouette(uid)}
      <div class="cap">Eres el impostor. Disimula… y adivina el futbolista.</div>
    </div>
  `;
}

function renderFootballerArtByName(playerName, uid) {
  const n = normName(playerName);

  // Ajusta aquí los “match” si tu JSON usa otra forma
  if (n.includes("messi")) return wrapArt(svgMessiLike(uid), `Hoy toca magia. No digas el nombre.`);
  if (n.includes("cristiano") || n.includes("ronaldo")) return wrapArt(svgCristianoLike(uid), `Potencia y nervios de acero. Juega fino.`);
  if (n.includes("neymar")) return wrapArt(svgNeymarLike(uid), `Regate y creatividad. Habla sin delatarte.`);
  if (n.includes("mbappe") || n.includes("mbappé")) return wrapArt(svgMbappeLike(uid), `Velocidad total. Describe sin decir quién es.`);
  if (n.includes("haaland")) return wrapArt(svgHaalandLike(uid), `Fuerza y gol. Mantén la calma.`);

  // Fallback si el futbolista no está entre los 5
  return wrapArt(svgGenericPlayer(uid), `Habla con naturalidad. No digas el nombre.`);
}

function wrapArt(svg, caption) {
  return `
    <div class="deal-art-wrap">
      ${svg}
      <div class="cap">${escapeHtml(caption)}</div>
    </div>
  `;
}

/* =========================
   SVGs (estilo dibujo)
   ========================= */

function svgNeutralStadium(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Estadio">
    <defs>
      <linearGradient id="sky_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(0,167,255,0.18)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
      <linearGradient id="pitch_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,212,106,0.22)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="960" height="250" fill="url(#sky_${uid})"/>
    <rect x="0" y="220" width="960" height="200" fill="url(#pitch_${uid})"/>
    <path d="M0 300H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <circle cx="480" cy="320" r="56" fill="none" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <path d="M120 220V420M840 220V420" stroke="rgba(233,246,238,0.08)" stroke-width="3"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="16" font-weight="900">Momento de revelar</text>
  </svg>`;
}

function svgImpostorSilhouette(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Silueta con interrogante">
    <defs>
      <filter id="soft_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
      <linearGradient id="bg_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(255,59,77,0.18)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="960" height="420" fill="url(#bg_${uid})"/>
    <ellipse cx="480" cy="352" rx="120" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#soft_${uid})"/>
    <g fill="rgba(233,246,238,0.14)" stroke="rgba(233,246,238,0.22)" stroke-width="3">
      <circle cx="480" cy="130" r="46"/>
      <path d="M380 330 C392 255, 420 220, 480 220 C540 220, 568 255, 580 330 Z"/>
    </g>
    <text x="480" y="225" text-anchor="middle"
      fill="rgba(233,246,238,0.88)"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="120" font-weight="1000">?</text>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="16" font-weight="900">IMPOSTOR</text>
  </svg>`;
}

function svgGenericPlayer(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jugador genérico">
    <defs>
      <filter id="softg_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="110" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#softg_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="480" cy="120" r="34"/>
      <path d="M480 156 C480 198, 480 220, 480 252"/>
      <path d="M480 196 C444 214, 420 232, 396 256"/>
      <path d="M480 196 C520 212, 548 236, 572 262"/>
      <path d="M480 252 C450 286, 430 312, 410 334"/>
      <path d="M480 252 C510 280, 536 304, 562 322"/>
    </g>
    <circle cx="650" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="16" font-weight="900">Jugador</text>
  </svg>`;
}

/* Los 5 “dibujos” (estilo reconocible, no fotorrealista) */

function svgMessiLike(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración estilo Messi">
    <defs><filter id="s_${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.3"/></filter></defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="110" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#s_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="470" cy="118" r="34"/>
      <!-- “barba” ligera -->
      <path d="M446 124 C456 148, 486 148, 494 124" stroke="rgba(233,246,238,0.55)" />
      <path d="M470 152 C468 196, 468 220, 468 252"/>
      <path d="M468 196 C432 210, 410 226, 386 248"/>
      <path d="M468 196 C508 210, 540 232, 566 262"/>
      <path d="M468 252 C440 282, 420 310, 402 334"/>
      <path d="M468 252 C502 282, 530 304, 560 320"/>
    </g>
    <path d="M436 176 C456 158, 492 158, 510 176 C522 198, 520 236, 504 252 C490 268, 456 268, 442 252 C426 236, 424 198, 436 176 Z"
      fill="rgba(0,167,255,0.16)" stroke="rgba(0,167,255,0.28)" stroke-width="3"/>
    <circle cx="640" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="900">Futbolista</text>
  </svg>`;
}

function svgCristianoLike(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración estilo Cristiano">
    <defs><filter id="s_${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.3"/></filter></defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="120" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#s_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="480" cy="118" r="34"/>
      <!-- “peinado” pico -->
      <path d="M460 90 C476 72, 504 80, 512 98" stroke="rgba(233,246,238,0.55)"/>
      <path d="M480 152 C480 196, 480 218, 480 252"/>
      <path d="M480 192 C520 200, 552 218, 586 244"/>
      <path d="M480 192 C446 214, 420 232, 392 258"/>
      <path d="M480 252 C446 286, 424 312, 404 334"/>
      <path d="M480 252 C520 284, 550 304, 586 314"/>
    </g>
    <path d="M444 176 C462 156, 498 156, 518 176 C534 204, 528 244, 508 258 C490 272, 460 270, 446 248 C434 226, 430 198, 444 176 Z"
      fill="rgba(0,212,106,0.18)" stroke="rgba(0,212,106,0.30)" stroke-width="3"/>
    <circle cx="660" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="900">Futbolista</text>
  </svg>`;
}

function svgNeymarLike(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración estilo Neymar">
    <defs><filter id="s_${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.3"/></filter></defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="110" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#s_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="472" cy="118" r="34"/>
      <!-- “fade” lateral -->
      <path d="M445 120 C452 140, 458 146, 468 150" stroke="rgba(233,246,238,0.55)"/>
      <path d="M472 152 C470 196, 470 220, 470 252"/>
      <path d="M470 196 C438 210, 410 232, 390 258"/>
      <path d="M470 196 C510 212, 540 238, 572 270"/>
      <path d="M470 252 C438 280, 416 306, 396 334"/>
      <path d="M470 252 C506 282, 534 304, 562 320"/>
    </g>
    <path d="M438 176 C456 156, 492 156, 512 176 C526 202, 520 242, 500 256 C482 268, 456 266, 442 246 C430 226, 426 198, 438 176 Z"
      fill="rgba(0,167,255,0.14)" stroke="rgba(0,167,255,0.26)" stroke-width="3"/>
    <circle cx="640" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="900">Futbolista</text>
  </svg>`;
}

function svgMbappeLike(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración estilo Mbappé">
    <defs><filter id="s_${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.3"/></filter></defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="110" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#s_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="480" cy="118" r="34"/>
      <!-- cabeza rapada -->
      <path d="M452 104 C470 92, 490 92, 508 104" stroke="rgba(233,246,238,0.55)"/>
      <path d="M480 152 C480 196, 480 220, 480 252"/>
      <path d="M480 196 C446 214, 420 236, 396 262"/>
      <path d="M480 196 C520 212, 548 236, 576 268"/>
      <path d="M480 252 C450 284, 428 310, 408 334"/>
      <path d="M480 252 C516 280, 542 302, 570 320"/>
    </g>
    <path d="M446 176 C466 156, 498 156, 518 176 C532 200, 528 238, 508 254 C490 270, 460 268, 446 248 C434 226, 432 200, 446 176 Z"
      fill="rgba(0,212,106,0.16)" stroke="rgba(0,212,106,0.28)" stroke-width="3"/>
    <circle cx="650" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="900">Futbolista</text>
  </svg>`;
}

function svgHaalandLike(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración estilo Haaland">
    <defs><filter id="s_${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.3"/></filter></defs>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <ellipse cx="480" cy="352" rx="130" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#s_${uid})"/>
    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="480" cy="118" r="34"/>
      <!-- pelo hacia atrás -->
      <path d="M452 96 C476 82, 510 90, 520 112" stroke="rgba(233,246,238,0.55)"/>
      <path d="M480 152 C480 196, 480 220, 480 252"/>
      <path d="M480 196 C442 214, 414 238, 388 268"/>
      <path d="M480 196 C524 210, 560 238, 594 270"/>
      <path d="M480 252 C444 286, 420 312, 396 334"/>
      <path d="M480 252 C524 282, 556 304, 594 316"/>
    </g>
    <path d="M438 176 C458 154, 502 154, 522 176 C540 206, 534 246, 510 260 C488 274, 454 272, 438 246 C426 226, 424 200, 438 176 Z"
      fill="rgba(0,167,255,0.14)" stroke="rgba(0,167,255,0.26)" stroke-width="3"/>
    <circle cx="670" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <text x="30" y="52" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="900">Futbolista</text>
  </svg>`;
}

/* -------- (resto de funciones SVG extra que tengas) -------- */

function getPlayerArtVariant(i) {
  const uid = `p${i}`; // id único por jugador/turno
  const v = (i % 3); // 0,1,2
  if (v === 1) return playerArtKick(uid);
  if (v === 2) return playerArtRun(uid);
  return playerArtControl(uid);
}

// Ilustración SVG “dibujo” 1: chut
function playerArtKick(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jugador de fútbol chutando">
    <defs>
      <linearGradient id="gPitch_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,212,106,0.22)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
      <linearGradient id="gSky_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(0,167,255,0.18)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
      <filter id="soft_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>

    <rect x="0" y="0" width="960" height="260" fill="url(#gSky_${uid})"/>
    <rect x="0" y="220" width="960" height="200" fill="url(#gPitch_${uid})"/>
    <path d="M0 300H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <path d="M120 220V420M840 220V420" stroke="rgba(233,246,238,0.08)" stroke-width="3"/>
    <circle cx="480" cy="320" r="48" fill="none" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>

    <ellipse cx="480" cy="352" rx="92" ry="20" fill="rgba(0,0,0,0.35)" filter="url(#soft_${uid})"/>

    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="470" cy="120" r="34" />
      <path d="M470 156 C468 190, 468 210, 470 250" />
      <path d="M470 190 C440 210, 420 220, 398 232" />
      <path d="M470 190 C510 205, 536 222, 560 240" />
      <path d="M470 250 C450 285, 440 305, 430 330" />
      <path d="M430 330 C420 350, 410 360, 392 372" />
      <path d="M470 250 C510 280, 540 296, 586 300" />
      <path d="M586 300 C624 304, 650 316, 678 332" />
    </g>

    <g>
      <path d="M438 176 C456 158, 492 158, 508 176 C520 196, 518 230, 506 248 C492 270, 454 270, 440 248 C430 230, 426 196, 438 176 Z"
            fill="rgba(0,212,106,0.22)" stroke="rgba(0,212,106,0.35)" stroke-width="3"/>
      <path d="M442 248 C458 264, 494 264, 510 248 C520 268, 518 290, 506 306 C492 324, 460 324, 446 306 C434 290, 430 268, 442 248 Z"
            fill="rgba(0,167,255,0.16)" stroke="rgba(0,167,255,0.28)" stroke-width="3"/>
    </g>

    <g transform="translate(0,0)">
      <circle cx="742" cy="346" r="22" fill="rgba(233,246,238,0.92)" />
      <path d="M730 338 L742 330 L754 338 L750 352 L734 352 Z" fill="rgba(0,0,0,0.16)"/>
      <path d="M726 346 C736 360, 750 360, 760 346" stroke="rgba(0,0,0,0.18)" stroke-width="3" fill="none"/>
    </g>

    <path d="M650 330 C690 320, 712 316, 734 316" stroke="rgba(233,246,238,0.35)" stroke-width="6" stroke-linecap="round"/>
    <path d="M630 352 C676 342, 704 338, 726 338" stroke="rgba(233,246,238,0.25)" stroke-width="5" stroke-linecap="round"/>

    <text x="30" y="48" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="800">
      Ilustración · Jugador en acción
    </text>
  </svg>
  <div class="cap">Tu turno. Mira tu rol y pasa el móvil sin que nadie lo vea.</div>
  `;
}

// Ilustración 2: carrera
function playerArtRun(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jugador de fútbol corriendo">
    <defs>
      <linearGradient id="g1_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(0,212,106,0.18)"/>
        <stop offset="1" stop-color="rgba(0,167,255,0.14)"/>
      </linearGradient>
      <filter id="soft2_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>

    <rect x="0" y="0" width="960" height="420" fill="rgba(0,0,0,0)"/>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <path d="M0 330H960" stroke="rgba(233,246,238,0.06)" stroke-width="3"/>
    <ellipse cx="480" cy="350" rx="110" ry="22" fill="rgba(0,0,0,0.35)" filter="url(#soft2_${uid})"/>

    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="470" cy="122" r="34"/>
      <path d="M470 156 C462 194, 458 218, 452 252"/>
      <path d="M462 194 C430 196, 404 206, 378 222"/>
      <path d="M466 196 C508 188, 544 196, 580 214"/>
      <path d="M452 252 C420 278, 398 300, 372 330"/>
      <path d="M452 252 C500 278, 540 296, 598 308"/>
      <path d="M372 330 C354 350, 336 360, 312 372"/>
      <path d="M598 308 C632 314, 664 330, 694 350"/>
    </g>

    <path d="M430 176 C450 156, 490 156, 512 176 C526 202, 520 240, 498 256 C478 272, 446 268, 432 246 C420 224, 418 198, 430 176 Z"
          fill="rgba(0,167,255,0.16)" stroke="rgba(0,167,255,0.28)" stroke-width="3"/>
    <path d="M430 244 C458 268, 494 266, 516 244 C526 270, 520 292, 506 306 C488 324, 456 324, 440 306 C426 292, 422 270, 430 244 Z"
          fill="rgba(0,212,106,0.18)" stroke="rgba(0,212,106,0.30)" stroke-width="3"/>

    <circle cx="728" cy="338" r="22" fill="rgba(233,246,238,0.92)"/>
    <path d="M716 330 L728 322 L740 330 L736 344 L720 344 Z" fill="rgba(0,0,0,0.16)"/>
    <path d="M700 324 C720 304, 744 298, 770 300" stroke="rgba(233,246,238,0.22)" stroke-width="5" stroke-linecap="round"/>

    <text x="30" y="48" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="800">
      Ilustración · Carrera hacia el balón
    </text>
  </svg>
  <div class="cap">Habla con naturalidad. No digas el nombre directamente.</div>
  `;
}

// Ilustración 3: control del balón
function playerArtControl(uid) {
  return `
  <svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jugador de fútbol controlando el balón">
    <defs>
      <filter id="soft3_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>

    <rect x="0" y="0" width="960" height="420" fill="rgba(0,0,0,0)"/>
    <path d="M0 260H960" stroke="rgba(233,246,238,0.10)" stroke-width="3"/>
    <path d="M120 260 C220 220, 340 220, 480 260 C620 300, 740 300, 840 260" stroke="rgba(233,246,238,0.06)" stroke-width="3" fill="none"/>

    <ellipse cx="480" cy="352" rx="95" ry="20" fill="rgba(0,0,0,0.35)" filter="url(#soft3_${uid})"/>

    <g stroke="rgba(233,246,238,0.80)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="480" cy="120" r="34"/>
      <path d="M480 156 C480 196, 480 216, 480 252"/>
      <path d="M480 196 C448 210, 420 230, 396 252"/>
      <path d="M480 196 C520 212, 548 234, 574 260"/>
      <path d="M480 252 C452 282, 430 308, 412 334"/>
      <path d="M480 252 C512 280, 536 300, 562 320"/>
      <path d="M412 334 C392 354, 376 362, 350 372"/>
      <path d="M562 320 C588 340, 606 352, 632 368"/>
    </g>

    <path d="M448 176 C468 158, 492 158, 512 176 C524 196, 522 234, 506 252 C492 270, 468 270, 454 252 C438 234, 436 196, 448 176 Z"
          fill="rgba(0,212,106,0.20)" stroke="rgba(0,212,106,0.34)" stroke-width="3"/>
    <path d="M450 248 C470 266, 490 266, 510 248 C520 268, 520 292, 506 308 C492 326, 468 326, 454 308 C440 292, 440 268, 450 248 Z"
          fill="rgba(0,167,255,0.14)" stroke="rgba(0,167,255,0.26)" stroke-width="3"/>

    <circle cx="640" cy="350" r="22" fill="rgba(233,246,238,0.92)"/>
    <path d="M628 342 L640 334 L652 342 L648 356 L632 356 Z" fill="rgba(0,0,0,0.16)"/>

    <text x="30" y="48" fill="rgba(233,246,238,0.78)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="800">
      Ilustración · Control y calma
    </text>
  </svg>
  <div class="cap">No mires pantallas ajenas. Cada pista cuenta.</div>
  `;
}

// -------- ONLINE UI --------

function setButtonLoading(btn, loading, loadingText, idleText) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset._idle = btn.textContent;
    btn.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.textContent = idleText || btn.dataset._idle || btn.textContent;
  }
}

function stateLabel(state) {
  switch (state) {
    case "waiting": return "Esperando jugadores";
    case "playing": return "Partida en curso";
    case "voting": return "Votación";
    case "finished": return "Resultado";
    default: return "Conectado";
  }
}

function stateClass(state) {
  switch (state) {
    case "waiting": return "state-waiting";
    case "playing": return "state-playing";
    case "voting": return "state-voting";
    case "finished": return "state-finished";
    default: return "state-waiting";
  }
}

function initials(name) {
  const n = (name || "").trim();
  if (!n) return "??";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("") || "??";
}

function renderOnlineRoomHeader(roomData) {
  const code = window.getCurrentRoomCode?.() || "—";
  ui.onlineCurrentCode.textContent = code;

  const maxPlayers = roomData?.config?.nPlayers ?? "—";
  ui.onlinePlayersMax.textContent = String(maxPlayers);

  const playersObj = roomData?.players || {};
  const count = Object.keys(playersObj).length;
  ui.onlinePlayersCount.textContent = String(count);

  const st = roomData?.state || "waiting";
  const badge = ui.onlineStateBadge;
  if (badge) {
    badge.classList.remove("state-waiting", "state-playing", "state-voting", "state-finished");
    badge.classList.add(stateClass(st));
    badge.textContent = stateLabel(st);
  }

  if (ui.onlinePlayersHint) {
    ui.onlinePlayersHint.textContent =
      st === "waiting"
        ? "Comparte el código para que se unan."
        : "Estáis dentro. Que empiece el juego.";
  }
}

function renderOnlinePlayers(roomData) {
  const players = roomData?.players || {};
  const hostId = roomData?.hostId || null;

  const entries = Object.entries(players)
    .map(([id, p]) => ({ id, name: p?.name || "Jugador" }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  if (!entries.length) {
    ui.onlinePlayersList.innerHTML = `<div class="muted">Aún no hay jugadores en la sala.</div>`;
    return;
  }

  ui.onlinePlayersList.innerHTML = entries.map(({ id, name }) => {
    const isHost = hostId && id === hostId;
    return `
      <div class="player-card">
        <div class="player-avatar">${escapeHtml(initials(name))}</div>
        <div class="player-meta">
          <div class="player-name">
            ${escapeHtml(name)}
            ${isHost ? `<span class="player-tag">HOST</span>` : ``}
          </div>
          <div class="player-sub muted">${isHost ? "Controla la sala" : "Listo para jugar"}</div>
        </div>
      </div>
    `;
  }).join("");
}

function startListeningRoom() {
  try {
    window.listenRoom((roomData) => {
      renderOnlineRoomHeader(roomData);
      setOnlineStatus(roomData?.state ? `Estado: ${stateLabel(roomData.state)}.` : "Conectado.");
      renderOnlinePlayers(roomData);
    });
  } catch (e) {
    setOnlineStatus(String(e?.message || e));
  }
}

async function createRoomFlow() {
  try {
    applySetupInputs();
    const name = (ui.onlineName.value || "").trim() || "Host";

    setOnlineStatus("Creando sala… preparando el terreno.");
    setButtonLoading(ui.btnCreateRoom, true, "Creando…", "Crear sala");
    setButtonLoading(ui.btnJoinRoom, true, "Espera…", "Unirme");

    const roomCode = await window.createOnlineGame({
      duration: state.config.durationSec,
      difficulty: state.config.difficulty,
      nPlayers: state.config.nPlayers
    }, name);

    ui.onlineCurrentCode.textContent = roomCode;
    setOnlineStatus("Sala creada. Comparte el código y espera a los jugadores.");
    startListeningRoom();
  } catch (e) {
    console.error(e);
    alert(e?.message || String(e));
    setOnlineStatus(e?.message || String(e));
  } finally {
    setButtonLoading(ui.btnCreateRoom, false, "", "Crear sala");
    setButtonLoading(ui.btnJoinRoom, false, "", "Unirme");
  }
}

async function joinRoomFlow() {
  try {
    applySetupInputs();
    const code = (ui.onlineRoomCode.value || "").trim();
    const name = (ui.onlineName.value || "").trim() || "Jugador";

    setOnlineStatus("Uniéndote… entrando al vestuario.");
    setButtonLoading(ui.btnJoinRoom, true, "Uniendo…", "Unirme");
    setButtonLoading(ui.btnCreateRoom, true, "Espera…", "Crear sala");

    await window.joinOnlineGame(code, name);

    ui.onlineCurrentCode.textContent = code;
    setOnlineStatus("Dentro. Espera al host y no reveles tu pantalla.");
    startListeningRoom();
  } catch (e) {
    console.error(e);
    alert(e?.message || String(e));
    setOnlineStatus(e?.message || String(e));
  } finally {
    setButtonLoading(ui.btnJoinRoom, false, "", "Unirme");
    setButtonLoading(ui.btnCreateRoom, false, "", "Crear sala");
  }
}

async function copyCode() {
  const code = ui.onlineCurrentCode.textContent || "";
  if (!code || code === "—") return;

  try {
    await navigator.clipboard.writeText(code);
    setOnlineStatus("Código copiado. Envíalo al grupo.");
  } catch (_) {
    alert("No se pudo copiar automáticamente. Copia el código manualmente: " + code);
  }
}

async function init() {
  loadConfigFromStorage();
  renderSetup();

  try {
    const res = await fetch("./players.json", { cache: "no-store" });
    playersDB = await res.json();
    if (!Array.isArray(playersDB) || playersDB.length === 0) {
      throw new Error("Dataset vacío o inválido");
    }
  } catch (e) {
    alert("Error cargando players.json. Asegúrate de usar un servidor local (por ejemplo Live Server).");
    console.error(e);
    return;
  }

  if (!ui.btnLocal) {
    alert("Error: falta el botón btnLocal en index.html");
    return;
  }
  if (!ui.btnOnline) {
    alert("Error: falta el botón btnOnline en index.html");
    return;
  }

  // Local
  ui.btnLocal.addEventListener("click", () => {
    applySetupInputs();
    resetGame(true);
    renderDeal();
    showScreen("deal");
  });

  // Online: ahora abre pantalla online
  ui.btnOnline.addEventListener("click", () => {
    applySetupInputs();
    setMiniStatus("Modo online");
    setOnlineStatus("Listo.");
    ui.onlineCurrentCode.textContent = "—";
    ui.onlinePlayersList.innerHTML = `<div class="muted">Aún no hay jugadores en la sala.</div>`;
    showScreen("online");
  });

  // Online handlers
  ui.btnCreateRoom.addEventListener("click", createRoomFlow);
  ui.btnJoinRoom.addEventListener("click", joinRoomFlow);
  ui.btnBackFromOnline.addEventListener("click", () => {
    setMiniStatus("Prepara el partido");
    showScreen("setup");
  });

  ui.btnCopyCode.addEventListener("click", copyCode);

  // Local rest
  ui.btnHide.addEventListener("click", onHide);
  ui.btnNextPlayer.addEventListener("click", onNextPlayer);

  ui.btnBeginTimer.addEventListener("click", () => {
    showScreen("timer");
    startTimer();
  });

  ui.btnRestartFromReady.addEventListener("click", () => restart());
  ui.btnRestartFromTimer.addEventListener("click", () => restart());

  ui.btnEndEarly.addEventListener("click", () => {
    const ok = window.confirm("¿Ir a votación ahora?");
    if (!ok) return;
    goToVoting();
  });

  ui.btnConfirmVote.addEventListener("click", confirmVote);

  ui.btnPlayAgain.addEventListener("click", () => {
    stopTimer();
    resetGame(false);
    loadConfigFromStorage();
    renderSetup();
    showScreen("setup");
  });

  ui.btnPlaySame.addEventListener("click", () => {
    stopTimer();
    resetGame(true);
    renderDeal();
    showScreen("deal");
  });

  showScreen("setup");
}

init();

