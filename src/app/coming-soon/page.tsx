import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full bg-white rounded-[32px] shadow-sm border p-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center mb-6">
            <Clock3 className="w-12 h-12 text-[#14B8A6]" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#111827] leading-tight">
            Coming Soon
          </h1>

          <p className="text-gray-500 text-lg mt-5 leading-relaxed max-w-xl mx-auto">
            We are working hard to launch this device selling feature on
            CashNow. Stay tuned for a smooth and instant selling experience.
          </p>

          <div className="mt-10">
            <Link href="/">
              <Button className="bg-[#14B8A6] hover:bg-[#0F9F94] h-12 px-8 rounded-2xl text-base font-semibold">
                Back To Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}