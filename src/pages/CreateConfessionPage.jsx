import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { markStreakActivity } from "../services/streakService.js";

export default function CreateConfessionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post("/confessions", { content });
      markStreakActivity(user);
      toast.success("Confession posted");
      navigate("/confessions");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to post confession");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page space-y-8">
      <header className="space-y-3">
        <h1 className="page-title create-confession-title">Post a Confession</h1>
        <p className="page-subtitle">
          Share your story anonymously with the community. Keep it respectful and meaningful.
        </p>
      </header>

      <section className="card card-body space-y-4">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block">
            <span className="label">Your confession</span>
            <textarea
              className="input min-h-[180px]"
              placeholder="Write your confession..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Posting..." : "Post confession"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setContent("")}>
              Clear
            </button>
            <Link to="/confessions" className="btn btn-secondary">
              Back to public feed
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
