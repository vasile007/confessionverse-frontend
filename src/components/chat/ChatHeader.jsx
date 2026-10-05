import React from "react";
import { ArrowLeft, LogOut, RefreshCw, Shuffle } from "lucide-react";

export default function ChatHeader({ mode, room, label, socketReady, randomBusy, onNext, onLeave, onRefresh, onBack }) {
  const participants = Array.isArray(room?.participants) ? room.participants.length : 0;
  const description = mode === "random"
    ? `${participants || 1} ${participants === 1 ? "person" : "people"} here · maximum 6`
    : mode === "community"
      ? "One shared space for the ConfessionVerse community"
      : "Anonymous and visible only to participants";
  return (
    <header className="cv-chat-header">
      <button className="cv-mobile-back" type="button" onClick={onBack} aria-label="Back to chats"><ArrowLeft size={18} /></button>
      <div className="cv-chat-header__title">
        <span className="cv-chat-kicker">{mode === "private" ? "PRIVATE CHAT" : mode.toUpperCase()}</span>
        <h2>{label}</h2>
        <p>{description}</p>
      </div>
      <div className="cv-chat-header__actions">
        <span className={`cv-live-state ${socketReady ? "is-online" : ""}`}>{socketReady ? "Live" : "Reconnecting"}</span>
        {mode === "random" && room?.id && (
          <>
            <button onClick={onNext} disabled={randomBusy}><Shuffle size={16} /> Next</button>
            <button className="is-danger" onClick={onLeave} disabled={randomBusy}><LogOut size={16} /> Leave</button>
          </>
        )}
        <button className="is-icon" onClick={onRefresh} aria-label="Refresh chats"><RefreshCw size={16} /></button>
      </div>
    </header>
  );
}
