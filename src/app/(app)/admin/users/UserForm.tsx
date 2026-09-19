"use client";

import { useActionState } from "react";
import { Field, Input, Select, Button } from "@/components/ui/Form";
import type { UserRow } from "@/lib/db/schema";
import type { UserFormState } from "@/lib/actions/users";

export function UserForm({
  action,
  user,
  onSuccess,
}: {
  action: (prev: UserFormState, formData: FormData) => Promise<UserFormState>;
  user?: UserRow;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: UserFormState, fd: FormData) => {
    const result = await action(prev, fd);
    if (!result.error) onSuccess?.();
    return result;
  }, { error: null });
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <Field label="Name" required error={err.name}>
        <Input name="name" required defaultValue={user?.name ?? ""} />
      </Field>
      <Field label="Email" required error={err.email}>
        <Input type="email" name="email" required defaultValue={user?.email ?? ""} />
      </Field>
      <Field label="Role" required error={err.role}>
        <Select name="role" required defaultValue={user?.role ?? "BROKER"}>
          <option value="ADMIN">Admin</option>
          <option value="BROKER">Broker</option>
          <option value="VIEWER">Viewer</option>
        </Select>
      </Field>
      <Field label="Commission Rate (0–1)" required error={err.commissionRate}>
        <Input type="number" step="0.01" min={0} max={1} name="commissionRate" required defaultValue={user?.commissionRate ?? 0.1} />
      </Field>
      <Field label={user ? "New Password (leave blank to keep current)" : "Password"} error={err.password}>
        <Input type="password" name="password" minLength={8} required={!user} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : user ? "Save Changes" : "Create User"}
      </Button>
    </form>
  );
}
