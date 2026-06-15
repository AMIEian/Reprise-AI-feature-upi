import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../lib/api";
import { formatCurrency, formatCredits } from "../lib/utils";
import { showErrorToastWithRetry, showWarningToast } from "../lib/errorHandler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Users,
  Store,
  UserCheck,
  Clock,
  ShoppingCart,
  TrendingUp,
  DollarSign,
} from "lucide-react";

interface DashboardStats {
  total_customers: number;
  total_partners: number;
  active_partners: number;
  pending_verifications: number;
  total_agents: number;
  total_orders: number;
  orders_by_status: Record<string, number>;
  total_revenue: number;
  credits_in_circulation: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/dashboard/stats");
      if (!response.data) {
        showWarningToast("Dashboard data format error. Please refresh.");
        return;
      }
      setStats(response.data);
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
      const retryFn = () => fetchStats();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground">
          Failed to load dashboard statistics. Please try again.
        </p>
        <button
          onClick={() => fetchStats()}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Customers",
      value: stats.total_customers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      onClick: () => navigate("/customers"),
    },
    {
      title: "Total Partners",
      value: stats.total_partners,
      icon: Store,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      onClick: () => navigate("/partners"),
    },
    {
      title: "Active Partners",
      value: stats.active_partners,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      onClick: () => navigate("/partners?status=approved"),
    },
    {
      title: "Pending Verifications",
      value: stats.pending_verifications,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      onClick: () => navigate("/partners/pending"),
    },
    {
      title: "Total Orders",
      value: stats.total_orders,
      icon: ShoppingCart,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      onClick: () => navigate("/orders"),
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.total_revenue),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Credits in Circulation",
      value: formatCredits(stats.credits_in_circulation),
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      onClick: () => navigate("/credit-plans"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your system performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={
              stat.onClick
                ? "cursor-pointer hover:shadow-lg transition-shadow"
                : ""
            }
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.orders_by_status &&
        Object.keys(stats.orders_by_status).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Orders by Status</CardTitle>
              <CardDescription>
                Distribution of orders across different statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.orders_by_status).map(
                  ([status, count]) => (
                    <div key={status} className="border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground uppercase">
                        {status}
                      </div>
                      <div className="text-2xl font-bold mt-1">{count}</div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
