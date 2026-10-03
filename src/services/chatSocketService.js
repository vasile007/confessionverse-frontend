import { Client } from "@stomp/stompjs";
import { getToken } from "./tokenService.js";

function websocketUrl() {
  const configured = String(import.meta?.env?.VITE_WS_URL || "").trim();
  if (configured) return configured;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function connectChatSocket({ onMatch, onMessage, onDisconnect }) {
  const token = getToken();
  if (!token) return null;

  const client = new Client({
    brokerURL: websocketUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe("/user/queue/random-chat", (frame) => onMatch?.(JSON.parse(frame.body)));
      client.subscribe("/user/queue/messages", (frame) => onMessage?.(JSON.parse(frame.body)));
    },
    onWebSocketClose: () => onDisconnect?.(),
  });
  client.activate();
  return client;
}

export function publishChatMessage(client, chatRoomId, content, username) {
  if (!client?.connected) throw new Error("Chat connection is not ready");
  client.publish({
    destination: "/app/chat.send",
    body: JSON.stringify({
      sender: username,
      content,
      chatRoomId: String(chatRoomId),
    }),
  });
}
