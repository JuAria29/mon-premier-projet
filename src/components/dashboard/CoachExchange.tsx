"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icons";
import type { Session, Workspace } from "@/types";

interface Message {
  role: "user" | "coach";
  text: string;
}

interface CoachExchangeProps {
  workspace: Workspace;
  ton: string;
  session?: Session;
}

export function CoachExchange({ workspace, ton, session = "matin" }: CoachExchangeProps) {
  const storageKey = `aria-exchange-${workspace}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function persist(next: Message[]) {
    setMessages(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function callCoach(userText: string, trigger?: "briefing") {
    setLoading(true);

    // Build API message history (exclude the new user message if briefing)
    const history = trigger
      ? []
      : messages.map((m) => ({
          role: m.role === "coach" ? "assistant" : "user",
          content: m.text,
        }));

    const apiMessages = trigger
      ? undefined
      : [...history, { role: "user", content: userText }];

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          workspace,
          ton: ton.toLowerCase(),
          session,
          trigger,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "Je n'ai pas pu générer de réponse. Réessayez.";

      const next: Message[] = trigger
        ? [{ role: "coach", text: replyText }]
        : [...messages, { role: "user", text: userText }, { role: "coach", text: replyText }];

      persist(next);
    } catch {
      const errorMsg = "Une erreur réseau est survenue. Vérifiez votre connexion.";
      const next: Message[] = trigger
        ? [{ role: "coach", text: errorMsg }]
        : [...messages, { role: "user", text: userText }, { role: "coach", text: errorMsg }];
      persist(next);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await callCoach(text);
  }

  async function requestBriefing() {
    if (loading) return;
    await callCoach("", "briefing");
  }

  function clearHistory() {
    persist([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card exchange-card">
      <div className="card-head-row" style={{ padding: "16px 20px 0" }}>
        <span className="kicker">Échange avec le coach</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="clear-btn"
              title="Effacer l'historique"
            >
              Effacer
            </button>
          )}
          <button
            className="briefing-btn"
            onClick={requestBriefing}
            disabled={loading}
          >
            <Icon name="bolt" size={13} />
            Briefing du jour
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="exchange-thread">
        {messages.length === 0 && !loading && (
          <p className="empty-note" style={{ textAlign: "center", padding: "24px 0" }}>
            Demandez un <strong>briefing du jour</strong> ou posez une question à Aria…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text.split("\n").map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        ))}
        {loading && (
          <div className="bubble coach typing-bubble">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="exchange-input-row">
        <textarea
          className="exchange-textarea"
          placeholder="Posez votre question à Aria… (⌘↵ pour envoyer)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={send}
          disabled={!input.trim() || loading}
          title="Envoyer"
        >
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  );
}
