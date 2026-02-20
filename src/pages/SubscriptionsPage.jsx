import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import StatsGrid from "../components/StatsGrid.jsx";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/subscriptions");
      setSubscriptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const stats = useMemo(() => {
    const plans = new Set(subscriptions.map((s) => s.planType).filter(Boolean)).size;
    return [
      { label: "Total subscriptions", value: subscriptions.length },
      { label: "Plans", value: plans || "-" },
      { label: "Admin", value: "Read only" },
    ];
  }, [subscriptions]);

  return (
    <div className="page admin-page space-y-5">
      <header className="admin-hero space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Subscriptions</h1>
          <Link to="/admin" className="btn btn-secondary admin-btn">
            Return to admin
          </Link>
        </div>
        <p className="page-subtitle">Admin view of subscriptions, plans, and renewal dates.</p>
      </header>

      <StatsGrid
        stats={stats}
        className="admin-grid-compact md:grid-cols-3"
        itemClassName="admin-metric"
        labelClassName="admin-metric-label"
        valueClassName="admin-metric-value"
      />

      <section className="card card-body admin-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Subscription list</h2>
            <p className="text-sm text-slate-500">Review plan type and dates.</p>
          </div>
          <button className="btn btn-secondary admin-btn" onClick={loadSubscriptions}>
            Refresh
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

        {!loading && !error && subscriptions.length === 0 && (
          <div className="text-sm text-slate-600">No subscriptions found.</div>
        )}

        {!loading && !error && subscriptions.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="admin-table">
              <thead>
                <tr className="bg-black/20">
                  <th>ID</th>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period end</th>
                  <th>Last payment</th>
                  <th>Stripe customer</th>
                  <th>Stripe sub</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.id}</td>
                    <td>
                      <div className="font-semibold text-slate-100">{sub.username || sub.userId || "User"}</div>
                      <div className="text-xs text-slate-400">{sub.email || "-"}</div>
                    </td>
                    <td>{sub.planType || "-"}</td>
                    <td>{sub.status || "-"}</td>
                    <td>{formatDateTime(sub.currentPeriodEnd || sub.endDate)}</td>
                    <td>{formatDateTime(sub.lastPaymentAt)}</td>
                    <td>{sub.stripeCustomerIdShort || "-"}</td>
                    <td>{sub.stripeSubscriptionIdShort || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
