"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icons";
import type { Workspace } from "@/types";

interface Message {
  role: "user" | "coach";
  text: string;
}

interface CoachExchangeProps {
  workspace: Workspace;
  ton: string;
}

function coachReply(text: string, ton: string): string {
  const lower = text.toLowerCase();
  const hasProjet = /projet|lancer|id[ée]e|cr[ée]er/.test(lower);

  const replies: Record<string, string[]> = {
    direct: [
      "Noté. Quelle est la prochaine action concrète ?",
      "Bien. Comment allez-vous mesurer le succès demain ?",
      "Intéressant. Qu'est-ce qui vous a bloqué aujourd'hui ?",
    ],
    chaleureux: [
      "Merci de partager ça. Comment vous sentez-vous par rapport à cette journée ?",
      "C'est une belle avancée ! Qu'est-ce qui vous a donné de l'énergie aujourd'hui ?",
      "Je vous entends. Prenez soin de vous ce soir.",
    ],
    exigeant: [
      "C'est bien. Mais pouviez-vous faire mieux ? Qu'est-ce qui vous en a empêché ?",
      "Résultat noté. Demain, visez plus haut sur ce point.",
      "Analyse froide : qu'est-ce que vous auriez dû faire différemment ?",
    ],
    bienveillant: [
      "Vous avez bien travaillé aujourd'hui. Accordez-vous du repos.",
      "Chaque journée compte. Celle-ci a eu ses bons moments.",
      "Notez ce qui a bien marché — c'est votre carburant pour demain.",
    ],
  };

  const tonKey = ton.toLowerCase();
  const pool = replies[tonKey] ?? replies.chaleureux;
  const base = pool[Math.floor(Math.random() * pool.length)];

  if (hasProjet) {
    return base + "\n\n💡 J'ai noté cette idée de projet pour votre liste.";
  }
  return base;
}

export function CoachExchange({ workspace, ton }: CoachExchangeProps) {
  const storageKey = `aria-exchange-${workspace}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
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
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const reply = coachReply(text, ton);
    const next: Message[] = [
      ...messages,
      { role: "user", text },
      { role: "coach", text: reply },
    ];
    setMessages(next);
    setInput("");
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
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
        {messages.length > 0 && (
          <span className="count-pill">{Math.floor(messages.length / 2)} échange{messages.length / 2 > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Thread */}
      <div className="exchange-thread">
        {messages.length === 0 && (
          <p className="empty-note" style={{ textAlign: "center", padding: "24px 0" }}>
            Partagez votre bilan de journée avec Aria…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text.split("\n").map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="exchange-input-row">
        <textarea
          className="exchange-textarea"
          placeholder="Votre bilan du jour… (⌘↵ pour envoyer)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim()} title="Envoyer">
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  );
}
