import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle } from "lucide-react";

export default function WhyCashNow() {
  const points = [
    {
      title: "Fastest pickup",
      description: "Get your old device pickup up within 24-48 hours",
      image: "/assets/client-photos/photo-2.jpeg",
      isLandscape: true,
    },
    {
      title: "Schedule pickup",
      description:
        "Choose a convenient location and time for pickup. We value your time, so we'll coordinate with you to ensure a hassle-free experience.",
      image: "/assets/client-photos/photo-5.jpeg",
    },
    {
      title: "Instant payment",
      description:
        "Why wait? Get paid even before you hand over the phone. Choose between a direct bank transfer or paytm. It's secure and swift!",
      image: "/assets/client-photos/photo-9.jpeg",
      isLandscape: true,
    },
    {
      title: "Check price",
      description:
        "Provide device details and get the best price through our advanced pricing engine",
      image: "/assets/client-photos/photo-4.jpeg",
      isLandscape: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50">
        <section
          className="relative text-primary-foreground py-24 md:py-32 mx-4 mt-4 rounded-3xl overflow-hidden"
          style={{
            backgroundImage:
              'url("/images/Cashnow_20260226_125944_0000.jpg.jpeg")',
            backgroundSize: "100% 100%", // squeeze/stretch to fill both dimensions
            backgroundPosition: "center",
          }}
        >
          {/* dark overlay to keep text readable */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="container mx-auto px-4 text-center relative">
            <h1 className="text-4xl font-bold mb-4">Why Choose CashNow?</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Quick, secure and convenient way to sell your old device
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="space-y-20 lg:space-y-32">
              {points.map((point, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center"
                >
                  {/* Image Section */}
                  <div
                    className={`relative group overflow-hidden rounded-2xl shadow-xl mx-auto ${
                      // @ts-ignore
                      point.isLandscape ? "max-w-md" : "max-w-sm"
                    } ${index % 2 === 1 ? "md:order-2" : ""}`}
                  >
                    <img
                      src={point.image}
                      alt={point.title}
                      className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  </div>

                  {/* Text Section */}
                  <div
                    className={`flex flex-col justify-center ${
                      index % 2 === 1 ? "md:order-1" : ""
                    }`}
                  >
                    <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <div className="bg-primary/10 p-3 rounded-full flex-shrink-0">
                        <CheckCircle className="text-primary w-6 h-6" />
                      </div>
                      {point.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-lg lg:text-xl">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
