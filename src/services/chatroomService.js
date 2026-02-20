import api from "../api";

const NON_RETRY_ERROR_CODES = new Set([
  "FREE_LIMIT_REACHED",
  "PREMIUM_ROOM_REQUIRED",
  "FORBIDDEN_INVITE",
]);

function getErrCode(err) {
  return String(err?.response?.data?.code || "").toUpperCase();
}

function shouldRetry(err) {
  const status = Number(err?.response?.status || 0);
  const code = getErrCode(err);
  if (NON_RETRY_ERROR_CODES.has(code)) return false;
  return [400, 404, 405, 415, 422, 500].includes(status);
}

async function tryPostAttempts(attempts) {
  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const res = await api.post(attempt.path, attempt.body);
      return res.data;
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err)) throw err;
    }
  }
  throw lastErr || new Error("Unable to complete chat request");
}

export async function createChatroomWithFallback(username, roomType) {
  const clean = String(username || "").trim();
  if (!clean) throw new Error("Username is required");

  const payloads = [
    roomType ? { usernameToAdd: clean, roomType } : { usernameToAdd: clean },
    roomType ? { username: clean, roomType } : { username: clean },
    roomType ? { userToAdd: clean, roomType } : { userToAdd: clean },
    roomType ? { participantUsername: clean, roomType } : { participantUsername: clean },
    { usernameToAdd: clean },
    { username: clean },
  ];

  const attempts = payloads.map((body) => ({ path: "/chatrooms", body }));
  return tryPostAttempts(attempts);
}

export async function inviteToChatroomWithFallback(chatRoomId, username) {
  const roomId = Number(chatRoomId);
  const clean = String(username || "").trim();
  if (!roomId || !clean) throw new Error("Room id and username are required");

  const payloads = [
    { usernameToAdd: clean },
    { username: clean },
    { usernameToInvite: clean },
    { participantUsername: clean },
  ];
  const paths = [
    `/chatrooms/${roomId}/participants`,
    `/chatrooms/${roomId}/invite`,
    `/chatrooms/${roomId}/users`,
    `/chatrooms/${roomId}/members`,
  ];

  const attempts = [];
  for (const path of paths) {
    for (const body of payloads) {
      attempts.push({ path, body });
    }
  }

  return tryPostAttempts(attempts);
}

export async function createChatInvite(chatRoomId, username) {
  const roomId = Number(chatRoomId);
  const clean = String(username || "").trim();
  if (!roomId || !clean) throw new Error("Room id and username are required");

  const payloads = [
    { usernameToAdd: clean },
    { username: clean },
    { inviteeUsername: clean },
  ];
  const paths = [`/chatrooms/${roomId}/invites`, `/chatrooms/${roomId}/invite`];

  const attempts = [];
  for (const path of paths) {
    for (const body of payloads) {
      attempts.push({ path, body });
    }
  }
  return tryPostAttempts(attempts);
}

export async function getMyChatInvites() {
  const paths = ["/chat-invites/me", "/chat/invites/me"];
  let lastErr = null;
  for (const path of paths) {
    try {
      const res = await api.get(path);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      lastErr = err;
      const status = Number(err?.response?.status || 0);
      if (![404, 405].includes(status)) throw err;
    }
  }
  throw lastErr || new Error("Unable to load invites");
}

async function respondInvite(inviteId, action) {
  const id = Number(inviteId);
  if (!id) throw new Error("Invite id is required");
  const paths = [
    `/chat-invites/${id}/${action}`,
    `/chat/invites/${id}/${action}`,
  ];
  let lastErr = null;
  for (const path of paths) {
    try {
      const res = await api.post(path);
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = Number(err?.response?.status || 0);
      if (![404, 405].includes(status)) throw err;
    }
  }
  throw lastErr || new Error(`Unable to ${action} invite`);
}

export function acceptChatInvite(inviteId) {
  return respondInvite(inviteId, "accept");
}

export function declineChatInvite(inviteId) {
  return respondInvite(inviteId, "decline");
}
