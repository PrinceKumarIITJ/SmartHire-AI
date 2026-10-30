import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/components/layout/theme";
import { ToastProvider } from "@/components/ui/toast";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: {
    default: "SmartHire — AI Recruiting Intelligence",
    template: "%s · SmartHire",
  },
  description:
    "SmartHire screens, ranks and explains every candidate with a team of AI agents: structured parsing, explainable scoring, resume chat, fairness audits and human-approved outreach.",
  applicationName: "SmartHire",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070810" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7fc" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
