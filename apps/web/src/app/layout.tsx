import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { WebVitals } from "@/components/web-vitals";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * AGENTS.md viewport requirements:
 * - MUST: Mobile input font-size >= 16px or set viewport
 * - NEVER: Disable browser zoom (we allow user-scalable)
 * - MUST: viewport-fit=cover for safe areas on notched devices
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // AGENTS.md: NEVER disable browser zoom - keeping user-scalable enabled
  // maximum-scale removed to allow pinch zoom
  viewportFit: "cover", // For safe area support on notched devices
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Dits - Version Control for Video & Large Files",
    template: "%s | Dits",
  },
  description:
    "Dits is a free and open source version control system designed for video production and large binary files. Like Git, but optimized for media workflows.",
  keywords: [
    "version control",
    "video",
    "large files",
    "binary files",
    "git alternative",
    "media",
    "deduplication",
    "vcs",
    "video production",
    "content-defined chunking",
    "BLAKE3",
  ],
  authors: [{ name: "Byron Wade" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "Dits - Version Control for Video & Large Files",
    description:
      "Free and open source version control for video production. Like Git, but for large binary files.",
    url: "https://dits.dev",
    siteName: "Dits",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dits - Version Control for Video & Large Files",
    description:
      "Free and open source version control for video production. Like Git, but for large binary files.",
  },
  alternates: {
    canonical: "https://dits.dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <WebVitals />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
