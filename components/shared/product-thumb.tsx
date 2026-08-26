"use client";

import * as React from "react";
import Image from "next/image";
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

  Suppliers have not uploaded their own photography, so listings fall back to a
  category photo — real product imagery under CC / public-domain licences,
  bundled in `public/products/` (see ATTRIBUTION.json). They are served
  locally rather than hotlinked, so the marketplace works offline and nobody
  else's CDN is loaded on every page view.

  Categories without a photograph that genuinely reads as the product fall back
  to a generated tile: the category icon over a deterministic geometric pattern
  seeded from the product id. A wrong photo is worse than an honest placeholder,
  and the same product always draws the same tile so the grid stays stable.

  Both are replaced the day suppliers upload their own shots.
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

/**
 * Categories with bundled photographs, and how many each has. Several per
 * category matters: a six-across grid filtered to one category would otherwise
 * repeat the same photo straight down a column. Which one a listing gets is
 * chosen by a hash of its id, so it is stable across reloads.
 *
 * Categories absent here have no photo that genuinely reads as the product, and
 * fall back to the generated tile.
 */
const CATEGORY_PHOTOS: Partial<Record<ProductCategory, { slug: string; count: number }>> = {
  "Cement & Concrete": { slug: "cement-concrete", count: 2 },
  "Steel & Reinforcement": { slug: "steel-reinforcement", count: 1 },
  "Timber & Boards": { slug: "timber-boards", count: 1 },
  "Paints & Coatings": { slug: "paints-coatings", count: 2 },
  Roofing: { slug: "roofing", count: 1 },
  "Plumbing & Sanitaryware": { slug: "plumbing", count: 2 },
  Electrical: { slug: "electrical", count: 2 },
  "Tiles & Flooring": { slug: "tiles-flooring", count: 2 },
  "Doors & Windows": { slug: "doors-windows", count: 3 },
  "Hardware & Fasteners": { slug: "hardware-fasteners", count: 3 },
  "Adhesives & Sealants": { slug: "adhesives-sealants", count: 1 },
  Insulation: { slug: "insulation", count: 1 },
  "Interior Finishes": { slug: "interior-finishes", count: 1 },
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
  const common = { id, width: 24, height: 24, patternUnits: "userSpaceOnUse" as const };

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
  sizes = "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw",
  priority = false,
}: {
  productId: string;
  category: string;
  className?: string;
  iconClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  // A plain lookup, not a function call: the React Compiler treats a
  // capitalised binding assigned from a *function call* as creating a component
  // during render, and rejects it. A property access is fine.
  const Icon = CATEGORY_ICON[category as ProductCategory] ?? Blocks;
  const set = CATEGORY_PHOTOS[category as ProductCategory];
  const [photoFailed, setPhotoFailed] = React.useState(false);

  const seed = hash(productId);
  const photo = set ? `/products/${set.slug}-${(seed % set.count) + 1}.jpg` : undefined;
  const kind = PATTERNS[seed % PATTERNS.length];
  const patternId = `thumb-${productId.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (photo && !photoFailed) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setPhotoFailed(true)}
          className="object-cover"
        />
      </div>
    );
  }

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
