import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, LogOut, RefreshCw, Send, Shuffle, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import UserIdentity from "../components/UserIdentity.jsx";
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

const senderName = (message) =>
  String(message?.sender?.username || message?.senderUsername || message?.sender || "Anonymous");
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
  const socketRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const messageViewportRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldFollowRef = useRef(true);
  const messageRequestRef = useRef(0);
  const randomOperationRef = useRef(false);
  const roomRequestRef = useRef(0);

  const myUsername = String(user?.username || "").toLowerCase();
  const communityRoom = useMemo(() => rooms.find((room) => modeForRoom(room) === "community") || null, [rooms]);
  const randomRoom = useMemo(() => rooms.find((room) => modeForRoom(room) === "random") || null, [rooms]);
  const privateRooms = useMemo(() => rooms.filter((room) => modeForRoom(room) === "private"), [rooms]);

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
  }, []);

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
    const client = connectChatSocket({
      onConnected: () => setSocketReady(true),
      onMatch: (event) => {
        if (event?.status === "ROOM_UPDATED" && event?.chatRoom?.id) {
          const updated = event.chatRoom;
          setRooms((current) => [updated, ...current.filter((room) => Number(room.id) !== Number(updated.id))]);
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
        if (Number(message?.chatRoomId) !== Number(activeRoomIdRef.current)) return;
        setMessages((current) => {
          if (message?.id && current.some((item) => Number(item?.id) === Number(message.id))) return current;
          return [...current, message];
        });
      },
      onInvitesChanged: loadInvites,
      onRoomsChanged: () => loadRooms(),
      onDisconnect: () => setSocketReady(false),
    });
    socketRef.current = client;
    return () => {
      setSocketReady(false);
      socketRef.current = null;
      client?.deactivate();
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
      await createChatroomWithFallback(clean);
      setPrivateUsername("");
      setStartPrivateOpen(false);
      toast.success("Private chat request sent. The chat opens after acceptance.");
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
      if (accept && result?.chatRoom?.id) selectRoom(result.chatRoom, "private");
      toast.success(accept ? "Private chat accepted." : "Request declined.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to respond to request");
    } finally {
      setInviteBusy(null);
    }
  };

  const renderMessage = (message) => {
    const name = senderName(message);
    const mine = name.toLowerCase() === myUsername || Number(message?.senderId) === Number(user?.id);
    const system = !message?.sender && !message?.senderId;
    if (system) return <div key={message.id || message.timestamp} className="cv-system-message">{message.content}</div>;
    return (
      <article key={message.id || `${message.timestamp}-${name}`} className={`cv-message ${mine ? "is-mine" : "is-other"}`}>
        {!mine && (
          <button className="cv-message__sender" type="button" onClick={() => startPrivate(name)}>
            <UserIdentity username={name} size="sm" />
            <span>Continue privately</span>
          </button>
        )}
        <div className="cv-message__bubble">
          <p>{message.content}</p>
          <time>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time>
        </div>
      </article>
    );
  };

  if (isAdmin) return null;

  return (
    <div className="page chat-page cv-chat-page">
      <section className="cv-chat-shell">
        <aside className="cv-chat-sidebar">
          <header className="cv-chat-brand">
            <span>CHAT</span>
            <h1>Anonymous conversations</h1>
          </header>

          <div className="cv-primary-modes">
            <button className={activeMode === "community" ? "is-active" : ""} onClick={() => selectRoom(communityRoom, "community")} disabled={!communityRoom}>
              <Users size={19} />
              <span><strong>Community</strong><small>Talk with everyone</small></span>
            </button>
            <button className={activeMode === "random" ? "is-active is-random" : "is-random"} onClick={enterRandom} disabled={randomBusy}>
              <Shuffle size={19} />
              <span><strong>{randomBusy ? "Joining…" : "Random Chat"}</strong><small>Meet a small anonymous group</small></span>
            </button>
          </div>

          <div className="cv-sidebar-heading">
            <span>PRIVATE CHATS</span>
            {invites.length > 0 && <b>{invites.length}</b>}
          </div>
          <nav className="cv-private-list" aria-label="Private chats">
            {loading && <div className="cv-sidebar-empty">Loading chats…</div>}
            {!loading && privateRooms.length === 0 && <div className="cv-sidebar-empty">Accepted private chats appear here.</div>}
            {privateRooms.map((room) => {
              const label = privateRoomLabel(room);
              return (
                <button key={room.id} className={Number(activeRoom?.id) === Number(room.id) ? "is-active" : ""} onClick={() => selectRoom(room, "private")}>
                  <UserIdentity username={label} size="sm" />
                </button>
              );
            })}
          </nav>

          <button className="cv-start-private" onClick={() => setStartPrivateOpen(true)}><UserPlus size={17} /> Start Private Chat</button>
          <button className="cv-invites-button" onClick={() => setInvitesOpen(true)}><Bell size={16} /> Requests {invites.length > 0 && <b>{invites.length}</b>}</button>
          {!user?.premium && <button className="cv-upgrade-button" onClick={() => navigate("/subscriptions")}>Upgrade to Premium</button>}
        </aside>

        <main className="cv-chat-main">
          <header className="cv-chat-header">
            <div>
              <span className="cv-chat-kicker">{activeMode === "private" ? "PRIVATE CHAT" : activeMode.toUpperCase()}</span>
              <h2>{roomLabel}</h2>
              <p>{activeMode === "random"
                ? `${activeRoom?.participants?.length || 1} ${activeRoom?.participants?.length === 1 ? "person" : "people"} here · maximum 6`
                : activeMode === "community" ? "One shared space for the ConfessionVerse community" : "Anonymous and visible only to participants"}</p>
            </div>
            <div className="cv-chat-header__actions">
              <span className={`cv-live-state ${socketReady ? "is-online" : ""}`}>{socketReady ? "Live" : "Reconnecting"}</span>
              {activeMode === "random" && activeRoom?.id && (
                <>
                  <button onClick={nextRandom} disabled={randomBusy}><Shuffle size={16} /> Next</button>
                  <button className="is-danger" onClick={leaveRandom} disabled={randomBusy}><LogOut size={16} /> Leave</button>
                </>
              )}
              <button className="is-icon" onClick={() => loadRooms()} aria-label="Refresh chats"><RefreshCw size={16} /></button>
            </div>
          </header>

          <div className="cv-message-viewport" ref={messageViewportRef} onScroll={handleViewportScroll}>
            {messagesLoading && <div className="cv-chat-empty">Loading conversation…</div>}
            {!messagesLoading && !activeRoom?.id && activeMode === "random" && (
              <div className="cv-chat-empty"><Shuffle size={30} /><h3>Ready to meet a random group?</h3><p>Rooms hold up to six anonymous people.</p><button onClick={enterRandom}>Enter Random Chat</button></div>
            )}
            {!messagesLoading && activeRoom?.id && messages.length === 0 && (
              <div className="cv-chat-empty"><h3>No messages yet</h3><p>Start the conversation when you are ready.</p></div>
            )}
            {!messagesLoading && messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          <footer className="cv-composer">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) handleSend(); }} placeholder={activeRoom?.id ? `Message ${roomLabel}` : "Choose or enter a chat"} maxLength={500} disabled={!activeRoom?.id} />
            <button onClick={handleSend} disabled={!input.trim() || !activeRoom?.id || !socketReady} aria-label="Send message"><Send size={18} /></button>
          </footer>
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

      {invitesOpen && (
        <div className="cv-modal-backdrop" onMouseDown={() => setInvitesOpen(false)}>
          <section className="cv-modal" onMouseDown={(event) => event.stopPropagation()}>
            <span className="cv-chat-kicker">PRIVATE CHATS</span>
            <h3>Chat requests</h3>
            {invites.length === 0 && <p>No pending requests.</p>}
            <div className="cv-invite-list">
              {invites.map((invite) => (
                <div key={invite.id}><UserIdentity username={invite.inviterUsername || "Anonymous"} size="sm" /><span><button className="is-secondary" disabled={inviteBusy === invite.id} onClick={() => answerInvite(invite, false)}>Decline</button><button disabled={inviteBusy === invite.id} onClick={() => answerInvite(invite, true)}>Accept</button></span></div>
              ))}
            </div>
            <div><button className="is-secondary" onClick={() => setInvitesOpen(false)}>Close</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
