import { useEffect, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { showErrorToastWithRetry, showSuccessToast } from "../lib/errorHandler";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Plus, Edit, Trash2, Settings, Download } from "lucide-react";

interface CreditPlan {
  id: number;
  plan_name: string;
  credit_amount: number;
  price: number;
  bonus_percentage: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface PaymentRequest {
  id: number;
  partner_id: number;
  partner_email: string;
  partner_name: string;
  plan_id: number | null;
  credit_amount: number;
  payment_amount: number;
  bonus_percentage: number;
  approval_status: string;
  approval_notes: string | null;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  created_at: string;
  has_screenshot: boolean;
}

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string | null;
  updated_at: string;
}

export default function CreditPlans() {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [leadCostPercentage, setLeadCostPercentage] = useState<string>("15.0");
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  // Payment request states
  const [activeTab, setActiveTab] = useState<"plans" | "payments">("plans");
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] =
    useState<PaymentRequest | null>(null);
  const [paymentScreenshotModal, setPaymentScreenshotModal] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string>("");
  const [approveRejectDialog, setApproveRejectDialog] = useState(false);
  const [approveRejectAction, setApproveRejectAction] = useState<
    "approve" | "reject"
  >("approve");
  const [approveRejectNotes, setApproveRejectNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    plan_name: "",
    credit_amount: "",
    price: "",
    bonus_percentage: "",
    description: "",
  });

  useEffect(() => {
    fetchPlans();
    fetchSystemConfig();
    if (activeTab === "payments") {
      fetchPaymentRequests();
    }
  }, []);

  useEffect(() => {
    if (activeTab === "payments") {
      fetchPaymentRequests();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/credit-plans");
      setPlans(response.data);
    } catch (error: any) {
      console.error("Failed to fetch credit plans:", error);
      const retryFn = () => fetchPlans();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const response = await api.get("/admin/config");
      const configs: SystemConfig[] = response.data;
      const leadCostConfig = configs.find(
        (c) => c.config_key === "lead_cost_percentage",
      );
      if (leadCostConfig) {
        setLeadCostPercentage(leadCostConfig.config_value);
      }
    } catch (error: any) {
      console.error("Failed to fetch system config:", error);
      toast.error("Could not load system config.", { duration: 3000 });
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      setPaymentLoading(true);
      const response = await api.get("/admin/payment-requests");
      setPaymentRequests(response.data);
    } catch (error: any) {
      console.error("Failed to fetch payment requests:", error);
      toast.error("Failed to load payment requests", { duration: 3000 });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleViewScreenshot = async (req: PaymentRequest) => {
    if (!req.has_screenshot) {
      toast.error("No screenshot available", { duration: 3000 });
      return;
    }
    try {
      const response = await api.get(
        `/admin/payment-requests/${req.id}/screenshot`,
      );
      setScreenshotData(
        `${import.meta.env.VITE_API_BASE_URL}${response.data.url}`,
      );
      setSelectedPaymentRequest(req);
      setPaymentScreenshotModal(true);
    } catch (error: any) {
      console.error("Failed to load screenshot:", error);
      toast.error("Failed to load screenshot", { duration: 3000 });
    }
  };

  const handleApproveReject = async () => {
    if (!selectedPaymentRequest) return;

    if (approveRejectAction === "reject" && !approveRejectNotes.trim()) {
      toast.error("Please provide a reason for rejection", { duration: 3000 });
      return;
    }

    setIsProcessing(true);
    try {
      if (approveRejectAction === "approve") {
        await api.post(
          `/admin/payment-requests/${selectedPaymentRequest.id}/approve`,
          {
            approval_notes: approveRejectNotes,
          },
        );
        toast.success("Payment approved! Credits added to partner account", {
          duration: 3000,
        });
      } else {
        await api.post(
          `/admin/payment-requests/${selectedPaymentRequest.id}/reject`,
          {
            approval_notes: approveRejectNotes,
          },
        );
        toast.success("Payment rejected", { duration: 3000 });
      }
      setApproveRejectDialog(false);
      setApproveRejectNotes("");
      setSelectedPaymentRequest(null);
      await fetchPaymentRequests();
    } catch (error: any) {
      console.error("Failed to process payment:", error);
      toast.error(`Failed to ${approveRejectAction} payment`, {
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/credit-plans", {
        ...formData,
        credit_amount: parseFloat(formData.credit_amount),
        price: parseFloat(formData.price),
        bonus_percentage: parseFloat(formData.bonus_percentage) || 0,
      });
      showSuccessToast("Credit plan created successfully!");
      setCreateDialog(false);
      resetForm();
      await fetchPlans();
    } catch (error: any) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("already exists")
      ) {
        toast.error("A plan with this name already exists.", {
          duration: 4000,
        });
      } else {
        showErrorToastWithRetry(error, () => handleCreate(e));
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      await api.put(`/admin/credit-plans/${selectedPlan.id}`, {
        ...formData,
        credit_amount: parseFloat(formData.credit_amount),
        price: parseFloat(formData.price),
        bonus_percentage: parseFloat(formData.bonus_percentage) || 0,
      });
      showSuccessToast("Credit plan updated successfully!");
      setEditDialog(false);
      resetForm();
      setSelectedPlan(null);
      await fetchPlans();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Credit plan not found.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, () => handleEdit(e));
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this credit plan?"))
      return;

    try {
      await api.delete(`/admin/credit-plans/${id}`);
      showSuccessToast("Credit plan deactivated successfully!");
      await fetchPlans();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Credit plan not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("in use")
      ) {
        toast.error("Cannot deactivate a plan that has active subscriptions.", {
          duration: 4000,
        });
      } else {
        showErrorToastWithRetry(error, () => handleDelete(id));
      }
    }
  };

  const openEditDialog = (plan: CreditPlan) => {
    setSelectedPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      credit_amount: plan.credit_amount.toString(),
      price: plan.price.toString(),
      bonus_percentage: plan.bonus_percentage.toString(),
      description: plan.description || "",
    });
    setEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      plan_name: "",
      credit_amount: "",
      price: "",
      bonus_percentage: "",
      description: "",
    });
  };

  const handleUpdateLeadCostPercentage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingConfig(true);
    try {
      const value = parseFloat(leadCostPercentage);
      if (isNaN(value) || value < 0 || value > 100) {
        toast.error("Please enter a valid percentage between 0 and 100.", {
          duration: 4000,
        });
        setIsUpdatingConfig(false);
        return;
      }
      await api.put("/admin/config/lead_cost_percentage", {
        config_value: leadCostPercentage,
      });
      showSuccessToast("Lead cost percentage updated successfully!");
      setConfigDialog(false);
    } catch (error: any) {
      showErrorToastWithRetry(error, () => handleUpdateLeadCostPercentage(e));
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Credit Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage credit plans and partner payment approvals
          </p>
        </div>
        {activeTab === "plans" && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setConfigDialog(true)}
              className="w-full sm:w-auto"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Lead Cost
            </Button>
            <Button
              onClick={() => setCreateDialog(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "plans"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Credit Plans
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "payments"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Payment Requests
        </button>
      </div>

      {/* Credit Plans Section */}
      {activeTab === "plans" && (
        <Card>
          <CardHeader>
            <CardTitle>All Credit Plans</CardTitle>
            <CardDescription>{plans.length} plan(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No credit plans found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Bonus %</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.plan_name}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(plan.credit_amount)}
                      </TableCell>
                      <TableCell>{formatCurrency(plan.price)}</TableCell>
                      <TableCell>{plan.bonus_percentage}%</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {plan.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={plan.is_active ? "default" : "secondary"}
                        >
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Requests Section */}
      {activeTab === "payments" && (
        <>
          {paymentLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Partner Payment Requests</CardTitle>
                <CardDescription>
                  Review and approve/reject UPI payment screenshots for credit
                  purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No payment requests found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Credit Amount</TableHead>
                        <TableHead>Payment (₹)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-medium">
                              {req.partner_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {req.partner_email}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {req.credit_amount.toFixed(0)} credits
                            {req.bonus_percentage > 0 && (
                              <div className="text-xs text-green-600">
                                +{req.bonus_percentage}% ={" "}
                                {(
                                  req.credit_amount *
                                  (1 + req.bonus_percentage / 100)
                                ).toFixed(0)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₹{req.payment_amount.toFixed(0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.approval_status === "pending"
                                  ? "secondary"
                                  : req.approval_status === "approved"
                                    ? "default"
                                    : "destructive"
                              }
                            >
                              {req.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(req.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {req.has_screenshot && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewScreenshot(req)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {req.approval_status === "pending" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    setSelectedPaymentRequest(req);
                                    setApproveRejectAction("approve");
                                    setApproveRejectNotes("");
                                    setApproveRejectDialog(true);
                                  }}
                                >
                                  Approve
                                </Button>
                              )}
                              {req.approval_status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedPaymentRequest(req);
                                    setApproveRejectAction("reject");
                                    setApproveRejectNotes("");
                                    setApproveRejectDialog(true);
                                  }}
                                >
                                  Reject
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Credit Plan</DialogTitle>
            <DialogDescription>
              Create a new credit package for partners to purchase
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan_name">Plan Name *</Label>
              <Input
                id="plan_name"
                required
                value={formData.plan_name}
                onChange={(e) =>
                  setFormData({ ...formData, plan_name: e.target.value })
                }
                placeholder="e.g., Starter Pack"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit_amount">Credit Amount *</Label>
                <Input
                  id="credit_amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.credit_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_amount: e.target.value })
                  }
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="9000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_percentage">Bonus Percentage</Label>
              <Input
                id="bonus_percentage"
                type="number"
                step="0.01"
                value={formData.bonus_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_percentage: e.target.value })
                }
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this plan..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Plan</DialogTitle>
            <DialogDescription>
              Update the credit plan details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_plan_name">Plan Name *</Label>
              <Input
                id="edit_plan_name"
                required
                value={formData.plan_name}
                onChange={(e) =>
                  setFormData({ ...formData, plan_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_credit_amount">Credit Amount *</Label>
                <Input
                  id="edit_credit_amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.credit_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_price">Price (₹) *</Label>
                <Input
                  id="edit_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_bonus_percentage">Bonus Percentage</Label>
              <Input
                id="edit_bonus_percentage"
                type="number"
                step="0.01"
                value={formData.bonus_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_percentage: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialog(false);
                  resetForm();
                  setSelectedPlan(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Lead Cost Percentage</DialogTitle>
            <DialogDescription>
              Set the percentage of quoted price that partners pay to purchase a
              lead
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLeadCostPercentage} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead_cost_percentage">
                Lead Cost Percentage (%)
              </Label>
              <Input
                id="lead_cost_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={leadCostPercentage}
                onChange={(e) => setLeadCostPercentage(e.target.value)}
                placeholder="15.0"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Example: If a phone's quoted price is ₹10,000 and this is set to
                15%, the lead cost will be ₹1,500.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfigDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingConfig}>
                {isUpdatingConfig ? "Updating..." : "Update Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Screenshot Modal */}
      <Dialog
        open={paymentScreenshotModal}
        onOpenChange={setPaymentScreenshotModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
            <DialogDescription>
              {selectedPaymentRequest?.partner_name} - Request ID:{" "}
              {selectedPaymentRequest?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 rounded-lg overflow-auto max-h-[60vh] flex items-center justify-center">
            {screenshotData ? (
              <img
                src={screenshotData}
                alt="Payment screenshot"
                className="max-w-full"
              />
            ) : (
              <p className="text-muted-foreground">Loading screenshot...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={approveRejectDialog} onOpenChange={setApproveRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approveRejectAction === "approve"
                ? "Approve Payment"
                : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {selectedPaymentRequest?.partner_name} • Amount: ₹
              {selectedPaymentRequest?.payment_amount} • Credits:{" "}
              {selectedPaymentRequest?.credit_amount}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApproveReject();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="approval_notes">
                {approveRejectAction === "approve"
                  ? "Approval Notes"
                  : "Rejection Reason"}{" "}
                *
              </Label>
              <Textarea
                id="approval_notes"
                required={approveRejectAction === "reject"}
                value={approveRejectNotes}
                onChange={(e) => setApproveRejectNotes(e.target.value)}
                placeholder={
                  approveRejectAction === "reject"
                    ? "Why are you rejecting this payment?"
                    : "Optional notes..."
                }
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveRejectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className={
                  approveRejectAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {isProcessing
                  ? "Processing..."
                  : approveRejectAction === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
