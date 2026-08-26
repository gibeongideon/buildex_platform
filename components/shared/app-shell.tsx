"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { StatusPill, TooltipProvider, type Tone } from "@/components/ui/primitives";
import { ThemeToggle } from "./theme";
import { Wordmark, type ProductKey } from "./brand";

/*
  The portal shell: fixed sidebar on desktop, focus-trapped slide-over on
  mobile. Every product portal uses it, which is what keeps navigation,
  density and the header rhythm identical across Connect, Hardware and the
  internal console.
*/

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Marks routes that are scaffolded but not yet built out. */
  upcoming?: boolean;
  badge?: string;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export type ShellUser = {
  name: string;
  subtitle: string;
  status?: { label: string; tone: Tone };
};

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary-soft font-medium text-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "text-subtle-foreground")}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded-full bg-danger px-1.5 py-px text-[10px] font-semibold text-white">
          {item.badge}
        </span>
      ) : null}
      {item.upcoming ? (
        <span className="ml-auto rounded border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
          Soon
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  product,
  sections,
  user,
  onNavigate,
}: {
  product: ProductKey;
  sections: NavSection[];
  user: ShellUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link href="/" onClick={onNavigate} className="rounded-md">
          <Wordmark product={product} />
        </Link>
      </div>

      <nav aria-label="Portal" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section, index) => (
          <div key={section.title ?? index}>
            {section.title ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.subtitle}</p>
          </div>
        </div>
        {user.status ? (
          <div className="px-2 pt-1">
            <StatusPill tone={user.status.tone}>{user.status.label}</StatusPill>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell({
  product,
  sections,
  user,
  children,
}: {
  product: ProductKey;
  sections: NavSection[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const [drawerPathname, setDrawerPathname] = React.useState(pathname);

  // Route changes should always leave the mobile drawer closed — including on
  // browser back/forward, which never goes through a nav link's onClick. This
  // is React's documented "adjust state during render" pattern rather than an
  // effect, so the drawer is already closed on the first render of the new page.
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
          <SidebarContent product={product} sections={sections} user={user} />
        </aside>

        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface lg:hidden">
              <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
              <DialogPrimitive.Close className="absolute right-3 top-5 rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted">
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close navigation</span>
              </DialogPrimitive.Close>
              <SidebarContent
                product={product}
                sections={sections}
                user={user}
                onNavigate={() => setMobileOpen(false)}
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-surface-muted lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </button>
            <div className="lg:hidden">
              <Wordmark product={product} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          <main id="main" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
