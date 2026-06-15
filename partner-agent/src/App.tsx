import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BuyCreditsProvider } from "./context/BuyCreditsContext";
import BuyCreditsModal from "./components/BuyCreditsModal";
import PartnerLogin from "./pages/PartnerLogin";
import PartnerDashboard from "./pages/PartnerDashboard";
import Marketplace from "./pages/Marketplace";
import LeadDetail from "./pages/LeadDetail";
import LeadPurchaseConfirmation from "./pages/LeadPurchaseConfirmation";
import AgentsManagement from "./pages/AgentsManagement";
import AgentLogin from "./pages/AgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import Home from "./pages/Home";
import ApplicationStatus from "./pages/ApplicationStatus";
import { Toaster } from "./components/ui/sonner";

function ProtectedRoute({
  children,
  allowedType,
}: {
  children: React.ReactNode;
  allowedType: "partner" | "agent";
}) {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || userType !== allowedType) {
    return (
      <Navigate
        to={allowedType === "partner" ? "/partner/login" : "/agent/login"}
        replace
      />
    );
  }

  // For partners, check if they are approved
  if (allowedType === "partner" && user.verification_status !== "approved") {
    return <Navigate to="/partner/application-status" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route
        path="/partner/login"
        element={
          user && userType === "partner" ? (
            user.verification_status === "approved" ? (
              <Navigate to="/partner/dashboard" replace />
            ) : (
              <Navigate to="/partner/application-status" replace />
            )
          ) : (
            <PartnerLogin />
          )
        }
      />
      <Route
        path="/partner/application-status"
        element={<ApplicationStatus />}
      />
      <Route
        path="/agent/login"
        element={
          user && userType === "agent" ? (
            <Navigate to="/agent/dashboard" replace />
          ) : (
            <AgentLogin />
          )
        }
      />

      {/* Partner Routes */}
      <Route
        path="/partner/dashboard"
        element={
          <ProtectedRoute allowedType="partner">
            <PartnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/marketplace"
        element={
          <ProtectedRoute allowedType="partner">
            <Marketplace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/lead/:id"
        element={
          <ProtectedRoute allowedType="partner">
            <LeadDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/lead/:id/purchase"
        element={
          <ProtectedRoute allowedType="partner">
            <LeadPurchaseConfirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/agents"
        element={
          <ProtectedRoute allowedType="partner">
            <AgentsManagement />
          </ProtectedRoute>
        }
      />

      {/* Agent Routes */}
      <Route
        path="/agent/dashboard"
        element={
          <ProtectedRoute allowedType="agent">
            <AgentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BuyCreditsProvider>
          <AppRoutes />
          <BuyCreditsModal />
          <Toaster />
        </BuyCreditsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
