# Mobile App - Missing Features Documentation

## Overview

This document provides a detailed comparison between the partner-agent website and the mobile app, highlighting all features that are implemented in the web version but missing in the mobile app.

**Last Updated:** February 5, 2026

---

## 1. Agent Dashboard - Call Management Features

### 1.1 Call Customer Functionality

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- **Function:** `handleCallCustomer()`
- **Features:**
  - "Call Customer" button displayed in order detail modal
  - Automatically copies customer phone number to clipboard
  - Shows alert/notification with copied phone number
  - Enables call tracking state (`callInProgress`)
  - Visual feedback with green button styling

**Mobile App Current State:**

- No call customer button in agent dashboard
- Agent has to manually copy phone number from order details
- No integrated call tracking

**Implementation Required:**

```typescript
// Web version functionality to implement:
const handleCallCustomer = () => {
  const phoneNumber =
    selectedOrder?.customer_phone || selectedOrder?.phone || "";
  if (phoneNumber) {
    // Copy to clipboard
    navigator.clipboard
      .writeText(phoneNumber)
      .then(() => alert(`Phone number copied: ${phoneNumber}`));
  }
  setCallInProgress(true);
};
```

### 1.2 End Call Functionality

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- **Function:** `handleEndCall()`
- **Features:**
  - "End Call" button appears when call is in progress
  - Button has red styling for clear indication
  - Updates call state to ended
  - Triggers post-call action workflow
  - Icon-based visual feedback (PhoneCall icon from lucide-react)

**Mobile App Current State:**

- No call state management
- No end call functionality
- Missing post-call workflow

**Implementation Required:**

```typescript
const handleEndCall = () => {
  setCallInProgress(false);
  setCallEnded(true);
};
```

### 1.3 Post-Call Action Workflow

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- After ending call, agent must select one of three actions:
  1. **Complete Pickup** - Opens comprehensive pickup checklist
  2. **Reschedule** - Opens reschedule form with date/time/reason
  3. **Cancel (Not Interested)** - Opens cancellation form

**Features:**

- Dropdown selector with three options
- Each option has icon and descriptive text
- Visual color coding:
  - Complete Pickup: Green
  - Reschedule: Blue
  - Cancel: Red
- Enforces workflow: must call customer before proceeding
- Warning message if trying to proceed without calling

**Mobile App Current State:**

- Direct access to Complete Pickup modal
- No enforced call workflow
- Missing reschedule and cancel options from order detail view

**UI Components Required:**

```tsx
// Select dropdown with three actions
<Select onValueChange={handleActionSelect}>
  <SelectItem value="pickup">
    <CheckCircle2 /> Complete Pickup
  </SelectItem>
  <SelectItem value="reschedule">
    <Calendar /> Reschedule
  </SelectItem>
  <SelectItem value="cancel">
    <XCircle /> Cancel (Not Interested)
  </SelectItem>
</Select>
```

---

## 2. Map Integration & Navigation Features

### 2.1 View Map / Get Directions

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- **Function:** `handleViewMap(order: Order)`
- **Features:**
  - "View Map" button with MapIcon from lucide-react
  - Blue button styling (bg-blue-600)
  - Opens Google Maps in new window/tab
  - Pre-filled with customer pickup address
  - Uses Google Maps Directions API
  - Format: `https://www.google.com/maps/dir/?api=1&destination={address}`

**Implementation Details:**

```typescript
const handleViewMap = (order: Order) => {
  const getPickupAddress = () =>
    order.pickup_address ||
    `${order.pickup_address_line || ""}, ${order.pickup_city || ""}, 
     ${order.pickup_state || ""} - ${order.pickup_pincode || ""}`.trim();

  const address = encodeURIComponent(getPickupAddress());
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${address}`,
    "_blank",
  );
};
```

**Mobile App Current State:**

- No map integration
- No navigation/directions feature
- Agent has to manually enter address in Maps app

**Implementation Required for Mobile:**

- Use React Native's `Linking` API to open Maps
- Support both Google Maps and Apple Maps
- Pre-fill destination address
- Example:

```typescript
import { Linking, Platform } from "react-native";

