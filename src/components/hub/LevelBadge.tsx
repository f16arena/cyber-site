import { levelFor } from "@/lib/hub/level";

export function LevelBadge({
  elo,
  size = "md",
  showLabel = false,
}: {
  elo: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const lvl = levelFor(elo);
  const sizeClass =
    size === "sm"
      ? "w-5 h-5 text-[10px]"
      : size === "lg"
      ? "w-10 h-10 text-base"
      : "w-7 h-7 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        showLabel ? "" : "shrink-0"
      }`}
      title={`Уровень ${lvl.level} · ${elo} ELO`}
    >
      <span
        className={`${sizeClass} inline-flex items-center justify-center rounded font-black border-2 ${lvl.bgClass} ${lvl.textClass} ${lvl.borderClass}`}
      >
        {lvl.label}
      </span>
      {showLabel && (
        <span className={`text-[10px] font-mono uppercase tracking-widest ${lvl.textClass}`}>
          LVL {lvl.label}
        </span>
      )}
    </span>
  );
}
