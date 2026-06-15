import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CheckCircle,
  Users, 
  DollarSign,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BecomePartner() {
  const perks = [
    {
      title: "Earn Commission",
      description:
        "Get competitive commission rates on every successful transaction. The more you sell, the more you earn.",
      icon: DollarSign,
    },
    {
      title: "Flexible Schedule",
      description:
        "Work on your own terms. Set your availability and choose pickup times that fit your lifestyle.",
      icon: Clock,
    },
    {
      title: "Exclusive Leads",
      description:
        "Access to verified customer leads in your area. Get priority access to high-value opportunities.",
      icon: Users,
    },
    {
      title: "Training & Support",
      description:
        "Comprehensive training programs and ongoing support from our expert team to help you succeed.",
      icon: Award,
    },
    {
      title: "Performance Bonuses",
      description:
        "Unlock additional rewards and bonuses based on your performance and customer satisfaction ratings.",
      icon: TrendingUp,
    },
    {
      title: "Professional Tools",
      description:
        "Access to our partner dashboard, mobile app, and all the tools you need to manage your business efficiently.",
      icon: CheckCircle,
    },
  ];

  const handleBecomePartner = () => {
    window.location.href = "http://103.88.83.224:10002";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50">
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Become a Partner</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join our network of successful partners and start earning by
              helping customers sell their devices
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                Partner Perks & Benefits
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Enjoy these exclusive benefits when you join our partner program
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {perks.map((perk, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
                    <perk.icon className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{perk.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {perk.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-16">
              <div className="bg-white rounded-2xl p-8 shadow-xl max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join thousands of successful partners who are already earning
                  with CashNow. Sign up today and start your journey towards
                  financial success.
                </p>
                <Button
                  size="lg"
                  onClick={handleBecomePartner}
                  className="text-lg px-8 py-3"
                >
                  Become a Partner Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
