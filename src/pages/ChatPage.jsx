import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smile, Send, RotateCw, Bell, UserPlus } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";
import { getStoredUserId } from "../services/tokenService.js";
import UserIdentity from "../components/UserIdentity.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getMySubscription } from "../services/BillingService.jsx";
import { aiAnalyzeEmotion } from "../services/aiAssistService.js";
import { getAiQuotaState, tryConsumeAiUse } from "../services/aiQuotaService.js";
import { markStreakActivity } from "../services/streakService.js";
import {
  acceptChatInvite,
  createChatInvite,
  createChatroomWithFallback,
  getMyChatInvites,
  declineChatInvite,
} from "../services/chatroomService.js";

const ROOM_DEFINITIONS = [
  {
    key: "STANDARD",
    name: "General",
    icon: "\u{1F30D}",
    premium: false,
    description: "Always active room where everyone can join and chat.",
    rules: ["Respectful tone only", "No harassment", "No spam"],
  },
  {
    key: "LATE_NIGHT",
    name: "Late Night",
    icon: "\u{1F319}",
    premium: false,
    description: "Night talks and relaxed late-hour chat.",
    rules: ["Keep it civil", "No explicit content", "No contact sharing"],
  },
  {
    key: "HEARTBEAT",
    name: "Premium Room",
    icon: "\u{1F451}",
    premium: true,
    description: "Inner Circle access.",
    rules: ["No explicit sexual content", "No harassment", "No personal contacts in early messages"],
  },
];

const ROOM_KEY_SET = new Set(ROOM_DEFINITIONS.map((r) => r.key));
const DISABLE_PREMIUM_GATES = String(import.meta?.env?.VITE_DISABLE_PREMIUM_GATES || "").toLowerCase() === "true";

