import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";
import { AppShellProvider } from "@/context/AppShellContext";
import { LlmTraceProvider } from "@/context/LlmTraceContext";
import { ConfirmProvider, LayoutProvider } from "@/components/layout";
import { LlmTracePanel } from "@/components/dev/LlmTracePanel";
import { Toaster } from "@/components/ui/sonner";
import { I18nClientBridge } from "@/i18n/I18nClientBridge";
import { cn } from "@/lib/utils";

// Fork override: shadcn preset b37bl1flo wants Inter, but we keep Plus Jakarta
// Sans to preserve the existing visual identity. Lora remains the serif accent
// for special headings (e.g. chat home hero). Both are exposed as CSS vars
// (--font-sans, --font-serif) so Tailwind / shadcn token consumers see them
// transparently.
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "DeepTutor",
  description: "Agent-native intelligent learning companion",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(fontSans.variable, fontSerif.variable, "font-sans")}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans bg-[var(--background)] text-[var(--foreground)]">
        <AppShellProvider>
          <LayoutProvider>
            <LlmTraceProvider>
              <ConfirmProvider>
                <I18nClientBridge>{children}</I18nClientBridge>
              </ConfirmProvider>
              {/*
                Floating dev-mode telemetry button + sheet. Self-gates on
                enabled state (default ON in dev, OFF in prod). Sits above
                everything else thanks to z-toast.
              */}
              <LlmTracePanel />
            </LlmTraceProvider>
          </LayoutProvider>
        </AppShellProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
