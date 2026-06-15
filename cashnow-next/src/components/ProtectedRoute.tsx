import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface Props {
  // children is the protected element (e.g., <SellPhone />)
  children: React.ReactElement;
}

export default function ProtectedRoute({ children }: Props) {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  // allow public access to the sell listing/detail/quote flows
  if (
    location.pathname.startsWith("/sell") ||
    location.pathname.startsWith("/sell-phone")
  ) {
    return children;
  }

  // if an access token exists in localStorage, permit rendering and let backend validate
  const hasToken = Boolean(localStorage.getItem("accessToken"));
  if (hasToken) {
    return children;
  }

  // If user is logged in but trying to access checkout without an estimated price,
  // redirect them back to the sell flow.
  if (isLoggedIn && user?.role === "customer") {
    if (location.pathname.startsWith("/checkout")) {
      const phoneData = localStorage.getItem("phoneData");
      if (!phoneData) {
        return <Navigate to="/sell-phone" replace />;
      }
    }
    return children;
  }

  // otherwise redirect to login and include the intended target so Login can resume
  return (
    <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />
  );
}
