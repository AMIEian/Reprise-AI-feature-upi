import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import Header from "../components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  UserCircle,
  Lock,
  Phone,
  Building2,
  MapPin,
  CreditCard,
  FileText,
  AlertCircle,
  LogIn,
  UserPlus,
  Mail,
  Briefcase,
  Upload,
  CheckCircle2,
} from "lucide-react";
import PartnerOnHoldModal from "../components/PartnerOnHoldModal";

export default function PartnerLogin() {
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    company_name: "",
    business_address: "",
    udyam_id: "",
    pan_number: "",
    serviceable_pincodes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [udyamAadharFile, setUdyamAadharFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { signup, holdInfo } = useAuth();

  const PAN_LENGTH = 10;
  const UDYAM_ID_LENGTH = 19;
  const PHONE_LENGTH = 10;

  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  const extractErrorMessage = (error: any): string => {
    // Handle Pydantic validation errors (array of error objects)
    if (Array.isArray(error?.response?.data?.detail)) {
      const errors = error.response.data.detail
        .map((err: any) => {
          if (typeof err === "object" && err.msg) {
            const field = err.loc ? err.loc[err.loc.length - 1] : "field";
            return `${field}: ${err.msg}`;
          }
          return "Invalid input";
        })
        .filter((msg: string) => msg);

      return errors.length > 0
        ? errors.slice(0, 2).join(", ") // Show first 2 errors
        : "Please check your input and try again.";
    }

    // Handle string error messages
    if (typeof error?.response?.data?.detail === "string") {
      return error.response.data.detail;
    }

    return "An error occurred. Please try again.";
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let value = e.target.value;

      // Sanitize input to prevent XSS
      value = value.replace(/[<>\"']/g, "");

      // Specific formatting
      if (field === "pan_number") {
        value = value.toUpperCase();
      } else if (field === "udyam_id") {
        value = value.toUpperCase();
      } else if (field === "phone") {
        // Allow +91 prefix, but normalize
        if (value.startsWith("+91")) {
          value = value.substring(3);
        }
        // Remove non-numeric characters except +
        value = value.replace(/[^0-9]/g, "");
      }

      setFormData({ ...formData, [field]: value });
    };

  const validateForm = async (): Promise<string | null> => {
    // Required fields
    if (!formData.full_name.trim()) return "Full name is required";
    if (formData.full_name.length < 2 || formData.full_name.length > 100)
      return "Full name must be 2-100 characters";

    if (!formData.email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      return "Please enter a valid email address";

    // Check if email already exists
    try {
      const emailCheck = await api.post("/partner/check-email", null, {
        params: { email: formData.email },
      });
      if (emailCheck.data.exists) return "This email is already registered";
    } catch (error) {
      // If check fails, allow submission (backend will handle)
    }

    if (!formData.password) return "Password is required";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters";

    if (!formData.phone.trim()) return "Phone number is required";
    if (formData.phone.length !== PHONE_LENGTH)
      return `Phone number must be exactly ${PHONE_LENGTH} digits`;
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone))
      return "Phone number must contain only digits";

    // Check if phone already exists
    try {
      const phoneCheck = await api.post("/partner/check-phone", null, {
        params: { phone: formData.phone },
      });
      if (phoneCheck.data.exists)
        return "This phone number is already registered";
    } catch (error) {
      // If check fails, allow submission (backend will handle)
    }

    if (!formData.company_name.trim()) return "Shop name is required";
    if (formData.company_name.length < 2 || formData.company_name.length > 200)
      return "Shop name must be 2-200 characters";

    if (!formData.business_address.trim()) return "Shop address is required";
    if (
      formData.business_address.length < 10 ||
      formData.business_address.length > 500
    )
      return "Shop address must be 10-500 characters";

    if (!formData.pan_number.trim()) return "PAN number is required";
    if (formData.pan_number.length !== PAN_LENGTH)
      return `PAN number must be exactly ${PAN_LENGTH} characters`;

    if (formData.udyam_id?.trim()) {
      if (formData.udyam_id.length !== UDYAM_ID_LENGTH)
        return `Udyam Registration Number must be exactly ${UDYAM_ID_LENGTH} characters`;

      if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(formData.udyam_id))
        return "Udyam ID format must be UDYAM-XX-00-0000000";
    }

    if (!formData.serviceable_pincodes.trim())
      return "At least one serviceable pincode is required";
    const pincodes = formData.serviceable_pincodes
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (pincodes.length === 0) return "Please enter at least one valid pincode";

    return null;
  };

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError("Enter valid 10-digit phone number");
      return;
    }

    try {
      const res = await api.post("/auth/send-otp", {
        phone: normalizePhone(formData.phone),
      });

      if (res.data.success) {
        setOtpSent(true);
        setSuccess("OTP sent successfully");
      }
    } catch (err) {
      setError("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await api.post("/auth/verify-otp", {
        phone: normalizePhone(formData.phone),
        otp,
        role: "partner",
      });

      if (res.data?.access_token) {
        localStorage.setItem("accessToken", res.data.access_token);

        window.location.href = "/partner-dashboard";
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "OTP verification failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (activeTab === "login") {
        await verifyOtp();
        return;
      } else {
        // Client-side validation
        const validationError = await validateForm();
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        // Parse comma-separated pincodes
        const pincodes = formData.serviceable_pincodes
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        await signup(
          formData.full_name,
          formData.email,
          formData.password,
          formData.phone,
          formData.company_name,
          formData.business_address,
          formData.udyam_id,
          formData.pan_number,
          pincodes,
          udyamAadharFile ?? null,
        );

        setSuccess(
          "Application submitted successfully! You'll receive an email once approved.",
        );
        setActiveTab("login");
        setFormData({
          full_name: "",
          email: "",
          password: "",
          phone: "",
          company_name: "",
          business_address: "",
          udyam_id: "",
          pan_number: "",
          serviceable_pincodes: "",
        });
        setUdyamAadharFile(null);
      }
    } catch (err: any) {
      if (!err.response) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError("");
    setSuccess("");
    setLoading(false);
  };

  return (
    <>
      <Header showLoginButtons={false} />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full translate-y-16 -translate-x-16" />

          <CardHeader className="space-y-3 relative">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Partner Portal
            </CardTitle>
            <CardDescription className="text-center text-base">
              Login or apply to become a verified partner
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Apply Now
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number</Label>

                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                      <Input
                        type="tel"
                        maxLength={10}
                        className="pl-10 h-11"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={handleInputChange("phone")}
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-2">
                      <Label>OTP</Label>

                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    className="w-full h-11"
                    onClick={() => {
                      if (!otpSent) {
                        sendOtp();
                      } else {
                        verifyOtp();
                      }
                    }}
                  >
                    {!otpSent ? "Send OTP" : "Verify OTP"}
                  </Button>

                  {error && (
                    <Alert
                      variant="destructive"
                      className="animate-in slide-in-from-top-2"
                      aria-live="polite"
                      aria-describedby="error-desc"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="error-desc">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Your application will be reviewed by our team. You'll
                      receive an email once approved.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="full_name"
                        className="text-sm font-medium" 
                      >
                        Full Name *
                      </Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="full_name"
                          type="text"
                          required
                          className="pl-10 h-11"
                          placeholder="John Doe"
                          value={formData.full_name}
                          onChange={handleInputChange("full_name")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number *
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          required
                          className="pl-10 h-11"
                          placeholder="10-digit mobile number"
                          value={formData.phone}
                          onChange={handleInputChange("phone")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email-signup"
                      className="text-sm font-medium"
                    >
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email-signup"
                        type="email"
                        required
                        className="pl-10 h-11"
                        placeholder="partner@example.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password-signup"
                      className="text-sm font-medium"
                    >
                      Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password-signup"
                        type="password"
                        required
                        minLength={8}
                        className="pl-10 h-11"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      Shop Name *
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="company"
                        type="text"
                        required
                        className="pl-10 h-11"
                        placeholder="Your Shop Name"
                        value={formData.company_name}
                        onChange={handleInputChange("company_name")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      Shop Address *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Textarea
                        id="address"
                        required
                        rows={2}
                        maxLength={500}
                        className="pl-10 resize-none"
                        placeholder="Complete shop address"
                        value={formData.business_address}
                        onChange={handleInputChange("business_address")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pan" className="text-sm font-medium">
                        PAN Number *
                      </Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="pan"
                          type="text"
                          required
                          maxLength={10}
                          className="pl-10 h-11 uppercase"
                          placeholder="ABCDE1234F"
                          value={formData.pan_number}
                          onChange={handleInputChange("pan_number")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="udyam_id" className="text-sm font-medium">
                        Udyam Registration Number (Optional)
                      </Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="udyam_id"
                          type="text"
                          maxLength={19}
                          className="pl-10 h-11 uppercase"
                          placeholder="UDYAM-XX-00-0000000"
                          value={formData.udyam_id}
                          onChange={handleInputChange("udyam_id")}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        16-digit MSME Udyam Registration ID (e.g.
                        UDYAM-DL-14-0004089)
                      </p>
                    </div>
                  </div>

                  {/* Udyam Aadhaar Certificate Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Udyam Aadhaar Certificate (Optional)
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) =>
                        setUdyamAadharFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-11 flex items-center gap-2 px-4 border-2 border-dashed rounded-lg text-sm transition-colors ${
                        udyamAadharFile
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-gray-300 bg-gray-50 text-gray-500 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                      }`}
                    >
                      {udyamAadharFile ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            {udyamAadharFile.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 shrink-0" />
                          <span>Upload Udyam Aadhaar Certificate</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, WEBP or PDF · max 5 MB
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincodes" className="text-sm font-medium">
                      Serviceable Pincodes *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="pincodes"
                        type="text"
                        required
                        className="pl-10 h-11"
                        placeholder="e.g., 110001, 110002, 110003"
                        value={formData.serviceable_pincodes}
                        onChange={handleInputChange("serviceable_pincodes")}
                      />
                    </div>
                    <p className="text-xs text-gray-500 pl-10">
                      Enter all pincodes where you can provide pickup services
                      (comma-separated)
                    </p>
                  </div>

                  {success && (
                    <Alert className="animate-in slide-in-from-top-2 bg-green-50 border-green-200">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {success}
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert
                      variant="destructive"
                      className="animate-in slide-in-from-top-2"
                      aria-live="polite"
                      aria-describedby="signup-error-desc"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signup-error-desc">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Partner On Hold Modal */}
      <PartnerOnHoldModal
        isOpen={!!holdInfo}
        reason={holdInfo?.reason}
        liftDate={holdInfo?.liftDate}
        verificationStatus={holdInfo?.verificationStatus}
      />
    </>
  );
}