const handleViewMap = (order: Order) => {
  const address = encodeURIComponent(getPickupAddress(order));
  const url = Platform.select({
    ios: `maps://app?daddr=${address}`,
    android: `google.navigation:q=${address}`,
  });
  Linking.openURL(url);
};
```

---

## 3. Complete Pickup Checklist - Advanced Multi-Step Workflow

### 3.1 Overview

**Status:** ⚠️ Partially Implemented (Basic version exists)

**Web Implementation:**

- **Location:** `partner-agent/src/components/CompletePickupChecklist.tsx`
- **867 lines** of comprehensive checklist implementation
- Multi-step wizard with 5 distinct steps
- Visual progress indicator
- Real-time validation and feedback

**Mobile Implementation:**

- **Location:** `app/components/CompletePickupModal.tsx`
- **427 lines** - simpler single-screen implementation
- All fields on one scrollable screen
- Basic validation

### 3.2 Step 1: Physical Inspection Checklist

**Status:** ❌ Missing in Mobile App

**Web Features:**

- **Dedicated Step** with clear visual hierarchy
- **Checkboxes for:**
  - ✅ Screen is intact and working
  - ✅ Touchscreen is responsive
  - ✅ Camera is working
  - ✅ Microphone is working
  - ✅ Speaker is working
- **Accessories Section:**
  - ✅ Has Original Box
  - ✅ Has Original Charger
  - ✅ Has Original Bill
- **Visual Design:**
  - Color-coded sections (Blue for physical, Green for accessories)
  - Gradient backgrounds
  - Hover effects on checkbox items
  - Icons for each section (CheckCircle2)
  - Disabled "Continue" button until all items checked

**Mobile Current State:**

- Uses dropdown selectors instead of checkboxes
- Combined into single form field
- No visual separation of categories
- Less intuitive UX

### 3.3 Step 2: Photography Guide

**Status:** ❌ Missing in Mobile App

**Web Features:**

- **Educational step** before photo capture
- **Four guided photo angles:**
  1. Front View - "Take a clear photo of the front of the device"
  2. Back View - "Take a clear photo of the back of the device"
  3. Screen - "Take a photo showing the screen and any damage"
  4. Sides & Ports - "Capture all ports and side conditions"
- **Pro Tips Section:**
  - Good lighting is critical
  - Keep focus sharp
  - Include any visible damage
  - Capture all angles
- **Visual Design:**
  - Numbered steps (1, 2, 3, 4)
  - Amber/yellow color scheme
  - Alert box with tips
  - Camera icon
  - Navigation buttons (Back / Start Capturing)

**Mobile Current State:**

- No photo guide step
- Direct access to camera
- No instructions for agents

### 3.4 Step 3: Advanced Photo Capture System

**Status:** ⚠️ Basic camera access exists, advanced features missing

**Web Features:**

- **Real-time photo preview** after each capture
- **Photo counter** (Photo 1 of 4, Photo 2 of 4, etc.)
- **Current photo instruction** displayed prominently
- **Photo gallery view** of captured images
- **Delete functionality** for individual photos
  - Hover effect on each photo
  - X button appears on hover
  - Click to remove from array
- **Progress tracking** through 4 required photos
- **Visual feedback:**
  - Large preview area for captured image
  - Thumbnail grid showing all captured photos
  - Blue color scheme for active photo
  - Camera icon on capture button

**Photo Management:**

```typescript
const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setPhotos([...photos, file]);
      if (currentPhotoStep < photoSteps.length - 1) {
        setCurrentPhotoStep(currentPhotoStep + 1);
      } else {
        setCurrentStep("condition_details");
      }
    };
    reader.readAsDataURL(file);
  }
};
```

**Mobile Current State:**

- No photo preview
- No photo management
- No delete capability
- No guidance on which photo to take
- Photos are not stored locally for review

### 3.5 Step 4: Detailed Condition Assessment

**Status:** ⚠️ Basic fields exist, advanced UX missing

**Web Features:**

**Battery Health Selector:**

- Dropdown with 4 options:
  - ⭐ Excellent (80%+)
  - ✓ Good (60-80%)
  - ⚠ Fair (40-60%)
  - ✗ Poor (Below 40%)
- Visual preview showing selected option
- Color-coded (blue gradient)

**Body Condition Selector:**

- Dropdown with 4 options:
  - ⭐ Excellent - No scratches
  - ✓ Good - Minor scratches
  - ⚠ Fair - Visible wear & tear
  - ✗ Poor - Significant damage
- Visual preview showing selected option
- Color-coded (emerald gradient)

**Final Price Input:**

- Large, prominent input field
- Real-time comparison with estimated price
- Shows difference: `+₹500` or `-₹300`
- Color-coded difference display:
  - Amber/Orange for higher than estimate
  - Green for lower than estimate
- Format: `₹` currency symbol included

**Payment Method Selector:**

- Dropdown with 4 options:
  - 💵 Cash
  - 📱 UPI
  - 🏦 Bank Transfer
  - 📄 Cheque
- Icon-based visual representation
- Required field validation

**Customer Acceptance Checkbox:**

- Large, prominent checkbox
- Gradient background (green)
- Two-line description:
  - Bold: "Customer Accepted"
  - Subtitle: "Customer agreed to the final offer"
- Required to proceed

**Additional Notes:**

- Multi-line textarea
- Placeholder: "Any observations, damage details, or other notes..."
- Optional field
- Limited to 3 rows in UI

**Mobile Current State:**

- All fields exist but simpler UI
- No visual previews
- No real-time price comparison
- No icons in dropdowns
- Smaller, less prominent inputs
- Combined into single scrollable form

### 3.6 Step 5: Review & Confirmation

**Status:** ❌ Missing in Mobile App

**Web Features:**

- **Summary card** with all collected data
- **Two-column grid** showing:
  - Photos count (X / 4)
  - Payment method
- **Detailed review sections:**
  - Battery Health
  - Body Condition
  - Final Price (large, prominent, green)
  - Customer Acceptance (with checkmark icon)
  - Notes (if provided)
- **Color scheme:** Green gradient (success theme)
- **Confirmation message:**
  - Blue alert box
  - "Ready to complete" with checkmark icon
  - Instructions for next step
- **Action buttons:**
  - Back to Edit (outline style)
  - Complete Pickup (green, bold, large)
  - Loading state during submission

**Mobile Current State:**

- No review step
- Direct submission after filling form
- No chance to review before submission

### 3.7 Visual Progress Indicators

**Status:** ❌ Missing in Mobile App

**Web Features:**

- **5-step progress bar** at top of modal
- **Each step shows:**
  - Icon (CheckCircle2, Camera, ImageIcon, FileText, Check)
  - Label (Checklist, Photo Guide, Capture Photos, Details, Review)
  - Status indicator (current, completed, pending)
- **Color coding:**
  - Current step: Blue (bg-blue-600)
  - Completed steps: Green (bg-green-600)
  - Pending steps: Gray (bg-gray-300)
- **Connect lines** between steps
- **Scale animation** on current step (scale-110)
- **Smooth transitions** between steps

**Mobile Current State:**

- No progress indicator
- Single-screen form
- No indication of completion percentage

---

## 4. Reschedule Pickup Feature

### 4.1 Reschedule Form

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- **Triggered:** After ending call, selecting "Reschedule" option
- **Function:** `handleReschedulePickup()`

**Form Fields:**

1. **New Pickup Date** (Required)
   - Date input field
   - Cannot select past dates
   - Clear label with asterisk

2. **New Pickup Time** (Required)
   - Time input field
   - 24-hour or 12-hour format
   - Clear label with asterisk

3. **Reason for Rescheduling** (Required)
   - Multi-line textarea
   - Placeholder: "Please provide a reason for rescheduling"
   - Minimum 3 rows
   - Clear label with asterisk

4. **Additional Notes** (Optional)
   - Multi-line textarea
   - Placeholder: "Any additional notes"

**Visual Design:**

- Amber/yellow color scheme (warning theme)
- Calendar icon in header
- Section header: "Reschedule Pickup"
- Validation: All required fields must be filled
- Action buttons:
  - Confirm Reschedule (amber button, disabled until valid)
  - Cancel (outline button)

**API Integration:**

```typescript
await api.post(`/agent/orders/${orderId}/reschedule-pickup`, {
  new_date: "2024-01-15",
  new_time: "14:30",
  reschedule_reason: "Customer not available",
  notes: "Will call before visit",
});
```

**Mobile Current State:**

- Reschedule functionality exists: `app/components/SchedulePickupModal.tsx`
- BUT: Not accessible from agent dashboard order detail view
- Only shows "Schedule Pickup" button for un-scheduled orders
- No reschedule option for already scheduled pickups
- Missing reason and notes fields

---

## 5. Cancel Pickup Feature

### 5.1 Cancel/Decline Pickup Form

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/pages/AgentDashboard.tsx`
- **Triggered:** After ending call, selecting "Cancel (Not Interested)" option
- **Function:** `handleCancelPickup()`

