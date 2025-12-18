import { db, validateDatabaseURL } from "./firebase.js";
import {
  ref,
  set,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let currentRoom = null;
let playerId = null;
let unsubscribe = null; // simple control (no hay off() fácil con este import; lo manejamos con guardas)

function makePlayerId() {
  return "player_" + Math.random().toString(36).slice(2, 10);
}

function safeName(name) {
  const n = (name || "").trim();
  return n.length ? n.slice(0, 24) : "Jugador";
}

function normalizeRoomCode(code) {
  return String(code || "").trim();
}

function ensureFirebaseReady() {
  validateDatabaseURL();
}

window.createOnlineGame = async function (config, name) {
  ensureFirebaseReady();

  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const roomRef = ref(db, "rooms/" + roomCode);

  // Creamos sala
  await set(roomRef, {
    config,
    state: "waiting",
    createdAt: Date.now(),
    players: {}
  });

  // El host se une automáticamente
  await window.joinOnlineGame(roomCode, name || "Host");

  return roomCode;
};

window.joinOnlineGame = async function (roomCode, name) {
  ensureFirebaseReady();

  const code = normalizeRoomCode(roomCode);
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Código inválido. Debe tener 6 números.");
  }

  playerId = makePlayerId();
  const playerRef = ref(db, `rooms/${code}/players/${playerId}`);

  await set(playerRef, {
    name: safeName(name),
    joinedAt: Date.now(),
    vote: null
  });

  currentRoom = code;
};

window.listenRoom = function (callback) {
  ensureFirebaseReady();

  if (!currentRoom) throw new Error("No hay sala activa (currentRoom es null).");

  // Guardas para no duplicar renders
  const roomRef = ref(db, "rooms/" + currentRoom);

  onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
};

window.getCurrentRoomCode = function () {
  return currentRoom;
};

window.getCurrentPlayerId = function () {
  return playerId;
};

window.setPlayerName = async function (name) {
  ensureFirebaseReady();
  if (!currentRoom || !playerId) return;
  const playerRef = ref(db, `rooms/${currentRoom}/players/${playerId}`);
  await update(playerRef, { name: safeName(name) });
};
