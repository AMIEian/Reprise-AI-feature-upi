Overview

Purpose: Document all required error handling using toaster notifications for the frontend folder so implementers can add UX-safe, actionable toasts without guessing backend expectations or edge cases.
Scope: frontend (scanned files listed below). No code changes — this is specification-only.
Folder Scan Summary

Files scanned (primary): api.ts:1, SellPhone.tsx:1, PhoneDetail.tsx:1, OAuthCallback.tsx:1, AuthContext.tsx:1, CustomerLogin.tsx:1, Checkout.tsx:1, MyOrders.tsx:1, AgentDashboard.tsx:1 and related UI components/hooks where async work is present.
Primary async patterns found: direct fetch() calls, axios api wrapper (api.ts), react-query queries/mutations, localStorage/sessionStorage reads/writes, debounced validations, Google OAuth popup/callback flows, form submissions, page navigations that depend on async results (redirect-to-checkout flows).
Frontend Error Matrix (file-by-file)

For each file: normal cases → failure cases → silent failures → partial-success states. Where an API call exists, the backend endpoint is noted.

api.ts:1

Normal: axios instance with base URL, auth header from localStorage['accessToken'], global 401 interceptor redirecting to /login.
Failure cases:
Invalid/missing accessToken: axios requests get 401 → interceptor redirects to /login.
Interceptor errors (config/headers read): request blocked, caller receives rejected Promise.
Silent failures:
Global redirect triggered automatically without user-facing toast (user loses context).
Calls that set x-skip-auth-redirect may still expose internal errors to callers; currently no uniform toaster on 401.
Partial-success:
Token present but expired: interceptor deletes token and forces redirect; UI components may be mid-action (e.g., form submission) with no explanatory toast.
SellPhone.tsx:1

Async: fetch(${API_URL}/sell-phone/phones?... ) wrapped in react-query.
Normal: phones list loads; UI displays grid.
Failure cases:
Network / CORS / API down → response.ok false, thrown Error("Failed to fetch phones").
Invalid API_URL env var → network error.
Silent failures:
Error handler prints message only in markup (Error loading phones: {error.message}) — no toaster.
Slow responses show "Loading phones..." but no timeout message.
Partial-success:
API returns empty list with 200 → shows "no phones" visually but no user guidance.
Response structure missing phones/total_pages → default fallback used silently.
PhoneDetail.tsx:1

Async calls:
GET /sell-phone/phones/:id
GET /sell-phone/phones/:id/variants
GET /sell-phone/phones/:id/price?ram_gb=...&storage_gb=...
POST /customer-side-prediction/predict-price
Normal: loads phone metadata, variants, price; prediction returns predicted_price; completion stores sale info and navigates to checkout (or login redirect).
Failure cases:
404 phone not found → throw new Error("Failed to fetch phone") or UI shows "Phone not found".
400/422 on price or prediction (validation) → thrown Error("Failed to fetch variant price" / "Failed to fetch prediction").
Prediction endpoint returns 200 with logical failure (e.g., no predicted_price) → UI shows "0" or "Error" but no clear toast.
Network/timeouts → fetch() rejects; react-query surfaces error but UI shows basic inline text or "Error".
Auth-required endpoints returning 401 (for variant/price/prediction if behind auth) → currently will trigger axios global redirect only for axios requests; these are fetch() calls and will result in thrown errors with no auth handling.
Silent failures:
predictionError and error are shown inline but no toaster; some flows store phoneData in localStorage even if predictions fail.
Missing fallback when selected RAM/storage parsing returns 0 or NaN — displayed as "unknown" silently.
Partial-success:
Base price available but prediction fails → final price displayed as predictionData?.predicted_price || "0" leading to mismatch expectations without explanation.
Variants call may succeed while base phone call fails (or vice versa), leading to inconsistent UI.
OAuthCallback.tsx:1

