import { Client } from "@stomp/stompjs";
import { getToken } from "./tokenService.js";

function websocketUrl() {
  const configured = String(import.meta?.env?.VITE_WS_URL || "").trim();
  if (configured) return configured;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function parseFrame(frame, onError) {
  try {
    return JSON.parse(frame.body);
  } catch {
    onError?.("The chat server returned an unreadable update.");
    return null;
  }
}

export function connectChatSocket({ onConnected, onMatch, onMessage, onInvitesChanged, onRoomsChanged, onDisconnect, onError }) {
  const token = getToken();
  if (!token) return null;

  const client = new Client({
    brokerURL: websocketUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    connectionTimeout: 10000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe("/user/queue/random-chat", (frame) => {
        const value = parseFrame(frame, onError);
        if (value) onMatch?.(value);
      });
      client.subscribe("/user/queue/messages", (frame) => {
        const value = parseFrame(frame, onError);
        if (value) onMessage?.(value);
      });
      client.subscribe("/user/queue/chat-invites", (frame) => {
        const value = parseFrame(frame, onError);
        if (value) onInvitesChanged?.(value);
      });
      client.subscribe("/user/queue/chatrooms", (frame) => {
        const value = parseFrame(frame, onError);
        if (value) onRoomsChanged?.(value);
      });
      client.subscribe("/user/queue/chat-errors", (frame) => {
        const value = parseFrame(frame, onError);
        onError?.(value?.error || "The chat action could not be completed.");
      });
      onConnected?.();
    },
    onWebSocketClose: () => onDisconnect?.(),
    onWebSocketError: () => onError?.("Unable to reach live chat. Reconnecting…"),
    onStompError: (frame) => onError?.(frame?.headers?.message || "The chat server rejected the connection."),
  });
  client.activate();
  return client;
}

export function publishChatMessage(client, chatRoomId, content, username) {
  if (!client?.connected) throw new Error("Chat connection is not ready");
  client.publish({
    destination: "/app/chat.send",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sender: username,
      content,
      chatRoomId: String(chatRoomId),
    }),
  });
}
