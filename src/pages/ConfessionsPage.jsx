import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import usePublicConfessions from "../hooks/usePublicConfessions.js";
import useVotes from "../hooks/useVotes.js";
import { getDisplayAuthor, isAnonymousName } from "../utils/confessionAuthor.js";
import UserIdentity from "../components/UserIdentity.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getStreakInfo, markStreakActivity } from "../services/streakService.js";

export default function ConfessionsPage() {
  const feedActionBtnStyle = {
    border: "1px solid rgba(246, 212, 158, 0.95)",
  };

  const { isAdmin, user } = useAuth();
  const { confessions: publicConfessions, loading: loadingPublic, error: errorPublic, loadConfessions: loadPublic } = usePublicConfessions();
  const { voteMap, summaryMap, loadingVotes, loadVotes } = useVotes();
  const streakInfo = useMemo(() => getStreakInfo(user), [user, publicConfessions.length]);

  useEffect(() => {
    if (publicConfessions.length) loadVotes(publicConfessions);
  }, [publicConfessions.length]);

  const feedItems = useMemo(() => {
    const sorted = [...publicConfessions].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || b.time || 0).getTime() -
        new Date(a.createdAt || a.timestamp || a.time || 0).getTime()
    );
    return sorted;
  }, [publicConfessions]);

  const leaderboardRows = useMemo(() => {
    const byUser = new Map();
    for (const confession of publicConfessions) {
      const author = getDisplayAuthor(confession);
      const key = String(author || "Anonymous").trim().toLowerCase();
      const summary = summaryMap.get(confession.id);
      const likes = Number(summary?.likeCount ?? confession.upvotes ?? confession.upvoteCount ?? 0);
      const dislikes = Number(summary?.dislikeCount ?? confession.downvotes ?? confession.downvoteCount ?? 0);
      const score = likes * 2 - dislikes;
      const prev = byUser.get(key) || { author, score: 0, confessions: 0 };
      prev.score += score;
      prev.confessions += 1;
      byUser.set(key, prev);
    }
    return [...byUser.values()]
      .sort((a, b) => b.score - a.score || b.confessions - a.confessions)
      .slice(0, 5);
  }, [publicConfessions, summaryMap]);

  const getLeaderboardMark = (index) => {
    if (index === 0) return "\u{1F947}";
    if (index === 1) return "\u{1F948}";
    if (index === 2) return "\u{1F949}";
    return "\u2022";
  };

  const handleVote = async (confessionId, value) => {
    if (isAdmin) {
      toast.error("Admin account cannot vote.");
      return;
    }
    const current = voteMap.get(confessionId) || 0;
    if (current === value) return;
    const isLike = value === 1;
    try {
      await api.post(`/votes/${confessionId}`, {
        voteType: isLike ? "LIKE" : "DISLIKE",
      });
      markStreakActivity(user);
      toast.success("Vote submitted");
      loadVotes(publicConfessions);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to submit vote");
    }
  };

  const renderConfessionCard = (confession) => {
    const author = getDisplayAuthor(confession);
    const userLink = !isAnonymousName(author) ? `/u/${encodeURIComponent(author)}` : "";
    const confessionUser = confession?.author || confession?.user || confession?.owner || null;
    const isProConfession =
      !!confession?.highlighted ||
      !!confession?.premiumHighlight ||
      !!confession?.isPremium ||
      !!confessionUser?.premium ||
      String(confessionUser?.planType || "").toUpperCase() === "PRO";
    const voteValue = voteMap.get(confession.id) || 0;
    const summary = summaryMap.get(confession.id);
    const upCount = summary?.likeCount ?? confession.upvotes ?? confession.upvoteCount ?? 0;
    const downCount = summary?.dislikeCount ?? confession.downvotes ?? confession.downvoteCount ?? 0;
    return (
      <div key={confession.id} className={`space-y-3 feed-confession-item ${isProConfession ? "confession-card--pro" : ""}`}>
        <p className="text-slate-100">{confession.content}</p>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <UserIdentity
            user={confessionUser}
            username={author}
            to={userLink}
            size="sm"
            textClassName="text-sm text-slate-300"
          />
        </div>

        <div className="confession-votes">
          <button
            className={voteValue === 1 ? "vote-btn vote-btn--active" : "vote-btn"}
            onClick={() => handleVote(confession.id, 1)}
            aria-label="Like"
            disabled={isAdmin}
            title={isAdmin ? "Admin account cannot vote" : "Like"}
          >
            {"\u2764\uFE0F"}
          </button>
          <button
            className={voteValue === -1 ? "vote-btn vote-btn--danger" : "vote-btn"}
            onClick={() => handleVote(confession.id, -1)}
            aria-label="Dislike"
            disabled={isAdmin}
            title={isAdmin ? "Admin account cannot vote" : "Dislike"}
          >
            {"\uD83D\uDC4E"}
          </button>
          <span className="text-xs text-slate-400">
            {upCount} up | {downCount} down
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="page feed-page space-y-6">
      <section className="card card-body space-y-5">
        <div className="feed-head">
          <div className="feed-head__copy">
            <h1 className="section-title feed-title">Feed</h1>
          </div>
        </div>

        <div className="feed-layout">
          <div className="feed-main">
            {loadingPublic && (
              <div className="grid gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card card-body space-y-3">
                    <div className="h-4 w-3/4 skeleton"></div>
                    <div className="h-3 w-1/2 skeleton"></div>
                  </div>
                ))}
              </div>
            )}

            {!loadingPublic && errorPublic && <div className="card card-body text-rose-600">{errorPublic}</div>}

            {!loadingPublic && !errorPublic && feedItems.length === 0 && (
              <div className="card card-body text-slate-600">No public confessions yet.</div>
            )}

            {!loadingPublic && !errorPublic && feedItems.length > 0 && (
              <div className="feed-confessions-stack">
                {feedItems.map((confession) => renderConfessionCard(confession))}
              </div>
            )}

            {loadingVotes && <div className="text-sm text-slate-500">Syncing your votes...</div>}
          </div>

          <aside className="feed-side" aria-label="Feed side panels">
            <div className="feed-streak-reminder">
              {`\uD83D\uDD25 ${streakInfo.streak} day streak \u00B7 Come back tomorrow to keep your streak.`}
            </div>

            <div className="feed-leaderboard" aria-label="Feed leaderboard">
              <div className="feed-leaderboard__title">Leaderboard</div>
              {leaderboardRows.length === 0 && (
                <div className="feed-leaderboard__empty">Not enough activity yet.</div>
              )}
              {leaderboardRows.length > 0 && (
                <ul className="feed-leaderboard__list">
                  {leaderboardRows.map((row, idx) => (
                    <li key={`${row.author}-${idx}`} className="feed-leaderboard__item">
                      <span className={`feed-leaderboard__rank ${idx < 3 ? "is-podium" : ""}`}>{getLeaderboardMark(idx)}</span>
                      <span className="feed-leaderboard__name">{row.author || "Anonymous"}</span>
                      <span className="feed-leaderboard__score">{row.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="feed-side__actions">
              <button className="btn btn-secondary feed-action-btn" onClick={loadPublic} style={feedActionBtnStyle}>
                Refresh feed
              </button>
              <Link to="/confessions/new" className="btn btn-primary feed-action-btn" style={feedActionBtnStyle}>
                Write confession
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