Async calls:
api.post("/auth/google/token") (axios) or reads token from fragment and calls loginWithToken(token).
Normal: token in fragment → loginWithToken succeeds → navigate to /sell-phone.
Failure cases:
Token missing in fragment and POST /auth/google/token returns 401/400 → setError and redirect to /login after 3s.
loginWithToken returns false due to API failures → sets error.
Axios errors may include response.data.detail used in error message; other shapes fallback to generic "OAuth authentication failed".
Silent failures:
Errors are displayed on this page visually; no global toaster used; if this page is used in a popup flow, user may miss info.
Partial-success:
Token accepted but loginWithToken fetch for user details fails → token stored but currentUser not set; application may treat user as logged out.
AuthContext.tsx:1

Async calls:
api.post("/auth/login")
api.get("/auth/me") or /auth/me/details
api.post("/auth/signup")
Fallback fetch to /auth/me/details when axios fails
Normal: saves accessToken and currentUser in localStorage and state.
Failure cases:
Login/signup returns 400/401/409 → login/signup returns false (no toast).
loginWithToken axios call fails → fallback fetch attempted; if both fail, token removed and false returned; errors logged but no user-facing toast.
Interceptor 401 behavior (global redirect) may run during loginWithToken unless x-skip-auth-redirect provided; some calls include skip header but others rely on fallback.
Silent failures:
All failures return booleans or false without standardized toasts; callers rely on alerts or redirects.
No user guidance on why login/signup failed (e.g., invalid credentials vs server error).
Partial-success:
Token stored but user fetch fails (client treats as logged in via token presence) — potential state-desync.
CustomerLogin.tsx:1

Async: api.get('/auth/check-pincode/:pin'), api.post('/auth/google'), signup & login via AuthContext.
Normal: login/signup success → navigate to saved redirect or /.
Failure cases:
Pincode check network failure → sets pincodeError and shows inline alerts; no toasts.
Google api.post("/auth/google") returns error → currently caught and alert("Google authentication failed. Please try again.").
login/signup false → alert("Login failed...") or alert("Signup failed...").
Silent failures:
Frequent use of alert() rather than toasts: inconsistent UX and not dismissible/persistent.
googleReady script loading errors only logged to console.
Partial-success:
Google signup that requires profile: server returns needs_profile; token may be set but profile missing; user sees modal — OK, but no global toast explaining the state.
Checkout.tsx:1

Async: api.get('/auth/check-pincode/:pin'), api.patch('/auth/me') (optional), api.post('/sell-phone/orders'), fetch ${API_URL}/auth/me/details (direct fetch) when pre-filling.
Normal: pincode validated → order created → confirmation screen.
Failure cases:
Pincode check fails → sets pincodeError and prevents progression; inline alerts used.
Profile update PATCH fails during checkout → logged to console; user is still allowed to proceed.
Order creation POST fails → currently alert("Failed to create order. Please try again."); no retry button or toast.
Token missing/expired → 401 from axios POST leads to redirect or error; sometimes caught and reported as generic alert.
Silent failures:
Errors are surfaced as alert() or inline alerts but are inconsistent; no uniform toaster usage and no retry affordance on critical steps like order creation.
Pre-fill fetch failures are ignored (if (!res.ok) return;) — user sees empty fields without message.
Partial-success:
Profile partial update succeeded but order creation failed — user data persisted but no clear message about order state.
Order creation may return 200 with error object — UI expects res.data, but no handling for success:false messages.
MyOrders.tsx:1

Async: api.get('/sell-phone/my-orders').
Normal: orders list renders.
Failure cases:
Network/401/500 → react-query error state shows dedicated error page with Try Again button.
Silent failures:
If API returns 200 but empty or missing fields, UI quietly shows empty list; no toaster to explain "no orders found" vs "error".
Partial-success:
Some orders returned but not all due to pagination/backend filter → UI doesn't indicate partial fetch.
AgentDashboard.tsx:1

