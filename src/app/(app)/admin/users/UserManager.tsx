"use client";

import { useState, useTransition } from "react";
import { UserForm } from "./UserForm";
import { createUser, updateUser, toggleUserActive } from "@/lib/actions/users";
import { Table, THead, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Form";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { formatPercent, formatDate } from "@/lib/utils/format";
import type { UserRow } from "@/lib/db/schema";

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Manage broker and admin accounts, roles, and commission rates.</p>
        </div>
        <Button type="button" onClick={() => { setCreating(true); setEditing(null); }}>
          + New User
        </Button>
      </div>

      {(creating || editing) && (
        <Card>
          <CardHeader title={editing ? `Edit ${editing.name}` : "New User"} />
          <CardBody>
            <UserForm
              action={editing ? updateUser.bind(null, editing.id) : createUser}
              user={editing ?? undefined}
              onSuccess={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <Table>
          <THead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Commission</Th>
            <Th>Status</Th>
            <Th>Since</Th>
            <Th>Actions</Th>
          </THead>
          <tbody>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td className="font-medium text-slate-900">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge color={u.role === "ADMIN" ? "purple" : u.role === "BROKER" ? "blue" : "slate"}>
                    {u.role}
                  </Badge>
                </Td>
                <Td>{formatPercent(u.commissionRate, 0)}</Td>
                <Td>
                  <Badge color={u.active ? "green" : "red"}>{u.active ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td>{formatDate(u.createdAt)}</Td>
                <Td>
                  <div className="flex gap-3">
                    <button
                      className="text-xs font-medium text-slate-600 hover:underline"
                      onClick={() => { setEditing(u); setCreating(false); }}
                    >
                      Edit
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        disabled={pending}
                        onClick={() => startTransition(() => toggleUserActive(u.id, !u.active))}
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
