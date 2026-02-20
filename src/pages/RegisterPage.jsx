import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthed } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed) navigate("/");
  }, [isAuthed, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { username, email, password });
      const { token: t, accessToken, jwt, username: u, user } = res.data || {};
      const token = t || accessToken || jwt;
      const uname = u || user?.username || username;
      if (token) login({ token, username: uname, user: user || { username: uname, email } });
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Registration failed. The email may already be used.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page register-luxe-page">
      <section className="register-luxe">
        <div className="register-luxe__left">
          <h1 className="register-luxe__title">Join ConfessionVerse</h1>
          <div className="register-luxe__rule" />
          <p className="register-luxe__subtitle">A safer place to be honest.</p>
          <ul className="register-luxe__list">
            <li>Anonymous by design</li>
            <li>Moderated conversations</li>
            <li>AI-assisted clarity</li>
          </ul>
        </div>

        <div className="register-luxe__right">
          <div className="register-luxe__card">
            <h2 className="register-luxe__card-title">Create your account</h2>
            <p className="register-luxe__card-subtitle">Join the private conversation.</p>

            <form onSubmit={handleSubmit} className="register-luxe__form" autoComplete="off">
              <label className="register-luxe__label">
                <span>Username</span>
                <input
                  type="text"
                  name="register_username"
                  autoComplete="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose your username"
                  className="input register-luxe__input"
                  required
                />
              </label>
              <label className="register-luxe__label">
                <span>Email address</span>
                <input
                  type="email"
                  name="register_email"
                  autoComplete="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Type your email"
                  className="input register-luxe__input"
                  required
                />
              </label>
              <label className="register-luxe__label">
                <span>Password</span>
                <div className="register-luxe__password">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="register_password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Type your password"
                    className="input register-luxe__input register-luxe__input--password"
                    required
                  />
                  <button
                    type="button"
                    className="register-luxe__toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {error && <div className="register-luxe__error">{error}</div>}
              <button type="submit" className="register-luxe__btn" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </button>
            </form>

            <p className="register-luxe__signin">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