Async: api.get('/sell-phone/agent/orders'), api.get('/sell-phone/agent/nearby-orders'), api.get('/auth/me').
Normal: data refreshes periodically.
Failure cases:
401/403 → redirect or drawn error message; for agent-only pages navigation to /agent/login.
API errors return message shown in small error card; no global toasts.
Rate-limit or large response time → UI may show loading spinner indefinitely (react-query refetch).
Silent failures:
Failed background refetches produce minimal visual effect; no toast to explain stale data.
Partial-success:
Combined lists (myOrders + nearbyOrders) may duplicate or miss entries when one of two fetches fails.
Backend Dependency Error Matrix

(Each frontend operation → backend endpoint, method, expected success, possible error responses + notes on unexpected shapes)

Endpoint: GET /sell-phone/phones

Used by: SellPhone (fetch via react-query)
Method: GET
Success: 200 JSON { phones: [...], total_pages: number }
Possible errors:
400 Validation (bad query param)
401 Unauthorized (if restricted)
404 Not Found
500 Server error
Network timeout / DNS / CORS
Edge concerns:
Backend returns 200 with { phones: [] } — frontend should surface “No phones found”.
Backend returns 200 but with different shape — frontend must validate phones exists.
Endpoint: GET /sell-phone/phones/:id

Used by: PhoneDetail
Method: GET
Success: 200 JSON phone object (fields: id, Brand, Model, Selling_Price, RAM_GB, Internal_Storage_GB, etc.)
Errors: 404 (not found), 401, 500, malformed payload.
Notes: frontend shows "Phone not found" when !phoneData, but must show toast on 404/network failure giving next steps.
Endpoint: GET /sell-phone/phones/:id/variants

Used by: PhoneDetail
Method: GET
Success: 200 { rams: [...], storages: [...] }
Errors: 404 (no variants), 200 with missing keys, 500.
Notes: If returns empty arrays, frontend falls back to custom input — should inform user.
Endpoint: GET /sell-phone/phones/:id/price?ram_gb=&storage_gb=

Used by: PhoneDetail
Method: GET
Success: 200 { base_price: number }
Errors: 400 validation, 404, 500, or 200 with logical failure (no base_price).
Notes: If 200 but no base_price, show info toast and use DB fallback Selling_Price.
Endpoint: POST /customer-side-prediction/predict-price

Used by: PhoneDetail
Method: POST
Success: 200 { predicted_price: number, confidence?: number }
Errors: 400 validation (bad payload), 422 prediction model failed, 500 internal.
Edge cases:
200 with predicted_price = 0 or missing. Must treat as logical failure and inform user.
Slow model response → need timeout/abort and fallback.
Endpoint: POST /auth/google/token

Used by: OAuthCallback (axios)
Method: POST
Success: 200 { access_token: string }
Errors: 401/403 (invalid session), 400, 500
Notes: axios call uses x-skip-auth-redirect; implementers must surface toast on non-200.
Endpoint: POST /auth/google

Used by: CustomerLogin Google flow
Method: POST
Success: 200 { access_token, needs_profile?: boolean }
Errors: 400/401/500
Notes: needs_profile true requires profile modal; present toast: "Almost done — complete your profile."
Endpoint: GET /auth/check-pincode/:pin

Used by: CustomerLogin, Checkout
Method: GET
Success: 200 { serviceable: boolean, message?, partner_count? }
Errors: 400 invalid pin, 500 server error
Edge: 200 with serviceable:false is a valid response (warning status) — must be treated as user-correctable (choose different pincode or continue with warning).
Endpoint: POST /auth/login

Used by: AuthContext.login
Method: POST
Success: 200 { access_token }, then GET /auth/me
Errors: 401 invalid credentials, 429 rate limit, 500
Notes: 200 with missing access_token should be treated as failure.
Endpoint: GET /auth/me, GET /auth/me/details

Used by: AuthContext, Checkout (direct fetch)
Method: GET
Success: 200 user object (id, full_name, email, phone, role)
Errors: 401 token expired, 500
Notes: axios interceptor may redirect on 401; loginWithToken uses x-skip-auth-redirect to control flow — toasters must be produced by loginWithToken on failures.
Endpoint: POST /auth/signup

