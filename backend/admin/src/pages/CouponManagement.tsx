import { useEffect, useState } from "react";
import api from "../lib/api";
import { showSuccessToast, showErrorToast } from "../lib/errorHandler";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Smartphone,
  Globe,
  TicketPercent,
  BadgeCheck,
  BadgeMinus,
  Layers,
} from "lucide-react";

interface PhoneOption {
  id: number;
  Brand: string;
  Model: string;
}

interface Coupon {
  id: number;
  code: string;
  description: string | null;
  amount: number;
  is_global: boolean;
  applicable_phone_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  code: "",
  description: "",
  amount: "",
  is_global: true,
  applicable_phone_id: "",
};

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [phones, setPhones] = useState<PhoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [couponsRes, phonesRes] = await Promise.all([
        api.get("/admin/coupons"),
        api.get("/sell-phone/phones?limit=200"),
      ]);
      setCoupons(couponsRes.data);
      setPhones(phonesRes.data.phones || []);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description || "",
      amount: c.amount.toString(),
      is_global: c.is_global,
      applicable_phone_id: c.applicable_phone_id?.toString() || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { showErrorToast("Coupon code is required"); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { showErrorToast("Amount must be a positive number"); return; }
    if (!form.is_global && !form.applicable_phone_id) {
      showErrorToast("Please select a phone for phone-specific coupon"); return;
    }

    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      amount,
      is_global: form.is_global,
      applicable_phone_id: form.is_global ? null : parseInt(form.applicable_phone_id),
    };

    try {
      if (editingId) {
        await api.put(`/admin/coupons/${editingId}`, payload);
        showSuccessToast("Coupon updated successfully");
      } else {
        await api.post("/admin/coupons", payload);
        showSuccessToast("Coupon created successfully");
      }
      closeForm();
      fetchAll();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.detail || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await api.put(`/admin/coupons/${c.id}`, { is_active: !c.is_active });
      showSuccessToast(`Coupon ${c.is_active ? "deactivated" : "activated"}`);
      fetchAll();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.detail || "Failed to update coupon");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/coupons/${id}`);
      showSuccessToast("Coupon deleted");
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      showErrorToast(err?.response?.data?.detail || "Failed to delete coupon");
    } finally {
      setDeleting(null);
    }
  };

  const getPhoneName = (id: number | null) => {
    if (!id) return "—";
    const p = phones.find((ph) => ph.id === id);
    return p ? `${p.Brand} ${p.Model}` : `Phone #${id}`;
  };

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Coupons",
      value: coupons.length,
      icon: TicketPercent,
      accent: "text-blue-500",
      border: "border-l-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active",
      value: coupons.filter((c) => c.is_active).length,
      icon: BadgeCheck,
      accent: "text-emerald-500",
      border: "border-l-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Inactive",
      value: coupons.filter((c) => !c.is_active).length,
      icon: BadgeMinus,
      accent: "text-slate-400",
      border: "border-l-slate-400",
      bg: "bg-slate-400/10",
    },
    {
      label: "Phone-Specific",
      value: coupons.filter((c) => !c.is_global).length,
      icon: Layers,
      accent: "text-violet-500",
      border: "border-l-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Tag className="h-6 w-6" />
            </span>
            Coupon Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage price-boost coupons for customers
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`border-l-4 ${stat.border}`}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-3xl font-bold ${stat.accent}`}>
                      {stat.value}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {stat.label}
                    </p>
                  </div>
                  <span className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.accent}`} />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingId ? "Edit Coupon" : "Create New Coupon"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingId
                    ? "Update the coupon details below"
                    : "Fill in details to create a new coupon"}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Code */}
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">
                  Coupon Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="coupon-code"
                  placeholder="e.g. SUMMER50"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="font-mono uppercase tracking-widest"
                />
                <p className="text-xs text-muted-foreground">Code will be stored in uppercase</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="coupon-desc">Description</Label>
                <Input
                  id="coupon-desc"
                  placeholder="e.g. Summer discount — adds ₹500 to price"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="coupon-amount">
                  Bonus Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="coupon-amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  This amount is <strong>added</strong> on top of the quoted phone price
                </p>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label>Applicable To</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: true, label: "All Phones", icon: Globe },
                    { value: false, label: "Specific Phone", icon: Smartphone },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const selected = form.is_global === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, is_global: opt.value, applicable_phone_id: "" }))}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone selector */}
              {!form.is_global && (
                <div className="space-y-1.5">
                  <Label htmlFor="coupon-phone">
                    Select Phone <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="coupon-phone"
                    className="w-full h-10 rounded-lg border border-input bg-card text-card-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    value={form.applicable_phone_id}
                    onChange={(e) => setForm((f) => ({ ...f, applicable_phone_id: e.target.value }))}
                  >
                    <option value="">-- Select a phone --</option>
                    {phones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.Brand} {p.Model}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              <Button variant="outline" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update Coupon" : "Create Coupon"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table / List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">
              All Coupons
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </CardTitle>
            <Input
              placeholder="Search by code or description…"
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">No coupons found</p>
              <p className="text-sm mt-1">Create your first coupon using the button above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bonus (₹)</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Scope</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Created</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                        idx % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md text-xs tracking-widest border border-primary/20">
                          {c.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-[180px] truncate">
                        {c.description || (
                          <span className="italic opacity-40 text-xs">No description</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs">
                          +₹{c.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.is_global ? (
                          <span className="flex items-center gap-1.5 text-blue-500 text-xs font-medium">
                            <Globe className="h-3.5 w-3.5 shrink-0" /> All Phones
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-violet-500 text-xs font-medium">
                            <Smartphone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[120px]">{getPhoneName(c.applicable_phone_id)}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(c)}
                          title={c.is_active ? "Click to deactivate" : "Click to activate"}
                          className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                        >
                          {c.is_active ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-full">
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs bg-slate-400/10 px-2 py-1 rounded-full">
                              <XCircle className="h-3.5 w-3.5" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit coupon"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            title="Delete coupon"
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
