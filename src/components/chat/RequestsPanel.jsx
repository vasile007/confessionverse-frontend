import React from "react";
import UserIdentity from "../UserIdentity.jsx";

export default function RequestsPanel({ invites, busyId, onAnswer, onClose }) {
  return (
    <div className="cv-modal-backdrop" onMouseDown={onClose}>
      <section className="cv-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="chat-requests-title">
        <span className="cv-chat-kicker">PRIVATE CHATS</span>
        <h3 id="chat-requests-title">Chat requests</h3>
        {invites.length === 0 && <p>No pending requests.</p>}
        <div className="cv-invite-list">
          {invites.map((invite) => (
            <div key={invite.id}>
              <UserIdentity username={invite.inviterUsername || "Anonymous"} size="sm" />
              <span>
                <button className="is-secondary" disabled={busyId === invite.id} onClick={() => onAnswer(invite, false)}>Decline</button>
                <button disabled={busyId === invite.id} onClick={() => onAnswer(invite, true)}>{busyId === invite.id ? "Working…" : "Accept"}</button>
              </span>
            </div>
          ))}
        </div>
        <div><button className="is-secondary" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}
