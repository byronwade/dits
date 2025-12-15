"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DocsSidebar } from "@/components/docs-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Spacer for fixed header + alpha banner */}
      <div className="h-[104px]" aria-hidden="true" />

      {/* Mobile Menu Bar */}
      <div className="sticky top-[104px] z-40 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="h-full overflow-y-auto">
              <DocsSidebar onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium text-muted-foreground">Documentation</span>
      </div>

      <div className="container-wrapper flex flex-1 flex-col px-2">
        <div
          className="flex w-full min-h-min flex-1 items-start px-0 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]"
          style={
            {
              "--sidebar-width": "240px",
            } as React.CSSProperties
          }
        >
          {/* Left Sidebar - Desktop only */}
          <aside className="text-sidebar-foreground w-[var(--sidebar-width)] flex-col sticky top-[104px] z-30 hidden h-[calc(100svh-104px)] bg-transparent lg:flex">
            <DocsSidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full">
            <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

