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
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PartnerHoldModalProps {
  open: boolean;
  partnerId: number;
  partnerName: string;
  onClose: () => void;
  onHoldPlaced: () => void;
}

export default function PartnerHoldModal({
  open,
  partnerId,
  partnerName,
  onClose,
  onHoldPlaced,
}: PartnerHoldModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [liftOption, setLiftOption] = useState("admin_decides");
  const [liftDate, setLiftDate] = useState("");

  const handlePlaceHold = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the hold", { duration: 4000 });
      return;
    }

    if (liftOption === "specific_date" && !liftDate) {
      toast.error("Please select a lift date", { duration: 4000 });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reason: reason.trim(),
        lift_date:
          liftOption === "specific_date"
            ? new Date(liftDate).toISOString()
            : null,
        admin_decides_lift: liftOption === "admin_decides",
      };

      await api.post(`/admin/partners/${partnerId}/hold`, payload);
      showSuccessToast(`Partner "${partnerName}" placed on hold!`);
      setReason("");
      setLiftOption("admin_decides");
      setLiftDate("");
      onHoldPlaced();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Partner not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("already on hold")
      ) {
        toast.error("This partner is already on hold.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, handlePlaceHold);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Partner on Hold</DialogTitle>
          <DialogDescription>
            Hold the partner account for rule violations. They cannot access
            leads or make deals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Partner Name</Label>
            <p className="text-sm text-gray-600 mt-1">{partnerName}</p>
          </div>

          <div>
            <Label htmlFor="reason" className="font-semibold">
              Reason for Hold *
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe the reason for placing this partner on hold (e.g., Multiple payment defaults, Poor service quality, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters required
            </p>
          </div>

          <div className="relative z-10">
            <Label htmlFor="lift-option" className="font-semibold">
              Hold Lift Option *
            </Label>
            <Select value={liftOption} onValueChange={setLiftOption}>
              <SelectTrigger id="lift-option" className="mt-1 w-full">
                <SelectValue placeholder="Select lift option" />
              </SelectTrigger>
              <SelectContent className="w-full" side="bottom" align="start">
                <SelectItem value="admin_decides">
                  Admin Decides (Manual Lift)
                </SelectItem>
                <SelectItem value="specific_date">
                  Specific Date (Auto Lift)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2 pt-1">
              Choose whether you will manually lift the hold or set an auto-lift
              date
            </p>
          </div>

          {liftOption === "specific_date" && (
            <div>
              <Label htmlFor="lift-date" className="font-semibold">
                Hold Lift Date *
              </Label>
              <Input
                id="lift-date"
                type="datetime-local"
                value={liftDate}
                onChange={(e) => setLiftDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select when the hold should automatically lift
              </p>
            </div>
          )}

          {liftOption === "admin_decides" && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                You will need to manually lift this hold. Use the lift hold
                option on the partner details page when ready.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePlaceHold}
            disabled={
              loading ||
              !reason.trim() ||
              (liftOption === "specific_date" && !liftDate)
            }
          >
            {loading ? "Placing Hold..." : "Place Hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
