import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { WebVitals } from "@/components/web-vitals";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  generateMetadata as genMeta,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateWebSiteSchema,
} from "@/lib/seo";
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

export const metadata: Metadata = genMeta({
  title: "Dits - Local-First Version Control for Media & Assets",
  description:
    "Dits is open, local-first version control for large media and asset pipelines. Try the alpha locally and help shape its open format and protocol.",
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits-social-preview.png",
        width: 1280,
        height: 640,
        alt: "Dits - Local-First Version Control for Media and Assets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();
  const softwareApplicationSchema = generateSoftwareApplicationSchema({
    name: "Dits",
    description:
      "Open, local-first version control for large media and asset pipelines.",
    operatingSystem: ["macOS on Apple silicon", "Windows x64"],
  });

  const websiteSchema = generateWebSiteSchema({});

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(organizationSchema),
          }}
        />
        <Script
          id="software-application-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(softwareApplicationSchema),
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(websiteSchema),
          }}
        />
      </head>
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
