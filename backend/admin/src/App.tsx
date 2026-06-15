import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Partners from "./pages/Partners";
import PendingPartners from "./pages/PendingPartners";
import PartnerDetails from "./pages/PartnerDetails";
import CreditPlans from "./pages/CreditPlans";
import Orders from "./pages/Orders";
import PhonesList from "./pages/PhonesList";
import ReferralSettings from "./pages/ReferralSettings";
import CouponManagement from "./pages/CouponManagement";
import "./App.css";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="partners" element={<Partners />} />
            <Route path="partners/pending" element={<PendingPartners />} />
            <Route path="partners/:id" element={<PartnerDetails />} />
            <Route path="credit-plans" element={<CreditPlans />} />
            <Route path="orders" element={<Orders />} />
            <Route path="phones" element={<PhonesList />} />
            <Route path="referral-settings" element={<ReferralSettings />} />
            <Route path="coupons" element={<CouponManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
