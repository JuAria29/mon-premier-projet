export function getActiveWorkspace(): "pro" | "perso" {
  if (typeof window === "undefined") return "pro";
  return (localStorage.getItem("aria-active-workspace") as "pro" | "perso") ?? "pro";
}
