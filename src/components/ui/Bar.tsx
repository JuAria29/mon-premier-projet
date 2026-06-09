interface BarProps {
  pct: number;
  color?: string;
  height?: number;
  track?: string;
}

export function Bar({ pct, color = "var(--accent)", height = 6, track = "var(--border)" }: BarProps) {
  return (
    <div
      style={{
        width: "100%",
        height,
        background: track,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}
