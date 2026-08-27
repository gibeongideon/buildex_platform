import type { Metadata } from "next";
import { PortalShell } from "./portal-shell";

export const metadata: Metadata = {
  title: "Manufacturer portal",
  description:
    "Your catalogue, enquiries, campaigns and subscription on Buildex Connect.",
};

export default function ConnectPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
