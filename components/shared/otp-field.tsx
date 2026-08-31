"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Alert, Card, CardBody } from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/*
  Phone verification, shared by the manufacturer wizard and the customer
  registration wizard.

  Two wizards asking for the same six digits used to mean two copies of the
  resend timer, two demo hints and two ideas of what "any six digits" means.
  The form itself stays with the caller — each wizard owns its own resolver and
  its own next step — but everything around the input is here.
*/

/** Fixed so the demo is repeatable. Any six digits are accepted regardless. */
export const DEMO_OTP = "482913";

const RESEND_SECONDS = 30;

export function OtpField({
  registration,
  error,
  onFill,
  changeNumberHref,
  /** What the SMS is for, in the caller's own words. */
  reason,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  /** Called by the demo shortcut with the code to write into the field. */
  onFill: (code: string) => void;
  changeNumberHref: string;
  reason: React.ReactNode;
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <>
      <Card>
        <CardBody className="space-y-5">
          <Field error={error}>
            <Label required>Verification code</Label>
            {reason ? <FieldHint>{reason}</FieldHint> : null}
            <Input
              {...registration}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg font-semibold tracking-[0.5em] text-numeric"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={secondsLeft > 0}
              onClick={() => setSecondsLeft(RESEND_SECONDS)}
            >
              {secondsLeft > 0 ? (
                <span className="text-numeric">Resend code in {secondsLeft}s</span>
              ) : (
                "Resend code"
              )}
            </Button>
            <Link
              href={changeNumberHref}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Use a different number
            </Link>
          </div>
        </CardBody>
      </Card>

      <Alert
        tone="info"
        className="mt-4"
        title="Demo build — no SMS is sent"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onFill(DEMO_OTP)}
          >
            Fill code
          </Button>
        }
      >
        <p className="flex items-center gap-2">
          <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
          Your code is{" "}
          <span className="font-semibold tracking-wider text-numeric">{DEMO_OTP}</span> —
          any six digits will work.
        </p>
      </Alert>
    </>
  );
}
