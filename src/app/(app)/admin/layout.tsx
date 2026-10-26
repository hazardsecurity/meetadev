import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminConsole";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · meetadev" }, robots: { index: false, follow: false } };

// Every admin page sits behind requireAdmin (ADMIN_EMAILS). The tabs carry a badge where something is waiting.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [w] = await query<{ apps: number; reports: number; communities: number }>(
    `SELECT (SELECT count(*)::int FROM organizer_requests WHERE status = 'pending') AS apps,
            (SELECT count(*)::int FROM reports WHERE resolved_at IS NULL) AS reports,
            (SELECT count(*)::int FROM communities WHERE status = 'pending') AS communities`,
  );
  return (
    <div className="stack admin" style={{ "--gap": "20px" } as React.CSSProperties}>
      <div className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
        <p className="eyebrow">meetadev admin</p>
        <AdminNav counts={{ "/admin/organisers": w.apps, "/admin/reports": w.reports, "/admin/communities": w.communities }} />
      </div>
      {children}
    </div>
  );
}
