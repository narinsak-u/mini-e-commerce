import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User { id: string; name: string; email: string; role: string }

export default async function AdminUsersPage() {
  let users: User[] = [];
  try { const res = await api<{ data: User[] }>("/admin/users"); users = res.data; } catch (e) { console.error("Failed to load users", e); }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <Card>
        <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th></tr></thead>
            <tbody>{users.map((u) => (<tr key={u.id} className="border-b"><td className="py-3">{u.name}</td><td className="py-3">{u.email}</td><td className="py-3"><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></td></tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
