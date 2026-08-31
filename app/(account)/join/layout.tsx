import type { Metadata } from "next";
import { JoinShell } from "./join-shell";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join Buildex Connect: verify your details, choose a membership, then search, connect and shop.",
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <JoinShell>{children}</JoinShell>;
}
