import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { aiGeneralReply } from "../services/aiAssistService.js";
import { getAiQuotaState, tryConsumeAiUse } from "../services/aiQuotaService.js";
import { markStreakActivity } from "../services/streakService.js";

export default function AIPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quotaTick, setQuotaTick] = useState(0);

  const quota = useMemo(() => getAiQuotaState(user), [user, quotaTick]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const prompt = input.trim();
    const gate = tryConsumeAiUse(user);
    if (!gate.ok) {
      toast.error("Free plan: 3 AI uses/day. Redirecting to upgrade...");
      navigate("/subscriptions");
      return;
    }
    setQuotaTick((prev) => prev + 1);

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await aiGeneralReply(prompt);
      markStreakActivity(user);
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "No reply" }]);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Unable to get AI reply");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, the AI could not respond." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page ai-page space-y-8">
      <header className="ai-hero">
        <div className="ai-hero__content">
          <h1 className="page-title">Ask Your Friend</h1>
          <p className="page-subtitle">Some thoughts are easier to say here.</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr] ai-shell">
        <div className="card card-body space-y-4 ai-prompt-card">
          <div>
            <h2 className="section-title">Ask</h2>
          </div>

          <textarea
            className="input min-h-[180px]"
            placeholder="Write your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary ai-run-btn" onClick={handleSend} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
          {!quota.isPro && <div className="text-xs text-slate-500">AI used today: {quota.used}/3</div>}
        </div>

        <div className="card card-body space-y-4 ai-thread">
          {messages.length === 0 && <div className="text-sm text-slate-600">No message yet. Start with a prompt.</div>}
          {messages.length > 0 && (
            <div className="ai-thread__messages">
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`ai-bubble ${msg.role === "user" ? "ai-bubble--user" : ""}`}>
                  <div className="ai-bubble__meta">{msg.role === "user" ? "You" : "Assistant"}</div>
                  <div className="ai-bubble__text">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
