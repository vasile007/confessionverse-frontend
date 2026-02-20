import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import StatsGrid from "../components/StatsGrid.jsx";
import UserIdentity from "../components/UserIdentity.jsx";
import { getDisplayAuthor } from "../utils/confessionAuthor.js";
import { createChatInvite, createChatroomWithFallback } from "../services/chatroomService.js";

const DISABLE_PREMIUM_GATES = String(import.meta?.env?.VITE_DISABLE_PREMIUM_GATES || "").toLowerCase() === "true";
const ROOM_OPTIONS = [
  { key: "STANDARD", label: "Standard Room" },
  { key: "QUIET", label: "Quiet Room" },
  { key: "LATE_NIGHT", label: "Late Night" },
  { key: "STORIES", label: "Stories" },
  { key: "HEARTBEAT", label: "Heartbeat" },
  { key: "TAROT_DREAMS", label: "Tarot & Dreams" },
];

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { username: usernameParam } = useParams();
  const { user: me } = useAuth();

  const username = decodeURIComponent(usernameParam || "").trim();
  const [profile, setProfile] = useState(null);
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const [inviteRoomType, setInviteRoomType] = useState("STANDARD");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!username) {
        setError("Invalid profile username.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const profileAttempts = [
        `/users/public/${encodeURIComponent(username)}`,
        `/users/profile/${encodeURIComponent(username)}`,
      ];

      let loadedProfile = null;
      for (const path of profileAttempts) {
        try {
          const res = await api.get(path);
          loadedProfile = res.data;
          break;
        } catch {}
      }

      try {
        const confessionAttempts = [
          `/confessions/public/by-user/${encodeURIComponent(username)}`,
          `/confessions/public`,
        ];

        let loadedConfessions = [];
        for (const path of confessionAttempts) {
          try {
            const res = await api.get(path);
            const data = Array.isArray(res.data) ? res.data : [];
            if (path.includes("/by-user/")) {
              loadedConfessions = data;
            } else {
              loadedConfessions = data.filter(
                (c) => String(getDisplayAuthor(c)).toLowerCase() === username.toLowerCase()
              );
            }
            if (loadedConfessions.length || path.includes("/by-user/")) break;
          } catch {}
        }

        if (!mounted) return;
        setConfessions(loadedConfessions);

        if (!loadedProfile) {
          loadedProfile = { username };
        }
        setProfile(loadedProfile);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.error || "Unable to load public profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [username]);

  const stats = useMemo(() => {
    const totalLikes = confessions.reduce((acc, c) => acc + Number(c.upvotes ?? c.upvoteCount ?? 0), 0);
    const totalDislikes = confessions.reduce((acc, c) => acc + Number(c.downvotes ?? c.downvoteCount ?? 0), 0);
    return [
      { label: "Public confessions", value: confessions.length },
      { label: "Total likes", value: totalLikes },
      { label: "Total dislikes", value: totalDislikes },
    ];
  }, [confessions]);

  const isMe = !!me?.username && me.username.toLowerCase() === username.toLowerCase();

  const handleStartChat = async () => {
    if (!username || isMe) return;
    setStartingChat(true);
    try {
      const roomsRes = await api.get("/chatrooms");
      const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : Array.isArray(roomsRes.data?.content) ? roomsRes.data.content : [];
      const targetRoom = rooms.find((room) => String(room?.roomType || "").toUpperCase() === inviteRoomType);

      if (targetRoom?.id) {
        await createChatInvite(targetRoom.id, username);
        sessionStorage.setItem("cv_open_room_id", String(targetRoom.id));
        const roomLabel = ROOM_OPTIONS.find((opt) => opt.key === inviteRoomType)?.label || inviteRoomType;
        toast.success(`Invite sent to ${roomLabel}`);
        navigate("/chat");
        return;
      }

      const room = await createChatroomWithFallback(username, inviteRoomType);
      try {
        const roomId = Number(room?.id || room?.chatRoomId || room?.chatRoom?.id || 0);
        if (roomId) sessionStorage.setItem("cv_open_room_id", String(roomId));
      } catch {}
      toast.success("Chat started");
      navigate("/chat");
    } catch (e) {
      console.error(e);
      const status = Number(e?.response?.status || 0);
      const code = String(e?.response?.data?.code || "").toUpperCase();
      const msg = e?.response?.data?.error || "Unable to start chat";
      if (status === 429 || code === "FREE_LIMIT_REACHED") {
        toast.error("Free chat limit reached. Upgrade to PRO to continue.");
        navigate("/subscriptions");
      } else if (code === "PREMIUM_ROOM_REQUIRED") {
        if (DISABLE_PREMIUM_GATES) {
          toast.error("Premium gate disabled in dev mode.");
        } else {
          toast.error("This room is available for PRO members only.");
          navigate("/subscriptions");
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="page space-y-8">
      <header className="space-y-3">
        <h1 className="page-title">Public Profile</h1>
        <p className="page-subtitle">Discover this member and interact directly.</p>
      </header>

      <section className="card card-body space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <UserIdentity username={profile?.username || username || "User"} size="lg" textClassName="text-xl font-semibold" />
          <div className="flex flex-wrap gap-2">
            {!isMe && (
              <>
                <select
                  className="input"
                  value={inviteRoomType}
                  onChange={(e) => setInviteRoomType(String(e.target.value || "STANDARD"))}
                  disabled={startingChat}
                >
                  {ROOM_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleStartChat} disabled={startingChat}>
                  {startingChat ? "Sending..." : "Invite to room"}
                </button>
              </>
            )}
            <Link to="/confessions" className="btn btn-secondary">
              Back to confessions
            </Link>
          </div>
        </div>
        {profile?.bio && <p className="text-sm text-slate-500">{profile.bio}</p>}
      </section>

      <StatsGrid stats={stats} />

      <section className="card card-body space-y-4">
        <div>
          <h2 className="section-title">Public confessions</h2>
          <p className="text-sm text-slate-500">Recent posts from this profile.</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

        {!loading && !error && confessions.length === 0 && (
          <div className="text-sm text-slate-600">No public confessions for this user.</div>
        )}

        {!loading && !error && confessions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {confessions.map((confession) => (
              <div key={confession.id} className="card card-body space-y-2">
                <p className="text-slate-900">{confession.content}</p>
                <div className="text-xs text-slate-500">
                  {Number(confession.upvotes ?? confession.upvoteCount ?? 0)} up |{" "}
                  {Number(confession.downvotes ?? confession.downvoteCount ?? 0)} down
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
