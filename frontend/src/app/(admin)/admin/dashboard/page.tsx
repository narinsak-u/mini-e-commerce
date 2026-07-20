import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react";

interface Dashboard {
  revenue: number;
  totalOrders: number;
  dailyRevenue: number;
  bestSellers: { productId: string; score: number }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function AdminDashboardPage() {
  let dashboard: Dashboard = {
    revenue: 0,
    totalOrders: 0,
    dailyRevenue: 0,
    bestSellers: [],
  };
  try {
    dashboard = await api<Dashboard>("/admin/analytics");
  } catch (e) {
    console.error("Failed to load dashboard", e);
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your store performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Total Revenue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(dashboard.revenue)}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                +12.4%
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                <ShoppingCart className="h-4 w-4 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {dashboard.totalOrders.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              All time orders
            </p>
          </CardContent>
        </Card>

        {/* Today&apos;s Revenue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&rsquo;s Revenue
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(dashboard.dailyRevenue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Today&rsquo;s earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Best Sellers */}
      {dashboard.bestSellers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Best Sellers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {dashboard.bestSellers.map((item, index) => (
                <div key={item.productId}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {item.productId.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.score} sold
                    </span>
                  </div>
                  {index < dashboard.bestSellers.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
