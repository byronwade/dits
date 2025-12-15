import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { WebVitals } from "@/components/web-vitals";
import { generateMetadata as genMeta, generateOrganizationSchema, generateSoftwareApplicationSchema, generateWebSiteSchema } from "@/lib/seo";
import Script from "next/script";
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
  title: "Dits - Version Control for Video & Large Files",
  description:
    "Dits is a free and open source version control system designed for video production and large binary files. Like Git, but optimized for media workflows.",
  canonical: "https://dits.dev",
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits - Version Control for Video & Large Files",
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
      "Dits is a free and open source version control system designed for video production and large binary files.",
  });
  
  // Add WebSite schema with SearchAction for homepage
  const websiteSchema = generateWebSiteSchema({
    potentialAction: {
      target: "https://dits.dev/search?q={search_term_string}",
      queryInput: "required name=search_term_string",
    },
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <Script
          id="software-application-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema),
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
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
