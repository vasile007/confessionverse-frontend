import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getMySubscription } from "../services/BillingService.jsx";

export default function BillingSuccessPage() {
  const [syncing, setSyncing] = useState(true);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const syncPlan = async () => {
      for (let i = 0; i < 8; i += 1) {
        try {
          const [subRes, meRes] = await Promise.all([getMySubscription(), api.get("/users/me")]);
          const sub = subRes || null;
          const me = meRes?.data || null;
          const status = String(sub?.status || "").toLowerCase();
          const pro =
            status === "active" ||
            status === "trialing" ||
            !!me?.premium ||
            String(sub?.planType || "").toUpperCase() === "PRO";
          if (pro) {
            if (!cancelled) {
              setSynced(true);
              setSyncing(false);
            }
            return;
          }
        } catch {}
        await wait(1500);
      }
      if (!cancelled) setSyncing(false);
    };

    syncPlan();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="card card-body space-y-4">
        <h1 className="page-title">Payment successful</h1>
        <p className="page-subtitle">
          {syncing
            ? "Your subscription is syncing..."
            : synced
            ? "Subscription synced. You can access PRO features now."
            : "Payment done. Sync may take a little longer; refresh Profile/Chat in a moment."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/profile" className="btn btn-primary">
            Go to profile
          </Link>
          <Link to="/chat" className="btn btn-secondary">
            Continue to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
