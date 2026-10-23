export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, color, photo, size = 52 }: { name: string; color: number; photo?: string; size?: number }) {
  if (photo?.startsWith("https://"))
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google profile photos, already sized by Google
      <img className="avatar avatar--photo" src={photo} alt="" width={size} height={size} referrerPolicy="no-referrer"
        style={{ "--s": `${size}px` } as React.CSSProperties} />
    );
  return (
    <span className={`avatar avatar--${color % 4}`} style={{ "--s": `${size}px` } as React.CSSProperties} aria-hidden>
      {initials(name)}
    </span>
  );
}
