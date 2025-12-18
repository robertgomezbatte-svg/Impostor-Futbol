import { db, validateDatabaseURL } from "./firebase.js";
import {
  ref,
  set,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let currentRoom = null;
let playerId = null;

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

  // Host: generamos el id primero para guardarlo como hostId
  const hostId = makePlayerId();
  playerId = hostId;
  currentRoom = roomCode;

  await set(roomRef, {
    config,
    state: "waiting",
    createdAt: Date.now(),
    hostId,
    players: {
      [hostId]: {
        name: safeName(name || "Host"),
        joinedAt: Date.now(),
        vote: null
      }
    }
  });

  return roomCode;
};

window.joinOnlineGame = async function (roomCode, name) {
  ensureFirebaseReady();

  const code = normalizeRoomCode(roomCode);
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Código inválido. Debe tener 6 números.");
  }

  playerId = makePlayerId();
  currentRoom = code;

  const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
  await set(playerRef, {
    name: safeName(name),
    joinedAt: Date.now(),
    vote: null
  });
};

window.listenRoom = function (callback) {
  ensureFirebaseReady();
  if (!currentRoom) throw new Error("No hay sala activa.");

  const roomRef = ref(db, "rooms/" + currentRoom);
  onValue(roomRef, (snapshot) => callback(snapshot.val()));
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
