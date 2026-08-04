"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Home, Navigation } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { PRODUCTS } from "@/lib/products";
import { aiDocsNavigation, docsNavigation, flattenDocsNav } from "@/lib/docs-nav";

const mediaDocs = flattenDocsNav(docsNavigation);
const aiDocs = flattenDocsNav(aiDocsNavigation);

/**
 * Lightweight site/docs command menu (Cmd/Ctrl+K). Marketing + docs navigation
 * only — not an app command palette.
 */
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Jump to a page or docs section"
    >
      <CommandInput placeholder="Search pages and docs…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {PRODUCTS.map((product) => (
          <CommandGroup key={product.id} heading={product.name}>
            <CommandItem value={`${product.name} home`} onSelect={() => go(product.home)}>
              <Home />
              {product.name} home
            </CommandItem>
            {product.nav.map((item) => (
              <CommandItem
                key={item.href}
                value={`${product.name} ${item.title}`}
                onSelect={() => go(item.href)}
              >
                <Navigation />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Docs">
          {mediaDocs.map((item) => (
            <CommandItem
              key={item.href}
              value={`docs ${item.title} ${item.href}`}
              onSelect={() => go(item.href)}
            >
              <FileText />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="AI docs">
          {aiDocs.map((item) => (
            <CommandItem
              key={item.href}
              value={`ai docs ${item.title} ${item.href}`}
              onSelect={() => go(item.href)}
            >
              <FileText />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
