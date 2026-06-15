import { useState } from "react";
import { toast } from "sonner";
import api from "../lib/api";
import { showErrorToastWithRetry, showSuccessToast } from "../lib/errorHandler";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AlertCircle } from "lucide-react";

interface LiftPartnerHoldModalProps {
  open: boolean;
  partnerId: number;
  partnerName: string;
  holdReason: string;
  onClose: () => void;
  onHoldLifted: () => void;
}

export default function LiftPartnerHoldModal({
  open,
  partnerId,
  partnerName,
  holdReason,
  onClose,
  onHoldLifted,
}: LiftPartnerHoldModalProps) {
  const [loading, setLoading] = useState(false);
  const [liftReason, setLiftReason] = useState("");

  const handleLiftHold = async () => {
    if (!liftReason.trim()) {
      toast.error("Please provide a reason for lifting the hold", {
        duration: 4000,
      });
      return;
    }

    if (liftReason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters long.", {
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admin/partners/${partnerId}/lift-hold`, {
        lift_reason: liftReason.trim(),
      });
      showSuccessToast(`Partner "${partnerName}" hold lifted!`);
      setLiftReason("");
      onHoldLifted();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Partner not found or hold not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("not on hold")
      ) {
        toast.error("This partner is not on hold.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, handleLiftHold);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lift Partner Hold</DialogTitle>
          <DialogDescription>
            Remove the hold from the partner account and restore their access to
            the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Partner Name</Label>
            <p className="text-sm text-gray-600 mt-1">{partnerName}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Current Hold Reason
              </p>
              <p className="text-sm text-amber-700 mt-1">{holdReason}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="lift-reason" className="font-semibold">
              Reason for Lifting Hold *
            </Label>
            <Textarea
              id="lift-reason"
              placeholder="Explain why the hold is being lifted (e.g., Issue resolved, Payment cleared, etc.)"
              value={liftReason}
              onChange={(e) => setLiftReason(e.target.value)}
              className="mt-1"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 5 characters required
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              Once lifted, the partner will be able to view and purchase leads
              again. Their agents will also be able to perform actions on
              orders.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleLiftHold}
            disabled={loading || !liftReason.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Lifting Hold..." : "Lift Hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
