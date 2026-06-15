import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SellPhone from "./pages/SellPhone";
import SellLaptop from "./pages/SellLaptop";
import PhoneDetail from "./pages/PhoneDetail";
import BrandModels from "./pages/BrandModels";
import LaptopDetail from "./pages/LaptopDetail";
import ComingSoon from "./pages/ComingSoon";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Lazy load less critical pages
const WhyCashNow = lazy(() => import("./pages/WhyCashNow"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Contact = lazy(() => import("./pages/Contact"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const BecomePartner = lazy(() => import("./pages/BecomePartner"));
const Referral = lazy(() => import("./pages/Referral"));

// Auth pages
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="h-screen w-screen flex items-center justify-center">
                Loading...
              </div>
            }
          >
            <Routes>
              {/* Main pages */}
              <Route path="/" element={<Index />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route
                path="/sell-phone"
                element={
                  <ProtectedRoute>
                    <SellPhone />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sell-phone/:brandName"
                element={
                  <ProtectedRoute>
                    <BrandModels />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sell-laptop"
                element={
                  <ProtectedRoute>
                    <SellLaptop />
                  </ProtectedRoute>
                }
              />
              <Route path="/sell/:phoneId" element={<PhoneDetail />} />
              <Route path="/sell-laptop/:laptopId" element={<LaptopDetail />} />

              {/* Customer/login: use CustomerLogin at /login */}
              <Route path="/login" element={<CustomerLogin />} />

              {/* Agent routes */}
              {/* <Route path="/agent/login" element={<AgentLogin />} />
            <Route path="/agent/register" element={<AgentLogin />} /> */}

              {/* Lazy loaded pages */}

              <Route path="/why-cashnow" element={<WhyCashNow />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/become-partner" element={<BecomePartner />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/my-orders" element={<MyOrders />} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
