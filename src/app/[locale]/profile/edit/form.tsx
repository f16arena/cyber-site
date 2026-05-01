"use client";

import { useActionState, useState } from "react";
import type { Game, Region } from "@prisma/client";
import { updateProfile, type ProfileFormState } from "./actions";

const REGIONS: Array<{ value: Region | ""; label: string }> = [
  { value: "", label: "— не указан —" },
  { value: "ALMATY", label: "Алматы" },
  { value: "ASTANA", label: "Астана" },
  { value: "SHYMKENT", label: "Шымкент" },
  { value: "KARAGANDA", label: "Караганда" },
  { value: "AKTAU", label: "Актау" },
  { value: "AKTOBE", label: "Актобе" },
  { value: "PAVLODAR", label: "Павлодар" },
  { value: "ATYRAU", label: "Атырау" },
  { value: "ORAL", label: "Уральск" },
  { value: "KOSTANAY", label: "Костанай" },
  { value: "TARAZ", label: "Тараз" },
  { value: "KZ_OTHER", label: "Другой город" },
];

const GAME_ROLES: Record<Game, string[]> = {
  CS2: ["AWP", "Rifler", "IGL", "Support", "Lurker", "Entry"],
  DOTA2: ["Carry", "Mid", "Offlane", "Support 4", "Support 5"],
  PUBG: ["IGL", "Fragger", "Sniper", "Support"],
};

const GAME_LABELS: Record<Game, string> = {
  CS2: "Counter-Strike 2",
  DOTA2: "Dota 2",
  PUBG: "PUBG",
};

const ALL_GAMES: Game[] = ["CS2", "DOTA2", "PUBG"];

type Props = {
  user: {
    username: string;
    bio: string | null;
    region: Region | null;
    twitchUrl: string | null;
    discordTag: string | null;
    messagePrivacy?: string;
  };
  profiles: Array<{
    game: Game;
    inGameRole: string | null;
    rank: string | null;
  }>;
};

const initialState: ProfileFormState = {};

export function ProfileEditForm({ user, profiles }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  const initialSelected = new Set(profiles.map((p) => p.game));
  const [selectedGames, setSelectedGames] = useState<Set<Game>>(initialSelected);
  const profileMap = new Map(profiles.map((p) => [p.game, p]));

  const toggleGame = (game: Game) => {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(game)) next.delete(game);
      else next.add(game);
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 p-4 text-sm">
          {state.error}
        </div>
      )}

      <Section title="Основное">
        <Field label="Ник">
          <input
            name="username"
            defaultValue={user.username}
            required
            minLength={2}
            maxLength={32}
            className={inputCls}
          />
        </Field>
        <Field label="Регион / город">
          <select
            name="region"
            defaultValue={user.region ?? ""}
            className={inputCls}
          >
            {REGIONS.map((r) => (
              <option key={r.value || "empty"} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Twitch (полная ссылка)">
          <input
            name="twitchUrl"
            defaultValue={user.twitchUrl ?? ""}
            placeholder="https://twitch.tv/username"
            className={inputCls}
          />
        </Field>
        <Field label="Discord">
          <input
            name="discordTag"
            defaultValue={user.discordTag ?? ""}
            placeholder="username или username#1234"
            className={inputCls}
          />
        </Field>
        <Field label="Кто может писать в личку">
          <select
            name="messagePrivacy"
            defaultValue={user.messagePrivacy ?? "EVERYONE"}
            className={inputCls}
          >
            <option value="EVERYONE">🌍 Все</option>
            <option value="FRIENDS_ONLY">👥 Только друзья</option>
          </select>
        </Field>
        <Field label="Био" full>
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            rows={4}
            maxLength={500}
            placeholder="Расскажи о себе, какие цели, играешь ли по вечерам и т.д."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </Section>

      <Section title="Игровые дисциплины">
        <p className="text-zinc-400 text-sm sm:col-span-2 mb-2">
          Выбери игры, в которые играешь. Команды и LFG будут фильтроваться по
          этим дисциплинам.
        </p>
        <div className="sm:col-span-2 flex flex-wrap gap-3 mb-4">
          {ALL_GAMES.map((game) => {
            const active = selectedGames.has(game);
            return (
              <button
                key={game}
                type="button"
                onClick={() => toggleGame(game)}
                className={`px-4 h-10 rounded font-bold text-sm uppercase tracking-wider transition-all clip-corner border ${
                  active
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 border-transparent text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-violet-400"
                }`}
              >
                {active ? "✓ " : ""}
                {game}
              </button>
            );
          })}
        </div>

        <div className="sm:col-span-2 space-y-4">
          {Array.from(selectedGames).sort().map((game) => {
            const existing = profileMap.get(game);
            return (
              <div
                key={game}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <input type="hidden" name="games" value={game} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    {game}
                  </span>
                  <span className="font-bold">{GAME_LABELS[game]}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1 block">
                      Игровая роль
                    </label>
                    <select
                      name={`role_${game}`}
                      defaultValue={existing?.inGameRole ?? ""}
                      className={inputCls}
                    >
                      <option value="">— не указана —</option>
                      {GAME_ROLES[game].map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1 block">
                      Ранг / рейтинг
                    </label>
                    <input
                      name={`rank_${game}`}
                      defaultValue={existing?.rank ?? ""}
                      placeholder={
                        game === "CS2"
                          ? "Premier 18 000"
                          : game === "DOTA2"
                            ? "MMR 4500"
                            : "Master"
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {selectedGames.size === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-zinc-500 text-sm">
              Выбери хотя бы одну игру выше.
            </div>
          )}
        </div>
      </Section>

      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all clip-corner"
        >
          {pending ? "Сохранение..." : "Сохранить"}
        </button>
        <a
          href="/profile"
          className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider border border-zinc-700 hover:border-zinc-500 transition-all clip-corner"
        >
          Отмена
        </a>
      </div>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
        {title}
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
