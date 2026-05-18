"use client";

import { HUB_MAP_BY_ID, type HubMapInfo } from "@/lib/hub/maps";

export type MapCardState = "available" | "banned" | "selected" | "disabled";

export function MapCard({
  mapId,
  state,
  team,
  order,
  onClick,
  disabled,
  size = "md",
}: {
  mapId: string;
  state: MapCardState;
  team?: "A" | "B";
  order?: number;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const map = HUB_MAP_BY_ID.get(mapId);
  const info: HubMapInfo = map ?? {
    id: mapId as never,
    displayName: mapId,
    csName: `de_${mapId}`,
    gradient: "linear-gradient(135deg, #27272a 0%, #52525b 100%)",
    accent: "#71717a",
    tagline: "",
  };

  const heightClass =
    size === "sm" ? "h-24" : size === "lg" ? "h-56" : "h-40";

  const Wrapper: React.ElementType =
    state === "available" && onClick && !disabled ? "button" : "div";

  const wrapperProps: Record<string, unknown> =
    state === "available" && onClick && !disabled
      ? { type: "button", onClick }
      : {};

  // Реальная картинка из /public/hub/maps/<id>.jpg если есть.
  // Если нет — браузер скроет img (onError), останется только градиент.
  const imageSrc = `/hub/maps/${info.id}.jpg`;

  return (
    <Wrapper
      {...wrapperProps}
      disabled={disabled}
      className={`group relative ${heightClass} w-full overflow-hidden rounded-xl border transition-all ${
        state === "available"
          ? `border-zinc-800 ${
              !disabled
                ? "hover:scale-[1.02] hover:border-orange-500/70 cursor-pointer hover:shadow-[0_0_24px_-8px] hover:shadow-orange-500/40"
                : "opacity-60 cursor-not-allowed"
            }`
          : state === "banned"
          ? "border-zinc-800/70 opacity-40 grayscale"
          : state === "selected"
          ? "border-emerald-400/80 shadow-[0_0_40px_-8px] shadow-emerald-500/60 scale-[1.02]"
          : "border-zinc-800/70 opacity-40 grayscale"
      }`}
      style={{
        background: info.gradient,
      }}
    >
      {/* Реальное изображение карты, если положили в /public/hub/maps/<id>.jpg */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          // Если файла нет — скрываем img, остаётся градиент-фон
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Затемнение поверх для читабельности текста */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />

      {/* Контент */}
      <div className="absolute inset-0 flex flex-col justify-end p-3">
        <div
          className={`font-black tracking-tight drop-shadow-lg ${
            size === "sm"
              ? "text-base"
              : size === "lg"
              ? "text-3xl"
              : "text-xl"
          } ${state === "selected" ? "text-emerald-200" : "text-white"}`}
        >
          {info.displayName}
        </div>
        {info.tagline && size !== "sm" && (
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-300/80 mt-0.5">
            {info.tagline}
          </div>
        )}
      </div>

      {/* Top-right badge: статус */}
      {state === "banned" && (
        <>
          <div className="absolute top-2 right-2 z-10">
            <span
              className={`text-[10px] font-mono font-black px-2 py-1 rounded border ${
                team === "A"
                  ? "border-orange-400 bg-orange-500/30 text-orange-200"
                  : team === "B"
                  ? "border-rose-400 bg-rose-500/30 text-rose-200"
                  : "border-zinc-500 bg-zinc-700/40 text-zinc-200"
              }`}
            >
              BANNED {order ? `#${order}` : ""} {team && `· ${team}`}
            </span>
          </div>
          {/* Диагональная красная линия поверх — визуально перечёркнуто */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-rose-500/80 -rotate-[15deg] origin-center" />
          </div>
        </>
      )}

      {state === "selected" && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-mono font-black px-2 py-1 rounded bg-emerald-400/30 border border-emerald-300 text-emerald-100 animate-pulse">
            ✓ SELECTED
          </span>
        </div>
      )}

      {state === "available" && !disabled && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-orange-500/30 border border-orange-300 text-orange-100">
            BAN
          </span>
        </div>
      )}
    </Wrapper>
  );
}
