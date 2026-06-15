import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../lib/api";
import { showErrorToastWithRetry } from "../lib/errorHandler";
import { formatDateTime } from "../lib/utils";
import { getPartnerStatusColor } from "../lib/badgeUtils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, XCircle, Image } from "lucide-react";

interface Partner {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  company_name: string;
  verification_status: string;
  credit_balance: number;
  is_active: boolean;
  created_at: string;
  udyam_id?: string;
  udyam_aadhar_image?: string | null;
}

export default function PendingPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingPartners();
  }, []);

  const fetchPendingPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/partners/pending-verification");
      setPartners(response.data);
    } catch (error: any) {
      console.error("Failed to fetch pending partners:", error);
      const retryFn = () => fetchPendingPartners();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      under_review: AlertCircle,
      clarification_needed: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle,
      suspended: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
      <Badge
        className={`${getPartnerStatusColor(status)} flex items-center gap-1`}
        variant="outline"
      >
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
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
          <h1 className="text-3xl font-bold">Pending Verifications</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve partner applications
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/partners")}>
          View All Partners
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Applications</CardTitle>
          <CardDescription>
            {partners.length} partner(s) awaiting verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pending verifications
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Udyam Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      {partner.full_name}
                    </TableCell>
                    <TableCell>{partner.company_name || "-"}</TableCell>
                    <TableCell>{partner.email}</TableCell>
                    <TableCell>{partner.phone}</TableCell>
                    <TableCell>
                      {partner.udyam_aadhar_image ? (
                        <button
                          onClick={() => {
                            setSelectedImage(
                              `${import.meta.env.VITE_API_BASE_URL}${partner.udyam_aadhar_image}`,
                            );
                            setImageTitle(
                              `${partner.full_name} - Udyam Certificate`,
                            );
                          }}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Image className="h-4 w-4" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(partner.verification_status)}
                    </TableCell>
                    <TableCell>{formatDateTime(partner.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/partners/${partner.id}`)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{imageTitle}</DialogTitle>
            <DialogDescription>Udyam Aadhaar Certificate</DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full flex items-center justify-center bg-gray-50 rounded-lg p-4">
              <img
                src={selectedImage}
                alt="Udyam Certificate"
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
