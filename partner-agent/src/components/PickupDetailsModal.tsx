import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import api from "../lib/api";
import { handleApiError } from "../lib/errorHandler";

interface PickupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

interface PhotoMetadata {
  index: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  captured_at: string;
}

interface PickupDetails {
  order_id: number;
  has_pickup_details: boolean;
  agent?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  phone_conditions?: any;
  final_offered_price?: number;
  customer_accepted_offer?: boolean;
  payment_method?: string;
  pickup_notes?: string;
  actual_condition?: string;
  photos_metadata?: PhotoMetadata[];
  photos_blob?: string; // Base64 encoded blob string from API
  photos_count?: number;
  total_blob_size?: number;
  captured_at?: string;
  created_at?: string;
}

export default function PickupDetailsModal({
  isOpen,
  onClose,
  orderId,
}: PickupDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PickupDetails | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extract individual photos from blob
  const photos = useMemo(() => {
    if (!details?.photos_blob || !details?.photos_metadata) return [];

    try {
      // Convert base64 blob to binary
      const binaryString = atob(details.photos_blob);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Split blob into individual photos based on metadata
      const extractedPhotos: Array<{
        metadata: PhotoMetadata;
        blob: Blob;
        url: string;
      }> = [];

      let currentIndex = 0;
      details.photos_metadata.forEach((metadata) => {
        const photoBytes = bytes.slice(
          currentIndex,
          currentIndex + metadata.size_bytes,
        );
        const blob = new Blob([photoBytes], {
          type: metadata.content_type,
        });
        const url = URL.createObjectURL(blob);

        extractedPhotos.push({
          metadata,
          blob,
          url,
        });

        currentIndex += metadata.size_bytes;
      });

      return extractedPhotos;
    } catch (e) {
      console.error("Error extracting photos from blob:", e);
      return [];
    }
  }, [details]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchPickupDetails();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    // Cleanup object URLs when component unmounts
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, [photos]);

  const fetchPickupDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/partner/orders/${orderId}/pickup-details`,
      );
      setDetails(response.data);
      setActivePhotoIndex(0);
    } catch (err: any) {
      handleApiError(err);
      setError(
        err.response?.data?.detail ||
          "Failed to fetch pickup details. Please try again.",
      );
      console.error("Error fetching pickup details:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatConditions = (conditions: any) => {
    if (!conditions) return null;
    return (
      <div className="space-y-2 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(conditions).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-gray-600 capitalize">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="font-medium">
                {typeof value === "boolean"
                  ? value
                    ? "✓ Yes"
                    : "✗ No"
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto bg-white border-gray-200 shadow-2xl p-3 md:p-6 rounded-t-2xl md:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Pickup Details - Order #{orderId}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-600">
            Complete inspection form and photos captured by agent
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-xs md:text-sm text-gray-600">
              Loading pickup details...
            </p>
          </div>
        ) : error ? (
          <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded text-xs md:text-sm text-red-700">
            {error}
          </div>
        ) : details && !details.has_pickup_details ? (
          <div className="p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded text-xs md:text-sm text-yellow-700">
            No pickup details found for this order.
          </div>
        ) : details ? (
          <div className="space-y-4 md:space-y-6">
            {/* Agent Info */}
            {details.agent && (
              <div className="border rounded-lg p-3 md:p-4 bg-blue-50">
                <h3 className="font-semibold text-sm md:text-base text-blue-900 mb-2">
                  Inspecting Agent
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{details.agent.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-medium">{details.agent.phone}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-xs md:text-sm break-all">
                      {details.agent.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Photos Section */}
            {photos.length > 0 && (
              <div className="border rounded-lg p-3 md:p-4">
                <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">
                  Photos ({details.photos_count})
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {/* Photo Display */}
                  <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center h-48 sm:h-64 md:h-96">
                    {photos[activePhotoIndex] ? (
                      <img
                        src={photos[activePhotoIndex].url}
                        alt={`Photo ${activePhotoIndex + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-xs md:text-sm text-gray-500">
                        No image data
                      </div>
                    )}
                  </div>

                  {/* Photo Thumbnails */}
                  {photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {photos.map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded border-2 overflow-hidden transition-all ${
                            activePhotoIndex === idx
                              ? "border-blue-500 scale-110"
                              : "border-gray-300"
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={`Thumb ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Photo Info */}
                  <div className="text-xs text-gray-600 space-y-0.5 md:space-y-1">
                    <p>
                      <span className="font-semibold">File:</span>{" "}
                      <span className="break-all">
                        {photos[activePhotoIndex]?.metadata.filename}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Size:</span>{" "}
                      {(
                        photos[activePhotoIndex]?.metadata.size_bytes / 1024
                      ).toFixed(2)}{" "}
                      KB
                    </p>
                    <p>
                      <span className="font-semibold">Captured:</span>{" "}
                      {photos[activePhotoIndex]?.metadata.captured_at
                        ? new Date(
                            photos[activePhotoIndex].metadata.captured_at,
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Conditions */}
            {details.phone_conditions && (
              <div className="border rounded-lg p-3 md:p-4">
                <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">
                  Phone Conditions
                </h3>
                {formatConditions(details.phone_conditions)}
              </div>
            )}

            {/* Offer Details */}
            <div className="border rounded-lg p-3 md:p-4 bg-green-50">
              <h3 className="font-semibold text-sm md:text-base text-green-900 mb-2 md:mb-3">
                Offer Details
              </h3>
              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Offered Price:</span>
                  <span className="font-semibold text-base md:text-lg">
                    ₹{details.final_offered_price?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer Acceptance:</span>
                  <span
                    className={`font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-sm ${
                      details.customer_accepted_offer
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {details.customer_accepted_offer ? "Accepted" : "Declined"}
                  </span>
                </div>
                {details.actual_condition && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Condition:</span>
                    <span className="font-medium">
                      {details.actual_condition}
                    </span>
                  </div>
                )}
                {details.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">
                      {details.payment_method}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup Notes */}
            {details.pickup_notes && (
              <div className="border rounded-lg p-3 md:p-4">
                <h3 className="font-semibold text-sm md:text-base mb-2">
                  Agent Notes
                </h3>
                <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {details.pickup_notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-3 md:pt-4 text-xs text-gray-500 space-y-0.5 md:space-y-1">
              <p>
                Captured at:{" "}
                {details.captured_at
                  ? new Date(details.captured_at).toLocaleString()
                  : "N/A"}
              </p>
              <p>
                Total Blob Size:{" "}
                {((details.total_blob_size || 0) / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-3 md:pt-4 border-t">
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
