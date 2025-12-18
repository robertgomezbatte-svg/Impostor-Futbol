/* Impostor de Futbolistas - MVP (pasar el móvil) */

const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("screenSetup"),
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
  btnStart: $("btnStart"),

  // Deal
  dealPlayerNum: $("dealPlayerNum"),
  dealProgress: $("dealProgress"),
  revealPlayerNum: $("revealPlayerNum"),
  roleTag: $("roleTag"),
  revealContent: $("revealContent"),
  btnReveal: $("btnReveal"),
  btnHide: $("btnHide"),
  btnNextPlayer: $("btnNextPlayer"),

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
  // Try a few times to ensure clue exists
  for (let tries = 0; tries < 30; tries++) {
    const candidate = pickRandom(playersDB);
    const pistas = candidate?.pistas?.[difficulty];
    if (Array.isArray(pistas) && pistas.length > 0) {
      return { target: candidate, clue: pickRandom(pistas) };
    }
    // Fallback: if difficulty missing, try normal -> easy -> hard
    const fallbackOrder = ["normal", "easy", "hard"];
    for (const d of fallbackOrder) {
      const p = candidate?.pistas?.[d];
      if (Array.isArray(p) && p.length > 0) {
        return { target: candidate, clue: pickRandom(p) };
      }
    }
  }
  // Absolute fallback (should not happen if dataset ok)
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
  setMiniStatus("Configura la partida");
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

  // Reset reveal UI
  ui.roleTag.classList.remove("impostor", "player");
  ui.roleTag.textContent = "Listo";

  ui.revealContent.innerHTML = `
    <div class="locker">
      <div class="locker-icon">🔒</div>
      <div class="locker-text">Pulsa para ver tu rol</div>
      <button id="btnRevealInline" class="btn primary">Ver mi rol</button>
    </div>
  `;

  // Wire inline reveal
  const btnRevealInline = document.getElementById("btnRevealInline");
  btnRevealInline.addEventListener("click", onReveal);

  ui.btnHide.disabled = true;
  ui.btnNextPlayer.disabled = true;

  setMiniStatus(`Reparto: Jugador ${i}/${n}`);
}

function onReveal() {
  const i = state.game.dealIndex;
  const impostor = (i === state.game.impostorIndex);

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
  ui.btnNextPlayer.disabled = true; // must hide first
}

function onHide() {
  // Hide role again
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
    // Done
    renderReady();
    showScreen("ready");
  }
}

function renderReady() {
  ui.readyDuration.textContent = formatTime(state.config.durationSec);
  setMiniStatus("Listos para debatir");
}

function startTimer() {
  stopTimer();
  state.game.timerRemaining = state.config.durationSec;

  ui.timerPlayers.textContent = String(state.config.nPlayers);
  ui.timerDifficulty.textContent = state.config.difficulty;
  ui.timerDisplay.textContent = formatTime(state.game.timerRemaining);

  setMiniStatus("Debate en curso");

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

  // Confirmation prompt
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

  // Determine top voted (simple: first max)
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

  setMiniStatus("Partida finalizada");
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

async function init() {
  loadConfigFromStorage();
  renderSetup();

  // Load dataset
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

  // Wire events
  ui.btnStart.addEventListener("click", () => {
    applySetupInputs();
    resetGame(true);
    renderDeal();
    showScreen("deal");
  });

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
    resetGame(false); // reset config too
    loadConfigFromStorage(); // restore last config if exists
    renderSetup();
    showScreen("setup");
  });

  ui.btnPlaySame.addEventListener("click", () => {
    stopTimer();
    resetGame(true);
    renderDeal();
    showScreen("deal");
  });

  // Initial screen
  showScreen("setup");
}

init();
