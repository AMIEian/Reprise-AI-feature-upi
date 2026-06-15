"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BadgeCheck,
  Shield,
  Truck,
  Wallet,
  Zap,
  Sparkles,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

export default function Index() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [googleProcessing, setGoogleProcessing] = useState(false);
  // const [otp, setOtp] = useState("");
  // const [otpSent, setOtpSent] = useState(false);
  // const [verifyingOtp, setVerifyingOtp] = useState(false);

  const navigate = useRouter();

  const { loginWithToken } = useAuth();

  const deviceCategories = [
    {
      title: "Sell Phone",
      image: "/assets/devices/phone.png",
      link: "/sell-phone",
      comingSoon: false,
    },
    {
      title: "Sell Laptop",
      image: "/assets/devices/laptop.png",
      link: "/coming-soon",
      comingSoon: true,
    },
    {
      title: "Sell TV",
      image: "/assets/devices/tv.png",
      link: "/coming-soon",
      comingSoon: true,
    },
    {
      title: "Sell Tablet",
      image: "/assets/devices/tablet.png",
      link: "/coming-soon",
      comingSoon: true,
    },
    {
      title: "Sell Smartwatch",
      image: "/assets/devices/smartwatch.png",
      link: "/coming-soon",
      comingSoon: true,
    },
    {
      title: "Sell Accessories",
      image: "/assets/devices/accessories.png",
      link: "/coming-soon",
      comingSoon: true,
    },
  ];

  const checkPhoneExists = async (phone: string) => {
    try {
      const response = await api.get(`/auth/check-phone/${phone}`);

      // backend returns available:true when NOT registered
      return !response.data.available;
    } catch (error) {
      console.error("Phone check failed:", error);
      return false;
    }
  };

  /*
  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    try {
      setFormLoading(true);

      // CHECK IF USER EXISTS
      const exists = await checkPhoneExists(phone);

      if (!exists) {
        toast.error("Phone number not registered. Please sign up first.");
        return;
      }

      const res = await api.post("/auth/send-otp", {
        phone,
      });

      if (res.data.success) {
        setOtpSent(true);
        toast.success("OTP sent successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP");
    } finally {
      setFormLoading(false);
    }
  };
  */

  /*
  const verifyOtp = async () => {
    if (verifyingOtp) return;

    try {
      setVerifyingOtp(true);

      const res = await api.post("/auth/verify-otp", {
        phone,
        otp,
      });

      if (res.data?.access_token) {
        localStorage.setItem("accessToken", res.data.access_token);

        await loginWithToken(res.data.access_token);

        toast.success("Login successful");

        window.location.href = "/";
      }
    } catch (err: any) {
      console.error(err);

      toast.error(err?.response?.data?.detail || "OTP verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };
  */

  const loginWithPhonePassword = async () => {
    try {
      setFormLoading(true);

      const res = await api.post("/auth/login", {
        identifier: phone,
        password: password,
      });

      if (res.data?.access_token) {
        localStorage.setItem("accessToken", res.data.access_token);

        await loginWithToken(res.data.access_token);

        toast.success("Login successful");

        window.location.href = "/";
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || "Invalid phone number or password",
      );
    } finally {
      setFormLoading(false);
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

  const onGoogleLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID not set");
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
            window.location.href = "/";
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

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Header />

      <main className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-2">
          {/* HERO */}
          <div className="grid md:grid-cols-2 gap-2 items-center min-h-[420px]">
            {/* LEFT */}
            <div>
              <h1 className="text-4xl md:text-[52px] font-bold leading-tight text-[#111827]">
                Turn Your Old
                <br />
                Phone Into
                <br />
                <span className="text-[#14B8A6]">Instant Cash</span>
              </h1>

              <p className="text-gray-600 text-lg mt-3 leading-relaxed">
                Quick quotes, free pickup,
                <br />
                and fast payments.
              </p>
            </div>

            {/* RIGHT IMAGE */}
            <div className="flex justify-center items-start">
              <img
                src="/images/cash-phone.png"
                alt="CashNow"
                className="w-full max-w-[320px] object-contain"
              />
            </div>
          </div>

          {/* SELL YOUR OLD DEVICES */}
          <div className="mt-2 mb-10">
            <h2 className="text-3xl font-bold text-[#111827] mb-6">
              Sell Your Old Devices
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {deviceCategories.map((device) => (
                <Link key={device.title} href={device.link} className="group">
                  <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl bg-white hover:-translate-y-1 cursor-pointer overflow-hidden">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-[170px] bg-[#F9FAFB]">
                      <div className="w-24 h-24 flex items-center justify-center mb-4">
                        <img
                          src={device.image}
                          alt={device.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex flex-col items-center">
                        <h3 className="font-semibold text-[#111827] text-sm leading-snug">
                          {device.title}
                        </h3>

                        {device.comingSoon && (
                          <span className="text-[11px] font-medium text-[#14B8A6] mt-1">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* TOP FEATURES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="bg-white border rounded-3xl p-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <BadgeCheck className="text-[#14B8A6]" />
              </div>

              <h3 className="font-bold mt-4">Best Price</h3>

              <p className="text-sm text-gray-500 mt-1">Instant Quote</p>
            </div>

            <div className="bg-white border rounded-3xl p-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Truck className="text-[#14B8A6]" />
              </div>

              <h3 className="font-bold mt-4">Free Pickup</h3>

              <p className="text-sm text-gray-500 mt-1">At Your Doorstep</p>
            </div>

            <div className="bg-white border rounded-3xl p-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Shield className="text-[#14B8A6]" />
              </div>

              <h3 className="font-bold mt-4">Secure Payment</h3>

              <p className="text-sm text-gray-500 mt-1">Fast & Safe</p>
            </div>
          </div>

          {/* OTP CARD */}
          <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-[28px] p-6 mt-8 max-w-xl mx-auto">
            <h2 className="text-[28px] font-bold text-center">
              Start Selling in
              <span className="text-[#14B8A6]"> 30 Seconds</span>
            </h2>

            <p className="text-center text-gray-500 mt-3 text-base">
              Enter your mobile number to continue
            </p>

            {/* INPUT */}
            <div className="border bg-white rounded-2xl h-14 flex items-center px-5 mt-8">
              <input
                type="text"
                placeholder="Enter your mobile number"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 outline-none text-base"
              />
            </div>

            <div className="border bg-white rounded-2xl h-14 flex items-center px-5 mt-4">
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 outline-none text-base"
              />
            </div>

            {/* BUTTON */}
            {/*<Button
              disabled={formLoading}
              onClick={sendOtp}
              className="w-full h-14 rounded-2xl mt-5 bg-[#14B8A6] hover:bg-[#0F9F94] text-lg font-semibold"
            >
              {formLoading ? "Please wait..." : "Get OTP"}
            </Button>
            {otpSent && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full border rounded-2xl h-14 px-4"
                />

                <Button
                  type="button"
                  disabled={verifyingOtp}
                  onClick={verifyOtp}
                  className="w-full h-14 rounded-2xl bg-blue-600"
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            )} 
            */}

            <Button
              disabled={formLoading}
              onClick={loginWithPhonePassword}
              className="w-full h-14 rounded-2xl mt-5 bg-[#14B8A6] hover:bg-[#0F9F94] text-lg font-semibold"
            >
              {formLoading ? "Please wait..." : "Login"}
            </Button>

            <div className="text-center mt-4">
              <Link
                href="/customer-login"
                className="text-[#14B8A6] font-medium"
              >
                New user? Create Account
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-500 mt-6">
              <Lock size={16} />

              <p className="text-sm">We never share your number with anyone</p>
            </div>

            {/* DIVIDER */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>

              <div className="relative flex justify-center text-sm">
                <span className="bg-[#F0FDFA] px-4 text-gray-500">OR</span>
              </div>
            </div>

            {/* GOOGLE */}
            <Button
              variant="outline"
              onClick={onGoogleLogin}
              disabled={googleProcessing}
              className="w-full h-14 rounded-2xl text-base font-medium flex items-center justify-center gap-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                width="22"
                height="22"
              >
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303C33.652 32.657 29.215 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.196 0-9.625-3.326-11.083-7.946l-6.522 5.025C9.705 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.048 3.057-3.943 5.26-7.303 5.26-5.196 0-9.625-3.326-11.083-7.946l-6.522 5.025C9.705 39.556 16.227 44 24 44c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
              {googleProcessing ? "Please wait..." : "Continue with Google"}
            </Button>
          </div>

          {/* BOTTOM FEATURES */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Zap className="text-[#14B8A6]" />
              </div>

              <div>
                <h4 className="font-bold">Instant Quote</h4>

                <p className="text-gray-500 text-sm">In 30 seconds</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Wallet className="text-[#14B8A6]" />
              </div>

              <div>
                <h4 className="font-bold">Get Paid Fast</h4>

                <p className="text-gray-500 text-sm">Same day payment</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Sparkles className="text-[#14B8A6]" />
              </div>

              <div>
                <h4 className="font-bold">Hassle Free</h4>

                <p className="text-gray-500 text-sm">No hidden charges</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
