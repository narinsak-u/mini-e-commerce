import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Dashboard { revenue: number; totalOrders: number; dailyRevenue: number; bestSellers: { productId: string; score: number }[] }

export default async function AdminDashboardPage() {
  let dashboard: Dashboard = { revenue: 0, totalOrders: 0, dailyRevenue: 0, bestSellers: [] };
  try { dashboard = await api<Dashboard>("/admin/analytics"); } catch (e) { console.error("Failed to load dashboard", e); }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-stone-200"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">${dashboard.revenue.toFixed(2)}</p></CardContent></Card>
        <Card className="shadow-sm border-stone-200"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{dashboard.totalOrders}</p></CardContent></Card>
        <Card className="shadow-sm border-stone-200"><CardHeader><CardTitle className="text-sm text-muted-foreground">Today&#39;s Revenue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">${dashboard.dailyRevenue.toFixed(2)}</p></CardContent></Card>
      </div>
      {dashboard.bestSellers.length > 0 && (
        <Card className="mt-8 shadow-sm border-stone-200">
          <CardHeader><CardTitle>Best Sellers</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dashboard.bestSellers.map((item) => <li key={item.productId} className="flex justify-between"><span>{item.productId.slice(0, 8)}</span><span>{item.score} sold</span></li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
