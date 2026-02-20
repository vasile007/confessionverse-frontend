import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createBillingSession } from "../services/BillingService.jsx";

export default function PremiumPage() {
  const [actionLoading, setActionLoading] = useState(false);
  const [currency, setCurrency] = useState(() => String(localStorage.getItem("cv_billing_currency") || "usd").toLowerCase());

  const priceLabel = {
    usd: "$1.59",
    gbp: "£1.29",
    ron: "7.90 RON",
  }[currency] || "$1.59";

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      localStorage.setItem("cv_billing_currency", currency);
      const data = await createBillingSession(currency);
      if (!data?.checkoutUrl) throw new Error("Checkout URL missing");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg =
        status === 401
          ? "Billing unavailable (401). Verify backend auth/Stripe config."
          : err?.response?.data?.error || err?.message || "Unable to open checkout";
      toast.error(msg);
      setActionLoading(false);
    }
  };

  return (
    <div className="page premium-page premium-luxe">
      <header className="premium-luxe__hero">
        <h1 className="premium-luxe__title">Premium</h1>
        <p className="premium-luxe__subtitle">Choose your plan: Free or Pro.</p>
      </header>

      <section className="premium-luxe__plan">
        <div>
          <h2 className="premium-luxe__plan-title">Pro plan</h2>
          <p className="premium-luxe__plan-price">{priceLabel} <span>/ month</span></p>
        </div>
        <div className="premium-luxe__currency">
          <label htmlFor="premium-currency">Currency</label>
          <select
            id="premium-currency"
            value={currency}
            onChange={(e) => setCurrency(String(e.target.value || "usd").toLowerCase())}
          >
            <option value="usd">USD</option>
            <option value="gbp">GBP</option>
            <option value="ron">RON</option>
          </select>
        </div>
      </section>

      <section className="premium-luxe__grid">
        <article className="premium-luxe__card premium-luxe__card--basic">
          <h2>Free plan</h2>
          <p>Great for getting started.</p>
          <ul>
            <li>General room</li>
            <li>Late Night room (time-based)</li>
            <li>AI: 3 uses per day</li>
            <li>Standard confession visibility</li>
          </ul>
        </article>

        <article className="premium-luxe__card premium-luxe__card--premium">
          <h2>Pro plan</h2>
          <p>Unlimited access.</p>
          <ul className="premium-luxe__checks">
            <li><span aria-hidden="true">&#10003;</span> Mesaje nelimitate</li>
            <li><span aria-hidden="true">&#10003;</span> Premium Room</li>
            <li><span aria-hidden="true">&#10003;</span> AI nelimitat</li>
            <li><span aria-hidden="true">&#10003;</span> Highlight confession</li>
            <li><span aria-hidden="true">&#10003;</span> Badge langa nume</li>
            <li><span aria-hidden="true">&#10003;</span> Fara rate limit</li>
          </ul>
          <button className="premium-luxe__cta" onClick={handleUpgrade} disabled={actionLoading}>
            {actionLoading ? "Opening..." : "Upgrade to Premium"}
          </button>
        </article>
      </section>

      <p className="premium-luxe__footnote">
        Plan status appears in <Link to="/profile">Profile</Link>. Boosts are separate from subscription plans.
      </p>
    </div>
  );
}
