// Backend API Base URL - Change this to your production URL when deploying
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
console.log(API_BASE_URL);
export const API_ENDPOINTS = {
  PARTNER_LOGIN: "/partner/login",
  PARTNER_SIGNUP: "/partner/signup",
  PARTNER_ME: "/partner/me",
  AGENT_LOGIN: "/agent/login",
  AGENT_ME: "/agent/me",

  CREDIT_PLANS: "/partner/credit-plans",
  PURCHASE_CREDITS: "/partner/purchase-credits",

  // Partner - Agent Management
  AGENTS: "/partner/agents",

  // Partner - Orders & Leads
  PARTNER_ORDERS: "/partner/orders",
  LOCKED_DEALS: "/partner/locked-deals",
  LEAD_PURCHASE_INFO: "/partner/lead-purchase-info", // + /{orderId}
  ORDER_ASSIGN: "/partner/orders", // + /{orderId}/assign
  ORDER_REASSIGN: "/partner/orders", // + /{orderId}/reassign

  // Agent - Orders
  AGENT_ORDERS: "/agent/orders",

  // Sell Phone - Marketplace
  MARKETPLACE_LEADS: "/sell-phone/partner/leads/available",
  LEAD_DETAIL: "/sell-phone/partner/leads", // + /{orderId}
  LEAD_LOCK: "/sell-phone/partner/leads", // + /{orderId}/lock
  LEAD_UNLOCK: "/sell-phone/partner/leads", // + /{orderId}/unlock
  LEAD_PURCHASE: "/sell-phone/partner/leads", // + /{orderId}/purchase

  // Sell Phone - Phone Data
  PHONES: "/sell-phone/phones",
  PHONE_VARIANTS: "/sell-phone/phones", // + /{phoneId}/variants
  PHONE_PRICE: "/sell-phone/phones", // + /{phoneId}/price

  // Customer Orders
  CREATE_ORDER: "/sell-phone/orders",
  MY_ORDERS: "/sell-phone/my-orders",
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
