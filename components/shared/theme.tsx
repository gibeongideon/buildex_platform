"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Theme handling.

  `data-theme` is always resolved to an explicit "light" or "dark" on <html>,
  including when the user's preference is "system". That means the CSS never
  needs a media-query fallback, and Tailwind's dark: variant has exactly one
  selector to match.
*/

const STORAGE_KEY = "buildex.theme";
type Preference = "light" | "dark" | "system";

/**
 * Runs before first paint to stop the page flashing the wrong theme. Inlined
 * in <head> rather than shipped as a component effect, which would be too
 * late.
 */
export const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}") || "system";
    var dark = stored === "dark" ||
      (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

function apply(preference: Preference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/*
  The stored preference is external state, so it is read through
  useSyncExternalStore rather than copied into React state by an effect. That
  keeps the toggle correct across tabs for free, and avoids a render pass that
  shows the wrong option selected.
*/

const preferenceListeners = new Set<() => void>();

function subscribePreference(listener: () => void) {
  preferenceListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readPreference(): Preference {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Preference) ?? "system";
  } catch {
    return "system";
  }
}

function writePreference(next: Preference) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Blocked storage — the choice applies now but won't persist.
  }
  preferenceListeners.forEach((listener) => listener());
}

const OPTIONS: { value: Preference; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const preference = React.useSyncExternalStore(
    subscribePreference,
    readPreference,
    () => "system" as Preference, // server render has no stored preference
  );

  // Follow the OS while the preference is "system".
  React.useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: Preference) {
    writePreference(next);
    apply(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-muted p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={cn(
              "rounded-[5px] p-1.5 transition-colors",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-subtle-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