**Form Fields:**

1. **Cancellation Reason** (Required)
   - Multi-line textarea
   - Placeholder: "Please provide a detailed reason for canceling this pickup"
   - Minimum 3 rows
   - Clear label with asterisk

2. **Additional Notes** (Optional)
   - Multi-line textarea
   - Placeholder: "Any additional notes"

**Visual Design:**

- Red color scheme (danger theme)
- XCircle icon in header
- Section header: "Cancel Pickup"
- **Warning Alert Box:**
  - Red background (bg-red-50)
  - Bold "Important:" label
  - Message: "Canceling this pickup means the customer is not willing to sell. The order will be marked as cancelled."
  - Border (border-red-200)

**Confirmation Dialog:**

- Double confirmation required
- Message: "Are you sure you want to cancel this pickup? The order will be marked as cancelled (customer does not want to sell)."

**API Integration:**

```typescript
await api.post(`/agent/orders/${orderId}/cancel-pickup`, {
  cancellation_reason: "Customer changed mind",
  notes: "Customer found better offer",
});
```

**Mobile Current State:**

- No cancel pickup functionality
- Agent cannot mark order as cancelled from their side
- No workflow for handling customer refusals

---

## 6. Pickup Details Viewer (Partner Dashboard)

### 6.1 Pickup Details Modal

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Location:** `partner-agent/src/components/PickupDetailsModal.tsx`
- **Purpose:** Partners can view complete pickup details after agent completes inspection
- **Trigger:** Click on completed order in partner dashboard

