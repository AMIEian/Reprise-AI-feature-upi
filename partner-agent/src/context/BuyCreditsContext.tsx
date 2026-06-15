import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import api from "../lib/api";
import { handleApiError } from "../lib/errorHandler";

interface CreditPlan {
  id: number;
  plan_name: string;
  description: string;
  bonus_percentage: number;
  credit_amount: number;
  price: number;
}

interface PaymentRequest {
  id: number;
  credit_amount: number;
  payment_amount: number;
  created_at: string;
  approval_status: "pending" | "approved" | "rejected";
  approval_notes?: string;
}

interface BuyCreditsContextType {
  showBuyModal: boolean;
  setShowBuyModal: (show: boolean) => void;
  plans: CreditPlan[];
  purchaseLoading: boolean;
  paymentStep: "select_plan" | "payment_proof";
  selectedPlan: CreditPlan | null;
  paymentRequestId: number | null;
  paymentRequests: PaymentRequest[];
  screenshot: File | null;
  screenshotPreview: string;
  openBuyModal: () => Promise<void>;
  handleBuyPlan: (planId: number) => void;
  handleScreenshotSelect: (file: File) => void;
  handleSubmitPayment: () => Promise<void>;
  fetchPaymentRequests: () => Promise<void>;
  resetModal: () => void;
  goBackToPlanSelection: () => void;
  resetScreenshot: () => void;
}

const BuyCreditsContext = createContext<BuyCreditsContextType | undefined>(
  undefined,
);

export const useBuyCredits = () => {
  const context = useContext(BuyCreditsContext);
  if (context === undefined) {
    throw new Error("useBuyCredits must be used within a BuyCreditsProvider");
  }
  return context;
};

interface BuyCreditsProviderProps {
  children: ReactNode;
}

export const BuyCreditsProvider: React.FC<BuyCreditsProviderProps> = ({
  children,
}) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "select_plan" | "payment_proof"
  >("select_plan");
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<number | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");

  const resetModal = () => {
    setShowBuyModal(false);
    setPaymentStep("select_plan");
    setSelectedPlan(null);
    setPaymentRequestId(null);
    setScreenshot(null);
    setScreenshotPreview("");
  };

  const openBuyModal = async () => {
    try {
      const resp = await api.get("/partner/credit-plans");
      setPlans(resp.data || []);
      setShowBuyModal(true);
    } catch (err) {
      console.error("Failed to load credit plans:", err);
      handleApiError(err);
    }
  };

  const handleBuyPlan = (planId: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setPaymentStep("payment_proof");
    }
  };

  const resetScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview("");
  };

  const goBackToPlanSelection = () => {
    setPaymentStep("select_plan");
    setSelectedPlan(null);
    setPaymentRequestId(null);
    resetScreenshot();
  };

  const handleScreenshotSelect = (file: File) => {
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!screenshot) {
      alert("Please select a screenshot");
      return;
    }

    if (!selectedPlan) {
      alert("Please select a plan first");
      return;
    }

    setPurchaseLoading(true);
    try {
      let requestId = paymentRequestId;

      if (!requestId) {
        const requestResp = await api.post(
          "/partner/payment-request",
          new URLSearchParams({
            plan_id: selectedPlan.id.toString(),
          }),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          },
        );
        requestId = requestResp.data.request_id;
        setPaymentRequestId(requestId);
      }

      if (!requestId) {
        throw new Error("Failed to get payment request ID");
      }

      const formData = new FormData();
      formData.append("payment_screenshot", screenshot);
      formData.append("request_id", requestId.toString());

      await api.post("/partner/submit-payment-proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert(
        "Payment proof submitted successfully! Our admin will review it within 24 hours.",
      );
      setShowBuyModal(false);
      resetModal();
      fetchPaymentRequests();
    } catch (err) {
      console.error("Failed to submit payment:", err);
      handleApiError(err);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const response = await api.get("/partner/payment-requests");
      setPaymentRequests(response.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch payment requests:", err);
    }
  };

  const value: BuyCreditsContextType = {
    showBuyModal,
    setShowBuyModal,
    plans,
    purchaseLoading,
    paymentStep,
    selectedPlan,
    paymentRequestId,
    paymentRequests,
    screenshot,
    screenshotPreview,
    openBuyModal,
    handleBuyPlan,
    handleScreenshotSelect,
    handleSubmitPayment,
    fetchPaymentRequests,
    resetModal,
    goBackToPlanSelection,
    resetScreenshot,
  };

  return (
    <BuyCreditsContext.Provider value={value}>
      {children}
    </BuyCreditsContext.Provider>
  );
};
