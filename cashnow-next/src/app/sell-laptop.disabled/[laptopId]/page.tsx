'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, ArrowRight, ArrowLeft, Box } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Http } from "@capacitor-community/http";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
    { id: 1, name: "Storage" },
    { id: 2, name: "Basic Condition" },
    { id: 3, name: "Functional Issues" },
    { id: 4, name: "Physical Condition" },
    { id: 5, name: "Accessories & Age" },
    { id: 6, name: "Final Quote" },
];

export default function LaptopDetail() {
    const { laptopId } = useParams();
    const router = useRouter();
    const { isLoggedIn } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedStorage, setSelectedStorage] = useState("");
    const [selectedScreenCondition, setSelectedScreenCondition] = useState("");
    const [deviceTurnsOn, setDeviceTurnsOn] = useState("");
    const [hasOriginalBox, setHasOriginalBox] = useState("");
    const [hasOriginalBill, setHasOriginalBill] = useState("");
    const [deviceAge, setDeviceAge] = useState("");
    const [keyboardIssue, setKeyboardIssue] = useState("");
    const [touchpadIssue, setTouchpadIssue] = useState("");
    const [wifiIssue, setWifiIssue] = useState("");
    const [speakerIssue, setSpeakerIssue] = useState("");
    const [batteryIssue, setBatteryIssue] = useState("");
    const [bodyCondition, setBodyCondition] = useState("");
    const [hingeCondition, setHingeCondition] = useState("");
    const [screenSpots, setScreenSpots] = useState("");
    const [hasCharger, setHasCharger] = useState("");
    const [selectedRam, setSelectedRam] = useState("");
    const [selectedProcessor, setSelectedProcessor] = useState("");
    const [storageType, setStorageType] = useState("");
    const [screenSize, setScreenSize] = useState("");
    const [graphicsCard, setGraphicsCard] = useState("");
    const [usageType, setUsageType] = useState("");

    type LaptopConfig = {
        ram_gb: number;
        storage_gb: number;
        processor: string;
        storage_type: string;
        screen_size: string;
        graphics: string;
        price: number;
    };

    const { data, isLoading, error } = useQuery<{
        id: number;
        Brand: string;
        Model: string;
        image_url: string;
        configs: LaptopConfig[];
    }>({
        queryKey: ["laptop", laptopId],
        queryFn: async () => {
            const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
            const res = await Http.request({
                method: "GET",
                url: `${API}/sell-laptop/laptops/${laptopId}`,
            });
            return res.data;
        },
        enabled: !!laptopId,
    });

    useEffect(() => {
        if (error) toast.error("Failed to load laptop");
    }, [error]);

    // PREDICTION
    const {
        data: predictionData,
        isLoading: isPredictionLoading,
        error: predictionError,
    } = useQuery({
        queryKey: [
            "laptopPrediction",
            laptopId,
            selectedStorage,
            selectedScreenCondition,
            deviceTurnsOn,
            hasOriginalBox,
            hasOriginalBill,
            deviceAge,
        ],
        queryFn: async () => {
            const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

            const payload = {
                laptop_details: {
                    brand: data?.Brand,
                    model: data?.Model,

                    // CONFIGURATION
                    ram_gb: selectedRam ? parseInt(selectedRam.replace("GB", "")) : undefined,
                    processor: selectedProcessor,
                    storage_gb: selectedStorage
                        ? selectedStorage.includes("TB")
                            ? parseInt(selectedStorage) * 1024
                            : parseInt(selectedStorage.replace("GB", ""))
                        : undefined,
                    storage_type: storageType,
                    screen_size: screenSize,
                    graphics: graphicsCard,

                    // BASIC
                    screen_condition: selectedScreenCondition,
                    device_turns_on: deviceTurnsOn === "yes",

                    // FUNCTIONAL
                    keyboard_issue: keyboardIssue === "no",
                    touchpad_issue: touchpadIssue === "no",
                    wifi_issue: wifiIssue === "no",
                    speaker_issue: speakerIssue === "no",
                    battery_condition: batteryIssue ? batteryIssue : "good",

                    // PHYSICAL
                    body_condition: bodyCondition,
                    hinge_condition: hingeCondition,
                    screen_spots: screenSpots === "yes" ? true : false,

                    // ACCESSORIES
                    has_original_box: hasOriginalBox === "yes" ? true : false,
                    has_original_bill: hasOriginalBill === "yes" ? true : false,
                    has_charger: hasCharger === "yes" ? true : false,

                    // AGE
                    device_age: deviceAge,
                },
            };

            console.log("Payload:", payload);

            // API CALL
            const res = await Http.request({
                method: "POST",
                url: `${API}/customer-side-prediction/predict-price`,
                headers: {
                    "Content-Type": "application/json",
                },
                data: payload,
            });

            if (res.status >= 400) throw new Error();
            return res.data;
        },

        enabled: 
            !!data &&
            currentStep === 6 &&
            !!selectedStorage &&
            !!selectedRam &&
            !!selectedProcessor &&
            !!selectedScreenCondition &&
            !!deviceTurnsOn &&
            !!batteryIssue &&
            !!bodyCondition &&
            !!hingeCondition &&
            !!screenSpots &&
            !!hasOriginalBox &&
            !!hasOriginalBill &&
            !!hasCharger &&
            !!usageType &&
            !!deviceAge,
    });

    useEffect(() => {
        if (predictionError) {
            toast.warning("Price service unavailable. Continue anyway.");
        }
    }, [predictionError]);

    if (isLoading) return <p>Loading...</p>;
    if (!data) return <p>No data</p>;

    console.log("Laptop API Response:", data);

    const laptop = {
        name: data.Brand + " " + data.Model,
        image: data.image_url,
    };

    const canProceed = () => {
        if (currentStep === 1)
            return (
                selectedStorage &&
                selectedRam &&
                selectedProcessor &&
                storageType &&
                screenSize &&
                graphicsCard
            );

        if (currentStep === 2)
            return selectedScreenCondition && deviceTurnsOn;

        if (currentStep === 3)
            return (
                keyboardIssue !== "" &&
                touchpadIssue !== "" &&
                wifiIssue !== "" &&
                speakerIssue !== "" &&
                batteryIssue !== ""
            );

        if (currentStep === 4)
            return (
                bodyCondition !== "" &&
                hingeCondition !== "" &&
                screenSpots !== ""
            );

        if (currentStep === 5)
            return (
                hasOriginalBox !== "" &&
                hasOriginalBill !== "" &&
                hasCharger !== "" &&
                deviceAge !== "" &&
                usageType !== ""
            );

        return true;
    };

    localStorage.removeItem("phoneData");

    const handleSell = () => {
        localStorage.setItem(
            "laptopData",
            JSON.stringify({
                ...laptop,
                storage: selectedStorage,
                condition: selectedScreenCondition,
                age: deviceAge,
                price: predictionData?.predicted_price || 0,
            })
        );

        if (isLoggedIn) router.push("/checkout");
        else router.push("/login");
    };

    const progress = (currentStep / STEPS.length) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <Header />

            <main className="flex-grow flex items-center">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid md:grid-cols-2 gap-8">

                        {/* LEFT PANEL */}
                        <div className="flex flex-col justify-between bg-white/40 backdrop-blur-sm rounded-3xl p-8 lg:p-12">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
                            >
                                <ArrowLeft /> Homepage
                            </Link>

                            <div className="mb-8">
                                <p className="text-sm text-blue-600 mb-2">
                                    step {currentStep}/{STEPS.length}
                                </p>

                                <div className="h-1 bg-gray-200 rounded-full mb-6">
                                    <div
                                        className="h-full bg-blue-600 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mb-8">
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                                    {currentStep === 1 && "Configuration"}
                                    {currentStep === 2 && "Basic Condition?"}
                                    {currentStep === 3 && "Functional Issues?"}
                                    {currentStep === 4 && "Physical Condition?"}
                                    {currentStep === 5 && "Accessories & Details?"}
                                    {currentStep === 6 && "Your Final Quote"}
                                </h1>
                                <p className="text-gray-600">
                                    {currentStep === 1 && "Select your device storage"}
                                    {currentStep === 2 && "Basic working condition"}
                                    {currentStep === 3 && "Check device functionality"}
                                    {currentStep === 4 && "Check physical condition"}
                                    {currentStep === 5 && "Provide additional details"}
                                </p>
                            </div>

                            <Card>
                                <CardContent className="p-6 flex gap-4">
                                    <img src={laptop.image} className="w-20" />
                                    <div>
                                        <h3 className="font-bold">{laptop.name}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="mt-6 flex justify-end">
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

                        {/* RIGHT PANEL */}
                        <div className="flex flex-col justify-center">
                            <div className="max-w-xl mx-auto w-full space-y-4">

                                {/* CONFIGURATION */}
                                {currentStep === 1 && (
                                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* STORAGE */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">Storage</h4>

                                            <div className="space-y-3">
                                                {data?.configs && data.configs.length > 0 ? (
                                                    [...new Set((data.configs as LaptopConfig[]).map((c) => c.storage_gb))].map((s) => (
                                                        <div
                                                            key={s}
                                                            onClick={() => setSelectedStorage(`${s}GB`)}
                                                            className={`p-4 border-2 rounded-2xl cursor-pointer
                                                            ${selectedStorage === `${s}GB`
                                                                    ? "border-blue-600 bg-blue-50"
                                                                    : "bg-white/60 hover:bg-white/80"}`}
                                                        >
                                                            {s} GB
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 bg-white/60 rounded-2xl">No storage data</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* RAM */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">RAM</h4>

                                            <div className="space-y-3">
                                                {data?.configs && data.configs.length > 0 ? (
                                                    [...new Set((data.configs as LaptopConfig[]).map((c) => c.ram_gb))].map((r) => (
                                                        <div
                                                            key={r}
                                                            onClick={() => setSelectedRam(`${r}GB`)}
                                                            className={`p-4 border-2 rounded-2xl cursor-pointer
                                                            ${selectedRam === `${r}GB`
                                                                    ? "border-blue-600 bg-blue-50"
                                                                    : "bg-white/60"}`}
                                                        >
                                                            {r} GB
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 bg-white/60 rounded-2xl">No RAM data</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* PROCESSOR */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">Processor</h4>

                                            <div className="space-y-3">
                                                {data?.configs && data.configs.length > 0 ? (
                                                    [...new Set((data.configs as LaptopConfig[]).map((c) => c.processor))].map((p) => (
                                                        <div
                                                            key={p}
                                                            onClick={() => setSelectedProcessor(p)}
                                                            className={`p-4 border-2 rounded-2xl cursor-pointer
                                                            ${selectedProcessor === p
                                                                    ? "border-blue-600 bg-blue-50"
                                                                    : "bg-white/60"}`}
                                                        >
                                                            {p}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 bg-white/60 rounded-2xl">No processor data</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* STORAGE TYPE */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">Storage Type</h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setStorageType("ssd")}
                                                    className={`p-4 border-2 rounded-2xl text-center
                                                    ${storageType === "ssd"
                                                            ? "border-green-600 bg-green-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    SSD
                                                </div>

                                                <div
                                                    onClick={() => setStorageType("hdd")}
                                                    className={`p-4 border-2 rounded-2xl text-center
                                                    ${storageType === "hdd"
                                                            ? "border-blue-600 bg-blue-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    HDD
                                                </div>
                                            </div>
                                        </div>

                                        {/* SCREEN SIZE */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">Screen Size</h4>

                                            <div className="space-y-3">
                                                {["13 inch", "14 inch", "15.6 inch", "17 inch"].map((s) => (
                                                    <div
                                                        key={s}
                                                        onClick={() => setScreenSize(s)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${screenSize === s
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60"}`}
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* GRAPHICS */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">Graphics</h4>

                                            <div className="space-y-3">
                                                {["Integrated", "NVIDIA GTX", "NVIDIA RTX", "AMD Radeon"].map((g) => (
                                                    <div
                                                        key={g}
                                                        onClick={() => setGraphicsCard(g)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${graphicsCard === g
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60"}`}
                                                    >
                                                        {g}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* CONDITION */}
                                {currentStep === 2 && (
                                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* SCREEN CONDITION */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Screen Condition
                                            </h4>

                                            <div className="space-y-3">
                                                {[
                                                    {
                                                        id: "good",
                                                        label: "Good",
                                                        desc: "No scratches, pristine condition",
                                                    },
                                                    {
                                                        id: "minor",
                                                        label: "Minor Scratches",
                                                        desc: "Light scratches, barely visible",
                                                    },
                                                    {
                                                        id: "major",
                                                        label: "Major Scratches",
                                                        desc: "Visible scratches across screen",
                                                    },
                                                    {
                                                        id: "cracked",
                                                        label: "Cracked",
                                                        desc: "Screen has cracks but functional",
                                                    },
                                                    {
                                                        id: "shattered",
                                                        label: "Shattered",
                                                        desc: "Severely damaged screen",
                                                    },
                                                ].map((c) => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => setSelectedScreenCondition(c.id)}
                                                        className={`flex items-start gap-3 border-2 rounded-2xl p-4 cursor-pointer
                                                        ${selectedScreenCondition === c.id
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60 hover:bg-white/80"
                                                            }`}
                                                    >
                                                        <div className="flex-grow">
                                                            <div className="font-semibold">{c.label}</div>
                                                            <div className="text-sm text-gray-500">{c.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* YES NO */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Device turns on?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setDeviceTurnsOn("yes")}
                                                    className={`p-4 rounded-2xl border-2 cursor-pointer text-center
                                                    ${deviceTurnsOn === "yes"
                                                            ? "border-green-600 bg-green-50"
                                                            : "bg-white/60"
                                                        }`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setDeviceTurnsOn("no")}
                                                    className={`p-4 rounded-2xl border-2 cursor-pointer text-center
                                                    ${deviceTurnsOn === "no"
                                                            ? "border-red-600 bg-red-50"
                                                            : "bg-white/60"
                                                        }`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FUNCTIONAL ISSUES */}
                                {currentStep === 3 && (
                                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* KEYBOARD */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Keyboard working properly?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setKeyboardIssue("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${keyboardIssue === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setKeyboardIssue("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${keyboardIssue === "no" ? "border-red-600 bg-red-50" : "bg-white/60"}`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* TOUCHPAD */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Touchpad working properly?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setTouchpadIssue("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${touchpadIssue === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setTouchpadIssue("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${touchpadIssue === "no" ? "border-red-600 bg-red-50" : "bg-white/60"}`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* WIFI */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Wi-Fi working properly?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setWifiIssue("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${wifiIssue === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setWifiIssue("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${wifiIssue === "no" ? "border-red-600 bg-red-50" : "bg-white/60"}`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* SPEAKERS */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Speakers working properly?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setSpeakerIssue("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${speakerIssue === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setSpeakerIssue("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${speakerIssue === "no" ? "border-red-600 bg-red-50" : "bg-white/60"}`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* BATTERY */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Battery condition
                                            </h4>

                                            <div className="space-y-3">
                                                {[
                                                    { id: "good", label: "Good (Backup > 2 hrs)" },
                                                    { id: "average", label: "Average (1–2 hrs)" },
                                                    { id: "poor", label: "Poor (< 1 hr)" },
                                                ].map((b) => (
                                                    <div
                                                        key={b.id}
                                                        onClick={() => setBatteryIssue(b.id)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${batteryIssue === b.id
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60 hover:bg-white/80"
                                                            }`}
                                                    >
                                                        {b.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* PHYSICAL CONDITION */}
                                {currentStep === 4 && (
                                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* BODY CONDITION */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Body condition
                                            </h4>

                                            <div className="space-y-3">
                                                {[
                                                    { id: "no-scratch", value: "good", label: "No scratches or dents" },
                                                    { id: "minor", value: "minor", label: "Minor scratches / small dents" },
                                                    { id: "major", value: "major", label: "Major scratches / visible dents" },
                                                ].map((b) => (
                                                    <div
                                                        key={b.id}
                                                        onClick={() => setBodyCondition(b.value)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${bodyCondition === b.value
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60 hover:bg-white/80"
                                                            }`}
                                                    >
                                                        {b.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* HINGE CONDITION */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Hinges condition
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setHingeCondition("good")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${hingeCondition === "good"
                                                            ? "border-green-600 bg-green-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    Good
                                                </div>

                                                <div
                                                    onClick={() => setHingeCondition("loose")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${hingeCondition === "loose"
                                                            ? "border-red-600 bg-red-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    Loose / Damaged
                                                </div>
                                            </div>
                                        </div>

                                        {/* SCREEN SPOTS / LINES */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Any spots / lines on screen?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setScreenSpots("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${screenSpots === "no"
                                                            ? "border-green-600 bg-green-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    No Issues
                                                </div>

                                                <div
                                                    onClick={() => setScreenSpots("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${screenSpots === "yes"
                                                            ? "border-red-600 bg-red-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    Yes (Spots / Lines)
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* ACCESSORIES AND DETAILS */}
                                {currentStep === 5 && (
                                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                        {/* BOX */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Original box?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div onClick={() => setHasOriginalBox("yes")} className={`p-4 rounded-2xl border-2 text-center ${hasOriginalBox === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}>
                                                    Yes
                                                </div>
                                                <div onClick={() => setHasOriginalBox("no")} className={`p-4 rounded-2xl border-2 text-center ${hasOriginalBox === "no" ? "border-gray-600 bg-gray-50" : "bg-white/60"}`}>
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* BILL */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Original bill/invoice?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div onClick={() => setHasOriginalBill("yes")} className={`p-4 rounded-2xl border-2 text-center ${hasOriginalBill === "yes" ? "border-green-600 bg-green-50" : "bg-white/60"}`}>
                                                    Yes
                                                </div>
                                                <div onClick={() => setHasOriginalBill("no")} className={`p-4 rounded-2xl border-2 text-center ${hasOriginalBill === "no" ? "border-gray-600 bg-gray-50" : "bg-white/60"}`}>
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* CHARGER */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Original charger available?
                                            </h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setHasCharger("yes")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${hasCharger === "yes"
                                                            ? "border-green-600 bg-green-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    Yes
                                                </div>

                                                <div
                                                    onClick={() => setHasCharger("no")}
                                                    className={`p-4 rounded-2xl border-2 text-center cursor-pointer
                                                    ${hasCharger === "no"
                                                            ? "border-gray-600 bg-gray-50"
                                                            : "bg-white/60"}`}
                                                >
                                                    No
                                                </div>
                                            </div>
                                        </div>

                                        {/* USAGE TYPE */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                Usage type
                                            </h4>

                                            <div className="space-y-3">
                                                {[
                                                    { id: "light", label: "Light (Office / Browsing)" },
                                                    { id: "moderate", label: "Moderate (Coding / Work)" },
                                                    { id: "heavy", label: "Heavy (Gaming / Editing)" },
                                                ].map((u) => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => setUsageType(u.id)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${usageType === u.id
                                                                ? "border-blue-600 bg-blue-50"
                                                                : "bg-white/60 hover:bg-white/80"
                                                            }`}
                                                    >
                                                        {u.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* AGE */}
                                        <div>
                                            <h4 className="font-semibold mb-3 text-gray-700">
                                                How old is your device?
                                            </h4>

                                            <div className="space-y-3">
                                                {[
                                                    { id: "0-3 months", label: "0 – 3 months" },
                                                    { id: "3-6 months", label: "3 – 6 months" },
                                                    { id: "6-11 months", label: "6 – 11 months" },
                                                    { id: "above 11 months", label: "Above 11 months" },
                                                ].map((a) => (
                                                    <div
                                                        key={a.id}
                                                        onClick={() => setDeviceAge(a.id)}
                                                        className={`p-4 border-2 rounded-2xl cursor-pointer
                                                        ${deviceAge === a.id ? "border-blue-600 bg-blue-50" : "bg-white/60"}`}
                                                    >
                                                        {a.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* FINAL */}
                                {currentStep === 6 && (
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-3xl text-white">
                                        <p>Estimated Value</p>

                                        {isPredictionLoading ? (
                                            <h1 className="text-5xl">Loading...</h1>
                                        ) : predictionError ? (
                                            <h1 className="text-5xl">Error</h1>
                                        ) : (
                                            <h1 className="text-5xl">
                                                ₹ {predictionData?.predicted_price || 0}
                                            </h1>
                                        )}

                                        <Button
                                            onClick={handleSell}
                                            className="mt-6 w-full"
                                        >
                                            Proceed to Sell
                                        </Button>
                                    </div>
                                )}

                                {/* NEXT */}
                                {currentStep < STEPS.length && (
                                    <Button
                                        disabled={!canProceed()}
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        className="w-full"
                                    >
                                        Next <ArrowRight />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}