Used by: AuthContext.signup
Method: POST
Success: 201 or 200; may auto-login
Errors: 400 (validation), 409 (already exists), 500
Notes: signup returns boolean but no reason is surfaced to user.
Endpoint: PATCH /auth/me

Used by: CustomerLogin (save profile), Checkout (persist missing fields)
Method: PATCH
Success: 200 updated user
Errors: 400 validation, 401, 500
Notes: failures currently logged and ignored — should show non-blocking toast with retry option.
Endpoint: POST /sell-phone/orders

Used by: Checkout finalization
Method: POST
Success: 200/201 order object
Errors: 400 invalid payload, 401 unauthorized, 422 business validation (pincode not serviceable), 500
Critical: order creation failure must be surfaced prominently with clear next steps and retry affordance.
Endpoint: GET /sell-phone/my-orders, GET /sell-phone/agent/orders, GET /sell-phone/agent/nearby-orders

Used by MyOrders / AgentDashboard
Method: GET
Success: 200 array of orders
Errors: 401/403, 500
Notes: partial datasets (200 with incomplete content) should trigger a caution toast if detected.
Generic notes:

Backend may return 200 with logical failure object (e.g., { success: false, detail: "..." }) — frontend currently often assumes success; implement check for error-like payloads.
Backend might return 204/empty on success (e.g., PATCH) — frontend should treat 204 as success and avoid parsing JSON.
Axios and fetch are both used — centralize error-shape normalization for toasts.
Error Classification (applies across operations)

✅ User-correctable
Invalid form input (missing email, bad pincode length)
Non-serviceable pincode (user chooses different pincode)
OAuth state mismatch (CSRF) — user can retry login
🔐 Authentication / Authorization
Missing/expired tokens → 401
Role mismatch (accessing agent pages without agent role)
🌐 Network / Connectivity
DNS, offline, CORS failures, aborted connections
🧩 Backend logic failure
Business validation returned by server (pincode not serviceable, prediction model error)
Model returns no predicted_price
⏳ Timeout / race condition
Prediction model slow; user navigates away while request pending
Double-submit creating duplicate orders
🧠 State desynchronization
Token in localStorage but user fetch fails
Partial updates persisted but not reflected in UI
📦 Dependency / import failure
Google script failed to load
api import mismatch (named vs default) or missing env var
❓ Unknown / fallback
Unexpected payload shape, 200 with error object, parsing JSON failures
Toaster Message Specification

General rules for every toaster:

Include short description (no tech jargon).
Explain why in user language (one sentence).
Provide clear next action (refresh, retry, check input, contact support).
Indicate whether action is blocking.
Include a user-visible short error code or hint if available (e.g., "Auth failed" / "Network").
Grouped toaster templates (apply to each endpoint’s failure cases):

Authentication / Authorization (🔐)

Toaster Type: Error (persistent)
Message: "Session expired. Please sign in again to continue."
Why: "Your login expired or is invalid."
Action: "Tap Sign In to re-authenticate." (Include Retry / Go to Login button)
Behavior: Persistent until user acts; blocks critical actions (order creation). Avoid automatic redirect without toast if user is mid-work.
Network / Connectivity (🌐)

Toaster Type: Error (auto-dismiss after 8s, with a Retry action)
Message: "We couldn't reach our servers. Check your internet connection and try again."
Why: "A network or server error occurred."
Action: "Retry" button triggers the same request; if auto-retry used, show count.
Behavior: Non-blocking, but for critical actions (order creation) escalate to persistent.
User-correctable input (✅)

Toaster Type: Warning (auto-dismiss 5s)
Message: "Invalid PIN code. Please enter a 6-digit PIN and try again."
Why: "The PIN you entered is not valid or not serviceable."
Action: Focus the pincode input; optionally open pincode help.
Behavior: Non-blocking.
Business validation / Backend logic (🧩)

