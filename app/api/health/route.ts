import { NextResponse } from "next/server";

/*
  Liveness endpoint for the deploy.

  The pipeline restarts the service and then polls this until it answers, and
  rolls back to the previous release if it never does. It has to be cheap and it
  has to prove the *Node server* is up — not merely that nginx is listening — so
  it renders nothing and touches no data.

  `BUILDEX_RELEASE` is set by the systemd unit to the deployed commit, which
  makes "is the new version actually live?" answerable from outside the box.
*/

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    release: process.env.BUILDEX_RELEASE ?? "unknown",
    uptimeSeconds: Math.round(process.uptime()),
  });
}
