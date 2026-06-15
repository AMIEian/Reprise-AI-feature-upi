import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Http } from "@capacitor-community/http";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export default function BrandModels() {
  const { brandName } = useParams();
  const [searchModel, setSearchModel] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["brandPhones", brandName],

    queryFn: async () => {
      const API_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

      const response = await Http.request({
        method: "GET",

        url: `${API_URL}/sell-phone/phones`,

        params: {
          brand: brandName || "",
          page: "1",
          limit: "100",
        },

        headers: {
          Accept: "application/json",
        },
      });

      return response.data;
    },

    enabled: !!brandName,
  });

  const phones = data?.phones || [];
  const filteredPhones = phones.filter((phone: any) =>
    `${phone.Brand} ${phone.Model}`
      .toLowerCase()
      .includes(searchModel.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow">
        <section className="container mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold mb-2 capitalize">
                Sell Old {brandName} Phones
              </h1>

              <p className="text-gray-500">Select your model</p>
            </div>

            {/* Search Model */}
            <div className="relative w-full lg:w-[320px]">
              <Input
                type="text"
                placeholder="Search Model"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="pl-10 h-12 rounded-xl border-gray-300 bg-white"
              />

              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-10">Loading phones...</div>
          )}

          {error && (
            <div className="text-center py-10 text-red-500">
              Failed to load phones
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {filteredPhones.map((phone: any) => (
              <Link key={phone.id} to={`/sell/${phone.id}`}>
                <Card className="hover:shadow-lg transition-all duration-300 rounded-xl border border-gray-200 bg-white">
                  <CardContent className="p-3">
                    <div className="h-28 flex items-center justify-center mb-3">
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
                        alt={`${phone.Brand} ${phone.Model}`}
                        className="h-full object-contain"
                      />
                    </div>

                    <h3 className="text-sm font-medium text-center leading-5">
                      {phone.Brand} {phone.Model}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main> 

      <Footer />
    </div>
  );
}
