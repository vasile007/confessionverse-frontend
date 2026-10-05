import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import ChatSidebar from "../components/chat/ChatSidebar.jsx";
import ChatHeader from "../components/chat/ChatHeader.jsx";
import MessageList from "../components/chat/MessageList.jsx";
import MessageComposer from "../components/chat/MessageComposer.jsx";
import RequestsPanel from "../components/chat/RequestsPanel.jsx";
import { connectChatSocket, publishChatMessage } from "../services/chatSocketService.js";
import {
  acceptChatInvite,
  createChatroomWithFallback,
  declineChatInvite,
  getMyChatInvites,
} from "../services/chatroomService.js";

const modeForRoom = (room) => {
  const type = String(room?.roomType || "").toUpperCase();
  if (type === "STANDARD") return "community";
  if (type === "RANDOM" || String(room?.username || "").startsWith("Random ")) return "random";
  return "private";
};

const ACTIVE_ROOM_STORAGE_KEY = "cv_active_chat_room_id";

export default function ChatPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeMode, setActiveMode] = useState("community");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [randomBusy, setRandomBusy] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(null);
  const [startPrivateOpen, setStartPrivateOpen] = useState(false);
  const [privateUsername, setPrivateUsername] = useState("");
  const [privateBusy, setPrivateBusy] = useState(false);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [unreadByRoom, setUnreadByRoom] = useState({});
  const socketRef = useRef(null);
  const socketGenerationRef = useRef(0);
  const lastSocketErrorRef = useRef({ message: "", at: 0 });
  const activeRoomIdRef = useRef(null);
  const messageViewportRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldFollowRef = useRef(true);
  const messageRequestRef = useRef(0);
  const randomOperationRef = useRef(false);
  const roomRequestRef = useRef(0);
  const roomsRef = useRef([]);

  const myUsername = String(user?.username || "").toLowerCase();
  const communityRoom = useMemo(() => rooms.find((room) => modeForRoom(room) === "community") || null, [rooms]);
  const randomRoom = useMemo(() => rooms.find((room) => modeForRoom(room) === "random") || null, [rooms]);
  const privateRooms = useMemo(() => rooms.filter((room) => modeForRoom(room) === "private"), [rooms]);
  const unreadStorageKey = `cv_chat_unread_${String(user?.id || user?.username || "anonymous")}`;

  const privateRoomLabel = useCallback((room) => {
    const participants = Array.isArray(room?.participants) ? room.participants : [];
    const other = participants.find((participant) =>
      String(participant?.username || "").toLowerCase() !== myUsername);
    return other?.username || "Private chat";
  }, [myUsername]);

  const roomLabel = activeMode === "community"
    ? "Community"
    : activeMode === "random"
      ? "Random Chat"
      : privateRoomLabel(activeRoom);

  const loadInvites = useCallback(async () => {
    try {
      const result = await getMyChatInvites();
      setInvites(result.filter((invite) => String(invite?.status || "").toUpperCase() === "PENDING"));
    } catch {
      // Chat remains usable if invitation refresh is temporarily unavailable.
    }
  }, []);

  const loadRooms = useCallback(async ({ preserveSelection = true } = {}) => {
    const requestId = ++roomRequestRef.current;
    try {
      const response = await api.get("/chatrooms");
      if (requestId !== roomRequestRef.current) return;
      const list = Array.isArray(response.data) ? response.data : response.data?.content || [];
      const visible = list.filter((room) => {
        const type = String(room?.roomType || "").toUpperCase();
        return type === "STANDARD" || type === "RANDOM" || type === "DIRECT"
          || String(room?.username || "").startsWith("Random ");
      });
      setRooms(visible);
      roomsRef.current = visible;
      const storedRoomId = !preserveSelection
        ? Number(sessionStorage.getItem(ACTIVE_ROOM_STORAGE_KEY) || 0)
        : 0;
      const desiredRoomId = preserveSelection ? activeRoomIdRef.current : storedRoomId;
      const refreshed = desiredRoomId
        ? visible.find((room) => Number(room.id) === Number(desiredRoomId))
        : null;
      const target = refreshed
        || visible.find((room) => String(room?.roomType || "").toUpperCase() === "STANDARD")
        || null;
      activeRoomIdRef.current = target?.id || null;
      setActiveRoom(target);
      setActiveMode(target ? modeForRoom(target) : "community");
      return visible;
    } catch (error) {
      if (requestId !== roomRequestRef.current) return;
      toast.error(error?.response?.data?.error || "Unable to load chats");
    } finally {
      if (requestId === roomRequestRef.current) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId) => {
    const requestId = ++messageRequestRef.current;
    if (!roomId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    try {
      const response = await api.get(`/messages/chatroom/${roomId}`, { params: { size: 100 } });
      if (requestId !== messageRequestRef.current || Number(roomId) !== Number(activeRoomIdRef.current)) return;
      const list = response.data?.content ?? response.data ?? [];
      setMessages(Array.isArray(list) ? list : []);
      shouldFollowRef.current = true;
    } catch (error) {
      if (requestId !== messageRequestRef.current) return;
      setMessages([]);
      toast.error(error?.response?.data?.error || "Unable to load messages");
    } finally {
      if (requestId === messageRequestRef.current) setMessagesLoading(false);
    }
  }, []);

  const selectRoom = useCallback((room, mode = modeForRoom(room)) => {
    if (!room?.id) return;
    activeRoomIdRef.current = room.id;
    messageRequestRef.current += 1;
    sessionStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, String(room.id));
    setActiveMode(mode);
    setActiveRoom(room);
    setMessages([]);
    setMobileConversationOpen(true);
    setUnreadByRoom((current) => {
      if (!current[String(room.id)]) return current;
      const next = { ...current };
      delete next[String(room.id)];
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(unreadStorageKey) || "{}");
      setUnreadByRoom(stored && typeof stored === "object" ? stored : {});
    } catch {
      setUnreadByRoom({});
    }
  }, [unreadStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(unreadStorageKey, JSON.stringify(unreadByRoom));
    } catch {}
  }, [unreadByRoom, unreadStorageKey]);

  useEffect(() => {
    if (isAdmin) {
      toast.error("Admin accounts cannot access chat.");
      navigate("/admin", { replace: true });
      return;
    }
    loadRooms({ preserveSelection: false });
    loadInvites();
  }, [isAdmin, loadInvites, loadRooms, navigate]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id || null;
    loadMessages(activeRoom?.id);
  }, [activeRoom?.id, loadMessages]);

  useEffect(() => {
    if (isAdmin) return undefined;
    const generation = ++socketGenerationRef.current;
    const isCurrentSocket = () => socketGenerationRef.current === generation;
    const client = connectChatSocket({
      onConnected: () => {
        if (!isCurrentSocket()) return;
        setSocketReady(true);
        loadInvites();
        loadRooms();
      },
      onMatch: (event) => {
        if (!isCurrentSocket()) return;
        if (event?.status === "ROOM_UPDATED" && event?.chatRoom?.id) {
          const updated = event.chatRoom;
          setRooms((current) => {
            const next = [updated, ...current.filter((room) => Number(room.id) !== Number(updated.id))];
            roomsRef.current = next;
            return next;
          });
          if (Number(activeRoomIdRef.current) === Number(updated.id)) setActiveRoom(updated);
          return;
        }
        if (event?.status === "LEFT" && Number(event?.chatRoomId) === Number(activeRoomIdRef.current)) {
          activeRoomIdRef.current = null;
          sessionStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
          setActiveRoom(null);
          setActiveMode("community");
          setMessages([]);
          loadRooms();
        }
      },
      onMessage: (message) => {
        if (!isCurrentSocket()) return;
        const messageRoomId = Number(message?.chatRoomId);
        if (messageRoomId !== Number(activeRoomIdRef.current)) {
          const room = roomsRef.current.find((candidate) => Number(candidate.id) === messageRoomId);
          if (room && modeForRoom(room) === "private") {
            setUnreadByRoom((current) => ({
              ...current,
              [String(messageRoomId)]: Math.min(99, Number(current[String(messageRoomId)] || 0) + 1),
            }));
          } else {
            loadRooms();
          }
          return;
        }
        setMessages((current) => {
          if (message?.id && current.some((item) => Number(item?.id) === Number(message.id))) return current;
          return [...current, message];
        });
      },
      onInvitesChanged: (event) => {
        if (isCurrentSocket()) {
          loadInvites();
          if (event?.event === "CHAT_INVITE_CREATED") toast("New private chat request", { icon: "🔔" });
        }
      },
      onRoomsChanged: async (event) => {
        if (!isCurrentSocket()) return;
        const list = await loadRooms();
        const roomId = Number(event?.chatRoomId || 0);
        if (roomId && Array.isArray(list)) {
          const room = list.find((candidate) => Number(candidate.id) === roomId);
          if (room && modeForRoom(room) === "private") {
            selectRoom(room, "private");
          }
        }
      },
      onDisconnect: () => {
        if (isCurrentSocket()) setSocketReady(false);
      },
      onError: (message) => {
        if (!isCurrentSocket()) return;
        const now = Date.now();
        if (lastSocketErrorRef.current.message !== message || now - lastSocketErrorRef.current.at > 5000) {
          lastSocketErrorRef.current = { message, at: now };
          toast.error(message);
        }
      },
    });
    socketRef.current = client;
    return () => {
      if (socketGenerationRef.current === generation) {
        socketGenerationRef.current += 1;
        setSocketReady(false);
        socketRef.current = null;
      }
      void client?.deactivate();
    };
  }, [isAdmin, loadInvites, loadRooms]);

  useEffect(() => {
    if (activeMode !== "random" || !activeRoom?.id) return undefined;
    let stopped = false;
    const sendHeartbeat = async () => {
      try {
        await api.post("/chatrooms/random-heartbeat", { roomId: activeRoom.id });
      } catch (error) {
        if (!stopped && Number(error?.response?.status) === 403) await loadRooms();
      }
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 60000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeMode, activeRoom?.id, loadRooms]);

  useEffect(() => {
    if (shouldFollowRef.current) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleViewportScroll = () => {
    const element = messageViewportRef.current;
    if (!element) return;
    shouldFollowRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 90;
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || !activeRoom?.id || !socketRef.current?.connected) {
      if (!socketRef.current?.connected) toast.error("Chat is reconnecting. Try again in a moment.");
      return;
    }
    try {
      publishChatMessage(socketRef.current, activeRoom.id, content, user?.username || "Anonymous");
      setInput("");
      shouldFollowRef.current = true;
    } catch (error) {
      toast.error(error?.message || "Unable to send message");
    }
  };

  const enterRandom = async () => {
    if (randomOperationRef.current) return;
    if (randomRoom) {
      selectRoom(randomRoom, "random");
      return;
    }
    randomOperationRef.current = true;
    setRandomBusy(true);
    try {
      const response = await api.post("/chatrooms/random-join", {});
      const room = response.data?.chatRoom;
      if (!room?.id) throw new Error("Random chat did not return a room");
      setRooms((current) => [room, ...current.filter((item) => Number(item.id) !== Number(room.id))]);
      selectRoom(room, "random");
      toast.success("You joined a random group.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Unable to enter Random Chat");
    } finally {
      randomOperationRef.current = false;
      setRandomBusy(false);
    }
  };

  const leaveRandom = async () => {
    if (randomOperationRef.current || activeMode !== "random" || !activeRoom?.id) return;
    randomOperationRef.current = true;
    setRandomBusy(true);
    try {
      await api.delete(`/chatrooms/${activeRoom.id}/leave`);
      setRooms((current) => current.filter((room) => Number(room.id) !== Number(activeRoom.id)));
      selectRoom(communityRoom, "community");
      toast.success("You left Random Chat.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to leave Random Chat");
    } finally {
      randomOperationRef.current = false;
      setRandomBusy(false);
    }
  };

  const nextRandom = async () => {
    if (randomOperationRef.current || activeMode !== "random" || !activeRoom?.id) return;
    randomOperationRef.current = true;
    setRandomBusy(true);
    const previousId = activeRoom.id;
    try {
      const response = await api.post("/chatrooms/random-next", { currentRoomId: previousId });
      const room = response.data?.chatRoom;
      if (!room?.id) throw new Error("Unable to find another random group");
      setRooms((current) => [room, ...current.filter((item) =>
        Number(item.id) !== Number(previousId) && Number(item.id) !== Number(room.id))]);
      selectRoom(room, "random");
      toast.success("New random group joined.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Unable to shuffle");
      await loadRooms();
    } finally {
      randomOperationRef.current = false;
      setRandomBusy(false);
    }
  };

  const startPrivate = async (username = privateUsername) => {
    const clean = String(username || "").trim();
    if (!clean || privateBusy) return;
    if (clean.toLowerCase() === myUsername) {
      toast.error("Choose another anonymous user.");
      return;
    }
    setPrivateBusy(true);
    try {
      const result = await createChatroomWithFallback(clean, "DIRECT");
      setPrivateUsername("");
      setStartPrivateOpen(false);
      if (String(result?.status || "").toUpperCase() === "ACCEPTED" && result?.chatRoom?.id) {
        await loadRooms();
        selectRoom(result.chatRoom, "private");
        toast.success("Private conversation opened.");
        return;
      }
      toast.success(result?.message || "Private chat request sent. The chat opens after acceptance.");
      await loadInvites();
      const pendingForMe = String(result?.invite?.inviteeUsername || "").toLowerCase() === myUsername;
      if (pendingForMe) setInvitesOpen(true);
      await loadRooms();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to send private chat request");
    } finally {
      setPrivateBusy(false);
    }
  };

  const answerInvite = async (invite, accept) => {
    setInviteBusy(invite.id);
    try {
      const result = accept ? await acceptChatInvite(invite.id) : await declineChatInvite(invite.id);
      await loadInvites();
      await loadRooms();
      if (accept && result?.chatRoom?.id) {
        selectRoom(result.chatRoom, "private");
        setInvitesOpen(false);
      }
      toast.success(accept ? "Private chat accepted." : "Request declined.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to respond to request");
    } finally {
      setInviteBusy(null);
    }
  };

  const openInvites = async () => {
    setInvitesOpen(true);
    await loadInvites();
  };

  if (isAdmin) return null;

  return (
    <div className={`page chat-page cv-chat-page ${mobileConversationOpen ? "is-conversation-open" : ""}`}>
      <section className="cv-chat-shell">
        <ChatSidebar activeMode={activeMode} activeRoomId={activeRoom?.id} communityRoom={communityRoom} randomBusy={randomBusy} privateRooms={privateRooms} privateRoomLabel={privateRoomLabel} unreadByRoom={unreadByRoom} pendingCount={invites.length} loading={loading} isPremium={user?.premium} onSelectRoom={selectRoom} onEnterRandom={enterRandom} onOpenRequests={openInvites} onStartPrivate={() => setStartPrivateOpen(true)} onUpgrade={() => navigate("/subscriptions")} />

        <main className="cv-chat-main">
          <ChatHeader mode={activeMode} room={activeRoom} label={roomLabel} socketReady={socketReady} randomBusy={randomBusy} onNext={nextRandom} onLeave={leaveRandom} onRefresh={() => loadRooms()} onBack={() => setMobileConversationOpen(false)} />
          <MessageList loading={messagesLoading} room={activeRoom} mode={activeMode} messages={messages} myUsername={myUsername} myUserId={user?.id} viewportRef={messageViewportRef} endRef={messagesEndRef} onScroll={handleViewportScroll} onEnterRandom={enterRandom} onStartPrivate={startPrivate} />
          <MessageComposer value={input} onChange={setInput} onSend={handleSend} disabled={!activeRoom?.id} socketReady={socketReady} placeholder={activeRoom?.id ? `Message ${roomLabel}` : "Choose or enter a chat"} />
        </main>
      </section>

      {startPrivateOpen && (
        <div className="cv-modal-backdrop" onMouseDown={() => setStartPrivateOpen(false)}>
          <form className="cv-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); startPrivate(); }}>
            <span className="cv-chat-kicker">PRIVATE CHAT REQUEST</span>
            <h3>Continue privately</h3>
            <p>The conversation is created only after the other person accepts.</p>
            <input autoFocus value={privateUsername} onChange={(event) => setPrivateUsername(event.target.value)} placeholder="Anonymous username" maxLength={50} />
            <div><button type="button" className="is-secondary" onClick={() => setStartPrivateOpen(false)}>Cancel</button><button disabled={privateBusy || !privateUsername.trim()}>{privateBusy ? "Sending…" : "Send request"}</button></div>
          </form>
        </div>
      )}

      {invitesOpen && <RequestsPanel invites={invites} busyId={inviteBusy} onAnswer={answerInvite} onClose={() => setInvitesOpen(false)} />}
    </div>
  );
}
