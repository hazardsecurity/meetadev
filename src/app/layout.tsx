import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const sans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"] });
const code = Google_Sans_Code({ variable: "--font-google-sans-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Connect · DevFest Ilorin", template: "%s · DevFest Ilorin Connect" },
  description:
    "Find the people you should meet at DevFest Ilorin: mentors, learners, collaborators and teams that are hiring. Swap contacts only when you both say yes.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