**Features:**

**Agent Information Display:**

- Agent name, email, phone
- Blue gradient background section
- Icon-based display

**Phone Conditions Display:**

- Grid layout showing all inspected conditions
- Each condition in separate card:
  - Condition name (formatted)
  - Boolean values shown as: ✓ Yes / ✗ No
  - String values shown as-is
- Color-coded (gray background)

**Photo Gallery:**

- **Photo Extraction from Blob:**
  - Backend sends photos as base64 encoded blob
  - Frontend extracts individual photos based on metadata
  - Creates object URLs for display
  - Proper cleanup on unmount

- **Navigation:**
  - Thumbnail gallery at bottom
  - Large active photo display
  - Click thumbnails to switch
  - Photo counter (Photo 1 of 4)

- **Photo Metadata Display:**
  - Filename
  - Size (in KB/MB)
  - Capture timestamp
  - Content type

**Additional Details:**

- Final offered price (large, prominent)
- Customer acceptance status
- Payment method
- Pickup notes
- Actual condition summary
- Timestamp of pickup completion

**Technical Implementation:**

```typescript
// Photo extraction from blob
const photos = useMemo(() => {
  const binaryString = atob(details.photos_blob);
  const bytes = new Uint8Array(binaryString.length);

  // Extract individual photos based on metadata
  details.photos_metadata.forEach((metadata) => {
    const photoBytes = bytes.slice(
      currentIndex,
      currentIndex + metadata.size_bytes,
    );
    const blob = new Blob([photoBytes], { type: metadata.content_type });
    const url = URL.createObjectURL(blob);
    extractedPhotos.push({ metadata, blob, url });
  });

  return extractedPhotos;
}, [details]);
```

**Mobile Current State:**

- Partner dashboard exists but limited
- No pickup details viewer
- Cannot view photos after pickup completion
- Cannot see inspection details

---

## 7. UI/UX Enhancements

### 7.1 Framer Motion Animations

**Status:** ❌ Missing in Mobile App

**Web Implementation:**

- **Library:** framer-motion
- **Locations:** Multiple components

**Animation Types:**

1. **Modal Animations:**
   - Fade in/out overlay (opacity: 0 → 1)
   - Scale animation (scale: 0.9 → 1)
   - Example:

   ```tsx
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
   />
   ```

