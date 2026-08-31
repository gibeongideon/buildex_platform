"use client";

import { ServicesSurface } from "@/components/marketplace/home-surfaces";

/*
  The Services tab as a page of its own.

  Same component as the home page's Services scope, for the reason every other
  scope shares one: the tab row navigates off the home page, so landing here by
  clicking a tab and switching to it in place must show the same thing.
*/
export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
      <ServicesSurface />
    </div>
  );
}
