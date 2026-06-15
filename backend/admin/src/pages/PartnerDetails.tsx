import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import api from "../lib/api";
import { showErrorToastWithRetry, showSuccessToast } from "../lib/errorHandler";
import { formatDateTime } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import PartnerHoldModal from "../components/PartnerHoldModal";
import LiftPartnerHoldModal from "../components/LiftPartnerHoldModal";

interface HoldStatus {
  is_on_hold: boolean;
  hold_details?: {
    reason: string;
    hold_date: string;
    lift_date: string | null;
  };
  message: string;
}

interface PartnerDetails {
  partner: {
    id: number;
    email: string;
    full_name: string;
    phone: string;
    company_name: string;
    business_address: string;
    udyam_id: string;
    udyam_aadhar_image?: string | null;
    pan_number: string;
    verification_status: string;
    rejection_reason: string;
    credit_balance: number;
    is_active: boolean;
    created_at: string;
  };
  serviceable_pincodes: Array<{
    id: number;
    pincode: string;
    city: string;
    state: string;
    is_active: boolean;
  }>;
  verification_history: Array<{
    id: number;
    action_type: string;
    message_from_admin: string;
    message_from_partner: string;
    created_at: string;
  }>;
  agents: Array<{
    id: number;
    partner_id: number;
    email: string;
    phone: string;
    full_name: string;
    employee_id: string | null;
    is_active: boolean;
    created_at: string;
  }>;
}

