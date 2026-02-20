import React, { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import usePublicConfessions from "../hooks/usePublicConfessions.js";

export default function ReportsPage() {
  const {
    confessions,
    loading,
    error,
    loadConfessions,
  } = usePublicConfessions();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ confessionId: "", reason: "", description: "", severity: "MEDIUM" });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.confessionId || !form.reason.trim()) return;
    setCreating(true);
    try {
      await api.post(`/reports/${form.confessionId}`, {
        confessionId: Number(form.confessionId),
        reason: form.reason,
        description: form.description,
        severity: form.severity,
      });
      toast.success("Report submitted");
      setForm({ confessionId: "", reason: "", description: "", severity: "MEDIUM" });
      loadConfessions();
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        toast.error(err?.response?.data?.error || "Already reported.");
        return;
      }
      toast.error(err?.response?.data?.error || "Unable to submit report");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page space-y-5">
      <header className="space-y-3">
        <h1 className="page-title report-page-title">Report content</h1>
        <p className="page-subtitle">Help us keep ConfessionVerse safe by reporting harmful or abusive content.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card card-body space-y-3">
          <div>
            <h2 className="section-title create-report-title">Create report</h2>
            <p className="text-sm text-slate-500">Report a confession that needs review.</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block">
              <span className="label">Confession</span>
              <select
                className="input"
                value={form.confessionId}
                onChange={(e) => setForm({ ...form, confessionId: e.target.value })}
                required
              >
                <option value="">{loading ? "Loading..." : "Select confession"}</option>
                {confessions.map((confession) => (
                  <option key={confession.id} value={confession.id}>
                    {confession.content?.slice(0, 60) || "Confession"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Reason</span>
              <input
                className="input"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Short reason"
                required
              />
            </label>
            <label className="block">
              <span className="label">Details</span>
              <textarea
                className="input min-h-[120px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue..."
              />
            </label>
            <label className="block">
              <span className="label">Severity</span>
              <select
                className="input"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <span className="helper-text">Higher severity helps moderation prioritize.</span>
            </label>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Submitting..." : "Submit report"}
            </button>
          </form>
          {error && <div className="text-sm text-rose-600">{error}</div>}
        </div>

        <div className="card card-body space-y-3">
          <div>
            <h2 className="section-title">What happens next</h2>
            <p className="text-sm text-slate-500">
              Reports are reviewed by our moderation team. If the content violates the rules, it will be removed.
            </p>
          </div>
          <ul className="text-sm text-slate-500 list-disc pl-5">
            <li>We prioritize high severity reports.</li>
            <li>Repeat offenders may be suspended.</li>
            <li>Your identity remains anonymous.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
