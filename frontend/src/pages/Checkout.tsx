import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  ArrowLeft,
  CheckCircle,
  MapPin,
  CreditCard,
  Package,
  Sparkles,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Http } from "@capacitor-community/http";

export default function Checkout() {
  // Validation functions
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\+?[\d\s-]{10,}$/.test(phone);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Retrieve phoneData from localStorage (set in PhoneDetails) for reliability
  // Fallback to location.state or default if not available
  let phoneData;

  try {
    const phone = JSON.parse(localStorage.getItem("phoneData") || "null");
    const laptop = JSON.parse(localStorage.getItem("laptopData") || "null");

    const device = laptop || phone;

    phoneData =
      device ||
      location.state?.phoneData || {
        id: "default",
        name: "Unknown Device",
        variant: "N/A",
        condition: "N/A",
        price: 0,
      };

    console.log("Checkout Device Data:", phoneData);
  } catch (error) {
    console.error("Invalid data in localStorage:", error);
    phoneData = {
      id: "default",
      name: "Unknown Device",
      variant: "N/A",
      condition: "N/A",
      price: 0,
    };
  }

  // Form state for pre-filling from user data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // new: address / pickup controlled fields
  const [addressLine, setAddressLine] = useState("");
  const [cityVal, setCityVal] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincodeVal, setPincodeVal] = useState("");
  const [pickupDateVal, setPickupDateVal] = useState("");
  const [pickupTimeVal, setPickupTimeVal] = useState("");

  // Pincode validation state
  const [pincodeValid, setPincodeValid] = useState(false);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [serviceableInfo, setServiceableInfo] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // store fetched full user and track which fields were originally present
  const [fetchedUser, setFetchedUser] = useState<any>(null);
  const [originalHad, setOriginalHad] = useState({
    phone: false,
    address: false,
  });

  const [retrying, setRetrying] = useState(false);

  const [updatingProfile, setUpdatingProfile] = useState(false);

  // ── Coupon State ──
  const [couponCode, setCouponCode] = useState("");
  const [couponBonus, setCouponBonus] = useState(0);
  const [couponApplied, setCouponApplied] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyOrRemoveCoupon = async () => {
    if (couponApplied) {
      // Remove coupon
      setCouponApplied("");
      setCouponBonus(0);
      setCouponMsg("");
      setCouponCode("");
      setCouponSuccess(false);
      toast.info("Coupon removed");
      return;
    }
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
      const res = await api.post(`/sell-phone/coupons/validate`, {
        code: couponCode.trim().toUpperCase(),
        phone_id: (phoneData.id && phoneData.id !== "default") ? Number(phoneData.id) : null,
      });
      const data = res.data;
      if (data.valid) {
        setCouponApplied(couponCode.trim().toUpperCase());
        setCouponBonus(data.amount ?? 0);
        setCouponMsg(data.message);
        setCouponSuccess(true);
        toast.success(`Coupon applied! +₹${(data.amount ?? 0).toLocaleString()} bonus`);
      } else {
        setCouponMsg(data.message);
        setCouponSuccess(false);
        toast.error(data.message);
      }
    } catch {
      setCouponMsg("Could not validate coupon. Try again.");
      setCouponSuccess(false);
      toast.error("Coupon validation failed");
    } finally {
      setCouponLoading(false);
    }
  };

  const totalPrice = phoneData.price + couponBonus;

  // Error states for inline validation
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    addressLine: "",
    cityVal: "",
    stateVal: "",
    pincodeVal: "",
    pickupDateVal: "",
    pickupTimeVal: "",
  });

  // Check pincode serviceability
  const checkPincode = async (pin: string) => {
    if (!pin || pin.length !== 6) {
      setPincodeError("");
      setPincodeValid(false);
      setServiceableInfo(null);
      return;
    }

    setPincodeChecking(true);
    setPincodeError("");

    try {
      const response = await api.get(`/auth/check-pincode/${pin}`);
      const data = response.data;

      setServiceableInfo(data);
      setPincodeValid(data.serviceable);

      if (!data.serviceable) {
        setPincodeError(
          data.message ||
          "Cannot create orders in this pincode area. Please try a different pincode.",
        );
      }
    } catch (error) {
      console.error("Pincode check failed:", error);
      setPincodeError("Unable to verify pincode. Please try again.");
      setPincodeValid(false);
    } finally {
      setPincodeChecking(false);
    }
  };

  // Debounced pincode check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pincodeVal && pincodeVal.length === 6) {
        checkPincode(pincodeVal);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pincodeVal]);

  // Pre-fill fields if user is logged in
  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }

    // fetch full user details to prefill address and coords if present
    (async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const API_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
        const res = await Http.request({
          method: "GET",
          url: `${API_URL}/auth/me/details`,
          params: {},
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          },
        });
        if (res.status >= 400) return;
        const u = res.data;
        setFetchedUser(u);

        // Prefill name from full_name if available (handles Google /server data)
        if (u.full_name) {
          const parts = (u.full_name || "").split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }

        // Prefill common contact/address fields
        if (u.phone) setPhone(u.phone);
        if (u.email) setEmail(u.email);
        if (u.address) setAddressLine(u.address);

        // record which fields already existed to only persist missing ones later
        setOriginalHad({
          phone: !!u.phone,
          address: !!u.address,
        });
      } catch (e) {
        // ignore
      }
    })();
  }, [user]);

  // Auto-save form data to localStorage
  useEffect(() => {
    const formData = {
      firstName,
      lastName,
      phone,
      email,
      addressLine,
      cityVal,
      stateVal,
      pincodeVal,
      pickupDateVal,
      pickupTimeVal,
      paymentMethod,
      step,
    };
    localStorage.setItem("checkoutFormData", JSON.stringify(formData));
  }, [
    firstName,
    lastName,
    phone,
    email,
    addressLine,
    cityVal,
    stateVal,
    pincodeVal,
    pickupDateVal,
    pickupTimeVal,
    paymentMethod,
    step,
  ]);

  // Load saved form data on mount
  useEffect(() => {
    const saved = localStorage.getItem("checkoutFormData");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setAddressLine(data.addressLine || "");
        setCityVal(data.cityVal || "");
        setStateVal(data.stateVal || "");
        setPincodeVal(data.pincodeVal || "");
        setPickupDateVal(data.pickupDateVal || "");
        setPickupTimeVal(data.pickupTimeVal || "");
        setPaymentMethod(data.paymentMethod || "upi");
        setStep(data.step || 1);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();

    const errors = {
      firstName: firstName ? "" : "First name is required",
      lastName: lastName ? "" : "Last name is required",
      phone: validatePhone(phone) ? "" : "Please enter a valid phone number",
      email: validateEmail(email) ? "" : "Please enter a valid email address",
      addressLine: addressLine ? "" : "Address is required",
      cityVal: cityVal ? "" : "City is required",
      stateVal: stateVal ? "" : "State is required",
      pincodeVal: pincodeVal.length === 6 ? "" : "Pincode must be 6 digits",
      pickupDateVal: pickupDateVal ? "" : "Pickup date is required",
      pickupTimeVal: pickupTimeVal ? "" : "Pickup time is required",
    };

    setFieldErrors(errors);

    const hasErrors = Object.values(errors).some((error) => error);
    if (hasErrors) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setStep(2);
    window.scrollTo(0, 0);
  };

  // (No pickup coordinates collected anymore)

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate pincode before allowing order creation
    if (!pincodeVal || pincodeVal.length !== 6) {
      toast.warning("Please enter a valid 6-digit pincode", {
        description:
          "Pincode must be exactly 6 digits to proceed with checkout.",
        duration: 5000,
      });
      return;
    }

    // Check if pincode has been validated
    if (!serviceableInfo) {
      await checkPincode(pincodeVal);
      // Wait for check to complete
    }

    // Block order creation if pincode is not serviceable
    if (!pincodeValid) {
      toast.warning(
        pincodeError ||
        "Cannot create orders in this pincode area. Please try a different pincode.",
        {
          description:
            "This area is not currently serviced. Choose a different delivery location.",
          duration: 6000,
        },
      );
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("accessToken");

    // If user logged in, and some important fields were missing originally, persist them now.
    if (token && fetchedUser) {
      const updatePayload: any = {};
      if (!originalHad.phone && phone) updatePayload.phone = phone;
      if (!originalHad.address && addressLine)
        updatePayload.address = addressLine;

      if (Object.keys(updatePayload).length > 0) {
        setUpdatingProfile(true);
        try {
          await api.patch("/auth/me", updatePayload);
        } catch (err) {
          console.error("Failed to update profile during checkout", err);
          toast.error(
            "Profile update failed, but order was created. You can update details later.",
          );
        } finally {
          setUpdatingProfile(false);
        }
      }
    }

    const payload: any = {
      phone_name: phoneData.name,
      brand: phoneData.brand || phoneData.name.split(" ")[0],
      model: phoneData.model || phoneData.name.split(" ").slice(1).join(" "),
      ram_gb: phoneData.ram_gb,
      storage_gb:
        phoneData.storage_gb ||
        parseFloat(phoneData.variant?.match(/\d+/)?.[0] || "0"),
      variant: phoneData.variant,
      condition: phoneData.condition,
      quoted_price: phoneData.price,
      customer_condition_answers: phoneData.conditionAnswers || {},
      customer_name: `${firstName} ${lastName}`.trim(),
      phone_number: phone,
      email,
      address_line: addressLine,
      city: cityVal,
      state: stateVal,
      pincode: pincodeVal,
      pickup_date: pickupDateVal || null,
      pickup_time: pickupTimeVal || null,
      payment_method: paymentMethod,
      // coordinates removed — not collected
      coupon_code: couponApplied || undefined,
    };

    try {
      const res = await api.post("/sell-phone/orders", payload);
      const orderResp = res.data;
      setCreatedOrder(orderResp);
      setIsSubmitting(false);
      setStep(3);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Order create failed", err);
      setIsSubmitting(false);
      toast.error(
        "We couldn't create your order. Your payment was not processed.",
        {
          description: "A server error or validation prevented order creation.",
          action: {
            label: "Retry",
            onClick: () => {
              if (!retrying) {
                setRetrying(true);
                handleSubmitPayment(e as any).finally(() => setRetrying(false));
              }
            },
          },
          duration: Infinity,
        },
      );
    }
  };

  const stepIcons = [
    { icon: MapPin, label: "Pickup Details" },
    { icon: CreditCard, label: "Payment" },
    { icon: Package, label: "Confirmation" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Skip Links for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      <a
        href="#step-1"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to pickup details
      </a>
      <a
        href="#step-2"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-64 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to payment
      </a>
      <a
        href="#step-3"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to confirmation
      </a>

      <Header />

      <main id="main-content" className="flex-grow py-8">
        <div className="container mx-auto px-4">
          {/* Enhanced Steps Indicator */}
          <div className="mb-10">
            <div className="max-w-2xl mx-auto">
              <div className="relative flex items-center justify-between">
                {/* Progress Line Background */}
                <div className="absolute left-0 right-0 top-6 h-1 bg-gray-200 rounded-full -z-10"></div>
                {/* Progress Line Active */}
                <div
                  className="absolute left-0 top-6 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 -z-10"
                  style={{
                    width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
                  }}
                ></div>

                {stepIcons.map((stepItem, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center relative z-10"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${step > index + 1
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white scale-100"
                        : step === index + 1
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white scale-110 ring-4 ring-blue-200"
                          : "bg-white text-gray-400 border-2 border-gray-200"
                        }`}
                    >
                      {step > index + 1 ? (
                        <Check size={22} strokeWidth={3} />
                      ) : (
                        <stepItem.icon size={20} />
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm mt-3 font-medium transition-colors ${step >= index + 1 ? "text-gray-900" : "text-gray-400"
                        }`}
                    >
                      {stepItem.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {/* Step 1: Pickup Details */}
                {step === 1 && (
                  <div
                    id="step-1"
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MapPin size={22} />
                        Pickup Details
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">
                        Where should we pick up your device?
                      </p>
                      {user && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (fetchedUser) {
                              const parts = (fetchedUser.full_name || "").split(
                                " ",
                              );
                              setFirstName(parts[0] || "");
                              setLastName(parts.slice(1).join(" ") || "");
                              setPhone(fetchedUser.phone || "");
                              setEmail(fetchedUser.email || "");
                              setAddressLine(fetchedUser.address || "");
                              toast.success("Fields filled from your profile!");
                            }
                          }}
                          className="mt-2 bg-white/20 text-white hover:bg-white/30"
                        >
                          Fill from Profile
                        </Button>
                      )}
                    </div>

                    <form
                      onSubmit={handleSubmitAddress}
                      className="p-6 space-y-5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="first-name"
                            className="text-gray-700 font-medium"
                          >
                            First Name
                          </Label>
                          <Input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.firstName ? "border-red-500" : ""}`}
                            placeholder="John"
                            aria-describedby={
                              fieldErrors.firstName
                                ? "first-name-error"
                                : undefined
                            }
                          />
                          {fieldErrors.firstName && (
                            <p
                              id="first-name-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.firstName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="last-name"
                            className="text-gray-700 font-medium"
                          >
                            Last Name
                          </Label>
                          <Input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.lastName ? "border-red-500" : ""}`}
                            placeholder="Doe"
                            aria-describedby={
                              fieldErrors.lastName
                                ? "last-name-error"
                                : undefined
                            }
                          />
                          {fieldErrors.lastName && (
                            <p
                              id="last-name-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.lastName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="text-gray-700 font-medium"
                          >
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.phone ? "border-red-500" : ""}`}
                            placeholder="+91 98765 43210"
                            aria-describedby={
                              fieldErrors.phone ? "phone-error" : undefined
                            }
                          />
                          {fieldErrors.phone && (
                            <p
                              id="phone-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.phone}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="text-gray-700 font-medium"
                          >
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            required
                            className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.email ? "border-red-500" : ""}`}
                            placeholder="john@example.com"
                            aria-describedby={
                              fieldErrors.email ? "email-error" : undefined
                            }
                          />
                          {fieldErrors.email && (
                            <p
                              id="email-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="address"
                          className="text-gray-700 font-medium"
                        >
                          Full Address
                        </Label>
                        <Textarea
                          id="address"
                          value={addressLine}
                          onChange={(e) => setAddressLine(e.target.value)}
                          required
                          className={`min-h-[80px] border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.addressLine ? "border-red-500" : ""}`}
                          placeholder="House/Flat No., Street, Landmark..."
                          aria-describedby={
                            fieldErrors.addressLine
                              ? "address-error"
                              : undefined
                          }
                        />
                        {fieldErrors.addressLine && (
                          <p
                            id="address-error"
                            className="text-sm text-red-600"
                            role="alert"
                          >
                            {fieldErrors.addressLine}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="city"
                            className="text-gray-700 font-medium"
                          >
                            City
                          </Label>
                          <Input
                            id="city"
                            value={cityVal}
                            onChange={(e) => setCityVal(e.target.value)}
                            required
                            className={`h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.cityVal ? "border-red-500" : ""}`}
                            placeholder="Mumbai"
                            aria-describedby={
                              fieldErrors.cityVal ? "city-error" : undefined
                            }
                          />
                          {fieldErrors.cityVal && (
                            <p
                              id="city-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.cityVal}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="state"
                            className="text-gray-700 font-medium"
                          >
                            State
                          </Label>
                          <Select value={stateVal} onValueChange={setStateVal}>
                            <SelectTrigger
                              id="state"
                              className={`h-11 border-gray-200 ${fieldErrors.stateVal ? "border-red-500" : ""}`}
                            >
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="andhra-pradesh">
                                Andhra Pradesh
                              </SelectItem>
                              <SelectItem value="arunachal-pradesh">
                                Arunachal Pradesh
                              </SelectItem>
                              <SelectItem value="assam">Assam</SelectItem>
                              <SelectItem value="bihar">Bihar</SelectItem>
                              <SelectItem value="chhattisgarh">
                                Chhattisgarh
                              </SelectItem>
                              <SelectItem value="goa">Goa</SelectItem>
                              <SelectItem value="gujarat">Gujarat</SelectItem>
                              <SelectItem value="haryana">Haryana</SelectItem>
                              <SelectItem value="himachal-pradesh">
                                Himachal Pradesh
                              </SelectItem>
                              <SelectItem value="jharkhand">
                                Jharkhand
                              </SelectItem>
                              <SelectItem value="karnataka">
                                Karnataka
                              </SelectItem>
                              <SelectItem value="kerala">Kerala</SelectItem>
                              <SelectItem value="madhya-pradesh">
                                Madhya Pradesh
                              </SelectItem>
                              <SelectItem value="maharashtra">
                                Maharashtra
                              </SelectItem>
                              <SelectItem value="manipur">Manipur</SelectItem>
                              <SelectItem value="meghalaya">
                                Meghalaya
                              </SelectItem>
                              <SelectItem value="mizoram">Mizoram</SelectItem>
                              <SelectItem value="nagaland">Nagaland</SelectItem>
                              <SelectItem value="odisha">Odisha</SelectItem>
                              <SelectItem value="punjab">Punjab</SelectItem>
                              <SelectItem value="rajasthan">
                                Rajasthan
                              </SelectItem>
                              <SelectItem value="sikkim">Sikkim</SelectItem>
                              <SelectItem value="tamil-nadu">
                                Tamil Nadu
                              </SelectItem>
                              <SelectItem value="telangana">
                                Telangana
                              </SelectItem>
                              <SelectItem value="tripura">Tripura</SelectItem>
                              <SelectItem value="uttar-pradesh">
                                Uttar Pradesh
                              </SelectItem>
                              <SelectItem value="uttarakhand">
                                Uttarakhand
                              </SelectItem>
                              <SelectItem value="west-bengal">
                                West Bengal
                              </SelectItem>
                              <SelectItem value="andaman-and-nicobar-islands">
                                Andaman and Nicobar Islands
                              </SelectItem>
                              <SelectItem value="chandigarh">
                                Chandigarh
                              </SelectItem>
                              <SelectItem value="dadra-and-nagar-haveli-and-daman-and-diu">
                                Dadra and Nagar Haveli and Daman and Diu
                              </SelectItem>
                              <SelectItem value="delhi">Delhi</SelectItem>
                              <SelectItem value="jammu-and-kashmir">
                                Jammu and Kashmir
                              </SelectItem>
                              <SelectItem value="ladakh">Ladakh</SelectItem>
                              <SelectItem value="lakshadweep">
                                Lakshadweep
                              </SelectItem>
                              <SelectItem value="puducherry">
                                Puducherry
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldErrors.stateVal && (
                            <p
                              id="state-error"
                              className="text-sm text-red-600"
                              role="alert"
                            >
                              {fieldErrors.stateVal}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="pincode"
                            className="text-gray-700 font-medium"
                          >
                            PIN Code
                          </Label>
                          <Input
                            id="pincode"
                            value={pincodeVal}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setPincodeVal(val);
                            }}
                            maxLength={6}
                            required
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="400001"
                          />
                          {pincodeChecking && pincodeVal.length === 6 && (
                            <p className="text-sm text-blue-600">
                              Checking pincode...
                            </p>
                          )}
                          {pincodeValid && serviceableInfo && (
                            <Alert className="bg-green-50 border-green-200">
                              <AlertDescription className="text-green-800 text-sm">
                                ✓ Great! {serviceableInfo.partner_count}{" "}
                                partner(s) service your area. Estimated pickup:
                                1-2 days.
                              </AlertDescription>
                            </Alert>
                          )}
                          {pincodeError && pincodeVal.length === 6 && (
                            <Alert className="bg-amber-50 border-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-amber-800 text-sm">
                                {pincodeError}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">
                            Preferred Pickup Date
                          </Label>
                          {(() => {
                            const today = new Date();
                            const days = Array.from({ length: 7 }, (_, i) => {
                              const d = new Date(today);
                              d.setDate(today.getDate() + i);
                              return d;
                            });
                            const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
                            return (
                              <div className="grid grid-cols-7 gap-1.5">
                                {days.map((d, i) => {
                                  const iso = d.toISOString().split("T")[0];
                                  const isSelected = pickupDateVal === iso;
                                  const isToday = i === 0;
                                  return (
                                    <button
                                      key={iso}
                                      type="button"
                                      id={i === 0 ? "pickup-date" : undefined}
                                      onClick={() => setPickupDateVal(iso)}
                                      className={`
                                        flex flex-col items-center justify-center rounded-xl py-2.5 px-1 transition-all duration-200 border-2 cursor-pointer select-none
                                        ${isToday && isSelected
                                          ? "bg-gradient-to-b from-orange-400 to-orange-600 border-orange-500 text-white shadow-lg shadow-orange-300"
                                          : isToday
                                            ? "bg-gradient-to-b from-orange-400 to-orange-600 border-orange-500 text-white shadow-md shadow-orange-200 opacity-90"
                                            : isSelected
                                              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                              : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                                        }
                                      `}
                                    >
                                      <span className={`text-[10px] font-semibold tracking-wider ${isToday ? "text-white/90" : isSelected ? "text-blue-500" : "text-gray-400"}`}>
                                        {isToday ? "TODAY" : dayNames[d.getDay()]}
                                      </span>
                                      <span className={`text-lg font-bold leading-tight ${isToday ? "text-white" : isSelected ? "text-blue-700" : "text-gray-800"}`}>
                                        {d.getDate()}
                                      </span>
                                      {isToday && (
                                        <span className="text-[9px] font-bold tracking-widest text-white/80 mt-0.5">
                                          INSTANT
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="pickup-time"
                            className="text-gray-700 font-medium"
                          >
                            Preferred Time Slot
                          </Label>
                          <Select
                            value={pickupTimeVal}
                            onValueChange={setPickupTimeVal}
                          >
                            <SelectTrigger
                              id="pickup-time"
                              className="h-11 border-gray-200"
                            >
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="9-12">
                                9:00 AM - 12:00 PM
                              </SelectItem>
                              <SelectItem value="12-3">
                                12:00 PM - 3:00 PM
                              </SelectItem>
                              <SelectItem value="3-6">
                                3:00 PM - 6:00 PM
                              </SelectItem>
                              <SelectItem value="6-9">
                                6:00 PM - 9:00 PM
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="pt-4 space-y-3">
                        <Button
                          type="submit"
                          disabled={
                            !pincodeVal ||
                            pincodeVal.length !== 6 ||
                            pincodeChecking ||
                            !pincodeValid ||
                            !serviceableInfo
                          }
                          className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
                        >
                          Continue to Payment
                          <ArrowLeft size={18} className="ml-2 rotate-180" />
                        </Button>
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => toast.success("Draft saved!")}
                            className="text-sm"
                          >
                            Save Draft
                          </Button>
                          <Link
                            to="/sell-phone"
                            className="text-sm text-gray-500 hover:text-blue-600 inline-flex items-center transition-colors"
                          >
                            <ArrowLeft size={14} className="mr-1" />
                            Back to Devices
                          </Link>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 2: Payment Method */}
                {step === 2 && (
                  <div
                    id="step-2"
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard size={22} />
                        Payment Method
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">
                        How would you like to receive your payment?
                      </p>
                    </div>

                    <form
                      onSubmit={handleSubmitPayment}
                      className="p-6 space-y-6"
                    >
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                        className="space-y-4"
                      >
                        <div
                          className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${paymentMethod === "upi"
                            ? "border-blue-500 bg-blue-50/50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <div className="flex items-center">
                            <RadioGroupItem
                              value="upi"
                              id="upi"
                              className="text-blue-600"
                            />
                            <Label
                              htmlFor="upi"
                              className="flex-1 ml-3 cursor-pointer"
                            >
                              <div className="font-semibold text-gray-900">
                                UPI
                              </div>
                              <div className="text-sm text-gray-500">
                                Instant transfer to your UPI ID
                              </div>
                            </Label>
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Fastest
                            </div>
                          </div>
                        </div>

                        <div
                          className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${paymentMethod === "bank"
                            ? "border-blue-500 bg-blue-50/50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <div className="flex items-center">
                            <RadioGroupItem
                              value="bank"
                              id="bank"
                              className="text-blue-600"
                            />
                            <Label
                              htmlFor="bank"
                              className="flex-1 ml-3 cursor-pointer"
                            >
                              <div className="font-semibold text-gray-900">
                                Bank Transfer
                              </div>
                              <div className="text-sm text-gray-500">
                                Direct transfer to your bank account (1-2 days)
                              </div>
                            </Label>
                          </div>
                        </div>

                        <div
                          className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${paymentMethod === "cash"
                            ? "border-blue-500 bg-blue-50/50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <div className="flex items-center">
                            <RadioGroupItem
                              value="cash"
                              id="cash"
                              className="text-blue-600"
                            />
                            <Label
                              htmlFor="cash"
                              className="flex-1 ml-3 cursor-pointer"
                            >
                              <div className="font-semibold text-gray-900">
                                Cash
                              </div>
                              <div className="text-sm text-gray-500">
                                Receive payment in cash upon pickup
                              </div>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>

                      <div className="pt-4 space-y-3">
                        <Button
                          type="submit"
                          className="w-full h-12 text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </div>
                          ) : (
                            <>
                              <CheckCircle size={18} className="mr-2" />
                              Complete Sale
                            </>
                          )}
                        </Button>
                        <div className="text-center">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm text-gray-500 hover:text-blue-600"
                          >
                            <ArrowLeft size={14} className="mr-1" />
                            Back to Pickup Details
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                  <div
                    id="step-3"
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">
                        Sale Confirmed!
                      </h2>
                      <p className="text-green-100 mt-2">
                        Your device pickup has been scheduled
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="space-y-4 mb-8">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Sparkles size={20} className="text-yellow-500" />
                          Next Steps
                        </h3>
                        <div className="space-y-3">
                          {[
                            {
                              icon: Shield,
                              text: "Back up your data and perform a factory reset on your device",
                            },
                            {
                              icon: Package,
                              text: "Have your ID proof ready for verification during pickup",
                            },
                            {
                              icon: Clock,
                              text: "Our executive will verify the device condition and process your payment",
                            },
                          ].map((item, index) => (
                            <div
                              key={index}
                              className="flex items-start p-3 bg-gray-50 rounded-lg"
                            >
                              <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold">
                                {index + 1}
                              </span>
                              <span className="text-gray-600">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => navigate("/")}
                          className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          Back to Home
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-11 border-2"
                          onClick={() => navigate("/my-orders")}
                          disabled={!createdOrder}
                        >
                          View Order Details
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Sale Summary
                  </h3>

                  <div className="border-b pb-4 mb-4">
                    <div className="flex items-center mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
                        <img
                          src={`https://placehold.co/200x200?text=${encodeURIComponent(phoneData.name)}`}
                          alt={phoneData.name}
                          className="max-h-14"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {phoneData.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {phoneData.variant} • {phoneData.condition}
                        </p>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="details" className="border-none">
                        <AccordionTrigger className="text-sm text-blue-600 hover:text-blue-700 py-2">
                          View device details
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                            <p className="flex justify-between">
                              <span className="text-gray-500">Model:</span>
                              <span className="font-medium">
                                {phoneData.name}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-gray-500">Storage:</span>
                              <span className="font-medium">
                                {phoneData.variant}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-gray-500">Condition:</span>
                              <span className="font-medium">
                                {phoneData.condition}
                              </span>
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Coupon Code Input */}
                  {step < 3 && (
                    <div className="my-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Sparkles size={14} className="text-yellow-500" />
                        Have a coupon?
                      </p>
                      <div className="flex gap-2">
                        <input
                          id="coupon-code-input"
                          type="text"
                          placeholder="Enter code (e.g. SUMMER50)"
                          value={couponCode}
                          disabled={!!couponApplied}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && applyOrRemoveCoupon()}
                          className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={couponApplied ? "outline" : "default"}
                          onClick={applyOrRemoveCoupon}
                          disabled={couponLoading}
                          className={couponApplied ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
                        >
                          {couponLoading ? "..." : couponApplied ? "Remove" : "Apply"}
                        </Button>
                      </div>
                      {couponMsg && (
                        <p className={`text-xs mt-1 font-medium ${couponSuccess ? "text-green-600" : "text-red-500"}`}>
                          {couponSuccess ? "✓ " : "✗ "}{couponMsg}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base Price:</span>
                      <span className="font-medium">
                        ₹{phoneData.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pickup Fee:</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Processing Fee:</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>
                    {couponBonus > 0 && (
                      <div className="flex justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <Sparkles size={13} className="text-yellow-500" />
                          Coupon Bonus ({couponApplied}):
                        </span>
                        <span className="text-green-600 font-semibold">+₹{couponBonus.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Amount:</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        ₹{totalPrice.toLocaleString()}
                      </span>
                    </div>
                    {couponBonus > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        🎉 You're getting ₹{couponBonus.toLocaleString()} extra with coupon!
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Shield size={12} />
                      Final amount subject to physical verification
                    </p>
                  </div>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <Shield
                          size={18}
                          className="mx-auto text-green-600 mb-1"
                        />
                        <p className="text-xs text-green-700 font-medium">
                          Secure Payment
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <Clock
                          size={18}
                          className="mx-auto text-blue-600 mb-1"
                        />
                        <p className="text-xs text-blue-700 font-medium">
                          Instant Transfer
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Order details modal */}
      {showOrderModal && createdOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="order-details-title"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowOrderModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 z-10">
            <div className="flex justify-between items-start mb-4">
              <h3 id="order-details-title" className="text-lg font-semibold">
                Order Details
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close order details modal"
                autoFocus
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Reference:</strong> ORD-{createdOrder.id}
              </p>
              <p>
                <strong>Phone:</strong> {createdOrder.phone_name}{" "}
                {createdOrder.variant ?? ""}
              </p>
              <p>
                <strong>Quoted Price:</strong> ₹
                {(createdOrder.quoted_price ?? 0).toLocaleString()}
              </p>
              <p>
                <strong>Customer:</strong> {createdOrder.customer_name}
              </p>
              <p>
                <strong>Phone:</strong> {createdOrder.phone_number}
              </p>
              <p>
                <strong>Email:</strong> {createdOrder.email}
              </p>
              <p>
                <strong>Address:</strong> {createdOrder.address_line ?? "—"}
                {createdOrder.city ? `, ${createdOrder.city}` : ""}
                {createdOrder.state ? `, ${createdOrder.state}` : ""}
                {createdOrder.pincode ? ` - ${createdOrder.pincode}` : ""}
              </p>
              <p>
                <strong>Pickup:</strong>{" "}
                {createdOrder.pickup_date
                  ? new Date(createdOrder.pickup_date).toLocaleString()
                  : "Not scheduled"}
                {createdOrder.pickup_time
                  ? ` (${createdOrder.pickup_time})`
                  : ""}
              </p>
              <p>
                <strong>Status:</strong> {createdOrder.status ?? "pending"}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowOrderModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}