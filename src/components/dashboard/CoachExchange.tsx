"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const briefingDateKey = `aria-briefing-date-${workspace}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function persist(next: Message[]) {
    setMessages(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const callCoach = useCallback(async (userText: string, trigger?: "briefing") => {
    setLoading(true);

    const currentMessages: Message[] = (() => {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();

    const history = trigger
      ? []
      : currentMessages.map((m) => ({
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
        : [...currentMessages, { role: "user", text: userText }, { role: "coach", text: replyText }];

      persist(next);
    } catch {
      const errorMsg = "Erreur réseau. Vérifiez votre connexion.";
      const next: Message[] = trigger
        ? [{ role: "coach", text: errorMsg }]
        : [...currentMessages, { role: "user", text: userText }, { role: "coach", text: errorMsg }];
      persist(next);
    } finally {
      setLoading(false);
    }
  }, [workspace, ton, session, storageKey]);

  // Load from localStorage and auto-trigger briefing if today's not done
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed: Message[] = saved ? JSON.parse(saved) : [];
      setMessages(parsed);

      const lastBriefingDate = localStorage.getItem(briefingDateKey);
      const todayStr = new Date().toDateString();

      if (lastBriefingDate !== todayStr) {
        // Auto-trigger briefing once per day
        localStorage.setItem(briefingDateKey, todayStr);
        setInitialized(true);
      } else {
        setInitialized(true);
      }
    } catch {
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Auto-briefing: trigger after init if no messages today
  useEffect(() => {
    if (!initialized) return;
    const lastBriefingDate = localStorage.getItem(briefingDateKey);
    const todayStr = new Date().toDateString();
    const savedMessages: Message[] = (() => {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })();

    if (lastBriefingDate === todayStr && savedMessages.length === 0) {
      callCoach("", "briefing");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await callCoach(text);
  }

  async function requestBriefing() {
    if (loading) return;
    try {
      localStorage.setItem(briefingDateKey, new Date().toDateString());
    } catch { /* ignore */ }
    await callCoach("", "briefing");
  }

  function clearHistory() {
    persist([]);
    try { localStorage.removeItem(briefingDateKey); } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card exchange-card">
      <div className="card-head-row" style={{ padding: "14px 16px 0" }}>
        <span className="kicker">Coach Aria</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="clear-btn" title="Effacer l'historique">
              Effacer
            </button>
          )}
          <button className="briefing-btn" onClick={requestBriefing} disabled={loading}>
            <Icon name="bolt" size={13} />
            Nouveau briefing
          </button>
        </div>
      </div>

      <div className="exchange-thread">
        {messages.length === 0 && !loading && (
          <p className="empty-note" style={{ textAlign: "center", padding: "20px 0" }}>
            Analyse en cours…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text.split("\n").map((line, j) => (
              <p key={j}>{line || <br />}</p>
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

      <div className="exchange-input-row">
        <textarea
          className="exchange-textarea"
          placeholder="Posez une question à Aria… (⌘↵ pour envoyer)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim() || loading} title="Envoyer">
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  );
}
