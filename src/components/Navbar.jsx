import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { acceptChatInvite, declineChatInvite, getMyChatInvites } from "../services/chatroomService.js";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthed, isAdmin, username, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteActionId, setInviteActionId] = useState(null);
  const [invitesApiBroken, setInvitesApiBroken] = useState(false);
  const [unreadMessageRooms, setUnreadMessageRooms] = useState({});
  const [, setAvatarVersion] = useState(0);
  const menuRef = useRef(null);
  const menuCloseTimerRef = useRef(null);
  const messagePollBusyRef = useRef(false);
  const seenStorageKey = `cv_seen_room_last_${String(user?.id || username || "anon")}`;

  const navLinks = [
    { to: "/confessions", label: "Feed" },
    { to: "/chat", label: "Chat" },
    { to: "/ai", label: "AI" },
    { to: "/subscriptions", label: "Upgrade" },
  ];

  useEffect(() => {
    setMenuOpen(false);
    setInviteOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setInviteOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (menuCloseTimerRef.current) {
        clearTimeout(menuCloseTimerRef.current);
      }
    };
  }, []);

  const openMenu = () => {
    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
    menuCloseTimerRef.current = setTimeout(() => setMenuOpen(false), 120);
  };

  useEffect(() => {
    const onAvatarChanged = () => setAvatarVersion((prev) => prev + 1);
    window.addEventListener("avatar:changed", onAvatarChanged);
    return () => window.removeEventListener("avatar:changed", onAvatarChanged);
  }, []);

  const loadInvites = async () => {
    if (!isAuthed || isAdmin) {
      setInvites([]);
      return;
    }
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

  useEffect(() => {
    loadInvites();
    if (!isAuthed) return;
    if (invitesApiBroken) return;
    const interval = setInterval(loadInvites, 10000);
    return () => clearInterval(interval);
  }, [isAuthed, isAdmin, invitesApiBroken]);

  useEffect(() => {
    if (!isAuthed || isAdmin) {
      setInvites([]);
      setUnreadMessageRooms({});
      return;
    }
    // Avoid stale bell count when auth/user changes.
    setUnreadMessageRooms({});
  }, [isAuthed, isAdmin, seenStorageKey]);

  const getSeenMap = () => {
    try {
      const raw = localStorage.getItem(seenStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const setSeenMap = (map) => {
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(map || {}));
    } catch {}
  };

  const getMessageKey = (msg) => String(msg?.id || msg?.timestamp || msg?.createdAt || msg?.sentAt || msg?.time || "");

  const getMessageSender = (msg) =>
    String(msg?.sender?.username || msg?.sender || msg?.senderUsername || "").trim().toLowerCase();

  const loadMessageAlerts = async () => {
    if (!isAuthed || isAdmin) {
      setUnreadMessageRooms({});
      return;
    }
    if (pathname === "/chat") {
      setUnreadMessageRooms({});
      return;
    }
    if (messagePollBusyRef.current) return;
    messagePollBusyRef.current = true;
    try {
      const roomsRes = await api.get("/chatrooms");
      const rooms = Array.isArray(roomsRes.data)
        ? roomsRes.data
        : Array.isArray(roomsRes.data?.content)
        ? roomsRes.data.content
        : [];
      const seenMap = getSeenMap();
      let seenMapChanged = false;
      const me = String(username || user?.username || "").trim().toLowerCase();

      const results = await Promise.all(
        rooms.map(async (room) => {
          const roomId = Number(room?.id || 0);
          if (!roomId) return null;
          try {
            const res = await api.get(`/messages/chatroom/${roomId}`);
            const data = res.data?.content ?? res.data;
            const list = Array.isArray(data) ? data : [];
            if (!list.length) return null;
            const last = list[list.length - 1];
            const key = getMessageKey(last);
            if (!key) return null;
            const roomKey = String(roomId);
            const prevSeen = String(seenMap[roomKey] || "");

            // First baseline outside chat: do not notify for old messages.
            if (!prevSeen) {
              seenMap[roomKey] = key;
              seenMapChanged = true;
              return null;
            }

            if (prevSeen === key) return null;

            // Own messages should not trigger bell; advance baseline.
            if (getMessageSender(last) === me) {
              seenMap[roomKey] = key;
              seenMapChanged = true;
              return null;
            }
            return { roomId, key };
          } catch {
            return null;
          }
        })
      );

      const unread = {};
      for (const row of results) {
        if (!row) continue;
        unread[String(row.roomId)] = row.key;
      }
      if (seenMapChanged) setSeenMap(seenMap);
      setUnreadMessageRooms(unread);
    } catch {
      setUnreadMessageRooms({});
    } finally {
      messagePollBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAuthed || isAdmin) {
      setUnreadMessageRooms({});
      return;
    }
    if (pathname === "/chat") {
      setUnreadMessageRooms({});
      return;
    }
    loadMessageAlerts();
    const interval = setInterval(loadMessageAlerts, 3000);
    return () => clearInterval(interval);
  }, [isAuthed, isAdmin, pathname, seenStorageKey]);

  const handleInviteAction = async (invite, action) => {
    const id = invite?.id;
    if (!id) return;
    setInviteActionId(id);
    try {
      const data = action === "accept" ? await acceptChatInvite(id) : await declineChatInvite(id);
      if (action === "accept") {
        const roomId = Number(data?.chatRoomId || data?.chatRoom?.id || 0);
        if (!roomId) {
          toast.error("Invite accept response missing chatRoomId.");
          return;
        }
        try {
          sessionStorage.setItem("cv_open_room_id", String(roomId));
          const inviter = invite?.inviterUsername || invite?.inviter?.username || invite?.fromUsername || "";
          if (inviter) {
            sessionStorage.setItem("cv_invited_by", String(inviter));
            sessionStorage.setItem("cv_invited_room_id", String(roomId));
          }
        } catch {}
        toast.success("Invitation accepted");
        navigate("/chat");
      } else {
        toast.success("Invitation declined");
      }
      await loadInvites();
      setInviteOpen(action === "accept" ? false : inviteOpen);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to update invitation");
    } finally {
      setInviteActionId(null);
    }
  };

  const pendingCount = invites.length;

  return (
    <header className="sticky top-0 z-50 cv-nav">
      <div className="cv-nav__inner">
        <Link to="/" className="cv-nav__brand" aria-label="ConfessionVerse Home">
          <span className="cv-nav__logo-text">ConfessionVerse</span>
        </Link>

        <nav className="cv-nav__links" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`cv-nav__link ${pathname === link.to ? "is-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <Link to={isAuthed ? "/confessions/new" : "/login"} className="cv-nav__cta">
            Post a Confession
          </Link>
        </nav>

        <div className="cv-nav__actions" ref={menuRef}>
          {isAuthed && !isAdmin && (
            <button
              type="button"
              className="cv-nav__bell"
              onClick={() => setInviteOpen((prev) => !prev)}
              aria-expanded={inviteOpen}
              aria-haspopup="menu"
              title="Chat invitations"
            >
              <Bell size={16} />
              {pendingCount > 0 && <span className="cv-nav__bell-badge">{pendingCount}</span>}
            </button>
          )}
          <div
            className="cv-nav__menu-wrap"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="cv-nav__menu-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              Menu
            </button>

            <div
              className={`cv-nav__dropdown ${menuOpen ? "is-open" : ""}`}
              role="menu"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleCloseMenu}
            >
              {isAuthed && (
                <Link
                  to={isAdmin ? "/admin" : "/profile"}
                  className="cv-nav__dropdown-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="cv-nav__user">
                    <UserAvatar user={user || { username }} size="sm" />
                    <span>{isAdmin ? "Admin" : username || "Profile"}</span>
                  </span>
                </Link>
              )}
              <Link to="/reports" className="cv-nav__dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                Reports
              </Link>
              <Link to="/categories" className="cv-nav__dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                Categories
              </Link>
              <Link to="/about" className="cv-nav__dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                About
              </Link>
              {isAdmin && (
                <Link to="/admin" className="cv-nav__dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Admin dashboard
                </Link>
              )}
              {isAuthed ? (
                <button
                  type="button"
                  className="cv-nav__dropdown-item is-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  role="menuitem"
                >
                  Sign out
                </button>
              ) : (
                <Link to="/login" className="cv-nav__dropdown-item is-danger" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {isAuthed && !isAdmin && (
            <div className={`cv-nav__invites ${inviteOpen ? "is-open" : ""}`} role="menu">
              <div className="cv-nav__invites-title">Invitations</div>
              {invitesApiBroken && (
                <div className="cv-nav__invites-empty">Invites service unavailable right now.</div>
              )}
              {invitesLoading && <div className="cv-nav__invites-empty">Loading...</div>}
              {!invitesLoading && !invitesApiBroken && invites.length === 0 && (
                <div className="cv-nav__invites-empty">No pending invites.</div>
              )}
              {!invitesLoading &&
                invites.map((inv) => {
                  const inviter = inv?.inviterUsername || inv?.inviter?.username || inv?.fromUsername || "User";
                  const busy = inviteActionId === inv?.id;
                  return (
                    <div key={inv?.id || inviter} className="cv-nav__invite-item">
                      <div className="cv-nav__invite-text">
                        <strong>{inviter}</strong> invited you to a room
                      </div>
                      <div className="cv-nav__invite-actions">
                        <button
                          type="button"
                          className="cv-nav__invite-btn is-accept"
                          disabled={busy}
                          onClick={() => handleInviteAction(inv, "accept")}
                        >
                          {busy ? "..." : "Accept"}
                        </button>
                        <button
                          type="button"
                          className="cv-nav__invite-btn is-decline"
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
    </header>
  );
}
