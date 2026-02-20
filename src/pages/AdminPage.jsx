import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import StatsGrid from "../components/StatsGrid.jsx";

export default function AdminPage() {
  const [usersCount, setUsersCount] = useState(0);
  const [subscriptionsCount, setSubscriptionsCount] = useState(0);
  const [confessionsCount, setConfessionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAdminOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, subscriptionsRes] = await Promise.all([
        api.get("/users"),
        api.get("/subscriptions"),
      ]);
      const confessionsRes = await api.get("/confessions");
      const users = Array.isArray(usersRes.data) ? usersRes.data : [];
      const subscriptions = Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [];
      const confessions = Array.isArray(confessionsRes.data) ? confessionsRes.data : [];
      setUsersCount(users.length);
      setSubscriptionsCount(subscriptions.length);
      setConfessionsCount(confessions.length);
    } catch (err) {
      console.error(err);
      setError("Unable to load admin overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminOverview();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Users", value: usersCount },
      { label: "Confessions", value: confessionsCount },
      { label: "Subscriptions", value: subscriptionsCount },
      { label: "Access", value: "ADMIN" },
    ],
    [usersCount, confessionsCount, subscriptionsCount]
  );

  return (
    <div className="page admin-page space-y-5">
      <header className="admin-hero space-y-3">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage users, subscriptions, and moderation tools from one place.</p>

        <div className="admin-actions-grid">
          <Link to="/admin/users" className="admin-action-tile">
            <div className="admin-action-tile__title">Users</div>
            <div className="admin-action-tile__desc">Roles, premium, account records</div>
          </Link>
          <Link to="/admin/confessions" className="admin-action-tile">
            <div className="admin-action-tile__title">Confessions</div>
            <div className="admin-action-tile__desc">Review and remove problematic content</div>
          </Link>
          <Link to="/admin/reports" className="admin-action-tile">
            <div className="admin-action-tile__title">Reports</div>
            <div className="admin-action-tile__desc">Moderation queue and user notifications</div>
          </Link>
          <Link to="/admin/subscriptions" className="admin-action-tile">
            <div className="admin-action-tile__title">Subscriptions</div>
            <div className="admin-action-tile__desc">Plans, dates, and active records</div>
          </Link>
        </div>
      </header>

      <StatsGrid
        stats={stats}
        className="admin-grid-compact md:grid-cols-4"
        itemClassName="admin-metric"
        labelClassName="admin-metric-label"
        valueClassName="admin-metric-value"
      />

      <section className="card card-body admin-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">System status</h2>
          <button className="btn btn-secondary admin-btn" onClick={loadAdminOverview}>
            Refresh
          </button>
        </div>
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 skeleton"></div>
            ))}
          </div>
        )}
        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}
        {!loading && !error && (
          <div className="text-sm text-slate-500">
            Admin overview is online. Use the sections above to manage platform data.
          </div>
        )}
      </section>
    </div>
  );
}
