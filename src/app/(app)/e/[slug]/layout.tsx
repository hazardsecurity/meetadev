import { accentStyle } from "@/lib/accents";
import { eventBySlug } from "@/lib/events";

// Every page of an event wears the colour its organisers picked.
export default async function EventLayout({ children, params }: LayoutProps<"/e/[slug]">) {
  const style = accentStyle((await eventBySlug((await params).slug))?.accent);
  return style ? <div className="event-accent" style={style}>{children}</div> : children;
}
