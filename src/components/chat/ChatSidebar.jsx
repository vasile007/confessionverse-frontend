import React from "react";
import { Bell, Shuffle, UserPlus, Users } from "lucide-react";
import UserIdentity from "../UserIdentity.jsx";

export default function ChatSidebar({
  activeMode,
  activeRoomId,
  communityRoom,
  randomBusy,
  privateRooms,
  privateRoomLabel,
  unreadByRoom,
  pendingCount,
  loading,
  isPremium,
  onSelectRoom,
  onEnterRandom,
  onOpenRequests,
  onStartPrivate,
  onUpgrade,
}) {
  return (
    <aside className="cv-chat-sidebar" aria-label="Chat navigation">
      <header className="cv-chat-brand">
        <span>CHAT</span>
        <h1>Anonymous conversations</h1>
      </header>

      <div className="cv-primary-modes">
        <button className={activeMode === "community" ? "is-active" : ""} onClick={() => onSelectRoom(communityRoom, "community")} disabled={!communityRoom}>
          <Users size={19} />
          <span><strong>Community</strong><small>Talk with everyone</small></span>
        </button>
        <button className={activeMode === "random" ? "is-active is-random" : "is-random"} onClick={onEnterRandom} disabled={randomBusy}>
          <Shuffle size={19} />
          <span><strong>{randomBusy ? "Joining…" : "Random Chat"}</strong><small>Meet a small anonymous group</small></span>
        </button>
      </div>

      <div className="cv-sidebar-heading"><span>PRIVATE CHATS</span></div>
      <nav className="cv-private-list" aria-label="Private chats">
        {loading && <div className="cv-sidebar-empty">Loading chats…</div>}
        {!loading && privateRooms.length === 0 && <div className="cv-sidebar-empty">Accepted private chats appear here.</div>}
        {privateRooms.map((room) => {
          const unread = Number(unreadByRoom[String(room.id)] || 0);
          return (
            <button key={room.id} className={Number(activeRoomId) === Number(room.id) ? "is-active" : ""} onClick={() => onSelectRoom(room, "private")}>
              <UserIdentity username={privateRoomLabel(room)} size="sm" />
              {unread > 0 && <b className="cv-unread-badge" aria-label={`${unread} unread messages`}>{unread > 99 ? "99+" : unread}</b>}
            </button>
          );
        })}
      </nav>

      <div className="cv-sidebar-actions">
        <button className="cv-start-private" onClick={onStartPrivate}><UserPlus size={17} /> Start Private Chat</button>
        <button className="cv-invites-button" onClick={onOpenRequests}>
          <Bell size={16} /> Requests
          {pendingCount > 0 && <b aria-label={`${pendingCount} pending requests`}>{pendingCount}</b>}
        </button>
        {!isPremium && <button className="cv-upgrade-button" onClick={onUpgrade}>Upgrade to Premium</button>}
      </div>
    </aside>
  );
}
