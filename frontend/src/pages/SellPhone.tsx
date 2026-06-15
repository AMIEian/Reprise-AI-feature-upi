import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
// Tabs removed per request — showing phone grid directly
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext, 
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Http } from "@capacitor-community/http";

const BRANDS = [
  {
    id: 1,
    name: "Samsung",
    logo: "/assets/brands/samsung.png",
    popularModels: ["Galaxy S21", "Galaxy Note 20", "Galaxy A52"],
  },
  {
    id: 2,
    name: "Apple",
    logo: "/assets/brands/apple.png",
    popularModels: ["iPhone 12", "iPhone 11", "iPhone SE"],
  },
  {
    id: 3,
    name: "OnePlus",
    logo: "/assets/brands/oneplus.png",
    popularModels: ["OnePlus 9", "OnePlus 8T", "OnePlus Nord"],
  },
  {
    id: 4,
    name: "Xiaomi",
    slug: "Redmi",
    logo: "/assets/brands/xiaomi.svg",
    popularModels: ["Mi 11", "Redmi Note 10", "Poco X3"],
  },
  {
    id: 5,
    name: "Oppo",
    logo: "/assets/brands/oppo.png",
    popularModels: ["Oppo Find X3", "Oppo Reno 5", "Oppo A54"],
  },
  {
    id: 6,
    name: "Vivo",
    logo: "/assets/brands/vivo.png",
    popularModels: ["Vivo X60", "Vivo V21", "Vivo Y20"],
  },
  {
    id: 7,
    name: "Google",
    logo: "/assets/brands/google.png",
    popularModels: ["Pixel 6", "Pixel 5", "Pixel 4"],
  },
  {
    id: 8,
    name: "Honor",
    logo: "/assets/brands/honor.png",
    popularModels: ["Honor 9X", "Honor 8X", "Honor 7X"],
  },
  {
    id: 9,
    name: "Infinix",
    logo: "/assets/brands/infinix.png",
    popularModels: ["Infinix Zero 8", "Infinix Note 12", "Infinix S7        "],
  },
  {
    id: 10,
    name: "Iqoo",
    logo: "/assets/brands/iqoo.png",
    popularModels: ["IQOO 9", "IQOO 8", "IQOO 7"],
  },
  {
    id: 11,
    name: "Motorola",
    logo: "/assets/brands/motorola.svg",
    popularModels: ["Motorola Edge 2021", "Motorola G52", "Motorola Moto G31"],
  },
  {
    id: 12,
    name: "Nothing",
    logo: "/assets/brands/nothing.png",
    popularModels: ["Nothing Phone (1)", "Nothing Phone (2)"],
  },
  {
    id: 13,
    name: "Realme",
    logo: "/assets/brands/realme.png",
    popularModels: ["Realme GT", "Realme 8", "Realme Narzo"],
  },
];

const POPULAR_BRANDS = [
  "Apple",
  "Samsung",
  "Google",
  "OnePlus",
  "Xiaomi",
  "Oppo",
  "Vivo",
];

const SLIDE_IMAGES = [
  "/images/Cashnow_20260226_140025_0000.jpg.jpeg",
  "/images/3_20260225_191315_0001.jpg.jpeg",
  "/images/Cashnow_20260223_135656_0000.jpg.jpeg",
  "/images/2_20260225_191315_0000.jpg.jpeg",
];

