import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  CheckCircle2,
  Camera,
  AlertCircle,
  ChevronRight,
  X,
  Check,
  Image as ImageIcon,
  FileText,
  DollarSign,
} from "lucide-react";

interface PhoneCondition {
  screen_condition: boolean;
  touchscreen_working: boolean;
  camera_working: boolean;
  microphone_working: boolean;
  speaker_working: boolean;
  battery_health: string;
  body_condition: string;
  has_original_box: boolean;
  has_original_charger: boolean;
  has_original_bill: boolean;
}

interface CompletePickupChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    phone_conditions: PhoneCondition;
    photos: File[];
    final_offered_price: number;
    customer_accepted: boolean;
    pickup_notes: string;
    payment_method: string;
  }) => Promise<void>;
  isLoading: boolean;
  estimatedPrice: number;
  deviceName: string;
}

type ChecklistStepType =
  | "checklist"
  | "photo_guide"
  | "photo_capture"
  | "condition_details"
  | "review";

export default function CompletePickupChecklist({
  isOpen,
  onClose,
  onComplete,
  isLoading,
  estimatedPrice,
  deviceName,
}: CompletePickupChecklistProps) {
  const [currentStep, setCurrentStep] =
    useState<ChecklistStepType>("checklist");
  const [conditions, setConditions] = useState<PhoneCondition>({
    screen_condition: true,
    touchscreen_working: true,
    camera_working: true,
    microphone_working: true,
    speaker_working: true,
    battery_health: "Good",
    body_condition: "Good",
    has_original_box: false,
    has_original_charger: false,
    has_original_bill: false,
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [currentPhotoStep, setCurrentPhotoStep] = useState(0);
  const [finalPrice, setFinalPrice] = useState(estimatedPrice);
  const [customerAccepted, setCustomerAccepted] = useState(false);
  const [pickupNotes, setPickupNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const photoSteps = [
    {
      name: "Front View",
      description: "Take a clear photo of the front of the device",
    },
    {
      name: "Back View",
      description: "Take a clear photo of the back of the device",
    },
    {
      name: "Screen",
      description: "Take a photo showing the screen and any damage",
    },
    {
      name: "Sides & Ports",
      description: "Capture all ports and side conditions",
    },
  ];

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotos([...photos, file]);
        if (currentPhotoStep < photoSteps.length - 1) {
          setCurrentPhotoStep(currentPhotoStep + 1);
        } else {
          setCurrentStep("condition_details");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConditionChange = (key: keyof PhoneCondition, value: any) => {
    setConditions({ ...conditions, [key]: value });
  };

  const handleComplete = async () => {
    if (photos.length === 0) {
      alert("Please capture at least one photo");
      return;
    }

    if (!customerAccepted) {
      alert("Please confirm customer acceptance");
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method");
      return;
    }

    try {
      await onComplete({
        phone_conditions: conditions,
        photos,
        final_offered_price: finalPrice,
        customer_accepted: customerAccepted,
        pickup_notes: pickupNotes,
        payment_method: paymentMethod,
      });
      onClose();
    } catch (error) {
      console.error("Error completing pickup:", error);
    }
  };

  const canProceedToPhotos = Object.values(conditions).every(
    (v) => v !== null && v !== "",
  );

  const steps: {
    step: ChecklistStepType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      step: "checklist",
      label: "Checklist",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      step: "photo_guide",
      label: "Photo Guide",
      icon: <Camera className="w-4 h-4" />,
    },
    {
      step: "photo_capture",
      label: "Capture Photos",
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      step: "condition_details",
      label: "Details",
      icon: <FileText className="w-4 h-4" />,
    },
    { step: "review", label: "Review", icon: <Check className="w-4 h-4" /> },
  ];

  const stepOrder: ChecklistStepType[] = [
    "checklist",
    "photo_guide",
    "photo_capture",
    "condition_details",
    "review",
  ];

  const isStepCompleted = (step: ChecklistStepType) => {
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    return stepIndex < currentIndex;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden flex flex-col p-0 bg-white shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                Complete Pickup
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-1 text-sm">
                {deviceName}
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors p-1 hover:bg-blue-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 px-6 py-5 border-b">
          <div className="flex items-center justify-between gap-1">
            {steps.map((s, idx) => (
              <div key={s.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold transition-all border-2 ${
                      currentStep === s.step
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-110"
                        : isStepCompleted(s.step)
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-400 border-gray-300"
                    }`}
                  >
                    {isStepCompleted(s.step) ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      s.icon
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold mt-2 text-center ${
                      currentStep === s.step
                        ? "text-blue-600"
                        : isStepCompleted(s.step)
                          ? "text-green-600"
                          : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-full mx-2 transition-colors -mt-6 ${
                      isStepCompleted(s.step) ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Checklist */}
          {currentStep === "checklist" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  Physical Inspection
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      key: "screen_condition",
                      label: "Screen is intact and working",
                    },
                    {
                      key: "touchscreen_working",
                      label: "Touchscreen is responsive",
                    },
                    { key: "camera_working", label: "Camera is working" },
                    {
                      key: "microphone_working",
                      label: "Microphone is working",
                    },
                    { key: "speaker_working", label: "Speaker is working" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-blue-200"
                    >
                      <input
                        type="checkbox"
                        checked={
                          conditions[key as keyof PhoneCondition] as boolean
                        }
                        onChange={(e) =>
                          handleConditionChange(
                            key as keyof PhoneCondition,
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 rounded accent-blue-600"
                      />
                      <span className="text-gray-800 font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl border border-emerald-200 shadow-sm">
                <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  Accessories & Documents
                </h3>
                <div className="space-y-2">
                  {[
                    { key: "has_original_box", label: "Has Original Box" },
                    {
                      key: "has_original_charger",
                      label: "Has Original Charger",
                    },
                    { key: "has_original_bill", label: "Has Original Bill" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-emerald-200"
                    >
                      <input
                        type="checkbox"
                        checked={
                          conditions[key as keyof PhoneCondition] as boolean
                        }
                        onChange={(e) =>
                          handleConditionChange(
                            key as keyof PhoneCondition,
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 rounded accent-emerald-600"
                      />
                      <span className="text-gray-800 font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep("photo_guide")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
                disabled={!canProceedToPhotos}
              >
                Continue to Photo Guide
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Photo Guide */}
          {currentStep === "photo_guide" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200 shadow-sm">
                <h3 className="font-bold text-lg text-amber-900 mb-4 flex items-center gap-2">
                  <Camera className="w-6 h-6 text-amber-600" />
                  Photography Guide
                </h3>
                <p className="text-sm text-amber-800 mb-4 font-medium">
                  Take clear, well-lit photos from these angles for quality
                  assessment:
                </p>
                <div className="space-y-3">
                  {photoSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-lg border border-amber-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {step.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-100 border border-amber-300 p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Pro Tips
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    Good lighting is critical • Keep focus sharp • Include any
                    visible damage • Capture all angles
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("checklist")}
                  className="flex-1 border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setCurrentStep("photo_capture");
                    setCurrentPhotoStep(0);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Start Capturing Photos
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Photo Capture */}
          {currentStep === "photo_capture" && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
                  Photo {photos.length + (photoPreview ? 1 : 0)} of{" "}
                  {photoSteps.length}
                </div>
                <h3 className="font-bold text-xl text-gray-900">
                  {photoSteps[currentPhotoStep]?.name}
                </h3>
                <p className="text-gray-600 mt-2">
                  {photoSteps[currentPhotoStep]?.description}
                </p>
              </div>

              {photoPreview && (
                <div className="relative bg-gray-100 rounded-xl overflow-hidden max-h-80 flex items-center justify-center border-2 border-blue-200">
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="max-w-full max-h-full"
                  />
                </div>
              )}

              {!photoPreview && (
                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 py-16 flex flex-col items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No photo yet</p>
                  <p className="text-gray-400 text-sm">
                    Click the button below to capture
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center pt-2">
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <div className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                    <Camera className="w-5 h-5" />
                    Capture Photo
                  </div>
                </label>
              </div>

              {photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase">
                    Captured Photos
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`photo-${idx}`}
                          className="w-full h-20 object-cover rounded-lg border-2 border-blue-200"
                        />
                        <button
                          onClick={() => {
                            setPhotos(photos.filter((_, i) => i !== idx));
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("photo_guide")}
                  className="flex-1 border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("condition_details")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={photos.length === 0}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Condition Details */}
          {currentStep === "condition_details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Battery
                  </div>
                  <div className="font-bold text-blue-900 mt-1">
                    {conditions.battery_health}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                    Body
                  </div>
                  <div className="font-bold text-emerald-900 mt-1">
                    {conditions.body_condition}
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-white p-5 rounded-xl border border-gray-200">
                <div>
                  <Label className="text-gray-900 font-bold mb-3 block text-sm">
                    🔋 Battery Health
                  </Label>
                  <Select
                    value={conditions.battery_health}
                    onValueChange={(value) =>
                      handleConditionChange("battery_health", value)
                    }
                  >
                    <SelectTrigger className="border-gray-300 rounded-lg h-11 bg-white hover:border-blue-400 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">
                        ⭐ Excellent (80%+)
                      </SelectItem>
                      <SelectItem value="Good">✓ Good (60-80%)</SelectItem>
                      <SelectItem value="Fair">⚠ Fair (40-60%)</SelectItem>
                      <SelectItem value="Poor">✗ Poor (Below 40%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-5">
                  <Label className="text-gray-900 font-bold mb-3 block text-sm">
                    📱 Body Condition
                  </Label>
                  <Select
                    value={conditions.body_condition}
                    onValueChange={(value) =>
                      handleConditionChange("body_condition", value)
                    }
                  >
                    <SelectTrigger className="border-gray-300 rounded-lg h-11 bg-white hover:border-blue-400 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">
                        ⭐ Excellent - No scratches
                      </SelectItem>
                      <SelectItem value="Good">
                        ✓ Good - Minor scratches
                      </SelectItem>
                      <SelectItem value="Fair">
                        ⚠ Fair - Visible wear & tear
                      </SelectItem>
                      <SelectItem value="Poor">
                        ✗ Poor - Significant damage
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-5">
                  <Label className="text-gray-900 font-bold mb-2 block text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Final Offered Price (₹)
                  </Label>
                  <Input
                    type="number"
                    value={finalPrice}
                    onChange={(e) =>
                      setFinalPrice(parseFloat(e.target.value) || 0)
                    }
                    placeholder="Enter final price"
                    className="border-gray-300 rounded-lg text-lg font-bold text-green-700 h-11"
                  />
                  <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>Estimated: ₹{estimatedPrice.toFixed(0)}</span>
                    <span
                      className={
                        finalPrice > estimatedPrice
                          ? "text-amber-600 font-semibold"
                          : finalPrice < estimatedPrice
                            ? "text-green-600 font-semibold"
                            : ""
                      }
                    >
                      {finalPrice > estimatedPrice
                        ? `+₹${(finalPrice - estimatedPrice).toFixed(0)}`
                        : finalPrice < estimatedPrice
                          ? `-₹${(estimatedPrice - finalPrice).toFixed(0)}`
                          : "Same as estimate"}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-5">
                  <Label className="text-gray-900 font-bold mb-3 block text-sm">
                    💳 Payment Method
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="border-gray-300 rounded-lg h-11 bg-white hover:border-blue-400 focus:border-blue-500">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="UPI">📱 UPI</SelectItem>
                      <SelectItem value="Bank Transfer">
                        🏦 Bank Transfer
                      </SelectItem>
                      <SelectItem value="Cheque">📄 Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:border-green-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={customerAccepted}
                      onChange={(e) => setCustomerAccepted(e.target.checked)}
                      className="w-5 h-5 rounded accent-green-600"
                    />
                    <div>
                      <span className="text-gray-900 font-bold block">
                        Customer Accepted
                      </span>
                      <span className="text-xs text-gray-600">
                        Customer agreed to the final offer
                      </span>
                    </div>
                  </label>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-gray-900 font-bold mb-2 block text-sm">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                    placeholder="Any observations, damage details, or other notes..."
                    className="border-gray-300 rounded-lg resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("photo_capture")}
                  className="flex-1 border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("review")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={!customerAccepted || !paymentMethod}
                >
                  Review & Confirm
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 shadow-sm">
                <h3 className="font-bold text-xl text-green-900 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                  Pickup Summary
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Photos
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {photos.length}
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          / 4
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Payment
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        {paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-green-200 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">
                        Battery Health:
                      </span>
                      <span className="font-bold text-gray-900">
                        {conditions.battery_health}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">
                        Body Condition:
                      </span>
                      <span className="font-bold text-gray-900">
                        {conditions.body_condition}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 bg-white px-4 rounded-lg border border-green-200">
                      <span className="text-gray-700 font-medium">
                        Final Price:
                      </span>
                      <span className="text-3xl font-bold text-green-600">
                        ₹{finalPrice.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">
                        Customer Acceptance:
                      </span>
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <Check className="w-5 h-5" />
                        Confirmed
                      </span>
                    </div>
                  </div>

                  {pickupNotes && (
                    <div className="border-t-2 border-green-200 pt-4">
                      <div className="text-sm text-gray-700 font-medium mb-2">
                        Notes:
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200 text-sm text-gray-700">
                        {pickupNotes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">
                    Ready to complete
                  </p>
                  <p className="text-blue-800 text-xs mt-1">
                    Click the button below to submit and complete this pickup
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("condition_details")}
                  className="flex-1 border-gray-300"
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Complete Pickup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
