import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import { getStoredUserId } from "../services/tokenService.js";
import StatsGrid from "../components/StatsGrid.jsx";

export default function BoostsPage() {
  const [boosts, setBoosts] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ confessionId: "", boostType: "SPOTLIGHT" });

  const loadBoosts = async () => {
    setLoading(true);
    setError("");
    try {
      const [boostRes, confessionRes] = await Promise.allSettled([
        api.get("/boosts"),
        api.get("/confessions"),
      ]);

      if (boostRes.status === "fulfilled") {
        setBoosts(Array.isArray(boostRes.value.data) ? boostRes.value.data : []);
      } else {
        setBoosts([]);
        setError("Unable to load boosts.");
      }

      if (confessionRes.status === "fulfilled") {
        setConfessions(Array.isArray(confessionRes.value.data) ? confessionRes.value.data : []);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load boosts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoosts();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Active boosts", value: boosts.length },
      { label: "My confessions", value: confessions.length },
      { label: "Boost types", value: "Spotlight, Pulse, Echo" },
    ],
    [boosts.length, confessions.length]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.confessionId) return;
    const userId = getStoredUserId();
    if (!userId) {
      toast.error("Please sign in to create a boost.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/boosts", {
        confessionId: Number(form.confessionId),
        userId,
        boostType: form.boostType,
      });
      toast.success("Boost activated");
      setForm({ confessionId: "", boostType: "SPOTLIGHT" });
      loadBoosts();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to create boost");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.delete(`/boosts/${id}`);
      toast.success("Boost cancelled");
      setBoosts((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Unable to cancel boost");
    }
  };

  return (
    <div className="page space-y-8">
      <header className="space-y-3">
        <h1 className="page-title">Boosts</h1>
        <p className="page-subtitle">Give your confessions extra visibility with elegant, time-based boosts.</p>
      </header>

      <StatsGrid stats={stats} />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card card-body space-y-4">
          <div>
            <h2 className="section-title">Create a boost</h2>
            <p className="text-sm text-slate-500">Choose one of your confessions and pick a boost type.</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block">
              <span className="label">Confession</span>
              <select
                className="input"
                value={form.confessionId}
                onChange={(e) => setForm({ ...form, confessionId: e.target.value })}
                required
              >
                <option value="">Select a confession</option>
                {confessions.map((confession) => (
                  <option key={confession.id} value={confession.id}>
                    {confession.content?.slice(0, 60) || "Confession"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Boost type</span>
              <select
                className="input"
                value={form.boostType}
                onChange={(e) => setForm({ ...form, boostType: e.target.value })}
              >
                <option value="SPOTLIGHT">Spotlight</option>
                <option value="PULSE">Pulse</option>
                <option value="ECHO">Echo</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Activating..." : "Activate boost"}
            </button>
          </form>
        </div>

        <div className="card card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Active boosts</h2>
              <p className="text-sm text-slate-500">Track your current visibility campaigns.</p>
            </div>
            <button className="btn btn-secondary" onClick={loadBoosts}>
              Refresh
            </button>
          </div>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 skeleton"></div>
              ))}
            </div>
          )}

          {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

          {!loading && !error && boosts.length === 0 && (
            <div className="text-sm text-slate-600">No boosts active yet.</div>
          )}

          {!loading && !error && boosts.length > 0 && (
            <div className="space-y-3">
              {boosts.map((boost) => (
                <div key={boost.id} className="card card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-500">Boost</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {boost.boostType || "Boost"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Confession #{boost.confessionId || "-"}
                      </div>
                    </div>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <span>{boost.date ? `Date: ${boost.date}` : ""}</span>
                    <button className="btn btn-danger" onClick={() => handleCancel(boost.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
