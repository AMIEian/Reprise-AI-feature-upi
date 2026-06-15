import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: any) => { requestCode: () => void };
        };
      };
    };
  }
}

export default function CustomerLogin() {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pincodeError, setPincodeError] = useState(""); 
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeValid, setPincodeValid] = useState(false);
  const [serviceableInfo, setServiceableInfo] = useState<any>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [loginPhoneIdentifier, setLoginPhoneIdentifier] = useState("");
  const [showGoogleProfileModal, setShowGoogleProfileModal] = useState(false);
  const [googleProfilePhone, setGoogleProfilePhone] = useState("");
  const [googleProfileAddress, setGoogleProfileAddress] = useState("");
  const [googleProcessing, setGoogleProcessing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken, signup } = useAuth();

  // Helper to normalize phone number
  const normalizePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned.slice(2);
    }
    return cleaned;
  };

  // OTP VERIFICATION
  const sendOtp = async () => {
    const normalizedPhone = normalizePhone(loginPhoneIdentifier);

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    try {
      const res = await api.post("/auth/send-otp", {
        phone: normalizePhone(loginPhoneIdentifier),
      });

      if (res.data.success) {
        setOtpSent(true);
        toast.success("OTP sent successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) {
      toast.error("Enter valid OTP");
      return;
    }

    try {
      setFormLoading(true);

      const res = await api.post("/auth/verify-otp", {
        phone: normalizePhone(loginPhoneIdentifier),
        otp,
      });

      console.log("VERIFY OTP RESPONSE:", res.data);

      // SUCCESS
      if (res.data?.access_token) {
        localStorage.setItem("accessToken", res.data.access_token);

        await loginWithToken(res.data.access_token);

        toast.success("Login successful");

        navigate("/");

        return;
      }

      // fallback
      toast.error("Invalid OTP");
    } catch (err: any) {
      console.error("VERIFY OTP ERROR:", err);

      toast.error(err?.response?.data?.detail || "OTP verification failed");
    } finally {
      setFormLoading(false);
    }
  };

  // Debounced email check
  useEffect(() => {
    if (isSignup && email) {
      const timer = setTimeout(() => {
        checkEmailAvailability(email);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setEmailAvailable(null);
    }
  }, [email, isSignup]);

  // Debounced phone check
  useEffect(() => {
    if (isSignup && phone) {
      const timer = setTimeout(() => {
        checkPhoneAvailability(phone);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setPhoneAvailable(null);
    }
  }, [phone, isSignup]);

  // Debounced pincode check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pincode && pincode.length === 6 && isSignup) {
        checkPincode(pincode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pincode, isSignup]);

  useEffect(() => {
    const id = "google-identity";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => {
        console.log("Google Identity loaded");
      };

      s.onerror = () => {
        console.error("Failed to load Google Identity script");
      };
      document.head.appendChild(s);
    }
  }, []);

  // Check email availability
  const checkEmailAvailability = async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    try {
      const response = await api.get(`/auth/check-email/${email}`);

      setEmailAvailable(response.data.available);
    } catch (error) {
      console.error("Email check failed:", error);
      setEmailAvailable(null);
    }
  };

  // Check phone availability
  const checkPhoneAvailability = async (phone: string) => {
    const normalized = normalizePhone(phone);

    if (normalized.length !== 10) {
      setPhoneAvailable(null);
      return;
    }

    try {
      const response = await api.get(`/auth/check-phone/${normalized}`);

      setPhoneAvailable(response.data.available);
    } catch (error) {
      console.error("Phone check failed:", error);
      setPhoneAvailable(null);
    }
  };

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
        setPincodeError("Sorry, service is not available in this pincode.");
      }
    } catch (error) {
      console.error("Pincode check failed:", error);

      setPincodeError("Unable to verify pincode. Please try again.");

      setPincodeValid(false);
    } finally {
      setPincodeChecking(false);
    }
  };

  // PKCE helpers - REMOVE sha256 and code_verifier generation
  const base64UrlEncode = (arrayBuffer: ArrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let str = "";
    for (const charCode of bytes) str += String.fromCharCode(charCode);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  // remove generateCodeVerifier and sha256; only keep state generator
  const generateState = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array.buffer);
  };

  // submit profile collected after Google signup
  const submitGoogleProfile = async () => {
    if (!googleProfilePhone) {
      toast.warning("Please provide your phone number to continue.", {
        description: "Phone number is required to complete your profile.",
        duration: 5000,
      });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(normalizePhone(googleProfilePhone))) {
      toast.warning("Please enter a valid 10-digit phone number", {
        description: "Phone number must be 10 digits starting with 6-9.",
        duration: 5000,
      });
      return;
    }
    try {
      setGoogleProcessing(true);
      await api.patch("/auth/me", {
        phone: normalizePhone(googleProfilePhone),
        address: googleProfileAddress || undefined,
      });
      setShowGoogleProfileModal(false);
      const stateRedirect = (location.state as any)?.redirectTo;
      const savedRedirect = localStorage.getItem("postLoginRedirect");
      const target = stateRedirect || savedRedirect;
      if (target) {
        localStorage.removeItem("postLoginRedirect");
        navigate(target);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Please try again.", {
        description: "Could not update your profile information.",
        duration: 5000,
      });
    } finally {
      setGoogleProcessing(false);
    }
  };

  const onGoogleLogin = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("VITE_GOOGLE_CLIENT_ID not set");
      return;
    }
    if (!window.google?.accounts?.oauth2?.initCodeClient) {
      console.error("Google initCodeClient not available");
      return;
    }
    // generate state only (CSRF protection)
    const state = generateState();
    sessionStorage.setItem("google_oauth_state", state);

    const startGoogleLogin = () => {
      setGoogleProcessing(true);
      // @ts-ignore
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        state, // pass state through to callback
        callback: async (resp: any) => {
          // enforce state matches
          const receivedState = resp?.state;
          const storedState = sessionStorage.getItem("google_oauth_state");
          if (!receivedState || !storedState || receivedState !== storedState) {
            console.error("Invalid or missing OAuth state - possible CSRF");
            setGoogleProcessing(false);
            return;
          }
          const auth_code = resp?.code;
          if (!auth_code) {
            console.error("No auth_code in response");
            setGoogleProcessing(false);
            return;
          }
          try {
            // include pincode and signup flag when in signup flow
            const payload: any = { auth_code };

            const res = await api.post("/auth/google", payload);
            const token = res.data?.access_token;
            const needs_profile = !!res.data?.needs_profile;

            if (token) {
              localStorage.setItem("accessToken", token);
              // initialize AuthContext with the token so currentUser is set (includes role)
              try {
                await loginWithToken(token);
              } catch (err) {
                console.error("loginWithToken failed:", err);
                toast.error("Authentication failed. Please try again.", {
                  description: "Could not initialize user session.",
                  duration: 5000,
                });
                setGoogleProcessing(false);
                return;
              }
            }

            if (needs_profile) {
              // show profile modal to capture phone/address
              setShowGoogleProfileModal(true);
            } else {
              // handle post-login redirect
              const stateRedirect = (location.state as any)?.redirectTo;
              const savedRedirect = localStorage.getItem("postLoginRedirect");
              const target = stateRedirect || savedRedirect;
              if (target) {
                localStorage.removeItem("postLoginRedirect");
                navigate(target);
              } else {
                navigate("/");
              }
            }
          } catch (err) {
            console.error("Google login failed:", err);
            toast.error("Google authentication failed. Please try again.", {
              description: "Could not complete sign-in or token exchange.",
              duration: 5000,
            });
          } finally {
            sessionStorage.removeItem("google_oauth_state");
            setGoogleProcessing(false);
          }
        },
      });
      client.requestCode();
    };

    startGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[480px] border border-gray-100">
          {/* Left Side - Hero Image */}
          <div className="hidden lg:flex flex-col items-center justify-center relative h-full min-h-[480px] bg-gray-50 p-12">
            <img
              src="/images/1_20260223_141414_0000.jpg.jpeg"
              alt="Happy Customer"
              className="w-full max-w-lg h-auto rounded-2xl shadow-2xl object-contain"
            />
          </div>

          {/* Right Side - Form */}
          <div className="flex flex-col items-center justify-center h-full p-4 lg:p-12 bg-white">
            <div className="w-full max-w-md">
              <h1 className="text-4xl font-bold leading-tight">
                Turn Your Old Phone Into
                <span className="text-green-500"> Instant Cash</span>
              </h1>

              <p className="text-gray-500 mt-3">
                Quick quotes, free pickup, and fast payments.
              </p>

              {/* FEATURES */}
              <div className="grid grid-cols-3 gap-3 mt-8">
                <div className="border rounded-xl p-3 text-center hover:shadow-md transition">
                  <p className="font-semibold text-sm">Best Price</p>
                </div>

                <div className="border rounded-xl p-3 text-center hover:shadow-md transition">
                  <p className="font-semibold text-sm">Free Pickup</p>
                </div>

                <div className="border rounded-xl p-3 text-center hover:shadow-md transition">
                  <p className="font-semibold text-sm">Secure Payment</p>
                </div>
              </div>

              {/* OTP BOX */}
              <div className="bg-white rounded-3xl p-8 mt-8 border border-gray-200">
                <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center">
                    <svg
                      width="42"
                      height="42"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-[28px] font-bold text-center mb-2">
                  {isSignup ? "Create Account" : "Login with Phone"}
                </h2>

                <p className="text-center text-gray-500 text-sm mb-8">
                  We’ll send you an OTP to verify your number
                </p>

                <div className="space-y-5">
                  {isSignup && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Full Name *
                        </label>

                        <Input
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Phone Number *
                        </label>

                        <Input
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />

                        {phoneAvailable === false && (
                          <p className="text-sm text-red-600">
                            This phone number is already registered.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pincode *</label>

                        <Input
                          placeholder="560001"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) =>
                            setPincode(e.target.value.replace(/\D/g, ""))
                          }
                        />

                        {pincodeChecking && (
                          <p className="text-sm text-blue-600">
                            Checking pincode...
                          </p>
                        )}

                        {pincodeValid && serviceableInfo && (
                          <div className="text-sm text-green-600">
                            ✓ Service available in your area
                          </div>
                        )}

                        {pincodeError && (
                          <div className="text-sm text-red-600">
                            {pincodeError}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Address *</label>

                        <Input
                          placeholder="123 Main Street, City"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Referral Code (Optional)
                        </label>

                        <Input
                          placeholder="6-digit code (e.g., 123456)"
                          maxLength={6}
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                        />

                        <p className="text-xs text-gray-500">
                          Have a referral code? Enter it to earn bonus points!
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>

                        <Input
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />

                        {emailAvailable === false && (
                          <p className="text-sm text-red-600">
                            This email is already registered.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {!isSignup && (
                    <>
                      <div className="space-y-3">
                        <label className="text-base font-semibold text-gray-800">
                          Phone Number
                        </label>

                        <div className="border border-gray-300 rounded-xl h-14 flex items-center px-4 bg-white">
                          <input
                            type="text"
                            placeholder="Enter your phone number"
                            className="flex-1 outline-none text-base"
                            maxLength={10}
                            value={loginPhoneIdentifier}
                            onChange={(e) =>
                              setLoginPhoneIdentifier(e.target.value)
                            }
                          />
                        </div>

                        <p className="text-sm text-gray-500">
                          We’ll never share your number with anyone.
                        </p>
                      </div>
                    </>
                  )}

                  {!otpSent ? (
                    <Button
                      disabled={formLoading}
                      onClick={async () => {
                        if (formLoading) return;

                        try {
                          setFormLoading(true);

                          if (isSignup) {
                            if (!pincodeValid) {
                              toast.error(
                                "Service is not available in this pincode",
                              );
                              return;
                            }

                            if (emailAvailable === false) {
                              toast.error("Email already registered");
                              return;
                            }

                            if (phoneAvailable === false) {
                              toast.error("Phone number already registered");
                              return;
                            }

                            if (
                              !fullName ||
                              !phone ||
                              !email ||
                              !pincode ||
                              !address
                            ) {
                              toast.error("Please fill all required fields");
                              return;
                            }

                            const ok = await signup(
                              email,
                              "Temp@123",
                              "customer",
                              fullName,
                              normalizePhone(phone),
                              address,
                              null,
                              null,
                              pincode,
                              referralCode || undefined,
                            );

                            if (ok) {
                              toast.success("Account created successfully");
                              setIsSignup(false);
                            }

                            return;
                          }

                          await sendOtp();
                        } finally {
                          setFormLoading(false);
                        }
                      }}
                      className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-base font-semibold mt-4"
                    >
                      {formLoading
                        ? "Please wait..."
                        : isSignup
                        ? "Create Account"
                        : "Send OTP"}
                    </Button>
                  ) : (
                    <>
                      <Input
                        placeholder="Enter OTP"
                        value={otp}
                        maxLength={6}
                        onChange={(e) => setOtp(e.target.value)}
                      />

                      <Button
                        onClick={verifyOtp}
                        className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-base font-semibold mt-4"
                      >
                        {googleProcessing ? "Verifying..." : "Verify OTP"}
                      </Button>
                    </>
                  )}

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>

                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">OR</span>
                    </div>
                  </div>

                  {/* Google Login */}
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl text-base font-medium border border-gray-300 bg-white hover:bg-gray-50"
                    onClick={onGoogleLogin}
                  >
                    <>
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue with Google
                    </>
                  </Button>
                  <div className="text-center text-base mt-10">
                    {isSignup
                      ? "Already have an account? "
                      : "Don't have an account? "}

                    <button
                      onClick={() => setIsSignup(!isSignup)}
                      className="text-green-600 font-medium"
                    >
                      {isSignup ? "Login" : "Sign Up"}
                    </button>
                  </div>
                </div>
              </div>

              {/* TRUST SECTION */}
              <div className="grid grid-cols-3 gap-4 mt-8 text-center">
                <div>
                  <p className="font-semibold text-sm">Instant Quote</p>
                </div>

                <div>
                  <p className="font-semibold text-sm">Get Paid Fast</p>
                </div>

                <div>
                  <p className="font-semibold text-sm">Hassle Free</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google profile modal */}
      {showGoogleProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowGoogleProfileModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              Complete your profile
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We need your phone number to complete your account.
            </p>
            <input
              className="w-full border px-3 py-2 mb-3"
              placeholder="Phone"
              value={googleProfilePhone}
              onChange={(e) => setGoogleProfilePhone(e.target.value)}
            />
            <input
              className="w-full border px-3 py-2 mb-3"
              placeholder="Address"
              value={googleProfileAddress}
              onChange={(e) => setGoogleProfileAddress(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowGoogleProfileModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitGoogleProfile} disabled={googleProcessing}>
                {googleProcessing ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
