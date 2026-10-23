import { intent, levelLabel, roleEmoji, roleLabel } from "@/lib/options";

export function IntentChips({ intents, max }: { intents: string[]; max?: number }) {
  const list = intents.map(intent).filter((i) => i !== undefined);
  const shown = max ? list.slice(0, max) : list;
  return (
    <div className="chips">
      {shown.map((i) => (
        <span key={i.id} className={`chip chip--${i.color}`}>
          {i.short}
        </span>
      ))}
      {max && list.length > max && <span className="chip">+{list.length - max}</span>}
    </div>
  );
}

export function roleLine(role: string, level: string) {
  return [role && `${roleEmoji(role)} ${roleLabel(role)}`, levelLabel(level)].filter(Boolean).join(" · ");
}
