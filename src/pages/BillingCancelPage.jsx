import React from "react";
import { Link } from "react-router-dom";

export default function BillingCancelPage() {
  return (
    <div className="page">
      <div className="card card-body space-y-4">
        <h1 className="page-title">Payment canceled</h1>
        <p className="page-subtitle">No changes were made. You can try again anytime from the Premium page.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/subscriptions" className="btn btn-primary">
            Back to premium
          </Link>
          <Link to="/profile" className="btn btn-secondary">
            Go to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