export default function ChatPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorRooms, setErrorRooms] = useState("");
  const [errorMessages, setErrorMessages] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [userSuggestionsLoading, setUserSuggestionsLoading] = useState(false);
  const [userSuggestionsError, setUserSuggestionsError] = useState("");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesApiBroken, setInvitesApiBroken] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [invitesActionId, setInvitesActionId] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState("STANDARD");
  const [subscription, setSubscription] = useState(null);
  const [heartbeatTrack, setHeartbeatTrack] = useState("No music");
  const [selectedEmoji, setSelectedEmoji] = useState("\u{1F60A}");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [invitedByNotice, setInvitedByNotice] = useState("");
  const [invitedByRoomId, setInvitedByRoomId] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState("Access restricted. Join the Inner Circle.");
  const [premiumPreviewOpen, setPremiumPreviewOpen] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [roomUnread, setRoomUnread] = useState({});
  const [selectedRoomPeers, setSelectedRoomPeers] = useState([]);
  const [messageAnalysis, setMessageAnalysis] = useState("");
  const [analyzingMessage, setAnalyzingMessage] = useState(false);
  const [quotaTick, setQuotaTick] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const roomLatestRef = useRef({});
  const roomMessageSigRef = useRef({});
  const seenStorageKey = `cv_seen_room_last_${String(user?.id || user?.username || "anon")}`;
  const emojis = useMemo(
    () => [
      "\u{1F60A}",
      "\u{1F642}",
      "\u{1F605}",
      "\u{1F979}",
      "\u{1F602}",
      "\u{1F62E}",
      "\u{1F60E}",
      "\u{1F973}",
      "\u{1F622}",
      "\u{1F525}",
    ],
    []
  );

  const selectedRoomMeta = useMemo(
    () => ROOM_DEFINITIONS.find((r) => r.key === selectedRoomType) || ROOM_DEFINITIONS[0],
    [selectedRoomType]
  );
  const aiQuota = useMemo(() => getAiQuotaState(user), [user, quotaTick]);
  const aiLocked = !aiQuota.isPro && aiQuota.remaining <= 0;
  const hasProAccess = (sub) => {
    const status = String(sub?.status || "").toLowerCase();
    if (status === "active" || status === "trialing") return true;
    return !!user?.premium || String(sub?.planType || "").toUpperCase() === "PRO";
  };

  const isPro = useMemo(() => {
    return hasProAccess(subscription);
  }, [subscription, user?.premium]);
  const myUsername = String(user?.username || "").trim().toLowerCase();

  const isFreeLimitError = (err) => {
    const code = String(err?.response?.data?.code || "").toUpperCase();
    const msg = String(err?.response?.data?.error || err?.response?.data?.message || err?.message || "").toLowerCase();
    return code === "FREE_LIMIT_REACHED" || (msg.includes("free plan") && msg.includes("upgrade"));
  };

  const isLateNightActiveNow = () => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  };

  const openPaywall = (msg) => {
    if (DISABLE_PREMIUM_GATES) {
      toast.error(msg || "Premium gate disabled in dev mode.");
      return;
    }
    setPaywallMessage(msg || "Access restricted. Join the Inner Circle.");
    setPaywallOpen(true);
  };

  const openPremiumPreview = () => {
    setPremiumPreviewOpen(true);
  };

  const normalizeRoomType = (room) => String(room?.roomType || "").toUpperCase();

  const getMessageKey = (msg) => String(msg?.id || msg?.timestamp || msg?.createdAt || msg?.sentAt || msg?.time || "");

  const getMessageSender = (msg) =>
    String(msg?.sender?.username || msg?.sender || msg?.senderUsername || "").trim().toLowerCase();

  const markRoomSeen = (roomId, key) => {
    if (!roomId || !key) return;
    try {
      const raw = localStorage.getItem(seenStorageKey);
      const map = raw ? JSON.parse(raw) : {};
      const next = map && typeof map === "object" ? map : {};
      next[String(roomId)] = String(key);
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
    } catch {}
  };

  const getRoomLabel = (room) => {
    const type = normalizeRoomType(room);
    if (ROOM_KEY_SET.has(type)) {
      return ROOM_DEFINITIONS.find((r) => r.key === type)?.name || room?.name || "Room";
    }
    return String(room?.name || room?.title || "").trim() || "Conversation";
  };

  const fetchRoomParticipants = async (roomId) => {
    const paths = [`/chatrooms/${roomId}/participants`, `/chatrooms/${roomId}/members`, `/chatrooms/${roomId}/users`];
    let lastErr = null;
    for (const path of paths) {
      try {
        const res = await api.get(path);
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.content) ? res.data.content : [];
        return data;
      } catch (err) {
        lastErr = err;
        const status = Number(err?.response?.status || 0);
        if (![404, 405].includes(status)) break;
      }
    }
    throw lastErr || new Error("Unable to load room participants");
  };

  const isRoomAllowed = (roomKey) => {
    if (DISABLE_PREMIUM_GATES) return true;
    if (roomKey === "LATE_NIGHT" && !isLateNightActiveNow()) return false;
    const room = ROOM_DEFINITIONS.find((r) => r.key === roomKey);
    if (!room) return true;
    return !room.premium || isPro;
  };

  const loadSubscription = async () => {
    try {
      const sub = await getMySubscription();
      setSubscription(sub || null);
      return sub || null;
    } catch {
      setSubscription(null);
      return null;
    }
  };

  const loadRooms = async () => {
    setLoadingRooms(true);
    setErrorRooms("");
    try {
      const res = await api.get("/chatrooms");
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.content) ? res.data.content : [];
      setChatRooms(data);
      try {
        const pendingRoomId = Number(sessionStorage.getItem("cv_open_room_id") || 0);
        if (pendingRoomId) {
          const target = data.find((r) => Number(r?.id) === pendingRoomId);
          if (target) {
            const targetType = normalizeRoomType(target);
            if (ROOM_KEY_SET.has(targetType)) {
              setSelectedRoomType(targetType);
            }
            setSelectedRoom(target);
            sessionStorage.removeItem("cv_open_room_id");
          }
        }
        const inviteRoomId = Number(sessionStorage.getItem("cv_invited_room_id") || 0);
        const inviteBy = String(sessionStorage.getItem("cv_invited_by") || "").trim();
        if (inviteRoomId && inviteBy) {
          setInvitedByNotice(inviteBy);
          setInvitedByRoomId(inviteRoomId);
          sessionStorage.removeItem("cv_invited_by");
          sessionStorage.removeItem("cv_invited_room_id");
        }
      } catch {}
    } catch (err) {
      console.error(err);
      setErrorRooms("Unable to load chat rooms.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const data = await getMyChatInvites();
      const pending = data.filter((inv) => String(inv?.status || "").toUpperCase() === "PENDING");
      setInvites(pending);
      setInvitesApiBroken(false);
    } catch (err) {
      setInvites([]);
      if (Number(err?.response?.status || 0) >= 500) {
        setInvitesApiBroken(true);
      }
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadMessages = async (roomId, opts = {}) => {
    const silent = !!opts?.silent;
    if (!roomId) return;
    if (!silent) {
      setLoadingMessages(true);
      setErrorMessages("");
    }
    try {
      const res = await api.get(`/messages/chatroom/${roomId}`);
      const data = res.data?.content ?? res.data;
      const list = Array.isArray(data) ? data : [];
      const last = list.length ? list[list.length - 1] : null;
      const key = last ? getMessageKey(last) : "";
      const signature = `${list.length}:${key}`;
      const prevSignature = String(roomMessageSigRef.current[roomId] || "");
      const changed = prevSignature !== signature;
      roomMessageSigRef.current[roomId] = signature;

      if (changed) {
        setMessages(list);
      }
      if (list.length) {
        if (key) roomLatestRef.current[roomId] = key;
        if (selectedRoom?.id && Number(selectedRoom.id) === Number(roomId) && key) {
          markRoomSeen(roomId, key);
        }
      }
      if (selectedRoom?.id && Number(selectedRoom.id) === Number(roomId)) {
        const roomType = normalizeRoomType(selectedRoom);
        if (ROOM_KEY_SET.has(roomType)) {
          setRoomUnread((prev) => ({ ...prev, [roomType]: 0 }));
        }
      }
    } catch (err) {
      console.error(err);
      if (!silent) setErrorMessages("Unable to load messages.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const inviteOrStartConversation = async (username) => {
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername) return false;
    if (!isRoomAllowed(selectedRoomType)) {
      if (selectedRoomType === "LATE_NIGHT") {
        toast.error('"Late Night" is active only at night (22:00 - 06:00).');
        return false;
      }
      openPaywall("Access restricted. Join the Inner Circle.");
      return false;
    }

    try {
      if (selectedRoom?.id) {
        await createChatInvite(selectedRoom.id, cleanUsername);
      } else {
        const roomData = await createChatroomWithFallback(cleanUsername, selectedRoomType);
        const room = roomData?.chatRoom || roomData?.room || roomData;
        const roomId = Number(roomData?.chatRoomId || room?.id || 0);
        if (roomId) {
          try {
            sessionStorage.setItem("cv_open_room_id", String(roomId));
          } catch {}
          await loadRooms();
        }
      }
      toast.success("Invite sent. User must accept.");
      setSearchQuery("");
      setSearchError("");
      return true;
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || "Unable to create conversation";
      if (isFreeLimitError(err)) {
        openPaywall(msg);
      } else {
        toast.error(msg);
      }
      return false;
    }
  };

  const verifyUsernameExists = async (username) => {
    const clean = String(username || "").trim();
    if (!clean) return { ok: false, reason: "empty" };
    const encoded = encodeURIComponent(clean);
    const paths = [`/users/public/${encoded}`, `/users/profile/${encoded}`];
    let lastErr = null;

    for (const path of paths) {
      try {
        const res = await api.get(path);
        const found = String(res?.data?.username || "").trim();
        if (found) return { ok: true, username: found };
        return { ok: true, username: clean };
      } catch (err) {
        lastErr = err;
        const status = Number(err?.response?.status || 0);
        if ([404, 405].includes(status)) continue;
        return { ok: false, reason: "verify_failed", error: err };
      }
    }

    if (Number(lastErr?.response?.status || 0) === 404) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "verify_failed", error: lastErr };
  };

  const searchUserSuggestions = async (query) => {
    const clean = String(query || "").trim().toLowerCase();
    if (!clean) return { items: [], error: "" };
    const publicSearchPath = `/users/public/search?query=${encodeURIComponent(clean)}`;
    try {
      const res = await api.get(publicSearchPath);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.content) ? res.data.content : [];
      const usernames = list
        .map((entry) => {
          if (typeof entry === "string") return entry;
          return String(entry?.username || entry?.user?.username || entry?.profile?.username || "").trim();
        })
        .filter(Boolean)
        .filter((name) => name.toLowerCase().includes(clean))
        .filter((name) => name.toLowerCase() !== myUsername);

      const unique = Array.from(new Set(usernames.map((name) => name.toLowerCase())))
        .map((lower) => usernames.find((n) => n.toLowerCase() === lower))
        .filter(Boolean)
        .slice(0, 8);
      return { items: unique, error: "" };
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      if (status && ![403, 404, 405].includes(status)) {
        return { items: [], error: "Search is temporarily unavailable." };
      }
    }

    const exact = await verifyUsernameExists(clean);
    if (!exact.ok || !exact.username || exact.username.toLowerCase() === myUsername) {
      return { items: [], error: "" };
    }
    return { items: [exact.username], error: "" };
  };

  const handleAddSuggestedUser = async (username) => {
    const clean = String(username || "").trim();
    if (!clean) return;
    if (clean.toLowerCase() === myUsername) {
      setSearchError("You cannot send an invite to yourself.");
      return;
    }
    setSearchError("");
    setInviteSubmitting(true);
    const ok = await inviteOrStartConversation(clean);
    setInviteSubmitting(false);
    if (ok) setAddUserOpen(false);
  };

  const handleOpenAddUser = () => {
    setSearchError("");
    setUserSuggestionsError("");
    setSearchQuery("");
    setUserSuggestions([]);
    setAddUserOpen(true);
  };

  const handleSubmitAddUser = async (e) => {
    e.preventDefault();
    const username = String(searchQuery || "").trim();
    if (!username) {
      setSearchError("Enter the person's username.");
      return;
    }
    setSearchError("");
    setInviteSubmitting(true);
    if (username.toLowerCase() === myUsername) {
      setInviteSubmitting(false);
      setSearchError("You cannot send an invite to yourself.");
      return;
    }

    const verification = await verifyUsernameExists(username);
    if (!verification.ok) {
      setInviteSubmitting(false);
      if (verification.reason === "not_found") {
        setSearchError("Username does not exist in the database.");
      } else {
        setSearchError("I can't validate the username right now. Try again.");
      }
      return;
    }

    const ok = await inviteOrStartConversation(verification.username || username);
    setInviteSubmitting(false);
    if (ok) setAddUserOpen(false);
  };

  useEffect(() => {
    if (!addUserOpen) return;
    const query = String(searchQuery || "").trim();
    if (query.length < 2) {
      setUserSuggestions([]);
      setUserSuggestionsError("");
      setUserSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setUserSuggestionsLoading(true);
    setUserSuggestionsError("");

    const timer = setTimeout(async () => {
      const result = await searchUserSuggestions(query);
      if (cancelled) return;
      setUserSuggestions(result.items);
      setUserSuggestionsError(result.error || "");
      setUserSuggestionsLoading(false);
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addUserOpen, searchQuery, myUsername]);

  useEffect(() => {
    if (isAdmin) return;
    loadRooms();
    loadSubscription();
    loadInvites();
  }, [isAdmin]);

  useEffect(() => {
    if (invitesApiBroken) return;
    const interval = setInterval(loadInvites, 10000);
    return () => clearInterval(interval);
  }, [invitesApiBroken]);

  useEffect(() => {
    if (!selectedRoom?.id) return;
    loadMessages(selectedRoom.id, { silent: false });
    const interval = setInterval(() => loadMessages(selectedRoom.id, { silent: true }), 5000);
    return () => clearInterval(interval);
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!chatRooms.length) return;
    const interval = setInterval(async () => {
      for (const room of chatRooms) {
        const roomId = Number(room?.id || 0);
        if (!roomId) continue;
        const roomType = normalizeRoomType(room);
        if (!ROOM_KEY_SET.has(roomType)) continue;
        if (selectedRoom?.id && Number(selectedRoom.id) === roomId) continue;
        try {
          const res = await api.get(`/messages/chatroom/${roomId}`);
          const data = res.data?.content ?? res.data;
          const list = Array.isArray(data) ? data : [];
          if (!list.length) continue;
          const last = list[list.length - 1];
          const key = getMessageKey(last);
          if (!key) continue;
          const prevKey = roomLatestRef.current[roomId];
          roomLatestRef.current[roomId] = key;
          if (!prevKey || prevKey === key) continue;
          if (getMessageSender(last) === myUsername) continue;
          setRoomUnread((prev) => ({ ...prev, [roomType]: (prev[roomType] || 0) + 1 }));
        } catch {}
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [chatRooms, myUsername, selectedRoom?.id]);

  useEffect(() => {
    if (!selectedRoom?.id) return;
    if (invitedByRoomId && Number(selectedRoom.id) !== Number(invitedByRoomId)) {
      setInvitedByNotice("");
      setInvitedByRoomId(null);
    }
  }, [selectedRoom?.id, invitedByRoomId]);

  useEffect(() => {
    let active = true;
    const roomId = Number(selectedRoom?.id || 0);
    if (!roomId) {
      setSelectedRoomPeers([]);
      return;
    }
    (async () => {
      try {
        const participants = await fetchRoomParticipants(roomId);
        if (!active) return;
        const usernames = participants
          .map((entry) => {
            if (typeof entry === "string") return entry;
            if (!entry || typeof entry !== "object") return "";
            return (
              entry?.username ||
              entry?.user?.username ||
              entry?.participant?.username ||
              entry?.member?.username ||
              ""
            );
          })
          .map((name) => String(name || "").trim())
          .filter(Boolean)
          .filter((name) => name.toLowerCase() !== myUsername);
        setSelectedRoomPeers(Array.from(new Set(usernames)));
      } catch {
        if (!active) return;
        setSelectedRoomPeers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedRoom?.id, myUsername]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onWindowClick = () => setEmojiOpen(false);
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [emojiOpen]);

  const displayedRooms = useMemo(() => {
    return chatRooms.filter((room) => {
      const type = normalizeRoomType(room);
      return type === selectedRoomType;
    });
  }, [chatRooms, selectedRoomType]);

  const activeChatTitle = useMemo(() => {
    return `${selectedRoomMeta.icon} ${selectedRoomMeta.name}`;
  }, [selectedRoomMeta.icon, selectedRoomMeta.name]);

  const activeChatSubtitle = useMemo(() => {
    return selectedRoomMeta.description;
  }, [selectedRoomMeta.description]);

  const activeSidebarPeer = useMemo(() => {
    return selectedRoomPeers[0] || "";
  }, [selectedRoomPeers]);

  useEffect(() => {
    if (selectedRoom?.id && displayedRooms.some((r) => r.id === selectedRoom.id)) return;
    setSelectedRoom(displayedRooms[0] || null);
    if (!displayedRooms.length) setMessages([]);
  }, [displayedRooms, selectedRoom?.id]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!selectedRoom?.id) {
      toast.error("There is no open conversation here yet. Press Enter Random Conversation.");
      return;
    }
    if (!isRoomAllowed(selectedRoomType)) {
      if (selectedRoomType === "LATE_NIGHT") {
        toast.error('"Late Night" is active only at night (22:00 - 06:00).');
        return;
      }
      openPaywall("Access restricted. Join the Inner Circle.");
      return;
    }
    const senderId = getStoredUserId();
    if (!senderId) {
      toast.error("Please sign in to send messages.");
      return;
    }
    try {
      const res = await api.post(`/messages`, {
        chatRoomId: selectedRoom.id,
        senderId,
        content: inputValue,
      });
      setMessages((prev) => [...prev, res.data]);
      markStreakActivity(user);
      setInputValue("");
      const ownKey = getMessageKey(res.data);
      if (ownKey) markRoomSeen(selectedRoom.id, ownKey);
      const roomType = normalizeRoomType(selectedRoom);
      if (ROOM_KEY_SET.has(roomType)) {
        setRoomUnread((prev) => ({ ...prev, [roomType]: 0 }));
      }
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || "Unable to send message";
      if (isFreeLimitError(err)) {
        openPaywall(msg);
      } else {
        toast.error(msg);
      }
    }
  };

  const handleLeaveRoom = async (roomId) => {
    if (!roomId || isAdmin) return;
    try {
      await api.delete(`/chatrooms/${roomId}/leave`);
      setChatRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setMessages([]);
      }
      toast.success("Conversation removed");
    } catch (err) {
      console.error(err);
      const status = Number(err?.response?.status || 0);
      const backendMsg = err?.response?.data?.error || "";
      if (status === 403 && String(backendMsg).toLowerCase().includes("only participants")) {
        toast.error("Only participants can leave this chat");
        await loadRooms();
        return;
      }
      toast.error(backendMsg || "Unable to remove conversation");
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!roomId || isAdmin) return;
    try {
      await api.delete(`/chatrooms/${roomId}`);
      setChatRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setMessages([]);
      }
      toast.success("Conversation deleted");
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      if (status === 404 || status === 405) {
        toast.error("Delete endpoint missing in backend: DELETE /chatrooms/{id}");
        return;
      }
      toast.error(err?.response?.data?.error || "Unable to delete conversation");
    }
  };

  const formatMessageTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const renderMessage = (msg, idx) => {
    const senderName = msg.sender?.username || msg.sender || msg.senderId || "Anonymous";
    const content = msg.text || msg.content || msg.message || "";
    const messageTime = formatMessageTime(msg.timestamp || msg.createdAt || msg.sentAt || msg.time);
    return (
      <div key={msg.id || idx} className="chat-message">
        <div className="chat-message__bubble">
          <div className="chat-message__meta">
            <UserIdentity username={String(senderName)} size="sm" textClassName="chat-message__meta-text" />
          </div>
          <div className="chat-message__text">{content}</div>
          {messageTime && <div className="chat-message__time">{messageTime}</div>}
        </div>
      </div>
    );
  };

  const pendingInvitesCount = invites.length;

  const handleInviteAction = async (invite, action) => {
    const id = invite?.id;
    if (!id) return;
    setInvitesActionId(id);
    try {
      const data = action === "accept" ? await acceptChatInvite(id) : await declineChatInvite(id);
      if (action === "accept") {
        const acceptedRoom = data?.chatRoom || data?.room || data;
        const acceptedRoomId = Number(data?.chatRoomId || acceptedRoom?.id || 0);
        if (!acceptedRoomId) {
          toast.error("Invite accept response missing chatRoomId.");
          return;
        }
        const inviter = invite?.inviterUsername || invite?.inviter?.username || invite?.fromUsername || "";
        if (inviter) {
          setInvitedByNotice(inviter);
          setInvitedByRoomId(acceptedRoomId);
        }
        if (acceptedRoom?.id) {
          setSelectedRoom(acceptedRoom);
          const acceptedType = normalizeRoomType(acceptedRoom);
          if (ROOM_KEY_SET.has(acceptedType)) setSelectedRoomType(acceptedType);
        } else {
          try {
            sessionStorage.setItem("cv_open_room_id", String(acceptedRoomId));
          } catch {}
        }
        toast.success("Invitation accepted");
        navigate("/chat");
      } else {
        toast.success("Invitation declined");
      }
      await Promise.all([loadInvites(), loadRooms()]);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to update invitation");
    } finally {
      setInvitesActionId(null);
    }
  };

  const handleEnterRandomConversation = async () => {
    setRandomLoading(true);
    try {
      let rooms = chatRooms;
      if (!rooms.length) {
        const res = await api.get("/chatrooms");
        rooms = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.content) ? res.data.content : [];
        setChatRooms(rooms);
      }

      const eligible = rooms.filter((room) => {
        const type = normalizeRoomType(room);
        return ROOM_KEY_SET.has(type) && isRoomAllowed(type);
      });

      if (!eligible.length) {
        toast.error("No active conversations available right now.");
        return;
      }

      const randomRoom = eligible[Math.floor(Math.random() * eligible.length)];
      const randomType = normalizeRoomType(randomRoom);
      if (ROOM_KEY_SET.has(randomType)) {
        setSelectedRoomType(randomType);
      }
      setSelectedRoom(randomRoom);
      toast.success("Random conversation opened");
    } catch (err) {
      console.error(err);
      toast.error("Unable to open a random conversation");
    } finally {
      setRandomLoading(false);
    }
  };

  const handleAnalyzeMessage = async () => {
    const text = String(inputValue || "").trim();
    if (!text) {
      toast.error("Write a message first.");
      return;
    }
    const gate = tryConsumeAiUse(user);
    if (!gate.ok) {
      toast.error("Free plan: 3 AI uses/day. Upgrade for unlimited.");
      return;
    }
    setQuotaTick((prev) => prev + 1);
    setAnalyzingMessage(true);
    try {
      const analysis = await aiAnalyzeEmotion(text);
      markStreakActivity(user);
      setMessageAnalysis(analysis);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to analyze message");
    } finally {
      setAnalyzingMessage(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    toast.error("Admin account cannot access chat.");
    navigate("/admin", { replace: true });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) return;
    const interval = setInterval(() => {
      loadSubscription();
    }, 12000);
    const onFocus = () => loadSubscription();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAdmin]);

  return (
    <div className="page chat-page space-y-8">
      <section className="chat-luxe-shell">
        <aside className="chat-luxe-sidebar">
          <div>
            <h2 className="chat-luxe-title">Messages</h2>
            <p className="chat-luxe-subtitle">Join rooms for themed, anonymous conversations.</p>
          </div>

          <div className="chat-luxe-room-label">ROOMS</div>
          <div className="space-y-2">
            {ROOM_DEFINITIONS.map((room) => {
              const allowed = isRoomAllowed(room.key);
              const active = selectedRoomType === room.key;
              const unreadCount = Number(roomUnread[room.key] || 0);
              return (
                <button
                  key={room.key}
                  type="button"
                  className={`chat-room ${active ? "chat-room--active" : ""}`}
                  onClick={async () => {
                    if (!allowed) {
                      if (room.key === "LATE_NIGHT") {
                        toast.error('"Late Night" is active only at night (22:00 - 06:00).');
                        return;
                      }
                      if (room.premium) {
                        const freshSub = await loadSubscription();
                        if (hasProAccess(freshSub)) {
                          setSelectedRoomType(room.key);
                          return;
                        }
                      }
                      openPremiumPreview();
                      return;
                    }
                    setSelectedRoomType(room.key);
                  }}
                >
                  <div className="chat-room-row">
                    <div className="chat-room__title">
                      {room.icon} {room.name}{" "}
                      {room.premium ? (isPro ? "\u{1F513}" : "\u{1F512}") : ""}
                    </div>
                    {unreadCount > 0 && <span className="chat-room-unread">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                    <span className={`chat-room-pill ${room.premium ? "is-pro is-inner-circle" : "is-free"}`}>
                      {room.premium ? "PRO" : "FREE"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="chat-luxe-room-label">ACTIVE CHAT</div>
          <div className="chat-active-preview">
            {selectedRoom?.id ? (
              <>
                <button
                  type="button"
                  className="chat-active-preview__main"
                  onClick={() => setSelectedRoom(selectedRoom)}
                  title="Open active chat"
                >
                  {activeSidebarPeer ? (
                    <UserIdentity username={activeSidebarPeer} size="sm" textClassName="chat-active-preview__name" />
                  ) : (
                    <UserIdentity user={user} size="sm" textClassName="chat-active-preview__name" />
                  )}
                  <div className="chat-active-preview__meta">{getRoomLabel(selectedRoom)}</div>
                </button>
                {!isAdmin && (
                  <div className="chat-active-preview__actions">
                    <button
                      type="button"
                      className="chat-active-preview__delete"
                      onClick={() => handleDeleteRoom(selectedRoom.id)}
                      title="Delete conversation"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="chat-active-preview__leave"
                      onClick={() => handleLeaveRoom(selectedRoom.id)}
                      title="Leave conversation"
                    >
                      Leave
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="chat-active-preview__empty">There are no active conversations yet for the selected room.</div>
            )}
          </div>

          <div className="chat-luxe-sidebar-footer">
            <button
              className="chat-luxe-random-btn"
              onClick={handleEnterRandomConversation}
              disabled={randomLoading}
            >
              {randomLoading ? "Opening..." : "Enter Random Conversation"}
            </button>
            <button className="chat-luxe-upgrade-btn" onClick={() => navigate("/subscriptions")}>
              Upgrade
            </button>
          </div>
        </aside>

        <main className="chat-luxe-main">
          <div className="chat-luxe-main-head">
            <div>
              <h2 className="chat-luxe-main-title">{activeChatTitle}</h2>
              <p className="chat-luxe-subtitle">{activeChatSubtitle}</p>
              {invitedByNotice && selectedRoom?.id && invitedByRoomId && Number(selectedRoom.id) === Number(invitedByRoomId) && (
                <p className="chat-luxe-invite-note">Invited by {invitedByNotice}</p>
              )}
            </div>
            <div className="chat-luxe-head-actions">
              <span style={{ flex: 1 }} />
              <button
                className="chat-luxe-refresh"
                onClick={handleOpenAddUser}
                aria-label="Add user"
                title="Add user"
              >
                <UserPlus size={15} />
              </button>
              <button
                className="chat-luxe-refresh"
                onClick={() => setInvitesOpen(true)}
                aria-label="Open invites"
                title="Invites"
              >
                <Bell size={15} />
                {pendingInvitesCount > 0 && <span className="chat-invite-badge">{pendingInvitesCount}</span>}
              </button>
              <button className="chat-luxe-refresh" onClick={loadRooms} aria-label="Refresh rooms">
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          <div ref={messagesContainerRef} className="chat-thread__messages">
            {loadingMessages && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 skeleton"></div>
                ))}
              </div>
            )}
            {!loadingMessages && errorMessages && <div className="text-sm text-rose-600">{errorMessages}</div>}
            {!loadingMessages && !errorMessages && !selectedRoom?.id && (
              <div className="text-sm text-amber-300">
                There is no open conversation yet for the selected room. Press Enter Random Conversation.
              </div>
            )}
            {!loadingMessages && !errorMessages && messages.length === 0 && (
              <div className="text-sm text-slate-600">No messages yet. Start the conversation.</div>
            )}
            {!loadingMessages && !errorMessages && messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-luxe-composer">
            <div className="chat-luxe-tools">
              <button
                type="button"
                className="chat-luxe-tool-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEmojiOpen((prev) => !prev);
                }}
                aria-label="Insert emoji"
                title="Insert emoji"
              >
                <Smile size={15} />
              </button>
              {emojiOpen && (
                <div className="chat-luxe-emoji-menu" onClick={(e) => e.stopPropagation()}>
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`chat-luxe-emoji-item ${selectedEmoji === emoji ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setInputValue((prev) => `${prev}${emoji}`);
                        setEmojiOpen(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="chat-luxe-input-wrap">
              <input
                type="text"
                className="input"
                placeholder={selectedRoom?.id ? "Take your time..." : "There is no open conversation. Press Enter Random Conversation."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                maxLength={300}
                disabled={!selectedRoom?.id}
              />
            </div>
            <button className="chat-luxe-send" onClick={handleSend} disabled={!selectedRoom?.id}>
              <Send size={15} />
            </button>
          </div>

          <div className="chat-ai-inline">
            <button
              type="button"
              className="chat-ai-inline__btn"
              onClick={handleAnalyzeMessage}
              disabled={analyzingMessage || !inputValue.trim() || aiLocked}
            >
              {analyzingMessage ? "Analyzing..." : "Analyze message"}
            </button>
            <span className="chat-ai-inline__quota">
              {aiQuota.isPro ? "AI unlimited" : `AI used today: ${aiQuota.used}/3`}
            </span>
            {aiLocked && (
              <button type="button" className="chat-ai-inline__upgrade" onClick={() => navigate("/subscriptions")}>
                Unlock AI
              </button>
            )}
          </div>

          {messageAnalysis && <div className="chat-ai-inline__result">{messageAnalysis}</div>}
        </main>
      </section>

      {paywallOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="card card-body max-w-lg w-full space-y-4">
            <h3 className="text-xl font-semibold text-slate-100">Access restricted</h3>
            <p className="text-sm text-slate-300">{paywallMessage}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="premium-modal__cta"
                onClick={() => {
                  setPaywallOpen(false);
                  navigate("/subscriptions");
                }}
              >
                Join the Inner Circle
              </button>
              <button className="premium-modal__ghost" onClick={() => setPaywallOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {premiumPreviewOpen && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center bg-black/65 p-4">
          <div className="card card-body max-w-lg w-full space-y-4 premium-preview">
            <div className="premium-preview__eyebrow">Inner Circle Preview</div>
            <h3 className="text-xl font-semibold text-slate-100">Premium Room</h3>
            <div className="premium-preview__chat">
              <div className="premium-preview__msg">I did not expect this chat to feel this safe.</div>
              <div className="premium-preview__msg is-right">You can say hard things here. No judgement.</div>
              <div className="premium-preview__msg">It feels calmer than public rooms.</div>
            </div>
            <p className="text-sm text-slate-300">Access restricted. Join the Inner Circle.</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="premium-modal__cta"
                onClick={() => {
                  setPremiumPreviewOpen(false);
                  navigate("/subscriptions");
                }}
              >
                Join the Inner Circle
              </button>
              <button className="premium-modal__ghost" onClick={() => setPremiumPreviewOpen(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {invitesOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="card card-body max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-100">Chat Invitations</h3>
              <button className="btn btn-secondary" onClick={() => setInvitesOpen(false)}>
                Close
              </button>
            </div>

            {invitesLoading && <p className="text-sm text-slate-400">Loading invitations...</p>}
            {!invitesLoading && invitesApiBroken && (
              <p className="text-sm text-rose-400">Invites service unavailable right now.</p>
            )}
            {!invitesLoading && !invitesApiBroken && invites.length === 0 && (
              <p className="text-sm text-slate-400">No pending invitations.</p>
            )}

            {!invitesLoading && !invitesApiBroken && invites.length > 0 && (
              <div className="space-y-2">
                {invites.map((inv) => {
                  const inviter = inv?.inviterUsername || inv?.inviter?.username || inv?.fromUsername || "User";
                  const busy = invitesActionId === inv?.id;
                  return (
                    <div key={inv?.id || inviter} className="card card-body space-y-2">
                      <div className="text-sm text-slate-200">
                        <strong>{inviter}</strong> invited you to chat
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => handleInviteAction(inv, "accept")}
                        >
                          {busy ? "..." : "Accept"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => handleInviteAction(inv, "decline")}
                        >
                          {busy ? "..." : "Decline"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {addUserOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="card card-body max-w-md w-full space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-100">Add User</h3>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAddUserOpen(false);
                  setSearchError("");
                  setUserSuggestions([]);
                  setUserSuggestionsError("");
                }}
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-400">Search for a user in the database and send an invite to the selected room.</p>
            <form className="space-y-3" onSubmit={handleSubmitAddUser}>
              <input
                type="text"
                className="input"
                placeholder="Search username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (searchError) setSearchError("");
                }}
                maxLength={50}
                autoFocus
              />
              {userSuggestionsLoading && <p className="text-sm text-slate-400">Searching users...</p>}
              {!userSuggestionsLoading && userSuggestionsError && <p className="text-sm text-rose-400">{userSuggestionsError}</p>}
              {!userSuggestionsLoading && !userSuggestionsError && String(searchQuery || "").trim().length >= 2 && (
                <div className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
                  {userSuggestions.length > 0 ? (
                    <div className="divide-y divide-white/10">
                      {userSuggestions.map((name) => (
                        <div key={name} className="flex items-center justify-between gap-2 px-3 py-2">
                          <button
                            type="button"
                            className="text-sm text-slate-200 hover:text-white"
                            onClick={() => {
                              setSearchQuery(name);
                              setSearchError("");
                            }}
                          >
                            {name}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={inviteSubmitting}
                            onClick={() => handleAddSuggestedUser(name)}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-400">No users found.</p>
                  )}
                </div>
              )}
              {searchError && <p className="text-sm text-rose-400">{searchError}</p>}
              <button className="btn btn-primary w-full" type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? "Sending..." : "Send invite"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

