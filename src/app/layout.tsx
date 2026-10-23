import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const sans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"] });
const code = Google_Sans_Code({ variable: "--font-google-sans-code", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  applicationName: "meetadev",
  title: { default: "meetadev · Networking for DevFest & GDG events", template: "%s · meetadev" },
  description:
    "Organisers create a space for their DevFest or GDG event; attendees find mentors, learners, collaborators and teams that are hiring. Contacts are only swapped when both people say yes.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
