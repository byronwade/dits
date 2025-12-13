import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="container flex-1">
        <div className="flex gap-10 py-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-20">
              <DocsSidebar />
            </div>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
