import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import Header from "../components/Header";

export default function ApplicationStatus() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    if (!user || user.type !== "partner") {
      navigate("/partner/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    // Refresh user data only once when user first becomes available
    if (user && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      refreshUser();
    }
  }, [user]); // Only depend on user, not refreshUser

  useEffect(() => {
    // If user is approved, redirect to dashboard
    if (user && user.verification_status === "approved") {
      navigate("/partner/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          icon: Clock,
          color: "bg-yellow-50 border-yellow-200",
          textColor: "text-yellow-800",
          description:
            "Your application is being reviewed by our team. This typically takes 1-2 business days.",
          badge: (
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <Clock className="w-3 h-3 mr-1" />
              Under Review
            </Badge>
          ),
        };
      case "under_review":
        return {
          label: "Under Review",
          icon: AlertCircle,
          color: "bg-blue-50 border-blue-200",
          textColor: "text-blue-800",
          description:
            "Our team is actively reviewing your application details and documentation.",
          badge: (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              Processing
            </Badge>
          ),
        };
      case "clarification_needed":
        return {
          label: "More Information Needed",
          icon: AlertCircle,
          color: "bg-orange-50 border-orange-200",
          textColor: "text-orange-800",
          description:
            "We need some additional information to proceed with your application. Please contact our support team.",
          badge: (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              Clarification Needed
            </Badge>
          ),
        };
      case "approved":
        return {
          label: "Application Approved",
          icon: CheckCircle,
          color: "bg-green-50 border-green-200",
          textColor: "text-green-800",
          description: "Congratulations! Your application has been approved.",
          badge: (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <CheckCircle className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          ),
        };
      case "rejected":
        return {
          label: "Application Rejected",
          icon: XCircle,
          color: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          description:
            "Your application has been rejected. You can contact our support team to discuss the reasons and reapply if conflicts are resolved.",
          badge: (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              <XCircle className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          ),
        };
      case "suspended":
        return {
          label: "Account Suspended",
          icon: XCircle,
          color: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          description: "Your account has been suspended.",
          badge: (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              <XCircle className="w-3 h-3 mr-1" />
              Suspended
            </Badge>
          ),
        };
      default:
        return {
          label: "Unknown Status",
          icon: AlertCircle,
          color: "bg-gray-50 border-gray-200",
          textColor: "text-gray-800",
          description: "Unable to determine your application status.",
          badge: (
            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
              Unknown
            </Badge>
          ),
        };
    }
  };

  const statusDisplay = getStatusDisplay(user.verification_status || "pending");
  const StatusIcon = statusDisplay.icon;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBackHome = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <Header
        showLoginButtons={false}
        showLogout={true}
        onLogout={handleLogout}
        userName={user.name}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 pt-24">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={handleBackHome}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader
              className={`${statusDisplay.color} border-b-2 border-inherit space-y-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-white/80">
                    <StatusIcon
                      className={`w-8 h-8 ${statusDisplay.textColor}`}
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle
                      className={`text-2xl ${statusDisplay.textColor}`}
                    >
                      {statusDisplay.label}
                    </CardTitle>
                    <CardDescription className={statusDisplay.textColor}>
                      Application submitted on{" "}
                      {new Date(
                        user.created_at || Date.now(),
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </div>
                <div>{statusDisplay.badge}</div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-8">
              {/* Main Status Message */}
              <Alert className={`${statusDisplay.color} border-inherit`}>
                <StatusIcon className={`h-4 w-4 ${statusDisplay.textColor}`} />
                <AlertDescription className={statusDisplay.textColor}>
                  {statusDisplay.description}
                </AlertDescription>
              </Alert>

              {/* Partner Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Application Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium text-gray-900">{user.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-medium text-gray-900">
                        {user.phone || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-gray-900">
                        {user.verification_status
                          ?.replace(/_/g, " ")
                          .toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason - Only show if rejected */}
                {user.verification_status === "rejected" &&
                  user.rejection_reason && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="ml-3">
                        <AlertDescription className="font-semibold text-red-900 mb-2">
                          Reason for Rejection
                        </AlertDescription>
                        <p className="text-red-800">{user.rejection_reason}</p>
                      </div>
                    </Alert>
                  )}

                {/* Next Steps */}
                {user.verification_status === "rejected" && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <div className="ml-3">
                      <AlertDescription className="font-semibold text-blue-900 mb-2">
                        What to do next?
                      </AlertDescription>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Review the rejection reason above carefully</li>
                        <li>• Resolve any conflicts or issues mentioned</li>
                        <li>• Contact our support team to discuss</li>
                        <li>
                          • Once conflicts are resolved, admin can re-approve
                          your application
                        </li>
                      </ul>
                    </div>
                  </Alert>
                )}

                {user.verification_status === "approved" && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="ml-3">
                      <AlertDescription className="font-semibold text-green-900">
                        You can now access the Partner Dashboard to manage leads
                        and agents!
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {user.verification_status &&
                  !["approved", "rejected"].includes(
                    user.verification_status,
                  ) && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div className="ml-3">
                        <AlertDescription className="font-semibold text-blue-900">
                          Check back later for updates on your application
                          status
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6 justify-center">
            {user.verification_status === "approved" && (
              <Button
                onClick={() => navigate("/partner/dashboard")}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
            <Button
              onClick={handleBackHome}
              variant="outline"
              className="border-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
