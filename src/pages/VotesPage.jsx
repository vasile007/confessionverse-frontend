import React, { useEffect, useMemo } from "react";
import usePublicConfessions from "../hooks/usePublicConfessions.js";
import useVotes from "../hooks/useVotes.js";
import { getDisplayAuthor, isAnonymousName } from "../utils/confessionAuthor.js";
import StatsGrid from "../components/StatsGrid.jsx";
import UserIdentity from "../components/UserIdentity.jsx";

export default function VotesPage() {
  const {
    confessions,
    loading,
    error,
    loadConfessions,
  } = usePublicConfessions();
  const {
    summaryMap,
    loadingVotes,
    voteError,
    loadVotes,
  } = useVotes();

  useEffect(() => {
    if (confessions.length) loadVotes(confessions);
  }, [confessions.length]);

  const leaderboard = useMemo(() => {
    const scoreByUser = new Map();

    confessions.forEach((confession) => {
      const author = getDisplayAuthor(confession);
      const summary = summaryMap.get(confession.id);
      const likes = Number(summary?.likeCount ?? confession.upvotes ?? confession.upvoteCount ?? 0);
      const dislikes = Number(summary?.dislikeCount ?? confession.downvotes ?? confession.downvoteCount ?? 0);
      const key = `${author}`.toLowerCase();

      const current = scoreByUser.get(key) || {
        key,
        username: author,
        likes: 0,
        dislikes: 0,
        totalVotes: 0,
      };

      current.likes += likes;
      current.dislikes += dislikes;
      current.totalVotes += likes + dislikes;
      scoreByUser.set(key, current);
    });

    return Array.from(scoreByUser.values())
      .sort((a, b) => b.likes - a.likes || b.totalVotes - a.totalVotes)
      .slice(0, 10);
  }, [confessions, summaryMap]);

  const stats = useMemo(() => {
    const totalLikes = leaderboard.reduce((acc, entry) => acc + entry.likes, 0);
    const totalDislikes = leaderboard.reduce((acc, entry) => acc + entry.dislikes, 0);

    return [
      { label: "Ranked users", value: leaderboard.length },
      { label: "Total likes", value: totalLikes },
      { label: "Total dislikes", value: totalDislikes },
    ];
  }, [leaderboard]);

  return (
    <div className="page space-y-8">
      <header className="space-y-3">
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">
          Community ranking based on public confession votes.
        </p>
      </header>

      <StatsGrid stats={stats} />

      <section className="card card-body space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Leaderboard</h2>
            <p className="text-sm text-slate-500">Top authors by total likes on public confessions.</p>
          </div>
          <button className="btn btn-secondary" onClick={loadConfessions}>
            Refresh leaderboard
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="card card-body text-rose-600">{error}</div>}

        {!loading && !error && leaderboard.length === 0 && (
          <div className="text-sm text-slate-500">No ranking data yet.</div>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <ol className="rating-page-list">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const medal =
                rank === 1 ? "\uD83C\uDFC6" : rank === 2 ? "\uD83E\uDD48" : rank === 3 ? "\uD83E\uDD49" : `#${rank}`;
              const medalClass = rank === 1 ? "is-gold" : rank === 2 ? "is-silver" : rank === 3 ? "is-bronze" : "";
              return (
                <li key={entry.key} className="rating-page-item">
                  <div className="rating-page-left">
                    <span className={`rating-page-medal ${medalClass}`}>{medal}</span>
                    <UserIdentity
                      username={entry.username}
                      to={!isAnonymousName(entry.username) ? `/u/${encodeURIComponent(entry.username)}` : ""}
                      size="sm"
                      textClassName="rating-page-name"
                    />
                  </div>
                  <span className="rating-page-votes">{entry.likes} likes</span>
                </li>
              );
            })}
          </ol>
        )}

        {loadingVotes && <div className="text-sm text-slate-500">Updating ranking...</div>}
        {!loadingVotes && voteError && <div className="text-sm text-rose-600">{voteError}</div>}
      </section>
    </div>
  );
}
