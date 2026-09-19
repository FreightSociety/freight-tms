"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Field, Input, Button } from "@/components/ui/Form";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Field label="Email" required>
        <Input type="email" name="email" required placeholder="you@freightsociety.com" />
      </Field>
      <Field label="Password" required>
        <Input type="password" name="password" required placeholder="••••••••" />
      </Field>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
