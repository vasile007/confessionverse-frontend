import api from "../api";

function extractReply(data) {
  if (data == null) return "";
  if (typeof data === "string") return data;
  return data.reply || data.message || data.content || data.text || data.answer || "";
}

async function sendWithFallback(prompt) {
  const payloads = [{ message: prompt }, { prompt }, { text: prompt }];
  let lastErr = null;
  for (const payload of payloads) {
    try {
      const res = await api.post("/ai/reply", payload);
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err?.response?.status && err.response.status >= 500) break;
    }
  }
  throw lastErr || new Error("AI request failed");
}

export async function aiHelpRespond(confessionText) {
  const prompt = [
    "You are a concise empathy coach.",
    "Read the confession and provide one empathetic response.",
    "Return 2 short lines:",
    "1) Reply:",
    "2) Why it works:",
    "",
    `Confession: ${String(confessionText || "").trim()}`,
  ].join("\n");
  const data = await sendWithFallback(prompt);
  return extractReply(data) || "No suggestion available.";
}

export async function aiAnalyzeEmotion(text) {
  const prompt = [
    "Analyze the message emotion.",
    "Return exactly 2 lines in English:",
    "Tone: <single adjective>",
    "Suggestion: <short action to soften/clarify>",
    "",
    `Message: ${String(text || "").trim()}`,
  ].join("\n");
  const data = await sendWithFallback(prompt);
  return extractReply(data) || "Tone: unclear\nSuggestion: rewrite calmly.";
}

export async function aiGeneralReply(promptText) {
  const data = await sendWithFallback(promptText);
  return extractReply(data) || "No reply";
}
