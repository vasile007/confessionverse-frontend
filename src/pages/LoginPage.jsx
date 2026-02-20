import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-hot-toast";
import AuthSplitLayout from "../components/AuthSplitLayout.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthed, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed) navigate(isAdmin ? "/admin" : "/confessions");
  }, [isAuthed, isAdmin, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const envPaths = (import.meta?.env?.VITE_LOGIN_PATHS || "/auth/login,/auth/authenticate,/login")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const endpoints = envPaths.length ? envPaths : ["/auth/login", "/auth/authenticate", "/login"];
      const usernameKeys = (import.meta?.env?.VITE_LOGIN_USERNAME_FIELDS || "email,username,usernameOrEmail")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payloads = usernameKeys.map((k) => ({ [k]: email, password }));
      let ok = false;
      let welcomeName = "";
      let lastErr = null;
      for (const path of endpoints) {
        if (ok) break;
        for (const body of payloads) {
          try {
            const response = await api.post(path, body);
            const { token: t, accessToken, jwt, username, user } = response.data || {};
            let token = t || accessToken || jwt;
            if (!token) {
              const auth = response.headers?.authorization || response.headers?.Authorization;
              if (auth && String(auth).toLowerCase().startsWith("bearer ")) {
                token = auth.split(/\s+/)[1];
              }
            }
            if (!token) throw new Error("Token missing from response");
            const uname = username || user?.username || (email?.split("@")[0] || "");
            const me = await login({ token, username: uname, user: user || { username: uname, email } });
            welcomeName = String(me?.username || user?.username || uname || "").trim();
            const role = me?.role || user?.role || null;
            toast.success(welcomeName ? `Welcome, ${welcomeName}` : "Welcome");
            navigate(role === "ADMIN" ? "/admin" : "/confessions");
            ok = true;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
      }
      if (!ok) {
        throw lastErr || new Error("Authentication failed");
      }
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Server unreachable";
      setError(status ? `${status}: ${msg}` : msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      primaryClassName="login-luxe-hero card card-soft card-body space-y-6"
      secondaryClassName="login-luxe-panel card card-body"
      primary={
        <>
          <h1 className="text-3xl font-semibold text-slate-100">Welcome back</h1>
          <p className="text-sm text-slate-300">Sign in securely and continue your private experience.</p>
        </>
      }
      secondary={
        <>
          <span className="badge">Welcome back</span>
          <h2 className="text-2xl font-semibold text-slate-100">Sign in</h2>
          <p className="text-sm text-slate-400 mt-1">Use your email and password to continue.</p>

          <form onSubmit={handleLogin} className="login-luxe-form mt-6 space-y-4">
            <label className="block">
              <span className="label">Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle password-toggle--dark"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="divider my-6"></div>
          <div className="text-sm text-slate-400">
            <p className="mb-1">
              New here?{" "}
              <Link to="/register" className="font-semibold text-sky-700 hover:underline">
                Create an account
              </Link>
            </p>
            <Link to="/forgot-password" className="inline-block font-semibold text-sky-700 hover:underline">
              Forgot your password?
            </Link>
          </div>
        </>
      }
    />
  );
}



