import React, { useEffect, useRef, useState } from "react";
import { Send, Smile } from "lucide-react";

const EMOJIS = ["😀", "😂", "🥹", "😊", "😍", "😌", "😢", "😭", "😤", "🤔", "🙃", "🫶", "❤️", "💜", "✨", "🔥", "🌙", "⭐", "🌿", "🌈", "👍", "👏", "🙏", "💪", "🎉", "☕", "💬", "🕊️", "🤍", "🫂"];

export default function MessageComposer({ value, onChange, onSend, disabled, socketReady, placeholder }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const close = (event) => {
      if (!pickerRef.current?.contains(event.target)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [pickerOpen]);

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`.slice(0, 500);
    onChange(next);
    setPickerOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      const caret = Math.min(start + emoji.length, next.length);
      input?.setSelectionRange(caret, caret);
    });
  };

  return (
    <footer className="cv-composer">
      <div className="cv-emoji-wrap" ref={pickerRef}>
        <button type="button" className="cv-emoji-button" onClick={() => setPickerOpen((open) => !open)} disabled={disabled} aria-label="Choose emoji" aria-expanded={pickerOpen}><Smile size={20} /></button>
        {pickerOpen && <div className="cv-emoji-picker" role="dialog" aria-label="Emoji picker">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => insertEmoji(emoji)} aria-label={`Insert ${emoji}`}>{emoji}</button>)}</div>}
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        maxLength={500}
        rows={1}
        disabled={disabled}
        aria-label="Message"
      />
      <button className="cv-send-button" type="button" onClick={onSend} disabled={disabled || !socketReady || !value.trim()} aria-label={socketReady ? "Send message" : "Chat is reconnecting"}><Send size={18} /></button>
    </footer>
  );
}