export default function SellPhone() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12; // Items per page
  const navigate = useNavigate();

  // Track active carousel slide for scaling effect
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    onSelect();
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Fetch phones from backend
  const { data, isLoading, error } = useQuery({
    queryKey: ["phones", page, limit, searchQuery],
    queryFn: async () => {
      const API_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
      const paramsObj: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (searchQuery) paramsObj.search = searchQuery;

      const response = await Http.request({
        method: "GET",
        url: `${API_URL}/sell-phone/phones`,
        params: paramsObj,
        headers: { Accept: "application/json" },
      });

      if (response.status >= 400) {
        const errorMessage =
          response.status === 404
            ? "No phones found for your search."
            : response.status >= 500
            ? "Server error. Please try again later."
            : "Failed to fetch phones.";
        throw { status: response.status, message: errorMessage };
      }
      return response.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (
        (error as unknown as { status?: number })?.status &&
        (error as unknown as { status: number }).status >= 400 &&
        (error as unknown as { status: number }).status < 500
      )
        return false;
      return failureCount < 2;
    },
  });

  // Show toast on error
  useEffect(() => {
    if (error) {
      const errorMsg = error?.message || "An unexpected error occurred.";
      toast.error(errorMsg, {
        description: "Please check your connection and try again.",
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
        duration: 8000,
      });
    }
  }, [error]);

  const phones = data?.phones || [];
  const totalPages = Math.max(data?.total_pages || 1, 1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is now handled by the query refetch
  };

  // Remove local filtering since backend handles it
  const scrollingBrands = [...BRANDS, ...BRANDS];
  const filteredBrands = BRANDS.filter((brand) =>
    brand.name.toLowerCase().includes(selectedBrand.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Carousel Section — center-peek layout */}
        <section className="bg-background py-8 overflow-hidden">
          <Carousel
            setApi={setCarouselApi}
            opts={{ align: "center", loop: true, containScroll: false }}
            plugins={[
              Autoplay({
                delay: 3000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {SLIDE_IMAGES.map((image, index) => {
                const isActive = selectedIndex === index;
                return (
                  <CarouselItem
                    key={index}
                    className={`pl-3 basis-[82%] sm:basis-[75%] lg:basis-[65%] transition-all duration-500 ${
                      isActive
                        ? "scale-100 opacity-100 z-10"
                        : "scale-90 opacity-50"
                    }`}
                  >
                    <div className="rounded-2xl overflow-hidden aspect-square shadow-xl">
                      <img
                        src={image}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).src = `https://placehold.co/600x600/3b82f6/ffffff?text=Slide+${
                            index + 1
                          }`;
                        }}
                      />
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </section>

        {/* Search and Tabs Section */}
        <section className="py-8 bg-white shadow-sm">
          <div className="container mx-auto px-4">
            {/* Select Brand Section */}
            <div className="max-w-6xl mx-auto mb-10">
              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  Select Brand
                </h2>

                <p className="text-gray-500 mt-1">
                  Which phone are you selling?
                </p>
              </div>

              {/* Brand Search */}
              <div className="relative mb-8">
                <Input
                  type="text"
                  placeholder="Search brand (e.g. Samsung, Apple)"
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                  }}
                  className="pl-10 py-6 rounded-2xl border-gray-200"
                />

                <Search className="absolute left-3 top-4 h-5 w-5 text-gray-400" />

                {selectedBrand && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-2xl shadow-lg mt-2 z-50 overflow-hidden">
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => {
                            navigate(
                              `/sell-phone/${(
                                brand.slug || brand.name
                              ).toLowerCase()}`,
                            );
                            setSelectedBrand("");
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer transition"
                        >
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="w-8 h-8 object-contain"
                          />

                          <span>{brand.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500">
                        No brands found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Popular Brands */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Popular Brands</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {BRANDS.filter((brand) =>
                    POPULAR_BRANDS.includes(brand.name),
                  ).map((brand) => (
                    <div
                      key={brand.id}
                      onClick={() => {
                        navigate(
                          `/sell-phone/${(
                            brand.slug || brand.name
                          ).toLowerCase()}`,
                        );
                      }}
                      className={`border rounded-2xl p-6 cursor-pointer transition-all bg-white hover:shadow-lg ${
                        selectedBrand === brand.name
                          ? "border-green-500 ring-2 ring-green-200"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="h-16 flex items-center justify-center mb-4">
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="h-12 object-contain"
                        />
                      </div>

                      <p className="text-center font-medium">{brand.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Brands Live Scroll */}
              <div className="overflow-hidden py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">All Brands</h3>
                </div>

                <div className="relative overflow-hidden">
                  <div className="flex gap-4 animate-marquee whitespace-nowrap">
                    {scrollingBrands.map((brand, index) => (
                      <div
                        key={`${brand.id}-${index}`}
                        onClick={() => {
                          navigate(
                            `/sell-phone/${(
                              brand.slug || brand.name
                            ).toLowerCase()}`,
                          );
                        }}
                        className="min-w-[180px] border rounded-2xl p-5 cursor-pointer transition-all bg-white hover:shadow-xl border-gray-200 flex-shrink-0"
                      >
                        <div className="h-14 flex items-center justify-center mb-3">
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="h-10 object-contain"
                          />
                        </div>

                        <p className="text-center font-medium text-sm">
                          {brand.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for your phone model or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-16 py-2"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-12 top-1 h-8 px-2"
                  >
                    ✕
                  </Button>
                )}
                <Button
                  type="submit"
                  className="absolute right-1 top-1 h-8"
                  size="sm"
                >
                  Search
                </Button>
              </div>
            </form>

            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-8 w-8 mr-2" />
                <span>Loading phones...</span>
              </div>
            )}
            {!isLoading && !error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                  {phones.map((phone) => (
                    <div key={phone.id} className="group">
                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0 rounded-3xl bg-gradient-to-br from-pink-50 via-blue-50 to-yellow-50 h-[320px]">
                        <CardContent className="p-4 flex flex-col relative h-full">
                          <Link
                            to={`/sell/${phone.id}`}
                            className="flex flex-col h-full"
                          >
                            {/* Product Image */}
                            <div className="w-full aspect-[4/5] mb-3 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl p-0 group-hover:bg-white/80 transition-all overflow-hidden">
                              <img
                                src={
                                  phone.image_blob
                                    ? `data:image/jpeg;base64,${phone.image_blob}`
                                    : phone.image_url
                                    ? `${import.meta.env.VITE_API_BASE_URL}${
                                        phone.image_url
                                      }`
                                    : `/assets/phones/${phone.id}.png`
                                }
                                alt={phone.Brand + " " + phone.Model}
                                className="w-full h-full object-contain object-center drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (img.dataset.attempt === "1") {
                                    img.src = `https://placehold.co/400x300/e0e7ff/6366f1?text=${encodeURIComponent(
                                      phone.Brand + " " + phone.Model,
                                    )}`;
                                    return;
                                  }
                                  img.dataset.attempt = "1";
                                  img.src = `/assets/phones/${phone.id}.png`;
                                }}
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-grow flex flex-col justify-start">
                              <h3 className="font-bold text-sm mb-1 line-clamp-2 text-gray-900">
                                {phone.Brand + " " + phone.Model}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2">
                                {phone.Brand}
                              </p>
                              <div className="pt-2 flex flex-col">
                                <p className="text-sm font-bold text-green-600 mb-2">
                                  ₹
                                  {typeof phone.Selling_Price === "number" &&
                                  !isNaN(phone.Selling_Price)
                                    ? phone.Selling_Price.toLocaleString(
                                        "en-IN",
                                      )
                                    : "Price unavailable"}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-4 py-1 text-xs font-medium"
                                  >
                                    Sell
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>

                {!isLoading && !error && phones.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No phones found. Try adjusting your search.
                  </p>
                )}

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="w-full sm:w-auto"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Why Sell With Us Section */}
        <section className="py-8 sm:py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-10">
              Why Sell With CashNow?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="bg-blue-100 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Fast & Efficient</h3>
                <p className="text-gray-600">
                  Get a quote in minutes, not days. Our pickup process is quick
                  and hassle-free.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 text-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Trusted Service</h3>
                <p className="text-gray-600">
                  Over 1 million satisfied customers have trusted us with their
                  phones.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 text-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="M7 15h0"></path>
                    <path d="M12 15h0"></path>
                    <path d="M17 15h0"></path>
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Instant Payment</h3>
                <p className="text-gray-600">
                  Receive payment immediately upon phone verification, directly
                  to your preferred method.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
