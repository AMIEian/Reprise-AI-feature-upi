import { useEffect, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import {
  showErrorToastWithRetry,
  showSuccessToast,
  showWarningToast,
} from "../lib/errorHandler";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Phone {
  id: number;
  Brand: string;
  Series: string;
  Model: string;
  Storage_Raw: string;
  Original_Price: number | null;
  Selling_Price: number;
  RAM_GB: number | null;
  Internal_Storage_GB: number;
  image_url?: string | null;
}

interface PhoneFormData {
  Brand: string;
  Series: string;
  Model: string;
  Storage_Raw: string;
  Original_Price: string;
  Selling_Price: string;
  RAM_GB: string;
  Internal_Storage_GB: string;
  image_url?: string;
}

const initialFormData: PhoneFormData = {
  Brand: "",
  Series: "",
  Model: "",
  Storage_Raw: "",
  Original_Price: "",
  Selling_Price: "",
  RAM_GB: "",
  Internal_Storage_GB: "",
  image_url: "",
};

export default function PhonesList() {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [totalPhones, setTotalPhones] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
  const [formData, setFormData] = useState<PhoneFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchPhones();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // Reset to page 1 when search term changes
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchPhones = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * itemsPerPage;
      const response = await api.get("/admin/phones", {
        params: {
          skip,
          limit: itemsPerPage,
          search: searchTerm || undefined,
        },
      });
      setPhones(response.data.items);
      setTotalPhones(response.data.total);
    } catch (error: any) {
      console.error("Failed to fetch phones:", error);
      if (error.code === "ECONNABORTED") {
        showWarningToast(
          "Search timed out. Try with fewer or different keywords.",
        );
      } else {
        const retryFn = () => fetchPhones();
        showErrorToastWithRetry(error, retryFn);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.", { duration: 4000 });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.", { duration: 4000 });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedImageFile(file);
  };

  const uploadImageForPhone = async (phoneId: number) => {
    if (!selectedImageFile) {
      toast.error("Please select an image first.", { duration: 4000 });
      return;
    }

    try {
      setUploadingImage(true);
      const formDataForUpload = new FormData();
      formDataForUpload.append("file", selectedImageFile);

      await api.post(
        `/admin/phones/${phoneId}/upload-image`,
        formDataForUpload,
      );

      showSuccessToast("Image uploaded successfully!");
      setImagePreview(null);
      setSelectedImageFile(null);

      // Refresh phone data to show updated image
      if (selectedPhone) {
        setSelectedPhone({
          ...selectedPhone,
          image_url: imagePreview || selectedPhone.image_url,
        });
      }

      await fetchPhones();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      showErrorToastWithRetry(error, () => uploadImageForPhone(phoneId));
    } finally {
      setUploadingImage(false);
    }
  };

  const setImageUrl = async (phoneId: number, imageUrl: string) => {
    if (!imageUrl.trim()) {
      toast.error("Please enter a valid image URL.", { duration: 4000 });
      return;
    }

    try {
      await api.post(`/admin/phones/${phoneId}/set-image-url`, null, {
        params: { image_url: imageUrl },
      });

      showSuccessToast("Image URL set successfully!");
      setFormData({ ...formData, image_url: "" });
      await fetchPhones();
    } catch (error: any) {
      console.error("Error setting image URL:", error);
      showErrorToastWithRetry(error, () => setImageUrl(phoneId, imageUrl));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload: Record<string, any> = {
        Brand: formData.Brand,
        Series: formData.Series,
        Model: formData.Model,
        Storage_Raw: formData.Storage_Raw,
        Original_Price: formData.Original_Price
          ? parseFloat(formData.Original_Price)
          : null,
        Selling_Price: parseFloat(formData.Selling_Price),
        RAM_GB: formData.RAM_GB ? parseFloat(formData.RAM_GB) : null,
        Internal_Storage_GB: parseFloat(formData.Internal_Storage_GB),
      };
      // Include typed image URL if provided
      if (formData.image_url?.trim()) {
        payload.image_url = formData.image_url.trim();
      }
      const created = await api.post("/admin/phones", payload);
      const newPhoneId: number = created.data.id;

      // If a file was selected, upload it to the newly created phone
      if (selectedImageFile) {
        try {
          const fd = new FormData();
          fd.append("file", selectedImageFile);
          await api.post(`/admin/phones/${newPhoneId}/upload-image`, fd);
        } catch {
          // non-fatal — phone was created; image can be re-uploaded via edit
        }
      }

      showSuccessToast("Phone created successfully!");
      setCreateDialog(false);
      setFormData(initialFormData);
      setImagePreview(null);
      setSelectedImageFile(null);
      await fetchPhones();
    } catch (error: any) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("duplicate")
      ) {
        toast.error("This phone model already exists in the database.", {
          duration: 4000,
        });
      } else {
        showErrorToastWithRetry(error, () => handleCreate(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone) return;

    try {
      setSubmitting(true);
      // If an image file is selected, upload it first so the phone record has image_url
      if (selectedImageFile && selectedPhone) {
        try {
          setUploadingImage(true);
          const formDataForUpload = new FormData();
          formDataForUpload.append("file", selectedImageFile);
          await api.post(
            `/admin/phones/${selectedPhone.id}/upload-image`,
            formDataForUpload,
          );
          // Refresh selectedPhone preview will be done after update
        } catch (uploadErr) {
          // Non-fatal: allow edit to continue even if image upload failed
          console.error("Image upload failed during edit:", uploadErr);
        } finally {
          setUploadingImage(false);
        }
      }

      const payload: any = {};

      if (formData.Brand !== selectedPhone.Brand)
        payload.Brand = formData.Brand;
      if (formData.Series !== selectedPhone.Series)
        payload.Series = formData.Series;
      if (formData.Model !== selectedPhone.Model)
        payload.Model = formData.Model;
      if (formData.Storage_Raw !== selectedPhone.Storage_Raw)
        payload.Storage_Raw = formData.Storage_Raw;

      const originalPrice = formData.Original_Price
        ? parseFloat(formData.Original_Price)
        : null;
      if (originalPrice !== selectedPhone.Original_Price)
        payload.Original_Price = originalPrice;

      const sellingPrice = parseFloat(formData.Selling_Price);
      if (sellingPrice !== selectedPhone.Selling_Price)
        payload.Selling_Price = sellingPrice;

      const ramGB = formData.RAM_GB ? parseFloat(formData.RAM_GB) : null;
      if (ramGB !== selectedPhone.RAM_GB) payload.RAM_GB = ramGB;

      const internalStorage = parseFloat(formData.Internal_Storage_GB);
      if (internalStorage !== selectedPhone.Internal_Storage_GB)
        payload.Internal_Storage_GB = internalStorage;

      // Include image_url if the user typed a new URL (not a file upload)
      const typedImageUrl = formData.image_url?.trim() ?? "";
      const existingImageUrl = selectedPhone.image_url ?? "";
      if (typedImageUrl && typedImageUrl !== existingImageUrl)
        payload.image_url = typedImageUrl;

      await api.put(`/admin/phones/${selectedPhone.id}`, payload);
      showSuccessToast("Phone updated successfully!");
      setEditDialog(false);
      setSelectedPhone(null);
      setFormData(initialFormData);
      setImagePreview(null);
      setSelectedImageFile(null);
      await fetchPhones();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Phone not found.", { duration: 4000 });
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("duplicate")
      ) {
        toast.error("This phone model already exists.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, () => handleEdit(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPhone) return;

    try {
      setSubmitting(true);
      await api.delete(`/admin/phones/${selectedPhone.id}`);
      showSuccessToast("Phone deleted successfully!");
      setDeleteDialog(false);
      setSelectedPhone(null);
      await fetchPhones();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Phone not found or already deleted.", { duration: 4000 });
      } else {
        showErrorToastWithRetry(error, handleDelete);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setFormData(initialFormData);
    setCreateDialog(true);
  };

  const openEditDialog = (phone: Phone) => {
    setSelectedPhone(phone);
    setFormData({
      Brand: phone.Brand,
      Series: phone.Series,
      Model: phone.Model,
      Storage_Raw: phone.Storage_Raw,
      Original_Price: phone.Original_Price?.toString() || "",
      Selling_Price: phone.Selling_Price.toString(),
      RAM_GB: phone.RAM_GB?.toString() || "",
      Internal_Storage_GB: phone.Internal_Storage_GB.toString(),
      image_url: phone.image_url || "",
    });
    setImagePreview(
      phone.image_url
        ? `${import.meta.env.VITE_API_BASE_URL}${phone.image_url}`
        : null,
    );
    setEditDialog(true);
  };

  const openDeleteDialog = (phone: Phone) => {
    setSelectedPhone(phone);
    setDeleteDialog(true);
  };

  // Pagination logic using total from backend
  const totalPages = Math.ceil(totalPhones / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
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
          <h1 className="text-3xl font-bold">Phone List</h1>
          <p className="text-muted-foreground mt-1">
            Manage all phones in the database
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Phone
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Phones</CardTitle>
          <CardDescription>
            {totalPhones} phone{totalPhones !== 1 ? "s" : ""} in the system
            (Page {currentPage} of {totalPages || 1})
          </CardDescription>
          <form onSubmit={handleSearch} className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Input
                placeholder="Search by brand, model, or series..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
              {searchTerm && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead className="text-right">RAM (GB)</TableHead>
                  <TableHead className="text-right">
                    Internal Storage (GB)
                  </TableHead>
                  <TableHead className="text-right">Original Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      {searchTerm
                        ? "No phones found matching your search"
                        : "No phones found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  phones.map((phone) => (
                    <TableRow key={phone.id}>
                      <TableCell className="font-medium">
                        {phone.Brand}
                      </TableCell>
                      <TableCell>{phone.Series}</TableCell>
                      <TableCell>{phone.Model}</TableCell>
                      <TableCell>{phone.Storage_Raw}</TableCell>
                      <TableCell className="text-right">
                        {phone.RAM_GB ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {phone.Internal_Storage_GB}
                      </TableCell>
                      <TableCell className="text-right">
                        {phone.Original_Price
                          ? `₹${phone.Original_Price.toLocaleString()}`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{phone.Selling_Price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(phone)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(phone)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {phones.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + itemsPerPage, totalPhones)} of{" "}
                  {totalPhones} phones
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pageNum === currentPage ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      },
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Phone</DialogTitle>
            <DialogDescription>
              Add a new phone to the database
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  required
                  value={formData.Brand}
                  onChange={(e) =>
                    setFormData({ ...formData, Brand: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Series *</Label>
                <Input
                  id="series"
                  required
                  value={formData.Series}
                  onChange={(e) =>
                    setFormData({ ...formData, Series: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  required
                  value={formData.Model}
                  onChange={(e) =>
                    setFormData({ ...formData, Model: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage_raw">Storage *</Label>
                <Input
                  id="storage_raw"
                  required
                  placeholder="e.g., 128GB"
                  value={formData.Storage_Raw}
                  onChange={(e) =>
                    setFormData({ ...formData, Storage_Raw: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ram_gb">RAM (GB)</Label>
                <Input
                  id="ram_gb"
                  type="number"
                  step="0.1"
                  placeholder="Optional"
                  value={formData.RAM_GB}
                  onChange={(e) =>
                    setFormData({ ...formData, RAM_GB: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_storage">
                  Internal Storage (GB) *
                </Label>
                <Input
                  id="internal_storage"
                  type="number"
                  step="0.1"
                  required
                  value={formData.Internal_Storage_GB}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Internal_Storage_GB: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="original_price">Original Price (₹)</Label>
                <Input
                  id="original_price"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={formData.Original_Price}
                  onChange={(e) =>
                    setFormData({ ...formData, Original_Price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price (₹) *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.Selling_Price}
                  onChange={(e) =>
                    setFormData({ ...formData, Selling_Price: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">Phone Image</h3>

              {/* Image URL Input */}
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Enter a direct URL to the phone image (optional)
                </p>
              </div>

              {/* Image File Upload */}
              <div className="space-y-2">
                <Label htmlFor="image_file">Or Upload Image File</Label>
                <Input
                  id="image_file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <p className="text-xs text-gray-500">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF, etc.
                </p>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <Label>Image Preview</Label>
                  <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Phone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Phone</DialogTitle>
            <DialogDescription>Update phone information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_brand">Brand *</Label>
                <Input
                  id="edit_brand"
                  required
                  value={formData.Brand}
                  onChange={(e) =>
                    setFormData({ ...formData, Brand: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_series">Series *</Label>
                <Input
                  id="edit_series"
                  required
                  value={formData.Series}
                  onChange={(e) =>
                    setFormData({ ...formData, Series: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_model">Model *</Label>
                <Input
                  id="edit_model"
                  required
                  value={formData.Model}
                  onChange={(e) =>
                    setFormData({ ...formData, Model: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_storage_raw">Storage *</Label>
                <Input
                  id="edit_storage_raw"
                  required
                  value={formData.Storage_Raw}
                  onChange={(e) =>
                    setFormData({ ...formData, Storage_Raw: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_ram_gb">RAM (GB)</Label>
                <Input
                  id="edit_ram_gb"
                  type="number"
                  step="0.1"
                  placeholder="Optional"
                  value={formData.RAM_GB}
                  onChange={(e) =>
                    setFormData({ ...formData, RAM_GB: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_internal_storage">
                  Internal Storage (GB) *
                </Label>
                <Input
                  id="edit_internal_storage"
                  type="number"
                  step="0.1"
                  required
                  value={formData.Internal_Storage_GB}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Internal_Storage_GB: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_original_price">Original Price (₹)</Label>
                <Input
                  id="edit_original_price"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={formData.Original_Price}
                  onChange={(e) =>
                    setFormData({ ...formData, Original_Price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_selling_price">Selling Price (₹) *</Label>
                <Input
                  id="edit_selling_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.Selling_Price}
                  onChange={(e) =>
                    setFormData({ ...formData, Selling_Price: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Image Upload Section for Edit */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">Phone Image</h3>

              {/* Current Image Display */}
              {selectedPhone?.image_url && (
                <div className="space-y-2">
                  <Label>Current Image</Label>
                  <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${selectedPhone.image_url}`}
                      alt="Current"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Image URL Input */}
              <div className="space-y-2">
                <Label htmlFor="edit_image_url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedPhone && formData.image_url) {
                        setImageUrl(selectedPhone.id, formData.image_url);
                      }
                    }}
                    disabled={uploadingImage || !formData.image_url}
                  >
                    {uploadingImage ? "Setting..." : "Set"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter a direct URL to update the phone image
                </p>
              </div>

              {/* Image File Upload */}
              <div className="space-y-2">
                <Label htmlFor="edit_image_file">Or Upload Image File</Label>
                <Input
                  id="edit_image_file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <p className="text-xs text-gray-500">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF, etc.
                </p>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <Label>New Image Preview</Label>
                  <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="New Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedPhone) {
                        uploadImageForPhone(selectedPhone.id);
                      }
                    }}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Phone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {selectedPhone?.Brand} {selectedPhone?.Model}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