Toaster Type: Warning or Error depending on severity
Message: "We couldn't estimate a final price right now. You can continue to checkout, and an agent will confirm the price."
Why: "Price prediction service is currently unavailable or returned no price."
Action: "Proceed anyway" or "Retry Prediction" (if user wants).
Behavior: Non-blocking; If order creation depends on prediction, show persistent warning and require explicit user consent to proceed.
Order creation failure (critical)

Toaster Type: Error (persistent)
Message: "We couldn't create your order. Your payment was not processed."
Why: "A server error or validation prevented order creation."
Action: "Retry" (re-submit payload), "Check details", "Contact support" (provide support link/phone).
Behavior: Must be persistent and block navigation away from checkout until user dismisses or retries.
OAuth / Social login failures

Toaster Type: Error (persistent for 8s)
Message: "Sign-in failed. Please try signing in again."
Why: "Could not complete Google sign-in or token exchange."
Action: "Retry sign-in" and explain if profile details are missing (show modal).
Behavior: Persistent; if page is callback, show dedicated error view and a "Back to Login" CTA.
Partial-success / silent fallback

Toaster Type: Info (auto-dismiss 6s)
Message: "Saved partial details. Some information may be missing — review before completing checkout."
Why: "We saved your profile but couldn't update all fields."
Action: "Review profile"
Behavior: Non-blocking, visible on next relevant screen.
Unknown / Unexpected payload (❓)

Toaster Type: Error (persistent)
Message: "Something went wrong. Please refresh the page or try again."
Why: "Received unexpected data from our servers."
Action: "Refresh" or "Contact support" with error id/log reference.
Behavior: Persistent until dismissed.
Toaster behavior rules (global):

Authentication errors triggered by background requests should not silently redirect. Instead show a persistent auth-error toast with "Sign in" CTA; only redirect after user confirms or auto-redirect after a short countdown with visible toast.
For critical user flows (order creation, payment, final submission): toasts must be persistent and provide a retry CTA; if a retry fails repeatedly, offer "Contact support" and store an error snapshot for diagnostics.
For non-critical background refreshes (agent list refresh, nearby orders): show unobtrusive info toasts on repeated failures (e.g., "Background sync failed — data may be stale") with "Retry now" on demand.
Retry behavior: implement exponential backoff for silent background retries; toasts should reflect retry count and offer a manual retry button.
All toasts should include a compact actionable label: one of { Retry, Sign In, Refresh, Review, Contact Support }.
Edge Case Register

Active edge cases discovered and recommended handling:

Double clicks / rapid submits:

Risk: duplicate order creation. Mitigation (documented): disable submit button on first click; toast shows "Submitting—do not refresh." Provide idempotency guidance to backend (idempotency-key) in future.
Toaster: Error if duplicate detected: "Order already received. Check 'My Orders'."
Rapid navigation / redirect during pending request:

Risk: request aborted; user sees no confirmation.
Toaster: show in-progress toast "Completing sign-in..." and on abort show "Sign-in interrupted — try again."
Page refresh during request:

Risk: lost state (e.g., sale data in localStorage). Toaster: "Action interrupted — resume from saved progress." Non-blocking. Also document storing minimal draft in localStorage.
Partial form completion (profile or checkout):

Risk: backend accepted partially; UI assumed success.
Toaster: Info "We saved some details — please verify before creating order."
Stale cached data (react-query staleTime + refetchOnReconnect false):

Risk: stale prices/orders shown silently.
Toaster: Info "Data may be out-of-date. Tap to refresh."
Concurrent updates (two tabs; two agents editing same record):

Risk: last-write-wins; user confusion.
Toaster: Warning "This item was updated elsewhere. Please refresh to see latest status."
Invalid or missing environment variables:

Risk: VITE_API_BASE_URL or VITE_API_URL missing — fetch() will target http://localhost:8000 fallback but may be wrong.
Toaster: Error "App misconfigured. Please contact support." Persistent for dev deployments.
Missing imports / dependency failures:

Google Identity script load failure: user unable to sign in.
Toaster: Error "Google sign-in unavailable. Try again later or use email login."
Backend returns 200 with logical failure:

