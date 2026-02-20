import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { createBillingSession, getMySubscription } from "../services/BillingService.jsx";
import {
  AVATAR_OPTIONS,
  getAvatarIdForUser,
  getAvatarOptionById,
  setAvatarIdForUser,
} from "../services/avatarService.js";
import { getStreakInfo } from "../services/streakService.js";

export default function ProfilePage() {
  const { refreshMe } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const loadProfile = async () => {
    setError("");
    setLoading(true);
    try {
      const [meRes, subRes] = await Promise.allSettled([api.get("/users/me"), getMySubscription()]);
      if (meRes.status === "fulfilled") {
        const me = meRes.value.data;
        setUser(me);
        setAvatarId(getAvatarIdForUser(me));

        const subValue = subRes.status === "fulfilled" ? subRes.value || null : null;
        const subStatus = String(subValue?.status || "").toLowerCase();
        const nextIsPro =
          subStatus === "active" ||
          subStatus === "trialing" ||
          !!me?.premium ||
          String(subValue?.planType || "").toUpperCase() === "PRO";
        const streak = getStreakInfo(me, nextIsPro);
        setStreakDays(Number(streak?.streak || 0));
      } else {
        throw meRes.reason;
      }

      if (subRes.status === "fulfilled") {
        setSubscription(subRes.value || null);
      } else {
        setSubscription(null);
      }
    } catch (e) {
      console.error("Profile load error:", e);
      if (e?.response?.status === 401) {
        try {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        } catch {}
      } else {
        setError(e?.response?.data?.error || "Unable to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const isPro = (() => {
    const status = String(subscription?.status || "").toLowerCase();
    if (status === "active" || status === "trialing") return true;
    return !!user?.premium || String(subscription?.planType || "").toUpperCase() === "PRO";
  })();

  const handleOpenBilling = async (mode = "checkout") => {
    setBillingLoading(true);
    try {
      const preferredCurrency = String(localStorage.getItem("cv_billing_currency") || "usd").toLowerCase();
      const data = await createBillingSession(mode === "checkout" ? preferredCurrency : undefined);
      const target = mode === "portal" ? data?.customerPortalUrl : data?.checkoutUrl;
      if (!target) throw new Error("Billing link is unavailable");
      window.location.href = target;
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Billing unavailable (401). Verify backend auth/Stripe config."
          : e?.response?.data?.error || e?.message || "Unable to open billing";
      toast.error(msg);
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const changePassword = async (currentPassword, newPassword) => {
    const attempts = [
      { path: "/users/me/password", body: { currentPassword, newPassword } },
      { path: "/users/password", body: { currentPassword, newPassword } },
      { path: "/auth/change-password", body: { currentPassword, newPassword } },
      { path: "/auth/password/change", body: { currentPassword, newPassword } },
      { path: "/users/me", body: { currentPassword, newPassword } },
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        await api.put(attempt.path, attempt.body);
        return;
      } catch (e) {
        lastError = e;
        const status = e?.response?.status;
        if (status && status >= 500) break;
      }
    }

    throw lastError || new Error("Unable to change password");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please complete all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must have at least 8 characters");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated");
      refreshMe?.();
    } catch (e) {
      console.error("Password update error:", e);
      if (e?.response?.status === 401) {
        try {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        } catch {}
      } else {
        const msg = e?.response?.data?.error || "Unable to update password";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarSelect = (nextAvatarId) => {
    if (!user) return;
    setAvatarId(nextAvatarId);
    setAvatarIdForUser(user, nextAvatarId);
    setAvatarPickerOpen(false);
    try {
      window.dispatchEvent(new Event("avatar:changed"));
    } catch {}
    toast.success(`Avatar changed to ${getAvatarOptionById(nextAvatarId).label}`);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card card-body space-y-4">
          <div className="h-6 w-40 skeleton"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card card-body space-y-3">
                <div className="h-3 w-20 skeleton"></div>
                <div className="h-5 w-24 skeleton"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <section className="profile-luxe">
        <div className="profile-luxe__top">
          <div className="profile-luxe__tabs">
            <span className="is-active">Profile</span>
            <span>Security</span>
            <span>Membership</span>
          </div>
          <button
            type="button"
            className="profile-luxe__upgrade"
            onClick={() => handleOpenBilling(isPro ? "portal" : "checkout")}
            disabled={billingLoading}
          >
            {billingLoading ? "Opening..." : isPro ? "Manage subscription" : "Upgrade to Premium"}
          </button>
        </div>

        {error && <div className="card card-body text-rose-600">{error}</div>}

        <div className="profile-luxe__body">
          <aside className="profile-luxe__side">
            <div className="profile-avatar-picker">
              <button
                type="button"
                className="profile-avatar-trigger"
                onClick={() => setAvatarPickerOpen((prev) => !prev)}
                aria-expanded={avatarPickerOpen}
                aria-haspopup="dialog"
                title="Change avatar"
              >
                <span className="profile-luxe__emoji-ring">
                  <UserAvatar user={user} size="xl" className="profile-luxe__emoji" />
                </span>
              </button>
              {avatarPickerOpen && (
                <div className="profile-avatar-popover" role="dialog" aria-label="Choose avatar">
                  <div className="profile-avatar-popover__title">Choose avatar</div>
                  <div className="avatar-grid">
                    {AVATAR_OPTIONS.map((option) => {
                      const selected = option.id === avatarId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`avatar-option ${selected ? "is-selected" : ""}`}
                          onClick={() => handleAvatarSelect(option.id)}
                          aria-pressed={selected}
                          title={option.label}
                        >
                          <span className="avatar-option__icon">{option.icon}</span>
                          <span className="avatar-option__label">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-luxe__side-name">{user?.username || "User"}</div>
            <div className="profile-luxe__side-email">{user?.email || "No email"}</div>
            <div className="profile-luxe__side-badge">{isPro ? "Premium Member" : "Standard Member"}</div>
            <Link to="/subscriptions" className="profile-luxe__side-link">
              View Premium Details
            </Link>
          </aside>

          <main className="profile-luxe__main">
            <div className="profile-luxe__identity">
              <h1>{user?.username || "User"}</h1>
              <p>{user?.email || "No email"}</p>
              <span>{`\u{1F525} ${streakDays} day streak`}</span>
            </div>

            <div className="profile-luxe__content-grid">
              <section className="profile-luxe__account">
                <h2>Account</h2>
                <p>Plan: <strong>{isPro ? "PRO" : "FREE"}</strong></p>
                <p>Status: <strong>{subscription?.status || "free"}</strong></p>
                <p>Period end: <strong>{formatDateTime(subscription?.currentPeriodEnd || subscription?.endDate)}</strong></p>
                <p>Last payment: <strong>{formatDateTime(subscription?.lastPaymentAt)}</strong></p>
              </section>

              <section className="profile-luxe__security">
                <h2>Security</h2>
                <form onSubmit={handlePasswordChange} className="grid gap-4">
                  <label className="block">
                    <span className="label">Current password</span>
                    <div className="password-field">
                      <input
                        className="input"
                        type={showPasswords ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Current password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords((prev) => !prev)}
                        aria-label={showPasswords ? "Hide password fields" : "Show password fields"}
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">New password</span>
                    <div className="password-field">
                      <input
                        className="input"
                        type={showPasswords ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="New password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords((prev) => !prev)}
                        aria-label={showPasswords ? "Hide password fields" : "Show password fields"}
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">Confirm new password</span>
                    <div className="password-field">
                      <input
                        className="input"
                        type={showPasswords ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords((prev) => !prev)}
                        aria-label={showPasswords ? "Hide password fields" : "Show password fields"}
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                    {savingPassword ? "Updating..." : "Update password"}
                  </button>
                </form>
              </section>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
