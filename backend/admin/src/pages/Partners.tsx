import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import api from "../lib/api";
import { showErrorToastWithRetry } from "../lib/errorHandler";
import { formatDateTime, formatCurrency } from "../lib/utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import PartnerHoldModal from "../components/PartnerHoldModal";
import LiftPartnerHoldModal from "../components/LiftPartnerHoldModal";
import { Lock, Unlock } from "lucide-react";

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
}

interface HoldStatus {
  is_on_hold: boolean;
  hold_details?: {
    reason: string;
    hold_date: string;
    lift_date: string | null;
  };
  message: string;
}

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Hold modals state
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerHolds, setPartnerHolds] = useState<Record<number, HoldStatus>>(
    {},
  );

  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    fetchPartners();
  }, [statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== "all") {
        params.verification_status = statusFilter;
      }
      const response = await api.get("/admin/partners", { params });
      setPartners(response.data);

      // Fetch hold status for each partner
      const holdsData: Record<number, HoldStatus> = {};
      for (const partner of response.data) {
        try {
          const holdResponse = await api.get(
            `/admin/partners/${partner.id}/hold-status`,
          );
          holdsData[partner.id] = holdResponse.data;
        } catch (error) {
          console.error(
            `Failed to fetch hold status for partner ${partner.id}:`,
            error,
          );
        }
      }
      setPartnerHolds(holdsData);
    } catch (error: any) {
      console.error("Failed to fetch partners:", error);
      const retryFn = () => fetchPartners();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={getPartnerStatusColor(status)} variant="outline">
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const handlePlaceHold = (partner: Partner) => {
    setSelectedPartner(partner);
    setHoldModalOpen(true);
  };

  const handleLiftHold = (partner: Partner) => {
    setSelectedPartner(partner);
    setLiftModalOpen(true);
  };

  const handleHoldModalClose = () => {
    setHoldModalOpen(false);
    setSelectedPartner(null);
  };

  const handleLiftModalClose = () => {
    setLiftModalOpen(false);
    setSelectedPartner(null);
  };

  const handleHoldPlaced = () => {
    fetchPartners();
  };

  const handleHoldLifted = () => {
    fetchPartners();
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
          <h1 className="text-3xl font-bold">Partners</h1>
          <p className="text-muted-foreground mt-1">
            Manage all partners in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (value === "all") {
                searchParams.delete("status");
              } else {
                searchParams.set("status", value);
              }
              setSearchParams(searchParams);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="clarification_needed">
                Clarification Needed
              </SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Partners</CardTitle>
          <CardDescription>{partners.length} partner(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No partners found
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hold Status</TableHead>
                      <TableHead>Credit Balance</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => {
                      const holdStatus = partnerHolds[partner.id];
                      const isOnHold = holdStatus?.is_on_hold ?? false;

                      return (
                        <TableRow key={partner.id}>
                          <TableCell className="font-medium">
                            {partner.full_name}
                          </TableCell>
                          <TableCell>{partner.company_name || "-"}</TableCell>
                          <TableCell>{partner.email}</TableCell>
                          <TableCell>{partner.phone}</TableCell>
                          <TableCell>
                            {getStatusBadge(partner.verification_status)}
                          </TableCell>
                          <TableCell>
                            {isOnHold ? (
                              <Badge
                                variant="destructive"
                                className="bg-red-100 text-red-800"
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                ON HOLD
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700"
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(partner.credit_balance)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(partner.created_at)}
                          </TableCell>
                          <TableCell className="space-x-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/partners/${partner.id}`)
                              }
                            >
                              View
                            </Button>
                            {isOnHold ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleLiftHold(partner)}
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Lift Hold
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handlePlaceHold(partner)}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Hold
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPartner && (
        <>
          <PartnerHoldModal
            open={holdModalOpen}
            partnerId={selectedPartner.id}
            partnerName={selectedPartner.full_name}
            onClose={handleHoldModalClose}
            onHoldPlaced={handleHoldPlaced}
          />
          {partnerHolds[selectedPartner.id]?.is_on_hold && (
            <LiftPartnerHoldModal
              open={liftModalOpen}
              partnerId={selectedPartner.id}
              partnerName={selectedPartner.full_name}
              holdReason={
                partnerHolds[selectedPartner.id]?.hold_details?.reason || ""
              }
              onClose={handleLiftModalClose}
              onHoldLifted={handleHoldLifted}
            />
          )}
        </>
      )}
    </div>
  );
}
