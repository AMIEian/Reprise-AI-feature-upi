import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useBuyCredits } from "../context/BuyCreditsContext";
import { handleApiError } from "../lib/errorHandler";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { motion } from "framer-motion";

interface Lead {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  pickup_address_line: string;
  pickup_city: string;
  pickup_state: string;
  pickup_pincode: string | null;
  phone_name: string;
  brand: string;
  model: string;
  ram_gb: number | null;
  storage_gb: number | null;
  ai_estimated_price: number;
  final_quoted_price: number;
  ai_reasoning: string;
  customer_condition_answers: {
    screen_condition: string;
    device_turns_on: boolean;
    has_original_box: boolean;
    has_original_bill: boolean;
    device_age?: string;
  };
  status: string;
  created_at: string;
  lead_locked_at?: string;
  purchased_at?: string;
  assigned_at?: string;
  agent_id?: number;
  agent_name?: string;
}

interface Agent {
  id: number;
  full_name: string;
  phone: string;
  is_active: boolean;
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { openBuyModal } = useBuyCredits();
  const [lead, setLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [ordersRes, agentsRes] = await Promise.all([
        api.get("/partner/orders"),
        api.get("/partner/agents"),
      ]);
      // Find the specific order by ID
      const order = ordersRes.data.find((o: Lead) => o.id === parseInt(id!));
      setLead(order || null);
      setAgents(agentsRes.data.filter((a: Agent) => a.is_active));
    } catch (error) {
      console.error("Failed to fetch data:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) {
      alert("Please select an agent");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(
        `/partner/orders/${id}/assign?agent_id=${selectedAgentId}`,
      );
      await fetchData();
      alert("Agent assigned successfully!");
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">Lead not found</p>
            <Button
              className="mt-4 w-full"
              onClick={() => navigate("/partner/dashboard")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPurchased =
    lead.status === "lead_purchased" ||
    lead.status === "assigned_to_agent" ||
    lead.status === "accepted_by_agent";
  const canAssignAgent = lead.status === "lead_purchased" && !lead.agent_id;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header
        pageTitle="Lead Details"
        showLogout={true}
        onLogout={handleLogout}
        showDashboardButton={true}
        onBuyCredits={openBuyModal}
        additionalContent={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/partner/dashboard")}
            >
              ← Back
            </Button>
            <Badge className="text-sm px-3 py-1">
              {lead.status.replace(/_/g, " ")}
            </Badge>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1100px] mx-auto h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full"
          >
            {/* Left Panel - Asset Summary (70%) */}
            <div className="lg:col-span-7">
              <Card className="shadow-lg h-full flex flex-col">
                <CardContent className="p-8 flex-1 flex flex-col">
                  {/* Phone Details Header */}
                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-10 h-10 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {lead.phone_name || `${lead.brand} ${lead.model}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {[
                          lead.ram_gb ? `${lead.ram_gb}GB RAM` : null,
                          lead.storage_gb
                            ? `${lead.storage_gb}GB Storage`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                  </div>

                  {/* AI Price Section - Banner Style */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                      AI Estimated Price
                    </h3>
                    <div className="text-5xl font-bold text-green-600 mb-4">
                      {formatPrice(
                        lead.ai_estimated_price || lead.final_quoted_price,
                      )}
                    </div>
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <svg
                        className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-xs text-blue-700 leading-relaxed">
                        {lead.ai_reasoning}
                      </div>
                    </div>
                  </div>

                  {/* Condition Analysis */}
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                      Condition Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
                        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                          Screen
                        </div>
                        <div className="font-bold text-base capitalize text-gray-900">
                          {lead.customer_condition_answers.screen_condition}
                        </div>
                      </div>
                      <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
                        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                          Powers On
                        </div>
                        <div className="font-bold text-base text-gray-900">
                          {lead.customer_condition_answers.device_turns_on ? (
                            <span className="text-green-600">Yes ✓</span>
                          ) : (
                            <span className="text-red-600">No ✗</span>
                          )}
                        </div>
                      </div>
                      <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
                        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                          Original Box
                        </div>
                        <div className="font-bold text-base text-gray-900">
                          {lead.customer_condition_answers.has_original_box ? (
                            <span className="text-green-600">Yes ✓</span>
                          ) : (
                            <span className="text-red-600">No ✗</span>
                          )}
                        </div>
                      </div>
                      <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
                        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                          Original Bill
                        </div>
                        <div className="font-bold text-base text-gray-900">
                          {lead.customer_condition_answers.has_original_bill ? (
                            <span className="text-green-600">Yes ✓</span>
                          ) : (
                            <span className="text-red-600">No ✗</span>
                          )}
                        </div>
                      </div>
                      {lead.customer_condition_answers.device_age && (
                        <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white col-span-2">
                          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                            Device Age
                          </div>
                          <div className="font-bold text-base text-gray-900 capitalize">
                            {lead.customer_condition_answers.device_age}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information (if purchased) */}
                  {isPurchased && (
                    <div className="mt-6 pt-6 border-t-2 border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                        Customer Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Name</div>
                            <div className="font-semibold text-sm text-gray-900">
                              {lead.customer_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Phone</div>
                            <div className="font-semibold text-sm text-gray-900">
                              {lead.customer_phone}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-orange-600"
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
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Address</div>
                            <div className="font-semibold text-sm text-gray-900 leading-relaxed">
                              {lead.pickup_address_line}, {lead.pickup_city},{" "}
                              {lead.pickup_state}
                              {lead.pickup_pincode
                                ? ` - ${lead.pickup_pincode}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Action Sidebar (30%) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Assigned Agent */}
              {lead.agent_name && (
                <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-4">
                      Assigned Agent
                    </h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-2xl">
                          {lead.agent_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {lead.agent_name}
                        </div>
                        <div className="text-xs text-gray-600">Field Agent</div>
                      </div>
                    </div>
                    {/* <div className="grid grid-cols-2 gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        Message
                      </Button>
                    </div> */}

                    {/* Actions Section */}
                    {/* <div className="pt-4 border-t-2 border-green-300">
                      <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
                        Actions
                      </h4>
                      <Button
                        variant="default"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                        disabled
                      >
                        Mark Pickup Completed
                      </Button>
                    </div> */}
                  </CardContent>
                </Card>
              )}

              {/* Assign Agent Section */}
              {canAssignAgent && (
                <Card className="shadow-lg flex-1 flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-4">
                      Assign Agent
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {agents.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                          No active agents available
                        </p>
                      ) : (
                        agents.map((agent) => (
                          <div
                            key={agent.id}
                            className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                              selectedAgentId === agent.id
                                ? "border-indigo-500 bg-indigo-50 shadow-md"
                                : "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
                            }`}
                            onClick={() => setSelectedAgentId(agent.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-600 font-bold text-sm">
                                  {agent.full_name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-gray-900">
                                  {agent.full_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {agent.phone}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {agents.length > 0 && (
                      <div className="space-y-2">
                        <Button
                          onClick={handleAssignAgent}
                          disabled={actionLoading || !selectedAgentId}
                          className="w-full h-10 text-sm font-semibold"
                        >
                          {actionLoading ? "Assigning..." : "Assign Agent"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate("/partner/agents")}
                          className="w-full h-9 text-xs"
                        >
                          Manage Agents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
