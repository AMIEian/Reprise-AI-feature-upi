"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Box,
  HardDrive,
  Smartphone,
  DollarSign,
  Home,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Http } from "@capacitor-community/http";

interface Step {
  id: number;
  name: string;
  icon: LucideIcon;
}

interface PhoneOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

interface ScreenCondition {
  id: string;
  name: string;
  description: string;
  priceAdjustment: number;
}

interface PhoneData {
  id: number;
  Brand?: string;
  Model?: string;
  Selling_Price?: number;
  image_blob?: string;
  image_url?: string;
  RAM_GB?: number;
  Internal_Storage_GB?: number;
}

interface VariantsResponse {
  rams?: number[];
  storages?: number[];
}

interface VariantPriceResponse {
  base_price?: number;
}

interface PredictionResponse {
  predicted_price?: number;
}

interface PhoneDetailsForAPI {
  brand?: string;
  model?: string;
  ram_gb: number | null;
  storage_gb: number | null;
  screen_condition: string;
  device_turns_on: boolean;
  has_original_box: boolean;
  has_original_bill: boolean;
  device_age: string | null;
}

interface SaleData {
  id: number | string;
  name: string;
  brand?: string;
  model?: string;
  ram_gb: number;
  storage_gb: number;
  variant: string;
  condition: string;
  price: number;
  conditionAnswers: {
    screen_condition: string;
    device_turns_on: string;
    has_original_box: string;
    has_original_bill: string;
    device_age: string;
  };
}

interface PhoneSummary {
  id: number | string;
  name: string;
  brand?: string;
  image: string;
  basePrice: number;
  ramOptions: PhoneOption[];
  storageOptions: PhoneOption[];
  screenConditions: ScreenCondition[];
}

interface AgeOption {
  id: string;
  label: string;
  description: string;
}

const BASE_STEPS: Step[] = [
  { id: 1, name: "RAM", icon: HardDrive },
  { id: 2, name: "Storage", icon: HardDrive },
  { id: 3, name: "Condition", icon: Smartphone },
  { id: 4, name: "Final Quote", icon: DollarSign },
];

const APPLE_STEPS: Step[] = [
  { id: 1, name: "Storage", icon: HardDrive },
  { id: 2, name: "Condition", icon: Smartphone },
  { id: 3, name: "Final Quote", icon: DollarSign },
];

// Predefined RAM options
const RAM_OPTIONS: PhoneOption[] = [
  { id: "4gb", name: "4GB", priceAdjustment: 0 },
  { id: "6gb", name: "6GB", priceAdjustment: 0 },
  { id: "8gb", name: "8GB", priceAdjustment: 0 },
  { id: "12gb", name: "12GB", priceAdjustment: 0 },
  { id: "16gb", name: "16GB", priceAdjustment: 0 },
];

// Helper function to safely get API URL
const getApiUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return baseUrl.replace(/\/$/, "");
};

