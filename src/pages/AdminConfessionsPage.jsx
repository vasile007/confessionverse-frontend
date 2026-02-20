import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { getDisplayAuthor } from "../utils/confessionAuthor.js";

export default function AdminConfessionsPage() {
  const [confessions, setConfessions] = useState([]);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadConfessions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/confessions");
      setConfessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load confessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfessions();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return confessions.filter((c) => {
      const matchesQuery =
        !q ||
        String(c.id || "").toLowerCase().includes(q) ||
        String(c.content || "").toLowerCase().includes(q) ||
        String(getDisplayAuthor(c) || "").toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (visibility === "ALL") return true;
      const isPublic = Boolean(c.isPublic ?? c.public ?? true);
      return visibility === "PUBLIC" ? isPublic : !isPublic;
    });
  }, [confessions, search, visibility]);

  const handleDelete = async (confession) => {
    if (!confession?.id) return;
    const ok = window.confirm(`Delete confession #${confession.id}?`);
    if (!ok) return;

    setDeletingId(confession.id);
    try {
      const attempts = [
        () => api.delete(`/admin/confessions/${confession.id}`),
        () => api.delete(`/confessions/${confession.id}`),
        () => api.patch(`/confessions/${confession.id}`, { isPublic: false }),
      ];

      let deleted = false;
      let lastError = null;
      for (const run of attempts) {
        try {
          await run();
          deleted = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!deleted) {
        throw lastError || new Error("Delete failed");
      }

      setConfessions((prev) => prev.filter((c) => c.id !== confession.id));
      toast.success("Confession deleted");
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "");
      toast.error(serverMsg || "Unable to delete confession");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page admin-page space-y-5">
      <header className="admin-hero space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Admin Confessions</h1>
          <Link to="/admin" className="btn btn-secondary admin-btn">
            Return to admin
          </Link>
        </div>
        <p className="page-subtitle">Moderate content, find entries fast, and remove unwanted confessions.</p>
      </header>

      <section className="card card-body admin-card space-y-3">
        <div className="admin-toolbar flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Moderation queue</h2>
            <p className="text-sm text-slate-500">Search by user, content, or confession ID.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input w-72"
              placeholder="Search confessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <button className="btn btn-secondary admin-btn" onClick={loadConfessions}>
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-sm text-slate-600">No confessions match your filters.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="admin-table">
              <thead>
                <tr className="bg-black/20">
                  <th>ID</th>
                  <th>Author</th>
                  <th>Content</th>
                  <th>Visibility</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const author = getDisplayAuthor(c) || "Unknown";
                  const isPublic = Boolean(c.isPublic ?? c.public ?? true);
                  return (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td className="font-semibold text-slate-100">{author}</td>
                      <td className="max-w-[460px]">
                        <div className="truncate" title={c.content || "-"}>
                          {c.content || "-"}
                        </div>
                      </td>
                      <td>
                        <span className={isPublic ? "badge badge-success" : "badge badge-neutral"}>
                          {isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{c.createdAt || c.timestamp || "Unknown date"}</td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            className="btn btn-danger admin-btn"
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