export default function PartnerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [holdStatus, setHoldStatus] = useState<HoldStatus | null>(null);

  // Dialog states
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [liftModalOpen, setLiftModalOpen] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchPartnerDetails();
  }, [id]);

  const fetchPartnerDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/partners/${id}/verification-details`,
      );
      setDetails(response.data);

      // Fetch hold status
      try {
        const holdResponse = await api.get(`/admin/partners/${id}/hold-status`);
        setHoldStatus(holdResponse.data);
      } catch (error) {
        console.error("Failed to fetch hold status:", error);
      }
    } catch (error: any) {
      console.error("Failed to fetch partner details:", error);
      const retryFn = () => fetchPartnerDetails();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/admin/partners/${id}/approve`, {
        approval_notes: approvalNotes,
      });
      showSuccessToast("Partner approved successfully!");
      setApproveDialog(false);
      await fetchPartnerDetails();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Partner not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("already approved")
      ) {
        toast.error("Partner is already approved.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, handleApprove);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason", { duration: 4000 });
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/admin/partners/${id}/reject`, {
        rejection_reason: rejectionReason,
      });
      showSuccessToast("Partner rejected successfully!");
      setRejectDialog(false);
      await fetchPartnerDetails();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Partner not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("already rejected")
      ) {
        toast.error("Partner is already rejected.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, handleReject);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Partner not found</p>
        <Button onClick={() => navigate("/partners")} className="mt-4">
          Back to Partners
        </Button>
      </div>
    );
  }

  const {
    partner,
    serviceable_pincodes,
    verification_history,
    agents = [],
  } = details;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Partner Details</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage partner verification
          </p>
        </div>
      </div>

      {/* Partner Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{partner.full_name}</CardTitle>
              <CardDescription>{partner.email}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  partner.verification_status === "approved"
                    ? "default"
                    : partner.verification_status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {partner.verification_status.replace(/_/g, " ").toUpperCase()}
              </Badge>
              {holdStatus?.is_on_hold && (
                <Badge
                  variant="destructive"
                  className="bg-red-100 text-red-800"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  ON HOLD
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hold Status Alert */}
          {holdStatus?.is_on_hold && holdStatus.hold_details && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    Partner is on Hold
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>Reason:</strong> {holdStatus.hold_details.reason}
                  </p>
                  {holdStatus.hold_details.lift_date && (
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Auto-Lift Date:</strong>{" "}
                      {new Date(
                        holdStatus.hold_details.lift_date,
                      ).toLocaleString()}
                    </p>
                  )}
                  {!holdStatus.hold_details.lift_date && (
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Hold Type:</strong> Indefinite (requires manual
                      lift)
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="mt-3 bg-green-600 hover:bg-green-700"
                    onClick={() => setLiftModalOpen(true)}
                  >
                    <Unlock className="w-3 h-3 mr-2" />
                    Lift Hold
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">{partner.phone}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Company Name</Label>
              <p className="font-medium">{partner.company_name || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Business Address</Label>
              <p className="font-medium">{partner.business_address || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                Udyam Registration ID
              </Label>
              <p className="font-medium">{partner.udyam_id || "-"}</p>
            </div>
            {partner.udyam_aadhar_image && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">
                  Udyam Aadhaar Certificate
                </Label>
                <div className="mt-1">
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL}${partner.udyam_aadhar_image}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm"
                  >
                    View Certificate
                  </a>
                  <div className="mt-2 border rounded overflow-hidden max-w-xs">
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${partner.udyam_aadhar_image}`}
                      alt="Udyam Aadhaar Certificate"
                      className="max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">PAN Number</Label>
              <p className="font-medium">{partner.pan_number || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Credit Balance</Label>
              <p className="font-medium">◇{partner.credit_balance}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Applied On</Label>
              <p className="font-medium">
                {formatDateTime(partner.created_at)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Account Status</Label>
              <p className="font-medium">
                {partner.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {partner.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <Label className="text-red-800 font-semibold">
                Rejection Reason
              </Label>
              <p className="text-red-700 mt-1">{partner.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Serviceable Pincodes */}
      <Card>
        <CardHeader>
          <CardTitle>Serviceable Pincodes</CardTitle>
          <CardDescription>
            {serviceable_pincodes.length} pincode(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {serviceable_pincodes.length === 0 ? (
              <p className="text-muted-foreground">No pincodes configured</p>
            ) : (
              serviceable_pincodes.map((pincode) => (
                <Badge key={pincode.id} variant="outline">
                  {pincode.pincode}
                  {pincode.city && ` - ${pincode.city}`}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
          <CardDescription>
            {agents.length} agent(s) working under this partner
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-muted-foreground">No agents assigned yet</p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{agent.full_name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{agent.email}</span>
                      <span>{agent.phone}</span>
                      {agent.employee_id && (
                        <span>ID: {agent.employee_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={agent.is_active ? "default" : "secondary"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification History */}
      <Card>
        <CardHeader>
          <CardTitle>Verification History</CardTitle>
          <CardDescription>
            Timeline of all verification actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verification_history.length === 0 ? (
            <p className="text-muted-foreground">No history available</p>
          ) : (
            <div className="space-y-4">
              {verification_history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-border pl-4 pb-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">
                      {entry.action_type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.message_from_admin && (
                    <div className="bg-blue-50 rounded p-3 mt-2">
                      <p className="text-sm font-semibold text-blue-800">
                        Admin Message:
                      </p>
                      <p className="text-sm text-blue-700">
                        {entry.message_from_admin}
                      </p>
                    </div>
                  )}
                  {entry.message_from_partner && (
                    <div className="bg-muted rounded p-3 mt-2">
                      <p className="text-sm font-semibold text-foreground">
                        Partner Response:
                      </p>
                      <p className="text-sm text-foreground">
                        {entry.message_from_partner}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {partner.verification_status !== "approved" &&
        partner.verification_status !== "rejected" && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Review and take action on this application
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={() => setApproveDialog(true)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Partner
              </Button>

              <Button
                onClick={() => setRejectDialog(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject Application
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Re-approve Rejected Partner */}
      {partner.verification_status === "rejected" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">
              Reapproval Available
            </CardTitle>
            <CardDescription className="text-orange-800">
              This partner application was rejected but can be reapproved if
              conflicts have been resolved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {partner.rejection_reason && (
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  Original Rejection Reason:
                </p>
                <p className="text-sm text-orange-800">
                  {partner.rejection_reason}
                </p>
              </div>
            )}
            <div className="flex gap-4">
              <Button
                onClick={() => setApproveDialog(true)}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Partner Now
              </Button>
              <Button
                onClick={() => setRejectDialog(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hold/Lift Partner Card */}
      {partner.verification_status === "approved" && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Hold Management</CardTitle>
            <CardDescription>
              Place or lift hold on partner for rule violations
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {holdStatus?.is_on_hold ? (
              <Button
                onClick={() => setLiftModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Unlock className="h-4 w-4" />
                Lift Hold
              </Button>
            ) : (
              <Button
                onClick={() => setHoldModalOpen(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Place On Hold
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog} onOpenChange={setApproveDialog}>
        <AlertDialogContent className="bg-white border-gray-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Approve Partner
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This will approve the partner and grant them access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Approval Notes (Optional)</Label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes for this approval..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <AlertDialogContent className="bg-white border-gray-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              Reject Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Please provide a reason for rejection. This will be visible to the
              partner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this application is being rejected..."
              rows={4}
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Partner Hold Modal */}
      {details && (
        <>
          <PartnerHoldModal
            open={holdModalOpen}
            partnerId={partner.id}
            partnerName={partner.full_name}
            onClose={() => setHoldModalOpen(false)}
            onHoldPlaced={() => {
              setHoldModalOpen(false);
              fetchPartnerDetails();
            }}
          />
          {holdStatus?.is_on_hold && (
            <LiftPartnerHoldModal
              open={liftModalOpen}
              partnerId={partner.id}
              partnerName={partner.full_name}
              holdReason={holdStatus.hold_details?.reason || ""}
              onClose={() => setLiftModalOpen(false)}
              onHoldLifted={() => {
                setLiftModalOpen(false);
                fetchPartnerDetails();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
