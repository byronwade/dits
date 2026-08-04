import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 pt-[104px] pb-16 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          That route does not exist. Head home or open the docs for the local
          alpha.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/" prefetch={false} aria-label="Go home" />}>
            <Home data-icon="inline-start" />
            Go home
          </Button>
          <Button variant="outline" render={<Link href="/docs" prefetch={false} aria-label="Documentation" />}>
            Documentation
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
