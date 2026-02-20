import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { forgotPassword } from "../services/AuthService.jsx";

export default function ForgotPasswordPage() {
  const RESEND_SECONDS = 5 * 60;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000));
  const cooldownDone = remainingSeconds <= 0;
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      setResendEmail(email);
      setCooldownUntil(Date.now() + RESEND_SECONDS * 1000);
      toast.success("Reset email request sent");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Unable to process request";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setError("");
    setResending(true);
    try {
      await forgotPassword(resendEmail);
      setCooldownUntil(Date.now() + RESEND_SECONDS * 1000);
      toast.success("Reset email sent again");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Unable to resend reset email";
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page forgot-luxe-page">
      <section className="forgot-luxe">
        <div className="forgot-luxe__left">
          <h1 className="forgot-luxe__title">Password reset</h1>
          <div className="forgot-luxe__rule" />
          <div className="forgot-luxe__steps">
            <div className="forgot-luxe__step">
              <span className="forgot-luxe__step-no">1</span>
              <span className="forgot-luxe__step-text">Email</span>
            </div>
            <div className="forgot-luxe__step">
              <span className="forgot-luxe__step-no">2</span>
              <span className="forgot-luxe__step-text">Link</span>
            </div>
            <div className="forgot-luxe__step">
              <span className="forgot-luxe__step-no">3</span>
              <span className="forgot-luxe__step-text">New password</span>
            </div>
          </div>
        </div>

        <div className="forgot-luxe__right">
          <div className="forgot-luxe__card">
            <h2 className="forgot-luxe__card-title">Forgot your password?</h2>
            <p className="forgot-luxe__card-subtitle">Enter your email below and we&apos;ll send a secure reset link.</p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="forgot-luxe__form">
                <label className="forgot-luxe__label">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="forgot-luxe__input"
                    required
                  />
                </label>
                {error && <div className="forgot-luxe__error">{error}</div>}
                <button type="submit" className="forgot-luxe__btn" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            ) : (
              <div className="forgot-luxe__sent">
                {error && <div className="forgot-luxe__error">{error}</div>}
                <p>Reset email sent successfully.</p>
                <p>Check your inbox and spam folder, then open the reset link.</p>
                <div className="forgot-luxe__retry">
                  {!cooldownDone ? (
                    <p className="forgot-luxe__retry-wait">Didn&apos;t receive it? You can resend in {mm}:{ss}</p>
                  ) : (
                    <p className="forgot-luxe__retry-wait">Didn&apos;t receive it after 5 minutes? Enter email and resend.</p>
                  )}
                  <form onSubmit={handleResend} className="forgot-luxe__resend-form">
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="forgot-luxe__input"
                      required
                    />
                    <button type="submit" className="forgot-luxe__btn forgot-luxe__btn--ghost" disabled={!cooldownDone || resending}>
                      {resending ? "Resending..." : "Resend reset link"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <p className="forgot-luxe__signin">
              Remembered your password?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
