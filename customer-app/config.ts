// Backend API Base URL - Change this to your production URL when deploying
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
console.log("api base url", API_BASE_URL)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  ME: "/auth/me",
  ME_DETAILS: "/auth/me/details",
  CHECK_PINCODE: "/auth/check-pincode", // + /{pincode}
  CHECK_EMAIL: "/auth/check-email", // + /{email}
  CHECK_PHONE: "/auth/check-phone", // + /{phone}
  UPDATE_PROFILE: "/auth/update-profile",

  // Sell Phone - Browse Phones
  PHONES: "/sell-phone/phones",
  PHONE_DETAIL: "/sell-phone/phones", // + /{phoneId}
  PHONE_VARIANTS: "/sell-phone/phones", // + /{phoneId}/variants
  PHONE_PRICE: "/sell-phone/phones", // + /{phoneId}/price

  // Sell Phone - Price Prediction
  PREDICT_PRICE: "/customer-side-prediction/predict-price",

  // Orders
  CREATE_ORDER: "/sell-phone/orders",
  MY_ORDERS: "/sell-phone/my-orders",
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
