import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useBuyCredits } from "../context/BuyCreditsContext";
import { handleApiError } from "../lib/errorHandler";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Agent {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  employee_id?: string;
  is_active: boolean;
  created_at: string;
}

export default function AgentsManagement() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { openBuyModal } = useBuyCredits();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSelfAssignForm, setShowSelfAssignForm] = useState(false);
  const [selfAssignLoading, setSelfAssignLoading] = useState(false);
  const [selfAssignFormData, setSelfAssignFormData] = useState({
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    full_name: user?.name || "",
    employee_id: "",
  });
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    employee_id: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Initialize selfAssignFormData with user details when component mounts
  useEffect(() => {
    if (user) {
      setSelfAssignFormData({
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        full_name: user.name || "",
        employee_id: "",
      });
    }
  }, [user]);

  useEffect(() => {
    fetchAgents();
  }, []);

  // Check if partner has already self-assigned as an agent (case-insensitive comparison)
  const hasSelfAssigned = user?.email
    ? agents.some(
        (agent) => agent.email.toLowerCase() === user.email.toLowerCase(),
      )
    : false;

  console.log(user?.email, agents, hasSelfAssigned);
  const fetchAgents = async () => {
    try {
      const response = await api.get("/partner/agents");
      setAgents(response.data);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfAssignAsAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfAssignLoading(true);

    try {
      const response = await api.post(
        "/partner/self-assign-as-agent",
        selfAssignFormData,
      );
      setSelfAssignFormData({
        email: "",
        phone: "",
        password: "",
        full_name: "",
        employee_id: "",
      });
      setShowSelfAssignForm(false);
      await fetchAgents();
      alert(
        response.data?.message ||
          "Successfully self-assigned as an agent! You can now login to the agent portal.",
      );
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSelfAssignLoading(false);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await api.post("/partner/agents", formData);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        employee_id: "",
      });
      setShowAddForm(false);
      await fetchAgents();
      alert("Agent added successfully!");
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (
    agentId: number,
    currentStatus: boolean,
  ) => {
    const newStatus = !currentStatus;

    try {
      await api.patch(`/partner/agents/${agentId}`, { is_active: newStatus });
      await fetchAgents();
    } catch (error: any) {
      handleApiError(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Header
        pageTitle="Agents Management"
        showLogout={true}
        onLogout={handleLogout}
        showDashboardButton={true}
        onBuyCredits={openBuyModal}
        additionalContent={
          <Button
            variant="outline"
            onClick={() => navigate("/partner/dashboard")}
          >
            ← Back to Dashboard
          </Button>
        }
      />
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-gray-500">Manage your delivery agents</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Self-Assign as Agent Section */}
        <div className="mb-8">
          <Card className="relative overflow-hidden border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
            {/* Decorative Spots */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-30" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-100 rounded-full -ml-12 -mb-12 opacity-30" />

            <CardHeader className="relative z-10 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Self-Assign as Agent
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-2">
                    Become an agent yourself and handle pickups directly. You'll
                    be able to login to the agent portal and manage orders.
                  </CardDescription>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl shadow-md">
                  👤
                </div>
              </div>
            </CardHeader>

            {hasSelfAssigned ? (
              <CardContent className="relative z-10 py-6">
                <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">✓</div>
                    <div>
                      <p className="font-semibold text-green-800">
                        Already Self-Assigned as Agent
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        You've successfully created your agent account. You can
                        now login to the agent portal with your partner
                        credentials.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            ) : !showSelfAssignForm ? (
              <CardContent className="relative z-10 py-6">
                <Button
                  onClick={() => setShowSelfAssignForm(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all text-white"
                >
                  ✓ Self-Assign as Agent
                </Button>
              </CardContent>
            ) : (
              <CardContent className="relative z-10">
                <form onSubmit={handleSelfAssignAsAgent} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-2">
                        ✓ Your Partner Details (Auto-filled)
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Email:</span>
                          <span className="font-medium text-gray-700">
                            {selfAssignFormData.email}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Name:</span>
                          <span className="font-medium text-gray-700">
                            {selfAssignFormData.full_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Phone:</span>
                          <span className="font-medium text-gray-700">
                            {selfAssignFormData.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-green-700 font-medium">
                        💡 Tip: Leave password empty to use your partner account
                        password. This way you'll use the same credentials for
                        both portals!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sa_password">
                        Agent Password (Optional)
                      </Label>
                      <Input
                        id="sa_password"
                        type="password"
                        placeholder="Leave empty to use your partner password"
                        value={selfAssignFormData.password}
                        onChange={(e) =>
                          setSelfAssignFormData({
                            ...selfAssignFormData,
                            password: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-gray-500">
                        If you want a different password, enter one here
                        (minimum 8 characters)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sa_employee_id">
                        Employee ID (Optional)
                      </Label>
                      <Input
                        id="sa_employee_id"
                        placeholder="e.g., EMP-001"
                        value={selfAssignFormData.employee_id}
                        onChange={(e) =>
                          setSelfAssignFormData({
                            ...selfAssignFormData,
                            employee_id: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={selfAssignLoading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all text-white"
                    >
                      {selfAssignLoading
                        ? "Processing..."
                        : "✓ Self-Assign as Agent"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSelfAssignForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Add Agent Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className={
              showAddForm
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
            }
          >
            {showAddForm ? "✕ Cancel" : "+ Add New Agent"}
          </Button>
        </div>

        {/* Add Agent Form */}
        {showAddForm && (
          <Card className="mb-8 relative overflow-hidden border-2 shadow-lg">
            {/* Decorative Spots for Form */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-16 -mt-16 opacity-30" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-100 rounded-full -ml-12 -mb-12 opacity-30" />

            <CardHeader className="relative z-10 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Add New Agent
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create a new agent account for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form onSubmit={handleAddAgent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID (Optional)</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employee_id: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
                >
                  {formLoading ? "Adding..." : "✓ Add Agent"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Agents List */}
        {loading ? (
          <div className="text-center py-12">Loading agents...</div>
        ) : agents.length === 0 ? (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100 rounded-full -mr-20 -mt-20 opacity-40" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full -ml-16 -mb-16 opacity-40" />
            <CardContent className="relative z-10 py-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 mb-4 text-lg font-medium">
                No agents added yet
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Start building your delivery team
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                + Add Your First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 bg-gradient-to-br from-white to-gray-50"
              >
                {/* Decorative Spots */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full -mr-12 -mt-12 opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-100 rounded-full -ml-10 -mb-10 opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-pink-100 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="absolute bottom-1/3 left-1/4 w-12 h-12 bg-indigo-100 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />

                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {agent.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
                          {agent.full_name}
                        </CardTitle>
                        {agent.employee_id && (
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {agent.employee_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={agent.is_active ? "default" : "secondary"}
                      className={
                        agent.is_active
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm"
                          : "bg-gray-200 text-gray-600"
                      }
                    >
                      {agent.is_active ? "✓ Active" : "○ Inactive"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 space-y-3">
                  {/* Email Section */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
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
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">
                        Email
                      </div>
                    </div>
                    <div className="font-medium text-gray-700 text-sm truncate">
                      {agent.email}
                    </div>
                  </div>

                  {/* Phone Section */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-4 h-4 text-purple-600"
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
                      <div className="text-xs text-purple-700 font-medium uppercase tracking-wide">
                        Phone
                      </div>
                    </div>
                    <div className="font-medium text-gray-700 text-sm">
                      {agent.phone}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant={agent.is_active ? "outline" : "default"}
                    size="sm"
                    className={`w-full mt-2 transition-all ${
                      agent.is_active
                        ? "border-2 border-gray-300 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                    }`}
                    onClick={() =>
                      handleToggleStatus(agent.id, agent.is_active)
                    }
                  >
                    {agent.is_active ? "⊗ Deactivate" : "✓ Activate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
