import React from "react";
import { Shuffle } from "lucide-react";
import UserIdentity from "../UserIdentity.jsx";

function senderIdentity(message) {
  const sender = message?.sender;
  const username = typeof sender === "object" && sender !== null
    ? sender.username
    : message?.senderUsername || (typeof sender === "string" ? sender : "");
  const normalized = String(username || "").trim();
  return normalized ? { username: normalized, user: typeof sender === "object" ? sender : null } : null;
}

function MessageBubble({ message, myUsername, myUserId, onStartPrivate }) {
  const identity = senderIdentity(message);
  const name = identity?.username || "";
  const mine = (name && name.toLowerCase() === myUsername) || Number(message?.senderId) === Number(myUserId);
  if (!identity && !message?.senderId) return <div className="cv-system-message">{message.content}</div>;
  return (
    <article className={`cv-message ${mine ? "is-mine" : "is-other"}`}>
      {!mine && identity && (
        <button className="cv-message__sender" type="button" onClick={() => onStartPrivate(name)} aria-label={`Continue privately with ${name}`}>
          <UserIdentity user={identity.user} username={name} size="sm" />
          <span className="cv-message__private-action">Continue privately</span>
        </button>
      )}
      <div className="cv-message__bubble">
        <p>{message.content}</p>
        <time dateTime={message.timestamp || undefined}>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time>
      </div>
    </article>
  );
}

export default function MessageList({ loading, room, mode, messages, myUsername, myUserId, viewportRef, endRef, onScroll, onEnterRandom, onStartPrivate }) {
  return (
    <div className="cv-message-viewport" ref={viewportRef} onScroll={onScroll} aria-live="polite">
      {loading && <div className="cv-chat-empty">Loading conversation…</div>}
      {!loading && !room?.id && mode === "random" && (
        <div className="cv-chat-empty"><Shuffle size={30} /><h3>Ready to meet a random group?</h3><p>Rooms hold up to six anonymous people.</p><button onClick={onEnterRandom}>Enter Random Chat</button></div>
      )}
      {!loading && room?.id && messages.length === 0 && <div className="cv-chat-empty"><h3>No messages yet</h3><p>Start the conversation when you are ready.</p></div>}
      {!loading && messages.map((message) => (
        <MessageBubble key={message.id || `${message.timestamp}-${message?.senderId || "system"}`} message={message} myUsername={myUsername} myUserId={myUserId} onStartPrivate={onStartPrivate} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
