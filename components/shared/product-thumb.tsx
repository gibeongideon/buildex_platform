import * as React from "react";
import {
  Blocks,
  DoorOpen,
  Droplet,
  Droplets,
  Frame,
  Grid2x2,
  Grid3x3,
  House,
  Layers,
  Layers2,
  Paintbrush,
  Palette,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/lib/schemas/common";

/*
  Product imagery.

  Manufacturers have not uploaded photography yet, and a grid of grey "no
  image" boxes makes a marketplace look abandoned. So each listing gets a
  generated tile instead: the category's icon over a deterministic geometric
  pattern derived from the product id.

  Deterministic matters — the same product always draws the same tile, so the
  grid is stable across reloads and a shop learns to recognise a listing by its
  mark. It is drawn in brand tints, needs no network request, and is replaced
  wholesale the day real photography exists.
*/

const CATEGORY_ICON: Record<ProductCategory, React.ElementType> = {
  "Cement & Concrete": Blocks,
  "Steel & Reinforcement": Grid2x2,
  "Timber & Boards": Layers,
  "Paints & Coatings": Paintbrush,
  Roofing: House,
  "Plumbing & Sanitaryware": Droplets,
  Electrical: Zap,
  "Tiles & Flooring": Grid3x3,
  "Doors & Windows": DoorOpen,
  "Hardware & Fasteners": Wrench,
  "Adhesives & Sealants": Droplet,
  Insulation: Layers2,
  "Glass & Glazing": Frame,
  "Interior Finishes": Palette,
};

export function categoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON[category as ProductCategory] ?? Blocks;
}

/** Small stable hash so a product id always yields the same pattern. */
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PATTERNS = ["grid", "diagonal", "dots", "bricks"] as const;

function PatternDefs({ id, kind }: { id: string; kind: (typeof PATTERNS)[number] }) {
  const common = {
    id,
    width: 24,
    height: 24,
    patternUnits: "userSpaceOnUse" as const,
  };

  if (kind === "diagonal") {
    return (
      <pattern {...common}>
        <path d="M-2 6 L6 -2 M-2 18 L18 -2 M6 26 L26 6 M18 26 L26 18" stroke="currentColor" strokeWidth="1.25" fill="none" />
      </pattern>
    );
  }
  if (kind === "dots") {
    return (
      <pattern {...common}>
        <circle cx="6" cy="6" r="1.6" fill="currentColor" />
        <circle cx="18" cy="18" r="1.6" fill="currentColor" />
      </pattern>
    );
  }
  if (kind === "bricks") {
    return (
      <pattern {...common} height={16}>
        <path d="M0 0h24M0 8h24M0 16h24M6 0v8M18 8v8" stroke="currentColor" strokeWidth="1.25" fill="none" />
      </pattern>
    );
  }
  return (
    <pattern {...common}>
      <path d="M0 0h24v24H0z" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </pattern>
  );
}

export function ProductThumb({
  productId,
  category,
  className,
  iconClassName,
}: {
  productId: string;
  category: string;
  className?: string;
  iconClassName?: string;
}) {
  // A plain lookup, not `categoryIcon(category)`: the React Compiler treats a
  // capitalised binding assigned from a *function call* as creating a component
  // during render, and rejects it. A property access is fine.
  const Icon = CATEGORY_ICON[category as ProductCategory] ?? Blocks;
  const seed = hash(productId);
  const kind = PATTERNS[seed % PATTERNS.length];
  const patternId = `thumb-${productId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-surface-muted",
        className,
      )}
    >
      <svg
        className="absolute inset-0 size-full text-brand/[0.14] dark:text-brand/[0.20]"
        aria-hidden="true"
      >
        <defs>
          <PatternDefs id={patternId} kind={kind} />
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <Icon
        className={cn("relative size-8 text-brand/45 dark:text-brand/60", iconClassName)}
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </div>
  );
}
