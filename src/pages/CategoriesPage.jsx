import React, { useMemo } from "react";
import usePublicConfessions from "../hooks/usePublicConfessions.js";

export default function CategoriesPage() {
  const { confessions, loading, error } = usePublicConfessions();

  const categories = useMemo(() => {
    const buckets = [
      { key: "relationships", label: "Relationships", match: ["love", "ex", "relationship", "boyfriend", "girlfriend"] },
      { key: "family", label: "Family", match: ["family", "mom", "dad", "parent", "sister", "brother"] },
      { key: "work", label: "Work", match: ["work", "job", "boss", "office", "career"] },
      { key: "mental", label: "Mental Health", match: ["anxiety", "depression", "stress", "panic", "therapy"] },
    ];
    const counts = new Map(buckets.map((b) => [b.key, 0]));
    confessions.forEach((c) => {
      const text = String(c.content || "").toLowerCase();
      let matched = false;
      buckets.forEach((b) => {
        if (!matched && b.match.some((m) => text.includes(m))) {
          counts.set(b.key, (counts.get(b.key) || 0) + 1);
          matched = true;
        }
      });
      if (!matched) counts.set("other", (counts.get("other") || 0) + 1);
    });
    return [
      ...buckets.map((b) => ({ label: b.label, count: counts.get(b.key) || 0 })),
      { label: "Other", count: counts.get("other") || 0 },
    ];
  }, [confessions]);

  return (
    <div className="page space-y-8">
      <header className="space-y-3">
        <h1 className="page-title">Categories</h1>
        <p className="page-subtitle">Explore confessions grouped by theme.</p>
      </header>

      {loading && <div className="card card-body">Loading categories...</div>}
      {!loading && error && <div className="card card-body text-rose-600">{error}</div>}

      {!loading && !error && (
        <section className="grid gap-4 md:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.label} className="card card-body">
              <div className="text-sm text-slate-500">{cat.label}</div>
              <div className="text-2xl font-semibold text-slate-900">{cat.count}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