Examples: {success:false} or {predicted_price:null}
Toaster: Error/Warning depending on operation; instruct user to retry or proceed with caution.
Backend returns 204 / empty on PATCH:

Risk: frontend attempts to parse JSON and crashes.
Document handling: treat 204 as success and avoid parsing.
Feature flags off / migration missing:

Risk: endpoints exist but DB migration missing causing 500; should show clear admin-visible toast and user-friendly message: "Feature temporarily unavailable."
Missing x-skip-auth-redirect usage inconsistencies:

Some auth flows assume axios interceptor won't auto-redirect; ensure callers that need to handle 401 themselves always set the skip header and handle errors with toasts.
Google OAuth state mismatch (CSRF):

Toaster: Error "Sign-in interrupted (security check). Please try again."
Prediction model long latency:

Provide timeout fallback (e.g., 6–10s). Toaster: Info "Price estimation taking longer — you can continue to checkout and a representative will confirm."
If a new utility is needed:

Centralized "toast service" + normalized error parser for axios and fetch responses.
Request timeout wrapper and AbortController support for fetch calls.
Response shape validator (small schema check) for critical endpoints (price, order creation).
Error logging library (e.g., Sentry) with correlation id surfaced in toast for support.
Iteration Log

Step 1: Listed files to analyze and created todo list. (done)
Step 2: Scanned folder for all occurrences of fetch, api, axios, useQuery, and form handlers; opened and inspected primary files. (done)
Step 3: Extracted all API endpoints used by frontend, documented expected success shapes and all likely HTTP error statuses. (in-progress: included above)
Step 4: Enumerated failures and silent states per file and created toaster templates including types and behavior. (done)
Step 5: Compiled edge-case register and utility recommendations. (done)
Final check: re-scanned for indirect effects (AuthContext ↔ OAuthCallback ↔ localStorage flows, axios interceptor behavior). Verified no further async patterns exist in scanned folder beyond those documented.
No further edge cases found after iteration.
Final Recommendations (implementation-ready, no code)

Centralize error handling:
Add one canonical error normalization layer that accepts both axios errors and fetch errors and returns { classification, shortMessage, userMessage, actionable } for toasts.
Use x-skip-auth-redirect consistently where callers need to handle 401 themselves (e.g., OAuth flow).
Toaster & UX:
Adopt a single toaster library (sonner or equivalent) configured to support persistent toasts, action buttons, and linking to retry handlers.
Replace alert() uses and inline-only error text with toasts following the templates above.
Critical flow hardening:
Checkout / Order creation: make failures persistent, provide explicit Retry and Contact Support actions, block navigation away until user acknowledges.
OAuth flows: show explicit persistent toast on token-exchange failure and avoid silent redirect; provide a "Retry sign-in" CTA.
Network resilience:
Add a request timeout and AbortController to prediction calls and other potentially slow requests; provide a clear fallback toast and opt-in to continue without prediction.
Implement client-side idempotency protection (disable submit buttons, show "Submitting..." toast).
Observability and support:
Surface a short error reference or trace id in critical persistent toasts for customer support lookup.
Log errors to a centralized service; link to support in toasts.
Data validation:
Add lightweight response-shape checks for critical endpoints (orders, price, auth). If shape unexpected, show "Unexpected server response" toaster and do not rely on default fallbacks silently.
UX consistency:
Use persistent error toasts for auth failures, order failures, OAuth failures; use transient toasts for non-critical background failures.
For business validation (pincode not serviceable, prediction missing), show actionable warnings with explicit user choice (Continue vs Retry).
Testing:
Add automated UI tests covering: order creation failure, pincode invalid, token expiry mid-flow, prediction timeout, Google OAuth failure.
Add manual QA checklist for flows: login/signup, Google flows, checkout with serviceable and non-serviceable pincodes, slow prediction response.
If you want, I can next:

Produce a compact JSON or YAML mapping of endpoints → toaster templates for direct implementation.
Or create the canonical error-normalization spec (error shape examples and mapping rules) for engineers to implement.
No code changes were made — this is a full specification ready for implementation.