import type { Metadata } from "next";
import { GetStarted } from "@/components/GetStarted";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Shown in place of the landing page on someone's first visit (see proxy.ts).
export default function StartPage() {
  return <GetStarted />;
}
