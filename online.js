// online.js
import { db } from "./firebase.js";
import {
  ref,
  set,
  push,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let currentRoom = null;
let playerId = null;

// Crear partida (host)
window.createOnlineGame = async function (config) {
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const roomRef = ref(db, "rooms/" + roomCode);

  await set(roomRef, {
    config,
    state: "waiting",
    players: {}
  });

  currentRoom = roomCode;
  return roomCode;
};

// Unirse a partida
window.joinOnlineGame = async function (roomCode, name) {
  playerId = "player_" + Math.random().toString(36).slice(2, 9);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);

  await set(playerRef, {
    name,
    vote: null
  });

  currentRoom = roomCode;
};

// Escuchar cambios de la sala
window.listenRoom = function (callback) {
  const roomRef = ref(db, "rooms/" + currentRoom);
  onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
};
