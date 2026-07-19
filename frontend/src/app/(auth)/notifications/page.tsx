import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Notification { id: string; title: string; body: string | null; type: string; read: boolean; createdAt: string }

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  let notifications: Notification[] = [];
  try { const res = await api<{ data: Notification[] }>("/notifications"); notifications = res.data; } catch { console.error("Failed to load notifications"); }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No notifications.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                </div>
                {!n.read && <Badge>New</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