export default function PhoneDetail() {
  const params = useParams() as { phoneId?: string };
  const phoneId = params?.phoneId as string | undefined;
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isApplePhone, setIsApplePhone] = useState<boolean>(false);
  const [STEPS, setSTEPS] = useState<Step[]>(BASE_STEPS);

  // Form state
  const [selectedRam, setSelectedRam] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [selectedScreenCondition, setSelectedScreenCondition] =
    useState<string>("");
  const [deviceTurnsOn, setDeviceTurnsOn] = useState<string>("");
  const [hasOriginalBox, setHasOriginalBox] = useState<string>("");
  const [hasOriginalBill, setHasOriginalBill] = useState<string>("");
  const [deviceAge, setDeviceAge] = useState<string>("");

  // Fetch phone data from backend
  const {
    data: phoneData,
    isLoading,
    error,
  } = useQuery<PhoneData, Error>({
    queryKey: ["phone", phoneId],
    queryFn: async () => {
      const API_URL = getApiUrl();
      const response = await Http.request({
        method: "GET",
        url: `${API_URL}/sell-phone/phones/${phoneId}`,
        params: {},
        headers: { Accept: "application/json" },
      });
      if (response.status >= 400) throw new Error("Failed to fetch phone");
      return response.data as PhoneData;
    },
    enabled: !!phoneId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Show toast on phone fetch error
  useEffect(() => {
    if (error) {
      toast.error("We couldn't load the phone details. Please try again.", {
        description: "A network or server error occurred.",
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
        duration: 8000,
      });
    }
  }, [error]);

  // Fetch phone variants
  const { data: variants, isLoading: isVariantsLoading } = useQuery({
    queryKey: ["phoneVariants", phoneId],
    queryFn: async () => {
      const API_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      const response = await Http.request({
        method: "GET",
        url: `${API_URL}/sell-phone/phones/${phoneId}/variants`,
        params: {},
        headers: { Accept: "application/json" },
      });
      if (response.status >= 400) throw new Error("Failed to fetch variants");
      return response.data;
    },
    enabled: !!phoneId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch dynamic base price based on selections
  const { data: variantPrice } = useQuery({
    queryKey: ["phoneVariantPrice", phoneId, selectedRam, selectedStorage],
    queryFn: async () => {
      // Updated to parse selectedRam dynamically (e.g., "8gb" -> 8)
      const parseRam = (ram: string) => {
        const match = ram.match(/^(\d+)gb$/i);
        return match ? parseInt(match[1], 10) : 0;
      };
      const parseStorage = (storage: string) => {
        const match = storage.match(/^(\d+)gb$/i);
        return match ? parseInt(match[1], 10) : storage === "1tb" ? 1024 : 0;
      };
      const API_URL = getApiUrl();
      const response = await Http.request({
        method: "GET",
        url: `${API_URL}/sell-phone/phones/${phoneId}/price`,
        params: {
          ram_gb: parseRam(selectedRam).toString(),
          storage_gb: parseStorage(selectedStorage).toString(),
        },
        headers: { Accept: "application/json" },
      });
      if (response.status >= 400)
        throw new Error("Failed to fetch variant price");
      return response.data;
    },
    enabled: !!phoneId && !!selectedRam && !!selectedStorage,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Use dynamic base price if available, else fallback
  const basePrice = variantPrice?.base_price || phoneData?.Selling_Price || 0;

  // Fetch predicted price from backend
  const {
    data: predictionData,
    isLoading: isPredictionLoading,
    error: predictionError,
  } = useQuery({
    queryKey: [
      "pricePrediction",
      phoneId,
      selectedRam,
      selectedStorage,
      selectedScreenCondition,
      deviceTurnsOn,
      hasOriginalBox,
      hasOriginalBill,
      deviceAge,
    ],
    queryFn: async () => {
      const API_URL = getApiUrl();
      const response = await Http.request({
        method: "POST",
        url: `${API_URL}/customer-side-prediction/predict-price`,
        data: {
          phone_details: getPhoneDetailsForAPI(),
          // base_price is now fetched from DB based on brand, model, ram_gb, storage_gb
        },
        params: {},
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (response.status >= 400) throw new Error("Failed to fetch prediction");
      return response.data;
    },
    enabled:
      !!phoneData &&
      ((isApplePhone && currentStep === 3) ||
        (!isApplePhone && currentStep === 4)) &&
      !!selectedRam &&
      !!selectedStorage &&
      !!selectedScreenCondition &&
      !!deviceTurnsOn &&
      !!hasOriginalBox &&
      !!hasOriginalBill &&
      !!deviceAge,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Show toast on prediction error
  useEffect(() => {
    if (predictionError) {
      toast.warning(
        "We couldn't estimate a final price right now. You can continue to checkout, and an agent will confirm the price.",
        {
          description: "Price prediction service is currently unavailable.",
          action: {
            label: "Continue Anyway",
            onClick: () => {
              if (phoneData) {
                localStorage.setItem("phoneData", JSON.stringify(phoneData));
                router.push("/checkout");
              }
            },
          },
          duration: 8000,
        },
      );
    }
  }, [predictionError, phoneData, router]);

  // Set up phone-specific state when phoneData loads
  useEffect(() => {
    if (phoneData) {
      const isApple = phoneData.Brand?.toLowerCase() === "apple";
      if (isApple !== isApplePhone) {
        setIsApplePhone(isApple);
        // Set STEPS based on brand
        if (isApple) {
          setSTEPS(APPLE_STEPS);
        } else {
          setSTEPS(BASE_STEPS);
        }
      }

      // For Apple phones, auto-set RAM
      if (isApple) {
        // If RAM_GB exists in DB, use it; otherwise set to "na"
        if (phoneData.RAM_GB && phoneData.RAM_GB > 0) {
          setSelectedRam(`${phoneData.RAM_GB}gb`);
        } else {
          setSelectedRam("na");
        }
      }
    }
  }, [phoneData, isApplePhone]);

  // Dynamically build options from variants (filter out null/invalid entries)

  if (!phoneId || isNaN(Number(phoneId))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Invalid phone ID.</p>
          <Button onClick={() => router.push("/")}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  // Dynamically build options from variants (filter out null/invalid entries)
  const ramOptions =
    (variants?.rams || [])
      .filter((r: any) => typeof r === "number" && Number.isFinite(r) && r > 0)
      .map((ram: number) => ({
        id: `${ram}gb`,
        name: `${ram}GB`,
        priceAdjustment: 0, // Placeholder; adjust based on logic if needed
      })) || [];

  const storageOptions =
    (variants?.storages || [])
      .filter((s: any) => typeof s === "number" && Number.isFinite(s) && s > 0)
      .map((storage: number) => {
        const name = storage >= 1024 ? `${storage / 1024}TB` : `${storage}GB`;
        return {
          id: `${storage}gb`,
          name,
          priceAdjustment: 0, // Placeholder; adjust based on logic if needed
        };
      }) || [];

  if (isLoading) return <p>Loading phone details...</p>;
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Phone not found or failed to load.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  if (!phoneData) return <p>Phone not found</p>;

  const baseImageUrl = getApiUrl();

  // Map DB fields to component structure
  const phone = {
    id: phoneData.id,
    name: phoneData.Brand + " " + phoneData.Model,
    brand: phoneData.Brand,
    image: phoneData.image_blob
      ? `data:image/jpeg;base64,${phoneData.image_blob}`
      : phoneData.image_url
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${phoneData.image_url}`
        : `/assets/phones/${phoneData.id}.png`, // Use new image fields with fallback
    basePrice,
    // Keep options as predefined (not in DB)
    ramOptions: isApplePhone
      ? []
      : ramOptions.length > 0
        ? ramOptions
        : RAM_OPTIONS, // Use backend options if available, else predefined
    storageOptions,
    screenConditions: [
      {
        id: "good",
        name: "Good",
        description: "No scratches, pristine condition",
        priceAdjustment: 0,
      },
      {
        id: "minor-scratches",
        name: "Minor Scratches",
        description: "Light scratches, barely visible",
        priceAdjustment: -2000,
      },
      {
        id: "major-scratches",
        name: "Major Scratches",
        description: "Visible scratches across screen",
        priceAdjustment: -5000,
      },
      {
        id: "cracked",
        name: "Cracked",
        description: "Screen has cracks but functional",
        priceAdjustment: -10000,
      },
      {
        id: "shattered",
        name: "Shattered",
        description: "Severely damaged screen",
        priceAdjustment: -15000,
      },
    ],
  };

  // Map selections to API payload
  const getPhoneDetailsForAPI = () => {
    // Updated to parse selectedRam dynamically
    const parseRam = (ram: string) => {
      if (ram === "na") return null; // Apple phones have fixed RAM
      const match = ram.match(/^(\d+)gb$/i);
      return match ? parseInt(match[1], 10) : null;
    };
    const parseStorage = (storage: string) => {
      const match = storage.match(/^(\d+)gb$/i);
      return match ? parseInt(match[1], 10) : storage === "1tb" ? 1024 : null;
    };
    return {
      brand: phone.brand,
      model: phoneData.Model, // Use from DB
      ram_gb: parseRam(selectedRam),
      storage_gb: parseStorage(selectedStorage),
      screen_condition: selectedScreenCondition,
      device_turns_on: deviceTurnsOn === "yes",
      has_original_box: hasOriginalBox === "yes",
      has_original_bill: hasOriginalBill === "yes",
      device_age: deviceAge || null,
    };
  };

  const canProceed = () => {
    if (isApplePhone) {
      // Apple phone flow: Storage, Condition, Final Quote
      if (currentStep === 1) return selectedStorage !== "";
      if (currentStep === 2)
        return (
          selectedScreenCondition !== "" &&
          deviceTurnsOn !== "" &&
          hasOriginalBox !== "" &&
          hasOriginalBill !== "" &&
          deviceAge !== ""
        );
      return true;
    } else {
      // Non-Apple phone flow: RAM, Storage, Condition, Final Quote
      if (currentStep === 1) {
        return selectedRam !== ""; // Always check selectedRam since options are provided
      }
      if (currentStep === 2) return selectedStorage !== "";
      if (currentStep === 3)
        return (
          selectedScreenCondition !== "" &&
          deviceTurnsOn !== "" &&
          hasOriginalBox !== "" &&
          hasOriginalBill !== "" &&
          deviceAge !== ""
        );
      return true;
    }
  };

  const handleProceedToSell = () => {
    const parseRam = (ram: string) => {
      const match = ram.match(/^(\d+)gb$/i);
      return match ? parseInt(match[1], 10) : 0;
    };
    const parseStorage = (storage: string) => {
      const match = storage.match(/^(\d+)gb$/i);
      return match ? parseInt(match[1], 10) : storage === "1tb" ? 1024 : 0;
    };

    const saleData = {
      id: phoneData.id,
      name: phone.name,
      brand: phoneData.Brand,
      model: phoneData.Model,
      ram_gb: parseRam(selectedRam),
      storage_gb: parseStorage(selectedStorage),
      variant: `${selectedStorage}`.replace(/gb$/i, "") + "GB",
      condition:
        phone.screenConditions.find((c) => c.id === selectedScreenCondition)
          ?.name || selectedScreenCondition,
      price: predictionData?.predicted_price || 0,
      conditionAnswers: {
        screen_condition: selectedScreenCondition,
        device_turns_on: deviceTurnsOn,
        has_original_box: hasOriginalBox,
        has_original_bill: hasOriginalBill,
        device_age: deviceAge,
      },
    };
    // Persist selected sale details so checkout (or post-login flow) can pick it up
    localStorage.removeItem("laptopData");
    localStorage.setItem("phoneData", JSON.stringify(saleData));
    // mark that this login should resume the sale flow
    localStorage.setItem("postLoginRedirect", "/checkout");
    if (isLoggedIn) {
      router.push("/checkout");
    } else {
      // Redirect to login (Login page will remain responsible for auth)
      router.push("/login");
    }
  };

  const progress = STEPS.length > 0 ? (currentStep / STEPS.length) * 100 : 0;

  // Helper: safe display for RAM/storage to avoid "null" or "NaN"
  const formatRamDisplay = (selRam: string) => {
    if (selRam) {
      const n = parseInt(String(selRam).replace(/gb$/i, ""), 10);
      if (Number.isFinite(n) && n > 0) return `${n}GB`;
    }
    if (phoneData?.RAM_GB) return `${phoneData.RAM_GB}GB`;
    return "unknown";
  };

  const formatStorageDisplay = (selStorage: string) => {
    if (selStorage) {
      if (/1tb/i.test(selStorage)) return "1TB";
      const n = parseInt(String(selStorage).replace(/gb$/i, ""), 10);
      if (Number.isFinite(n) && n > 0) return `${n}GB`;
    }
    if (phoneData?.Internal_Storage_GB)
      return `${phoneData.Internal_Storage_GB}GB`;
    return "unknown";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 py-8 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full max-h-[calc(100vh-200px)]">
            {/* Left Side - Question/Info Panel */}
            <div className="flex flex-col justify-between bg-white/40 backdrop-blur-sm rounded-3xl p-8 lg:p-12">
              {/* Header */}
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
                >
                  <ArrowLeft size={20} />
                  <span className="font-medium">Homepage</span>
                </Link>

                {/* Step indicator */}
                <div className="mb-8">
                  <p className="text-sm font-medium text-blue-600 mb-2">
                    step {currentStep}/{STEPS.length}
                  </p>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Question Title */}
                <div className="mb-8">
                  {!isApplePhone && currentStep === 1 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        What is your RAM?
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Select the RAM capacity
                      </p>
                    </>
                  )}
                  {isApplePhone && currentStep === 1 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Storage capacity?
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Select your device storage
                      </p>
                    </>
                  )}
                  {!isApplePhone && currentStep === 2 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Storage capacity?
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Select your device storage
                      </p>
                    </>
                  )}
                  {isApplePhone && currentStep === 2 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Device Condition?
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Help us assess your device
                      </p>
                    </>
                  )}
                  {!isApplePhone && currentStep === 3 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Device Condition?
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Help us assess your device
                      </p>
                    </>
                  )}
                  {!isApplePhone && currentStep === 4 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Your Final Quote
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Based on your selections
                      </p>
                    </>
                  )}
                  {isApplePhone && currentStep === 3 && (
                    <>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                        Your Final Quote
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Based on your selections
                      </p>
                    </>
                  )}
                </div>

                {/* Phone Info Card */}
                <Card className="bg-white/60 backdrop-blur border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          phone.image ||
                          `https://placehold.co/100x100?text=${phone.name}`
                        }
                        alt={phone.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/100x100?text=${phone.name}`;
                        }}
                      />
                      <div>
                        <h3 className="font-bold text-lg">{phone.name}</h3>
                        <p className="text-sm text-gray-600">{phone.brand}</p>
                        {/* Safe dynamic RAM and Storage display - only show if not unknown */}
                        {(formatRamDisplay(selectedRam) !== "unknown" ||
                          formatStorageDisplay(selectedStorage) !==
                            "unknown") && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatRamDisplay(selectedRam) !== "unknown" &&
                              `RAM: ${formatRamDisplay(selectedRam)}`}
                            {formatRamDisplay(selectedRam) !== "unknown" &&
                              formatStorageDisplay(selectedStorage) !==
                                "unknown" &&
                              " | "}
                            {formatStorageDisplay(selectedStorage) !==
                              "unknown" &&
                              `Storage: ${formatStorageDisplay(selectedStorage)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom - Navigation */}
              <div>
                <div className="flex items-center justify-end">
                  <div className="flex gap-3">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="rounded-full px-6"
                      >
                        Previous
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Options Panel */}
            <div className="flex flex-col justify-center">
              <div className="max-w-xl mx-auto w-full space-y-4">
                {/* Step 1: RAM Selection (Non-Apple phones only) */}
                {!isApplePhone && currentStep === 1 && (
                  <RadioGroup
                    value={selectedRam}
                    onValueChange={setSelectedRam}
                    className="space-y-4"
                  >
                    {phone.ramOptions.map((ram: PhoneOption) => (
                      <div key={ram.id}>
                        <RadioGroupItem
                          value={ram.id}
                          id={`ram-${ram.id}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`ram-${ram.id}`}
                          className="flex items-center gap-4 border-2 rounded-2xl p-5 cursor-pointer peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 hover:bg-white/80 bg-white/60 backdrop-blur transition-all hover:shadow-lg"
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedRam === ram.id
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedRam === ram.id && (
                              <div className="w-3 h-3 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <span className="font-semibold text-lg flex-grow">
                              {ram.name}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Step 1 (Apple) OR Step 2 (Non-Apple): Storage Selection */}
                {((!isApplePhone && currentStep === 2) ||
                  (isApplePhone && currentStep === 1)) &&
                  (isVariantsLoading ? (
                    <p>Loading storage options...</p>
                  ) : (
                    <RadioGroup
                      value={selectedStorage}
                      onValueChange={setSelectedStorage}
                      className="space-y-4"
                    >
                      {phone.storageOptions.map((storage: PhoneOption) => (
                        <div key={storage.id}>
                          <RadioGroupItem
                            value={storage.id}
                            id={`storage-${storage.id}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`storage-${storage.id}`}
                            className="flex items-center gap-4 border-2 rounded-2xl p-5 cursor-pointer peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 hover:bg-white/80 bg-white/60 backdrop-blur transition-all hover:shadow-lg"
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedStorage === storage.id
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedStorage === storage.id && (
                                <div className="w-3 h-3 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="font-semibold text-lg flex-grow">
                              {storage.name}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ))}

                {/* Step 2 (Apple) OR Step 3 (Non-Apple): Condition Assessment */}
                {((!isApplePhone && currentStep === 3) ||
                  (isApplePhone && currentStep === 2)) && (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Screen Condition */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">
                        Screen Condition
                      </h4>
                      <div className="space-y-3">
                        {phone.screenConditions.map((condition) => (
                          <div
                            key={condition.id}
                            onClick={() =>
                              setSelectedScreenCondition(condition.id)
                            }
                            className={`flex items-start gap-3 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                              selectedScreenCondition === condition.id
                                ? "border-blue-600 bg-blue-50"
                                : "border-transparent"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                selectedScreenCondition === condition.id
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedScreenCondition === condition.id && (
                                <div className="w-3 h-3 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="font-semibold">
                                {condition.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {condition.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Device Turns On */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">
                        Device turns on?
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => setDeviceTurnsOn("yes")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            deviceTurnsOn === "yes"
                              ? "border-green-600 bg-green-50"
                              : "border-transparent"
                          }`}
                        >
                          <Check size={18} />
                          <span className="font-semibold">Yes</span>
                        </div>
                        <div
                          onClick={() => setDeviceTurnsOn("no")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            deviceTurnsOn === "no"
                              ? "border-red-600 bg-red-50"
                              : "border-transparent"
                          }`}
                        >
                          <span className="font-semibold">No</span>
                        </div>
                      </div>
                    </div>

                    {/* Original Box */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">
                        Original box?
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => setHasOriginalBox("yes")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            hasOriginalBox === "yes"
                              ? "border-green-600 bg-green-50"
                              : "border-transparent"
                          }`}
                        >
                          <Box size={18} />
                          <span className="font-semibold">Yes</span>
                        </div>
                        <div
                          onClick={() => setHasOriginalBox("no")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            hasOriginalBox === "no"
                              ? "border-gray-600 bg-gray-50"
                              : "border-transparent"
                          }`}
                        >
                          <span className="font-semibold">No</span>
                        </div>
                      </div>
                    </div>

                    {/* Original Bill */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">
                        Original bill/invoice?
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => setHasOriginalBill("yes")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            hasOriginalBill === "yes"
                              ? "border-green-600 bg-green-50"
                              : "border-transparent"
                          }`}
                        >
                          <Check size={18} />
                          <span className="font-semibold">Yes</span>
                        </div>
                        <div
                          onClick={() => setHasOriginalBill("no")}
                          className={`flex items-center justify-center gap-2 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                            hasOriginalBill === "no"
                              ? "border-gray-600 bg-gray-50"
                              : "border-transparent"
                          }`}
                        >
                          <span className="font-semibold">No</span>
                        </div>
                      </div>
                    </div>

                    {/* Device Age */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">
                        How old is your device?
                      </h4>
                      <div className="space-y-3">
                        {[
                          {
                            id: "0-3 months",
                            label: "0 – 3 months",
                            description: "Almost new",
                          },
                          {
                            id: "3-6 months",
                            label: "3 – 6 months",
                            description: "Lightly used",
                          },
                          {
                            id: "6-11 months",
                            label: "6 – 11 months",
                            description: "Moderately used",
                          },
                          {
                            id: "above 11 months",
                            label: "Above 11 months",
                            description: "More than a year",
                          },
                        ].map((option) => (
                          <div
                            key={option.id}
                            onClick={() => setDeviceAge(option.id)}
                            className={`flex items-start gap-3 border-2 rounded-2xl p-4 cursor-pointer hover:bg-white/80 bg-white/60 backdrop-blur transition-all select-none ${
                              deviceAge === option.id
                                ? "border-blue-600 bg-blue-50"
                                : "border-transparent"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                deviceAge === option.id
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {deviceAge === option.id && (
                                <div className="w-3 h-3 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="font-semibold">
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 (Apple) OR Step 4 (Non-Apple): Final Quote */}
                {((!isApplePhone && currentStep === 4) ||
                  (isApplePhone && currentStep === 3)) && (
                  <div className="space-y-6">
                    {/* Price Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
                      <p className="text-sm opacity-90 mb-2">
                        Estimated Value*
                      </p>
                      {isPredictionLoading ? (
                        <p className="text-6xl font-bold mb-4">Loading...</p>
                      ) : predictionError ? (
                        <p className="text-6xl font-bold mb-4">Error</p>
                      ) : (
                        <p className="text-6xl font-bold mb-4">
                          ₹
                          {predictionData?.predicted_price?.toLocaleString() ||
                            "0"}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm opacity-90">
                        <Check size={16} />
                        <span>Instant payment upon verification</span>
                      </div>
                      <p className="text-xs opacity-75 mt-2">
                        * This is estimated price and final price would be
                        decided by the agent on visit
                      </p>
                    </div>

                    <Button
                      onClick={handleProceedToSell}
                      className="w-full h-14 text-lg rounded-2xl"
                    >
                      Proceed to Sell <ArrowRight className="ml-2" />
                    </Button>
                  </div>
                )}

                {/* Next Button for steps before final quote */}
                {((isApplePhone && currentStep < 3) ||
                  (!isApplePhone && currentStep < 4)) && (
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={!canProceed()}
                      className="rounded-2xl px-8 py-6 text-lg"
                      size="lg"
                    >
                      Next
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}