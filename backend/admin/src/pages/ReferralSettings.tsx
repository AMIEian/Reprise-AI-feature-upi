import { useEffect, useState } from "react";
import api from "../lib/api";
import {
  showErrorToastWithRetry,
  showSuccessToast,
  showErrorToast,
} from "../lib/errorHandler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Gift, Calendar, TrendingUp } from "lucide-react";

interface ReferralSettings {
  id: number;
  points_for_referrer: number;
  points_for_new_user: number;
  validity_days: number;
  updated_at: string;
}

export default function ReferralSettings() {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    points_for_referrer: "",
    points_for_new_user: "",
    validity_days: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/admin/referral/settings");
      setSettings(response.data);
      setFormData({
        points_for_referrer: response.data.points_for_referrer.toString(),
        points_for_new_user: response.data.points_for_new_user.toString(),
        validity_days: response.data.validity_days.toString(),
      });
    } catch (error: any) {
      console.error("Failed to fetch referral settings:", error);
      const retryFn = () => fetchSettings();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      // Validate inputs
      const pointsReferrer = parseInt(formData.points_for_referrer);
      const pointsNewUser = parseInt(formData.points_for_new_user);
      const validityDays = parseInt(formData.validity_days);

      if (isNaN(pointsReferrer) || pointsReferrer < 0) {
        showErrorToast("Points for referrer must be a non-negative number");
        return;
      }

      if (isNaN(pointsNewUser) || pointsNewUser < 0) {
        showErrorToast("Points for new user must be a non-negative number");
        return;
      }

      if (isNaN(validityDays) || validityDays <= 0) {
        showErrorToast("Validity days must be a positive number");
        return;
      }

      setSaving(true);

      const response = await api.put("/admin/referral/settings", {
        points_for_referrer: pointsReferrer,
        points_for_new_user: pointsNewUser,
        validity_days: validityDays,
      });

      setSettings(response.data);
      showSuccessToast("Referral settings updated successfully");
    } catch (error: any) {
      console.error("Failed to update referral settings:", error);
      showErrorToast(
        error?.response?.data?.detail || "Failed to update settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Referral System Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure points and validity period for the referral program
          </p>
        </div>
        <Gift className="h-10 w-10 text-primary" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Points for Referrer Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Points for Referrer
            </CardTitle>
            <CardDescription>
              Awarded when someone uses their code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.points_for_referrer || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              points per referral
            </p>
          </CardContent>
        </Card>

        {/* Points for New User Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Points for New User
            </CardTitle>
            <CardDescription>Awarded when signing up with code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.points_for_new_user || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              points per signup
            </p>
          </CardContent>
        </Card>

        {/* Validity Period Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Code Validity</CardTitle>
            <CardDescription>How long codes remain valid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.validity_days || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">days</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Settings</CardTitle>
          <CardDescription>
            Modify the referral system parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Points for Referrer */}
            <div className="space-y-2">
              <Label
                htmlFor="points_for_referrer"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Points for Referrer
              </Label>
              <Input
                id="points_for_referrer"
                name="points_for_referrer"
                type="number"
                min="0"
                value={formData.points_for_referrer}
                onChange={handleInputChange}
                placeholder="e.g., 100"
              />
              <p className="text-xs text-muted-foreground">
                Points awarded to the person who referred
              </p>
            </div>

            {/* Points for New User */}
            <div className="space-y-2">
              <Label
                htmlFor="points_for_new_user"
                className="flex items-center gap-2"
              >
                <Gift className="h-4 w-4" />
                Points for New User
              </Label>
              <Input
                id="points_for_new_user"
                name="points_for_new_user"
                type="number"
                min="0"
                value={formData.points_for_new_user}
                onChange={handleInputChange}
                placeholder="e.g., 50"
              />
              <p className="text-xs text-muted-foreground">
                Points awarded to new customer
              </p>
            </div>

            {/* Validity Days */}
            <div className="space-y-2">
              <Label
                htmlFor="validity_days"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Validity Days
              </Label>
              <Input
                id="validity_days"
                name="validity_days"
                type="number"
                min="1"
                value={formData.validity_days}
                onChange={handleInputChange}
                placeholder="e.g., 2"
              />
              <p className="text-xs text-muted-foreground">
                Days before code expires
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  points_for_referrer:
                    settings?.points_for_referrer.toString() || "",
                  points_for_new_user:
                    settings?.points_for_new_user.toString() || "",
                  validity_days: settings?.validity_days.toString() || "",
                });
              }}
              disabled={saving}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              How the Referral System Works:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>
                Customer generates a 6-digit referral code valid for the
                specified number of days
              </li>
              <li>New customer enters the code during signup</li>
              <li>
                If code is valid, both customers receive their respective points
              </li>
              <li>Code becomes inactive after being used or expiring</li>
              <li>One code can only be used by one customer</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
