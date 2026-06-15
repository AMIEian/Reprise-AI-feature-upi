import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Phone,
  User,
  Users,
  LogOut,
  LayoutDashboard,
  Gift,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoggedIn, logout, refreshCurrentUser } = useAuth();
  const [fetchedUser, setFetchedUser] = useState<any>(null);
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    full_name: "",
    phone: "",
    address: "",
    pincode: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };
  // token / fetched-user quick check used across the header
  const hasToken = Boolean(localStorage.getItem("accessToken"));
  const authPresent = isLoggedIn || (hasToken && Boolean(user || fetchedUser));

  // Only show "My Orders" when the user is authenticated (via AuthContext)
  // or a valid token + fetched user indicates a customer role.
  const effectiveRole = user?.role || fetchedUser?.role;
  const isAuthenticated = isLoggedIn || (hasToken && Boolean(fetchedUser));
  const showMyOrders =
    isAuthenticated &&
    user?.role === "customer" &&
    !location.pathname.startsWith("/sell") &&
    !location.pathname.startsWith("/sell-phone");

  // Add scroll event listener properly with useEffect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // fetch current user from backend if token is present but AuthContext user is empty
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) return;

    if (isLoggedIn && user) return;

    let mounted = true;

    if (location.pathname === "/") {
      api
        .get("/auth/me")
        .then((res) => {
          if (!mounted) return;
          setFetchedName(res.data?.full_name || null);
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("accessToken");
          }
        });
    } else {
      // For other routes we need role info to render links correctly; fetch details.
      api
        .get("/auth/me/details")
        .then((res) => {
          if (!mounted) return;
          setFetchedUser(res.data);
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("accessToken");
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user, location.pathname]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("accessToken");
    setFetchedUser(null);
    navigate("/");
  };

  // user may have 'name' or backend returns 'full_name'
  const displayName =
    (user as any)?.full_name ||
    user?.name ||
    // prefer minimal fetchedName on homepage to avoid fetching extra details
    (location.pathname === "/" ? fetchedName : null) ||
    (fetchedUser && (fetchedUser.full_name || fetchedUser.email)) ||
    "";

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? "bg-background shadow-sm"
            : "bg-background/95 backdrop-blur-sm"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img
                  src="/assets/logo.jpeg"
                  alt="Logo"
                  className="h-8 w-8 mr-2"
                />
                <span className="text-xl font-bold text-primary">CashNow</span>
              </Link>

              <nav className="hidden md:flex items-center space-x-6 ml-10">
                {/* Sell Phone: only visible to customers.
								Unauthenticated users see a CTA that navigates to /login.
								Agents do not see this link. */}
                {authPresent ? (
                  user?.role === "customer" ? (
                    <>
                      <Link
                        to="/sell-phone"
                        className={`text-sm font-medium transition-colors ${
                          location.pathname === "/sell-phone"
                            ? "text-primary border-b-2 border-primary"
                            : "text-gray-600 hover:text-primary"
                        }`}
                      >
                        Sell Phone
                      </Link>

                      <Link
                        to="/sell-laptop"
                        className={`text-sm font-medium transition-colors ${
                          location.pathname === "/sell-laptop"
                            ? "text-primary border-b-2 border-primary"
                            : "text-gray-600 hover:text-primary"
                        }`}
                      >
                        Sell Laptop
                      </Link>
                    </>
                  ) : null
                ) : (
                  <>
                    <Link
                      to="/sell-phone"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === "/sell-phone"
                          ? "text-primary border-b-2 border-primary"
                          : "text-gray-600 hover:text-primary"
                      }`}
                    >
                      Sell Phone
                    </Link>

                    <Link
                      to="/sell-laptop"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === "/sell-laptop"
                          ? "text-primary border-b-2 border-primary"
                          : "text-gray-600 hover:text-primary"
                      }`}
                    >
                      Sell Laptop
                    </Link>
                  </>
                )}

                <Link
                  to="/how-it-works"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === "/how-it-works"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  How It Works
                </Link>
                <Link
                  to="/why-cashnow"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === "/why-cashnow"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  Why CashNow?
                </Link>
                {authPresent && user?.role === "customer" && (
                  <Link
                    to="/referral"
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === "/referral"
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-600 hover:text-primary"
                    }`}
                  >
                    Referral
                  </Link>
                )}
                <Link
                  to="/become-partner"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === "/become-partner"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  Become a Partner
                </Link>
                <Link
                  to="/contact"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === "/contact"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  Contact
                </Link>
                {showMyOrders && (
                  <Link
                    to="/my-orders"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    My Orders
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Conditional rendering based on login/token presence */}
              {authPresent ? (
                <>
                  {/* Show Dashboard link for agents */}
                  {user?.role === "agent" && (
                    <Link to="/agent/dashboard" className="hidden md:block">
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                      >
                        <LayoutDashboard size={18} />
                        Dashboard
                      </Button>
                    </Link>
                  )}

                  {/* User info badge */}
                  <button
                    onClick={async () => {
                      // fetch profile (without id) and show modal
                      try {
                        const res = await api.get("/auth/me/profile");
                        setProfile(res.data);
                        setShowProfileModal(true);
                      } catch (err) {
                        console.error(err);
                        if (err?.response?.status === 401) {
                          localStorage.removeItem("accessToken");
                          navigate("/login");
                        }
                      }
                    }}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100"
                  >
                    <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <User size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {displayName || "User"}
                    </span>
                  </button>

                  {/* Logout button */}
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  >
                    <LogOut size={18} />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  {/* Login button */}
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center text-sm font-medium hover:text-primary transition-colors"
                  >
                    <Link
                      to="/login"
                      className="flex items-center cursor-pointer"
                    >
                      <User size={18} className="mr-1" />
                      Login
                    </Link>
                  </Button>

                  {/* Sell Now button (desktop): if not logged in, send to /login.
							Customers will navigate to actual /sell-phone route via nav link above.
							Agents won't see Sell Now as a separate CTA. */}
                  {!isLoggedIn && (
                    <Link to="/sell-phone">
                      <Button className="bg-primary text-primary-foreground hover:brightness-95 hidden md:inline-flex">
                        Sell Now
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="grid gap-6 py-6">
                    {/* Sell Phone in mobile: same visibility rules as desktop */}
                    {authPresent ? (
                      user?.role === "customer" ? (
                        <>
                          <Link
                            to="/sell-phone"
                            className={`text-base font-medium ${
                              location.pathname === "/sell-phone"
                                ? "text-primary border-l-4 border-primary pl-2"
                                : "hover:text-blue-600"
                            }`}
                          >
                            Sell Phone
                          </Link>

                          <Link
                            to="/sell-laptop"
                            className={`text-base font-medium ${
                              location.pathname === "/sell-laptop"
                                ? "text-primary border-l-4 border-primary pl-2"
                                : "hover:text-blue-600"
                            }`}
                          >
                            Sell Laptop
                          </Link>
                        </>
                      ) : null
                    ) : (
                      <>
                        <Link
                          to="/sell-phone"
                          className={`text-base font-medium ${
                            location.pathname === "/sell-phone"
                              ? "text-primary border-l-4 border-primary pl-2"
                              : "hover:text-blue-600"
                          }`}
                        >
                          Sell Phone
                        </Link>

                        <Link
                          to="/sell-laptop"
                          className={`text-base font-medium ${
                            location.pathname === "/sell-laptop"
                              ? "text-primary border-l-4 border-primary pl-2"
                              : "hover:text-blue-600"
                          }`}
                        >
                          Sell Laptop
                        </Link>
                      </>
                    )}

                    <Link
                      to="/how-it-works"
                      className={`text-base font-medium transition-colors ${
                        location.pathname === "/how-it-works"
                          ? "text-primary border-l-4 border-primary pl-2"
                          : "hover:text-blue-600"
                      }`}
                    >
                      How It Works
                    </Link>
                    <Link
                      to="/why-cashnow"
                      className={`text-base font-medium transition-colors ${
                        location.pathname === "/why-cashnow"
                          ? "text-primary border-l-4 border-primary pl-2"
                          : "hover:text-blue-600"
                      }`}
                    >
                      Why CashNow?
                    </Link>
                    {authPresent && user?.role === "customer" && (
                      <Link
                        to="/referral"
                        className={`text-base font-medium transition-colors ${
                          location.pathname === "/referral"
                            ? "text-primary border-l-4 border-primary pl-2"
                            : "hover:text-blue-600"
                        }`}
                      >
                        Referral
                      </Link>
                    )}
                    <Link
                      to="/become-partner"
                      className={`text-base font-medium transition-colors ${
                        location.pathname === "/become-partner"
                          ? "text-primary border-l-4 border-primary pl-2"
                          : "hover:text-blue-600"
                      }`}
                    >
                      Become a Partner
                    </Link>
                    <Link
                      to="/contact"
                      className={`text-base font-medium transition-colors ${
                        location.pathname === "/contact"
                          ? "text-primary border-l-4 border-primary pl-2"
                          : "hover:text-blue-600"
                      }`}
                    >
                      Contact
                    </Link>
                    {showMyOrders && (
                      <Link
                        to="/my-orders"
                        className={`text-base font-medium transition-colors ${
                          location.pathname === "/my-orders"
                            ? "text-primary border-l-4 border-primary pl-2"
                            : "hover:text-blue-600"
                        }`}
                      >
                        My Orders
                      </Link>
                    )}

                    <div className="border-t pt-6">
                      {isLoggedIn ? (
                        <div className="grid gap-3">
                          {/* User info */}
                          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <User size={18} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {displayName || "User"}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {user?.role}
                              </p>
                            </div>
                          </div>

                          {/* Dashboard link for agents */}
                          {user?.role === "agent" && (
                            <Link to="/agent/dashboard">
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                              >
                                <LayoutDashboard size={16} className="mr-2" />
                                Dashboard
                              </Button>
                            </Link>
                          )}

                          {/* Logout button */}
                          <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <LogOut size={16} className="mr-2" />
                            Logout
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Link to="/login">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                            >
                              <User size={16} className="mr-2" />
                              Login
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      {showProfileModal && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Profile</h3>
              {!editing ? (
                <Button size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setEditValues({
                      full_name: profile.full_name || "",
                      phone: profile.phone || "",
                      address: profile.address || "",
                      pincode: profile.pincode || "",
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-gray-600">Name</label>
              <input
                className="border rounded px-3 py-2"
                value={editing ? editValues.full_name : profile.full_name || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, full_name: e.target.value })
                }
                disabled={!editing}
              />

              <label className="text-sm text-gray-600">Email</label>
              <input
                className="border rounded px-3 py-2 bg-gray-50"
                value={profile.email}
                disabled
              />

              <label className="text-sm text-gray-600">Phone</label>
              <input
                className="border rounded px-3 py-2"
                value={editing ? editValues.phone : profile.phone || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, phone: e.target.value })
                }
                disabled={!editing}
              />

              <label className="text-sm text-gray-600">Address</label>
              <input
                className="border rounded px-3 py-2"
                value={editing ? editValues.address : profile.address || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, address: e.target.value })
                }
                disabled={!editing}
              />

              <label className="text-sm text-gray-600">Pincode</label>
              <input
                className="border rounded px-3 py-2"
                value={editing ? editValues.pincode : profile.pincode || ""}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    pincode: e.target.value.replace(/\D/g, ""),
                  })
                }
                disabled={!editing}
                maxLength={6}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </Button>
              {editing && (
                <Button
                  onClick={async () => {
                    // Save changes
                    try {
                      const payload: any = {};
                      if (editValues.full_name !== profile.full_name)
                        payload.full_name = editValues.full_name;
                      if (editValues.phone !== profile.phone)
                        payload.phone = editValues.phone || null;
                      if (editValues.address !== profile.address)
                        payload.address = editValues.address || null;
                      if (editValues.pincode !== profile.pincode)
                        payload.pincode = editValues.pincode || null;

                      if (Object.keys(payload).length === 0) {
                        setEditing(false);
                        return;
                      }

                      await api.patch("/auth/me", payload);
                      // refresh context and local fetched user
                      try {
                        await refreshCurrentUser();
                      } catch (e) {
                        console.error(e);
                      }
                      // reload profile for modal
                      const res = await api.get("/auth/me/profile");
                      setProfile(res.data);
                      setEditing(false);
                    } catch (err) {
                      console.error("Failed to save profile", err);
                      toast.error("Failed to save profile. Please try again.", {
                        description:
                          "Could not update your profile information.",
                        duration: 5000,
                      });
                    }
                  }}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