2. **Card Hover Effects:**
   - Shadow transitions
   - Border color changes
   - Scale on hover

3. **List Item Animations:**
   - Staggered children animations
   - Slide in from bottom
   - Example:
   ```tsx
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.1 }}
   />
   ```

**Mobile Current State:**

- No animations (React Native doesn't support framer-motion)
- Static transitions
- Can be implemented with React Native Animated API or Reanimated

### 7.2 Lucide React Icons

**Status:** ⚠️ Different icon library in Mobile

**Web Implementation:**

- **Library:** lucide-react
- **Icons Used:**
  - Calendar
  - Clock
  - MapPin
  - Phone
  - User
  - Package
  - IndianRupee
  - CheckCircle2
  - Eye
  - PhoneCall
  - Map (MapIcon)
  - XCircle
  - Camera
  - AlertCircle
  - ChevronRight
  - X
  - Check
  - ImageIcon
  - FileText
  - DollarSign

**Mobile Current State:**

- Uses emoji icons (📦, 📅, ✅, etc.)
- Less professional appearance
- Inconsistent sizing

---

## 8. Advanced Form Components

### 8.1 shadcn/ui Components

**Status:** ❌ Missing in Mobile App

**Web Uses:**

- `@/components/ui/dialog` - Modal/Dialog system
- `@/components/ui/button` - Consistent button styling
- `@/components/ui/card` - Card containers
- `@/components/ui/badge` - Status badges
- `@/components/ui/input` - Form inputs
- `@/components/ui/label` - Form labels
- `@/components/ui/select` - Dropdown selectors
- `@/components/ui/textarea` - Multi-line inputs
- `@/components/ui/tabs` - Tab navigation
- `@/components/ui/alert` - Alert boxes
- `@/components/ui/alert-dialog` - Confirmation dialogs

**Benefits:**

- Consistent design system
- Accessible components
- TypeScript support
- Customizable with Tailwind

**Mobile Current State:**

- Custom-built components
- Inconsistent styling
- Less accessibility features

---

## 9. Desktop-Specific Features

### 9.1 Responsive Layouts

**Status:** ❌ Not applicable for mobile

**Web Features:**

- Grid layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Responsive breakpoints
- Hover states
- Large screen optimizations

### 9.2 Clipboard API

**Status:** ⚠️ Different implementation needed

**Web Usage:**

```typescript
navigator.clipboard
  .writeText(phoneNumber)
  .then(() => alert(`Phone number copied: ${phoneNumber}`));
```

**Mobile Alternative:**

```typescript
import Clipboard from "@react-native-clipboard/clipboard";
Clipboard.setString(phoneNumber);
```

---

## 10. Feature Priority Matrix

### High Priority (Critical for Agent Workflow)

1. ✅ Call Customer & End Call functionality
2. ✅ Map Integration / Get Directions
3. ✅ Multi-step Complete Pickup Checklist
4. ✅ Photo guide and advanced photo management
5. ✅ Reschedule Pickup form
6. ✅ Cancel Pickup form

### Medium Priority (Important for UX)

7. ✅ Post-call action workflow enforcement
8. ✅ Review & Confirmation step before submission
9. ✅ Visual progress indicators
10. ✅ Detailed condition assessment UI improvements

### Low Priority (Nice to Have)

11. ✅ Pickup Details Viewer for partners
12. ✅ Framer Motion animations
13. ✅ Professional icon library
14. ✅ Advanced UI components

---

## 11. Implementation Recommendations

### Phase 1: Critical Features (Week 1-2)

1. Implement Call Customer button with native phone dialer integration
2. Add Map/Directions button using React Native Linking
3. Create post-call action selection workflow
4. Implement Reschedule form with all fields
5. Implement Cancel form with warning dialog

### Phase 2: Enhanced Pickup Flow (Week 3-4)

6. Redesign Complete Pickup as multi-step wizard:
   - Step 1: Physical checklist
   - Step 2: Photo guide
   - Step 3: Photo capture with preview
   - Step 4: Condition details
   - Step 5: Review & confirm
7. Add photo management (preview, delete, retake)
8. Add visual progress indicator
9. Improve battery/body condition selectors with icons

### Phase 3: Partner Features (Week 5)

10. Add Pickup Details viewer in partner dashboard
11. Implement photo gallery for completed pickups
12. Add detailed inspection report view

### Phase 4: Polish & UX (Week 6)

13. Add animations using React Native Reanimated
14. Replace emoji icons with professional icon library (e.g., react-native-vector-icons)
15. Improve form validation and error messages
16. Add loading states and skeleton screens
17. Implement offline support for photo capture

---

## 12. Technical Considerations

### Dependencies to Add:

```json
{
  "dependencies": {
    "@react-native-clipboard/clipboard": "^1.13.2",
    "react-native-image-picker": "^7.0.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-reanimated": "^3.6.0",
    "@react-native-community/datetimepicker": "^7.6.0" // Already installed
  }
}
```

### API Changes Needed:

None - all endpoints already exist and are used by web version

### Platform-Specific Implementations:

1. **Phone Dialer:**

   ```typescript
   Linking.openURL(`tel:${phoneNumber}`);
   ```

2. **Maps:**

   ```typescript
   const url = Platform.select({
     ios: `maps://app?daddr=${address}`,
     android: `google.navigation:q=${address}`,
   });
   Linking.openURL(url);
   ```

3. **Camera:**

   ```typescript
   import { launchCamera } from "react-native-image-picker";
   launchCamera(options, callback);
   ```

4. **Clipboard:**
   ```typescript
   import Clipboard from "@react-native-clipboard/clipboard";
   Clipboard.setString(phoneNumber);
   ```

---

## 13. Files to Create/Modify

### New Files Needed:

1. `app/components/AgentCallControls.tsx` - Call/End call buttons
2. `app/components/PostCallActions.tsx` - Action selection after call
3. `app/components/ReschedulePickupModal.tsx` - Reschedule form
4. `app/components/CancelPickupModal.tsx` - Cancel form
5. `app/components/CompletePickupWizard.tsx` - Multi-step wizard
6. `app/components/PhotoGuide.tsx` - Photo guide step
7. `app/components/PhotoCapture.tsx` - Advanced photo capture
8. `app/components/PickupReview.tsx` - Review step
9. `app/components/ProgressIndicator.tsx` - Visual progress bar
10. `app/components/PickupDetailsViewer.tsx` - View completed pickups

### Files to Modify:

1. `app/app/(agent-tabs)/index.tsx` - Add map button, call controls
2. `app/app/lead-detail/[id].tsx` - Add reschedule/cancel options
3. `app/components/CompletePickupModal.tsx` - Replace with wizard
4. `app/app/(tabs)/dashboard.tsx` - Add pickup details viewer for partners

---

## 14. Testing Checklist

### Unit Tests:

- [ ] Call customer functionality
- [ ] End call state management
- [ ] Map URL generation
- [ ] Photo capture and preview
- [ ] Photo deletion
- [ ] Form validation (reschedule, cancel)
- [ ] Multi-step wizard navigation
- [ ] Price difference calculation

### Integration Tests:

- [ ] Complete pickup flow from call to submission
- [ ] Reschedule flow
- [ ] Cancel flow
- [ ] Photo upload with metadata
- [ ] API integration for all new endpoints

### E2E Tests:

- [ ] Agent workflow: View order → Call → Complete pickup
- [ ] Agent workflow: View order → Call → Reschedule
- [ ] Agent workflow: View order → Call → Cancel
- [ ] Partner viewing completed pickup details

---

## 15. Known Limitations

### Web-Only Features (Cannot be Replicated):

1. Framer Motion animations (use React Native Animated/Reanimated instead)
2. shadcn/ui components (build custom React Native equivalents)
3. Hover states (mobile uses touch interactions)

### Mobile-Specific Challenges:

1. File picker API differences
2. Camera permissions handling
3. Limited screen space for multi-column layouts
4. Different navigation patterns (stack vs. modal)

---

## Conclusion

The partner-agent website has significantly more advanced features compared to the mobile app, particularly in:

- Agent communication workflows (call management)
- Location/navigation integration
- Pickup inspection process (multi-step wizard)
- Photo management
- Post-call actions (reschedule/cancel)

**Total Missing Features: 15 major feature groups**

**Estimated Development Time: 6 weeks**

**Priority: High** - These features are critical for field agent productivity and customer satisfaction.
