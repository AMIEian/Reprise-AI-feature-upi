import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { showErrorToastWithRetry, showSuccessToast } from "../lib/errorHandler";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";

interface User {
  id: number;
  email: string;
  full_name: string;
}

export default function Customers() {
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    password: "",
    address: "",
  });

  const { admin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && admin) {
      fetchUsers();
    }
  }, [authLoading, admin]);

  const fetchUsers = async () => {
    try {
      setFetching(true);
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      const retryFn = () => fetchUsers();
      showErrorToastWithRetry(error, retryFn);
    } finally {
      setFetching(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", formData);
      showSuccessToast("Customer created successfully!");
      setCreateDialog(false);
      setFormData({
        email: "",
        full_name: "",
        phone: "",
        password: "",
        address: "",
      });
      await fetchUsers();
    } catch (error: any) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("email")
      ) {
        toast.error("Customer with this email already exists.", {
          duration: 4000,
        });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("phone")
      ) {
        toast.error("Customer with this phone already exists.", {
          duration: 4000,
        });
      } else {
        showErrorToastWithRetry(error, () => handleCreate(e));
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this customer? This action cannot be undone.",
      )
    )
      return;

    try {
      await api.delete(`/admin/users/${id}`);
      showSuccessToast("Customer deleted successfully!");
      await fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Customer not found or already deleted.", {
          duration: 4000,
        });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("orders")
      ) {
        toast.error(
          "Cannot delete customer with active orders. Please cancel or complete their orders first.",
          { duration: 4000 },
        );
      } else {
        showErrorToastWithRetry(error, () => handleDelete(id));
      }
    }
  };

  if (fetching) {
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage all customers in the system
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>Add Customer</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>{users.length} customer(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No customers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.full_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer account in the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
