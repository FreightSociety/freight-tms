import { requireRole } from "@/lib/session";
import { getAllUsers } from "@/lib/data/queries";
import { UserManager } from "./UserManager";

export default async function AdminUsersPage() {
  const user = await requireRole(["ADMIN"]);
  const users = await getAllUsers();

  return <UserManager users={users} currentUserId={user.id} />;
}
