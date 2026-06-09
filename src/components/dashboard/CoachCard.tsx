import type { CoachMessage } from "@/types";

interface CoachCardProps {
  message: CoachMessage;
  compact?: boolean;
}

const tonColors: Record<string, string> = {
  Direct: "var(--accent)",
  Exigeant: "var(--violet)",
  Chaleureux: "var(--success)",
  Bienveillant: "var(--info)",
};

export function CoachCard({ message, compact = false }: CoachCardProps) {
  const tonColor = tonColors[message.ton] ?? "var(--accent)";

  return (
    <div className="coach-card" style={{ padding: compact ? "16px 20px" : "20px 24px" }}>
      <div className="coach-card-head">
        <span className="kicker">Le mot du coach</span>
        <span
          className="ton-badge"
          style={{ background: `color-mix(in oklch, ${tonColor} 12%, white)`, color: tonColor }}
        >
          {message.ton}
        </span>
      </div>
      <h3 className="coach-card-title">{message.titre}</h3>
      <div className="coach-card-body">
        {message.corps.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <p className="coach-card-sign">{message.signe}</p>
    </div>
  );
}
