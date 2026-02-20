import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [subscriptionsByUser, setSubscriptionsByUser] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, subscriptionsRes] = await Promise.allSettled([
        api.get("/users"),
        api.get("/subscriptions"),
      ]);

      const usersData = usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
      setUsers(usersData);

      const subsData =
        subscriptionsRes.status === "fulfilled" && Array.isArray(subscriptionsRes.value.data)
          ? subscriptionsRes.value.data
          : [];

      const nextMap = {};
      for (const sub of subsData) {
        const userId = sub?.userId;
        if (userId == null) continue;
        const prev = nextMap[userId];
        if (!prev) {
          nextMap[userId] = sub;
          continue;
        }
        const prevTime = new Date(prev.updatedAt || prev.currentPeriodEnd || prev.startDate || 0).getTime() || 0;
        const currentTime = new Date(sub.updatedAt || sub.currentPeriodEnd || sub.startDate || 0).getTime() || 0;
        if (currentTime >= prevTime) nextMap[userId] = sub;
      }
      setSubscriptionsByUser(nextMap);
    } catch (err) {
      console.error(err);
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      [u.username, u.email, String(u.id)].some((val) => String(val || "").toLowerCase().includes(q))
    );
  }, [users, search]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id) return;
    const ok = window.confirm(`Delete user "${user.username || user.id}"?`);
    if (!ok) return;

    setUpdatingId(user.id);
    try {
      const attempts = [
        () => api.delete(`/admin/users/${user.id}`),
        () => api.delete(`/users/${user.id}`),
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

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted");
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "");
      toast.error(serverMsg || "Unable to delete user");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page admin-page space-y-5">
      <header className="admin-hero space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Users</h1>
          <Link to="/admin" className="btn btn-secondary admin-btn">
            Return to admin
          </Link>
        </div>
        <p className="page-subtitle">Admin view of the community. Stripe billing data is read-only here.</p>
      </header>

      <section className="card card-body admin-card space-y-3">
        <div className="admin-toolbar flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">User directory</h2>
            <p className="text-sm text-slate-500">Search by username, email, or ID.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="input w-64"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-secondary admin-btn" onClick={loadUsers}>
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-sm text-slate-600">No users found.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="admin-table">
              <thead>
                <tr className="bg-black/20">
                  <th>User</th>
                  <th>Email</th>
                  <th>Ref</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period end</th>
                  <th>Last payment</th>
                  <th>Stripe IDs</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const sub = subscriptionsByUser[user.id];
                  return (
                  <tr key={user.id} className="border-b border-white/10 last:border-b-0">
                    <td className="font-semibold text-slate-100">{user.username || "User"}</td>
                    <td>{user.email || "No email"}</td>
                    <td className="text-xs text-slate-400">
                      USR-{String(user.id || "").padStart(4, "0")}
                    </td>
                    <td>
                      <span className={String(sub?.planType || "").toUpperCase() === "PRO" || user.premium ? "badge badge-success" : "badge badge-neutral"}>
                        {String(sub?.planType || "").toUpperCase() || (user.premium ? "PRO" : "FREE")}
                      </span>
                    </td>
                    <td>{sub?.status || "-"}</td>
                    <td>{formatDateTime(sub?.currentPeriodEnd || sub?.endDate)}</td>
                    <td>{formatDateTime(sub?.lastPaymentAt)}</td>
                    <td className="text-xs">
                      <div>{sub?.stripeCustomerIdShort || "-"}</div>
                      <div>{sub?.stripeSubscriptionIdShort || "-"}</div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-danger admin-btn"
                          onClick={() => handleDeleteUser(user)}
                          disabled={updatingId === user.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
