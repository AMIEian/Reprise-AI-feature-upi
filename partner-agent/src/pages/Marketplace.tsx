import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useBuyCredits } from "../context/BuyCreditsContext";
import api from "../lib/api";
import { handleApiError } from "../lib/errorHandler";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Lead {
  order_id: number;
  phone_name: string;
  brand?: string;
  model?: string;
  ram_gb?: number;
  storage_gb?: number;
  quoted_price: number;
  ai_estimated_price?: number;
  pickup_pincode: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_date?: string;
  pickup_time?: string;
  is_locked?: boolean;
  locked_by_me?: boolean;
  created_at: string;
  status?: string;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { openBuyModal } = useBuyCredits();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sell-phone/partner/leads/available");
      setLeads(res.data || []);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const lockLead = async (orderId: number) => {
    if (!confirm("Lock this lead for exclusive viewing?")) return;
    setActionLoading(true);
    try {
      await api.post(`/sell-phone/partner/leads/${orderId}/lock`);
      // Redirect to partner dashboard after locking
      navigate("/partner/dashboard");
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const purchaseLead = async (orderId: number) => {
    if (!confirm("Purchase this lead (deduct credits)?")) return;
    setActionLoading(true);
    try {
      await api.post(`/sell-phone/partner/leads/${orderId}/purchase`);
      await fetchLeads();
      alert("Lead purchased successfully");
    } catch (err: any) {
      handleApiError(err, "purchase");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Header
        pageTitle="Marketplace"
        showLogout={true}
        onLogout={handleLogout}
        showDashboardButton={true}
        onBuyCredits={openBuyModal}
        additionalContent={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/partner/dashboard")}
            >
              Back
            </Button>
            <Button onClick={fetchLeads}>Refresh</Button>
          </div>
        }
      />
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-gray-500">
            Live leads available for purchase
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">No live leads available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <Card
                key={lead.order_id}
                className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 bg-gradient-to-br from-white to-gray-50"
              >
                {/* Decorative Spots */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-100 rounded-full -ml-12 -mb-12 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-pink-100 rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />

                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
                        {lead.brand} {lead.model}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {lead.ram_gb && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {lead.ram_gb}GB RAM
                          </span>
                        )}
                        {lead.storage_gb && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {lead.storage_gb}GB
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 shadow-sm">
                      {lead.status || "lead"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10">
                  <div className="space-y-4">
                    {/* Price Section */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                          Estimated Value
                        </span>
                      </div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-1">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(lead.ai_estimated_price || lead.quoted_price)}
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                          Pickup Location
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {lead.pickup_city || "City"},{" "}
                        {lead.pickup_state || "State"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        PIN: {lead.pickup_pincode}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {!lead.is_locked && (
                        <Button
                          onClick={() => lockLead(lead.order_id)}
                          disabled={actionLoading}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                          🔒 Lock Lead
                        </Button>
                      )}
                      {lead.is_locked && !lead.locked_by_me && (
                        <Button
                          variant="outline"
                          disabled
                          className="flex-1 border-2 border-gray-300 text-gray-400"
                        >
                          🔒 Locked by Others
                        </Button>
                      )}
                      {lead.locked_by_me && (
                        <Button
                          onClick={() => purchaseLead(lead.order_id)}
                          disabled={actionLoading}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                          💳 Purchase Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
