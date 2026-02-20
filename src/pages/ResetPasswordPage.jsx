import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AuthSplitLayout from "../components/AuthSplitLayout.jsx";
import { resetPassword } from "../services/AuthService.jsx";

function useResetToken() {
  const { token: pathToken } = useParams();
  const { search } = useLocation();

  return useMemo(() => {
    if (pathToken) return pathToken;
    const params = new URLSearchParams(search);
    return params.get("token") || "";
  }, [pathToken, search]);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useResetToken();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      toast.success("Password updated");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Reset failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      primary={
        <>
          <h2 className="text-2xl font-semibold text-slate-900">Set a new password</h2>
          <p className="text-sm text-slate-500 mt-1">Choose a new password for your account.</p>

          {!token && (
            <div className="mt-4 text-sm text-rose-600">
              Invalid reset link. Please request a new one.
            </div>
          )}

          {success ? (
            <div className="mt-6 card card-soft card-body space-y-2">
              <div className="text-sm text-slate-200">Password was reset successfully.</div>
              <div className="text-xs text-slate-400">Redirecting you to sign in...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="label">New password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="input"
                    required
                    minLength={8}
                  />
                </div>
              </label>
              <label className="block">
                <span className="label">Confirm new password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {error && <div className="text-sm text-rose-600">{error}</div>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading || !token}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="divider my-6"></div>
          <p className="text-sm text-slate-500">
            Back to{" "}
            <Link to="/login" className="font-semibold text-sky-700 hover:underline">
              Sign in
            </Link>
          </p>
        </>
      }
      secondary={
        <>
          <span className="badge">Secure reset</span>
          <h1 className="page-title">Keep your account safe</h1>
          <p className="page-subtitle">
            Use a unique password that you do not use on other sites.
          </p>
          <div className="space-y-3">
            <div className="card card-body">
              <div className="text-sm text-slate-500">Tip</div>
              <div className="text-lg font-semibold text-slate-900">Use at least 8+ characters</div>
            </div>
            <div className="card card-body">
              <div className="text-sm text-slate-500">Tip</div>
              <div className="text-lg font-semibold text-slate-900">Mix letters, numbers, symbols</div>
            </div>
          </div>
        </>
      }
    />
  );
}
