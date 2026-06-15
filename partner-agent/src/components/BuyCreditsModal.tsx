import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useBuyCredits } from "../context/BuyCreditsContext";

const BuyCreditsModal: React.FC = () => {
  const {
    showBuyModal,
    plans,
    purchaseLoading,
    paymentStep,
    selectedPlan,
    screenshot,
    screenshotPreview,
    handleBuyPlan,
    handleScreenshotSelect,
    handleSubmitPayment,
    resetModal,
    goBackToPlanSelection,
    resetScreenshot,
  } = useBuyCredits();

  return (
    <AnimatePresence>
      {showBuyModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              resetModal();
            }}
          ></div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full md:w-full md:max-w-2xl bg-white rounded-t-xl md:rounded-xl p-4 md:p-6 shadow-2xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto"
          >
            {/* Step 1: Select Plan */}
            {paymentStep === "select_plan" && (
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Buy Credits
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mb-4">
                  Choose a credit plan to purchase
                </p>

                <div className="space-y-2 md:space-y-3">
                  {plans.map((p, index) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-200 hover:border-purple-300">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-grow">
                              <div className="font-semibold text-sm md:text-base">
                                {p.plan_name}
                              </div>
                              <div className="text-xs md:text-sm text-gray-500">
                                {p.description}
                              </div>
                              {p.bonus_percentage > 0 && (
                                <div className="text-xs mt-1 font-semibold text-green-600">
                                  + {p.bonus_percentage}% bonus
                                </div>
                              )}
                            </div>
                            <div className="text-right w-full sm:w-auto">
                              <div className="text-lg md:text-xl font-bold">
                                {p.credit_amount} credits
                              </div>
                              <div className="text-xs md:text-sm text-gray-500">
                                ₹{p.price}
                              </div>
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  className="text-xs h-8 w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                                  onClick={() => handleBuyPlan(p.id)}
                                  disabled={purchaseLoading}
                                >
                                  {purchaseLoading ? "Processing..." : "Select"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 text-right">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetModal();
                    }}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Payment Proof */}
            {paymentStep === "payment_proof" && selectedPlan && (
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Scan & Pay via UPI
                </h2>
                <p className="text-xs md:text-sm text-gray-600 mb-4">
                  Plan:{" "}
                  <span className="font-semibold">
                    {selectedPlan.plan_name}
                  </span>{" "}
                  • Amount:{" "}
                  <span className="font-semibold">₹{selectedPlan.price}</span>
                </p>

                <div className="space-y-4">
                  {/* QR Code Section */}
                  <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
                    <CardContent className="p-6 flex flex-col items-center">
                      <h3 className="text-sm font-semibold mb-3 text-gray-700">
                        Scan to Pay
                      </h3>
                      <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                        <img
                          src="/assets/QR_CODE.jpg"
                          alt="UPI QR Code"
                          className="w-48 h-48 md:w-56 md:h-56 object-cover rounded"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        Scan this QR code with your UPI app and pay ₹
                        {selectedPlan.price}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Screenshot Upload Section */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3 text-gray-700">
                        Upload Payment Screenshot
                      </h3>

                      {screenshotPreview ? (
                        <div className="mb-4">
                          <img
                            src={screenshotPreview}
                            alt="Payment screenshot"
                            className="w-full max-h-64 object-contain rounded-lg border-2 border-green-300"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => {
                              resetScreenshot();
                            }}
                          >
                            Change Screenshot
                          </Button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-purple-400 transition-colors flex items-center justify-center min-h-[140px]">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleScreenshotSelect(file);
                              }
                            }}
                            className="hidden"
                          />
                          <div className="text-center text-gray-600 flex flex-col items-center gap-1">
                            <div className="text-2xl">📸</div>
                            <p className="font-semibold mb-0">
                              Click to select screenshot
                            </p>
                            <p className="text-xs text-gray-500">
                              or drag and drop
                            </p>
                          </div>
                        </label>
                      )}

                      <p className="text-xs text-gray-500 mt-3">
                        📸 Screenshot should show the successful payment
                        confirmation
                      </p>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        goBackToPlanSelection();
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!screenshot || purchaseLoading}
                      onClick={handleSubmitPayment}
                    >
                      {purchaseLoading ? "Uploading..." : "Submit Payment"}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    ✓ Admin will review your payment and credits will be added
                    within 24 hours
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuyCreditsModal;
