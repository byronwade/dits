import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container flex min-h-[70vh] flex-col items-center justify-center pt-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          That route is not part of the current Dits documentation or marketing
          surface.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button render={<Link href="/" />}>Home</Button>
          <Button variant="outline" render={<Link href="/docs" />}>
            Docs
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
