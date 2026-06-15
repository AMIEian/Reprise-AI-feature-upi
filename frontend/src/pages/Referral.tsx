import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Gift, 
  Copy,
  CheckCircle,
  Share2,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";

interface ReferralCode {
  id: number;
  code: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface ReferralInfo {
  user_id: number;
  referral_points: number;
  referral_code: string | null;
  referral_code_expires_at: string | null;
}

export default function Referral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token && !user) {
      navigate("/login?redirect=/referral");
      return;
    }

    if (user) {
      fetchReferralInfo();
    }
  }, [user, navigate]);

  const fetchReferralInfo = async () => {
    try {
      const infoResponse = await api.get("/referral/info");
      setReferralInfo(infoResponse.data);

      // Fetch current code
      const codeResponse = await api.get("/referral/my-code");
      if (codeResponse.data) {
        setReferralCode(codeResponse.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch referral info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      setGenerating(true);
      const response = await api.post("/referral/generate-code");
      setReferralCode(response.data);
      setReferralInfo((prev) =>
        prev
          ? {
              ...prev,
              referral_code: response.data.code,
              referral_code_expires_at: response.data.expires_at,
            }
          : null,
      );
      toast.success("Referral code generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate code:", error);
      toast.error(error?.response?.data?.detail || "Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (referralCode?.code) {
      try {
        await navigator.clipboard.writeText(referralCode.code);
        setCopied(true);
        toast.success("Code copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const handleShareCode = () => {
    if (referralCode?.code) {
      const shareText = `Join CashNow using my referral code: ${referralCode.code} and get bonus points!`;
      if (navigator.share) {
        navigator.share({
          title: "CashNow Referral",
          text: shareText,
        });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success("Share text copied to clipboard!");
      }
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">
            Please log in to access referral system
          </p>
        </div>
        <Footer />
      </>
    );
  }

  const expiryDate = referralCode?.expires_at
    ? new Date(referralCode.expires_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary/10 rounded-full p-4">
                <Gift className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Referral Program
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share your unique referral code with friends and family. When they
              sign up using your code, you both get rewarded with bonus points!
            </p>
          </div>

          {/* How It Works Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Step 1 */}
                <div className="space-y-2 text-center">
                  <div className="flex justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <h3 className="font-semibold">Generate Your Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to create your unique 6-digit
                    referral code
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2 text-center">
                  <div className="flex justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <h3 className="font-semibold">Share With Friends</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your code with anyone who wants to sell their phone
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-2 text-center">
                  <div className="flex justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <h3 className="font-semibold">Earn Points</h3>
                  <p className="text-sm text-muted-foreground">
                    Get bonus points when they sign up with your code
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Code Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary">
                    {referralInfo?.referral_points || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Points earned from referrals
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Generate Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referralCode && referralCode.is_active ? (
                  <div className="space-y-4">
                    <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your Active Code
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-3xl font-bold tracking-widest text-primary">
                          {referralCode.code}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyCode}
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expires: {expiryDate}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleShareCode}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Code
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleGenerateCode}
                      disabled={generating}
                    >
                      {generating ? "Generating..." : "Generate New Code"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You don't have an active referral code yet. Generate one
                      to start earning points!
                    </p>
                    <Button
                      className="w-full"
                      onClick={handleGenerateCode}
                      disabled={generating}
                    >
                      {generating ? "Generating..." : "Generate Your Code"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle>Program Benefits</CardTitle>
              <CardDescription>
                Earn rewards for helping friends join CashNow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    Unlimited referrals - refer as many friends as you want
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    Instant rewards - points are credited immediately when
                    friend signs up
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    No expiry - your points never expire
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    Easy sharing - copy and share your code anywhere
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Terms Section */}
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-base">Program Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>
                • Your referral code is valid for 2 days from generation.
                Generate a new code to extend validity.
              </p>
              <p>
                • Each code can only be used once. Once redeemed, a new code
                must be generated.
              </p>
              <p>
                • Points are awarded to both the referrer and new customer
                immediately upon signup.
              </p>
              <p>
                • New customer must complete signup within the code validity
                period.
              </p>
              <p>
                • Referral codes are 6-digit numbers and are unique to each
                user.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
