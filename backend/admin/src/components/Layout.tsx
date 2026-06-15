import { Outlet, useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  Clock,
  CreditCard,
  ShoppingCart,
  LogOut,
  Smartphone,
  Gift,
  Tag,
  Menu,
  X,
} from "lucide-react";

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
    },
    {
      label: "Customers",
      icon: Users,
      path: "/customers",
    },
    {
      label: "Partners",
      icon: Store,
      path: "/partners",
    },
    {
      label: "Pending Verifications",
      icon: Clock,
      path: "/partners/pending",
    },
    {
      label: "Credit Plans",
      icon: CreditCard,
      path: "/credit-plans",
    },
    {
      label: "Orders",
      icon: ShoppingCart,
      path: "/orders",
    },
    {
      label: "Phone List",
      icon: Smartphone,
      path: "/phones",
    },
    {
      label: "Referral Settings",
      icon: Gift,
      path: "/referral-settings",
    },
    {
      label: "Coupons",
      icon: Tag,
      path: "/coupons",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.jpeg" alt="Logo" className="h-6 w-6" />
          <h1 className="text-lg font-bold text-sidebar-foreground">
            Admin Portal
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="text-sidebar-foreground"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40",
          // Mobile: overlay drawer starting below header
          "lg:hidden top-16 h-[calc(100vh-4rem)]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: collapsible sidebar
          "lg:translate-x-0 lg:block lg:top-0 lg:h-full",
          isSidebarCollapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.jpeg" alt="Logo" className="h-8 w-8" />
            {!isSidebarCollapsed && (
              <>
                <h1 className="text-2xl font-bold text-sidebar-foreground">
                  Admin Portal
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="ml-auto text-sidebar-foreground lg:block hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </>
            )}
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="ml-auto text-sidebar-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          {!isSidebarCollapsed && (
            <p className="text-sm text-muted-foreground mt-1">{admin?.email}</p>
          )}
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  closeMobileMenu();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                  isSidebarCollapsed && "justify-center px-2",
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <Button
            variant="outline"
            className={cn("w-full justify-start", isSidebarCollapsed && "px-2")}
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          "pt-16 lg:pt-0", // Account for mobile header
          isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64",
          "ml-0 p-6 overflow-hidden",
        )}
      >
        <div className="max-w-7xl mx-auto safe-top">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
