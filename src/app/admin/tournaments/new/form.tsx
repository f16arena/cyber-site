"use client";

import { useActionState, useState } from "react";
import { createTournament, type ActionState } from "../../actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type Defaults = {
  game?: string;
  format?: string;
  prize?: number;
  maxTeams?: number;
  description?: string;
};

const DEFAULT_CS2_MAPS = [
  { id: "mirage", label: "Mirage" },
  { id: "inferno", label: "Inferno" },
  { id: "nuke", label: "Nuke" },
  { id: "ancient", label: "Ancient" },
  { id: "anubis", label: "Anubis" },
  { id: "vertigo", label: "Vertigo" },
  { id: "dust2", label: "Dust 2" },
];

const inputCls =
  "w-full bg-bg-elevated border border-border-default rounded-sm h-9 px-3 text-[13px] text-text-primary focus:outline-none focus:border-brand-yellow transition-colors";

const labelCls =
  "text-[10px] font-mono uppercase tracking-wider text-text-muted";

export function TournamentCreateForm({ defaults }: { defaults?: Defaults }) {
  const [state, action, pending] = useActionState(createTournament, initialState);
  const [game, setGame] = useState(defaults?.game ?? "");

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {state.error && (
        <div className="rounded-sm border border-rose-500/40 bg-rose-500/10 text-rose-300 p-3 text-[13px]">
          {state.error}
        </div>
      )}

      <Section title="Основное">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Название" full>
            <input
              name="name"
              required
              minLength={3}
              maxLength={80}
              className={inputCls}
              placeholder="F16 Spring Cup 2026"
            />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              required
              pattern="[a-z0-9-]{3,40}"
              className={`${inputCls} lowercase`}
              placeholder="spring-cup-2026"
            />
          </Field>
          <Field label="Игра">
            <select
              name="game"
              required
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>
                — выбери —
              </option>
              <option value="CS2">Counter-Strike 2</option>
              <option value="DOTA2">Dota 2</option>
              <option value="PUBG">PUBG</option>
            </select>
          </Field>
          <Field label="Формат">
            <select
              name="format"
              required
              defaultValue={defaults?.format ?? "SINGLE_ELIMINATION"}
              className={inputCls}
            >
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="BATTLE_ROYALE_SERIES">Battle Royale Series</option>
            </select>
          </Field>
          <Field label="Призовой фонд (₸)">
            <input
              name="prize"
              type="number"
              min={0}
              step={10000}
              defaultValue={defaults?.prize ?? 0}
              className={inputCls}
              placeholder="500000"
            />
          </Field>
        </div>
      </Section>

      <Section title="Команды и ростер">
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Макс команд">
            <select
              name="maxTeams"
              required
              defaultValue={String(defaults?.maxTeams ?? 8)}
              className={inputCls}
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16">16</option>
            </select>
          </Field>
          <Field label="Мин команд">
            <select name="minTeams" defaultValue="4" className={inputCls}>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
            </select>
          </Field>
          <Field label="Размер состава">
            <input
              name="rosterSize"
              type="number"
              min={1}
              max={10}
              defaultValue={5}
              className={inputCls}
            />
          </Field>
          <Field label="Запасных">
            <input
              name="substitutesAllowed"
              type="number"
              min={0}
              max={5}
              defaultValue={2}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex gap-6 mt-3 flex-wrap">
          <CheckboxField
            name="autoApproveTeams"
            label="Авто-приём команд"
            hint="без ручного апрува"
          />
          <CheckboxField
            name="allowSubstitutions"
            label="Разрешить замены"
            hint="между матчами"
            defaultChecked
          />
        </div>
      </Section>

      <Section title="Расписание">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Закрытие регистрации">
            <input
              name="registrationClosesAt"
              type="datetime-local"
              className={inputCls}
            />
          </Field>
          <Field label="Старт турнира">
            <input
              name="startsAt"
              type="datetime-local"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {game === "CS2" && (
        <Section title="CS2: veto + map pool">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field label="Veto preset" full>
              <select
                name="vetoPreset"
                defaultValue="AUTO"
                className={inputCls}
              >
                <option value="AUTO">
                  AUTO (BO1 → FACEIT, BO3 → PGL, BO5 → PGL расш.)
                </option>
                <option value="FACEIT_BO1">FACEIT BO1 (6 банов)</option>
                <option value="PGL_BO3">PGL BO3 (ban-ban-pick-pick-ban-ban-decider)</option>
                <option value="PGL_BO5">PGL BO5</option>
              </select>
            </Field>
          </div>
          <div className={labelCls + " mb-2"}>Map pool</div>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CS2_MAPS.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-1.5 rounded-sm border border-border-default bg-bg-elevated px-2 py-1.5 text-[12px] cursor-pointer hover:bg-bg-base"
              >
                <input
                  type="checkbox"
                  name="mapPool"
                  value={m.id}
                  defaultChecked
                  className="accent-brand-yellow"
                />
                {m.label}
              </label>
            ))}
          </div>
        </Section>
      )}

      <Section title="Описание и правила">
        <div className="space-y-3">
          <Field label="Краткое описание">
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={defaults?.description ?? ""}
              placeholder="Что за турнир, формат, призовой, для кого..."
              className={`${inputCls} h-auto py-2 resize-none`}
            />
          </Field>
          <Field label="Правила (markdown)">
            <textarea
              name="rulesMarkdown"
              rows={8}
              maxLength={5000}
              placeholder="## Регламент турнира..."
              className={`${inputCls} h-auto py-2 resize-none font-mono text-[12px]`}
            />
          </Field>
          <Field label="Баннер">
            <input
              type="file"
              name="banner"
              accept="image/png,image/jpeg,image/webp"
              className="text-[12px] text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-bg-elevated file:text-text-primary file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:tracking-wide hover:file:bg-bg-base file:cursor-pointer"
            />
            <span className="text-[11px] text-text-muted">
              PNG/JPG/WebP до 1 МБ. Лучше 16:9.
            </span>
          </Field>
        </div>
      </Section>

      <div className="flex gap-2 pt-4 border-t border-border-default">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Создание..." : "Создать турнир"}
        </Button>
        <a href="/admin/tournaments">
          <Button type="button" variant="secondary" size="lg">
            Отмена
          </Button>
        </a>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-border-default bg-bg-panel p-4">
      <h3 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
        {title}
      </h3>
      {children}
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
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({
  name,
  label,
  hint,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-brand-yellow"
      />
      <span className="text-text-primary">{label}</span>
      {hint && (
        <span className="text-[11px] text-text-muted">— {hint}</span>
      )}
    </label>
  );
}
