import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.42:8000";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
