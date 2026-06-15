import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { AlertCircle, Lock, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface PartnerOnHoldModalProps {
  isOpen: boolean;
  reason?: string;
  liftDate?: string;
  verificationStatus?: string;
}

export default function PartnerOnHoldModal({
  isOpen,
  reason,
  liftDate,
  verificationStatus,
}: PartnerOnHoldModalProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleClose = () => {
    logout();
    navigate("/");
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "pending":
        return {
          title: "Application Under Review",
          icon: Clock,
          bgColor: "bg-yellow-100",
          iconColor: "text-yellow-600",
          headerGradient: "from-yellow-600 to-orange-600",
          message:
            "Your application is currently being reviewed by our team. This typically takes 1-2 business days. You'll receive an email notification once the review is complete.",
        };
      case "under_review":
        return {
          title: "Application Under Review",
          icon: AlertCircle,
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
          headerGradient: "from-blue-600 to-indigo-600",
          message:
            "Our team is actively reviewing your application details and documentation. You'll be notified of any updates.",
        };
      case "clarification_needed":
        return {
          title: "More Information Needed",
          icon: AlertCircle,
          bgColor: "bg-orange-100",
          iconColor: "text-orange-600",
          headerGradient: "from-orange-600 to-red-600",
          message:
            "We need some additional information to proceed with your application. Please contact our support team for details.",
        };
      case "suspended":
        return {
          title: "Account Suspended",
          icon: Lock,
          bgColor: "bg-red-100",
          iconColor: "text-red-600",
          headerGradient: "from-red-600 to-rose-600",
          message:
            "Your account has been suspended. Please contact our support team to discuss your account status.",
        };
      case "rejected":
      default:
        return {
          title: "Application Rejected",
          icon: Lock,
          bgColor: "bg-red-100",
          iconColor: "text-red-600",
          headerGradient: "from-red-600 to-rose-600",
          message:
            "Your application has been rejected. Please contact our support team to discuss the reasons and reapply if conflicts are resolved.",
        };
    }
  };

  const statusConfig = getStatusConfig(verificationStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="bg-white border-gray-200 shadow-2xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-16 h-16 ${statusConfig.bgColor} rounded-full flex items-center justify-center`}
            >
              <StatusIcon className={`w-8 h-8 ${statusConfig.iconColor}`} />
            </div>
          </div>
          <AlertDialogTitle
            className={`text-2xl font-bold text-center bg-gradient-to-r ${statusConfig.headerGradient} bg-clip-text text-transparent`}
          >
            {statusConfig.title}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {reason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900 mb-1">
                Status Details:
              </p>
              <p className="text-sm text-yellow-800">{reason}</p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{statusConfig.message}</p>
          </div>

          {liftDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Review Expected By:
              </p>
              <p className="text-sm text-blue-800">
                {new Date(liftDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            onClick={handleClose}
            className="bg-gray-600 hover:bg-gray-700"
          >
            Go to Home
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
