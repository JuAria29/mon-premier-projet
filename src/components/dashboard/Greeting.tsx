import type { Session } from "@/types";

interface GreetingProps {
  session: Session;
  userName: string;
}

const content: Record<Session, { h1: string; sub: string }> = {
  matin: {
    h1: "Bonjour",
    sub: "Voici votre plan pour aujourd'hui. Prêt à avancer ?",
  },
  midi: {
    h1: "Bon après-midi",
    sub: "Mi-journée atteinte. Voici votre bilan et ce qui reste à faire.",
  },
  soir: {
    h1: "Bonsoir",
    sub: "La journée touche à sa fin. Passons en revue ce qui a été accompli.",
  },
};

export function Greeting({ session, userName }: GreetingProps) {
  const { h1, sub } = content[session];
  const firstName = userName.split(" ")[0];

  return (
    <div className="greeting">
      <h1 className="greeting-h1">
        {h1}, <span style={{ color: "var(--accent)" }}>{firstName}</span>
      </h1>
      <p className="greeting-sub">{sub}</p>
    </div>
  );
}
