# Admin Portal Theme Guide

## Overview

The admin portal now uses a consistent, centralized theming system based on CSS custom properties (CSS variables) with support for both light and dark modes.

## Theme System

### Color Variables

All colors are defined in `src/index.css` using OKLCH color space for better perceptual uniformity:

- `--background` / `--foreground` - Main page background and text
- `--card` / `--card-foreground` - Card backgrounds and text
- `--primary` / `--primary-foreground` - Primary brand color (blue)
- `--secondary` / `--secondary-foreground` - Secondary backgrounds
- `--muted` / `--muted-foreground` - Muted/subtle content
- `--accent` / `--accent-foreground` - Accent highlights
- `--destructive` / `--destructive-foreground` - Error/danger states
- `--border` / `--input` / `--ring` - UI element borders and focus rings
- `--sidebar-*` - Sidebar-specific colors

### Using Theme Colors

#### In Tailwind Classes

Always use semantic theme color classes instead of hardcoded colors:

✅ **Good:**

```tsx
<div className="bg-background text-foreground">
<p className="text-muted-foreground">
<button className="bg-primary text-primary-foreground">
<aside className="bg-sidebar border-sidebar-border">
```

❌ **Bad:**

```tsx
<div className="bg-white text-black">
<p className="text-gray-500">
<button className="bg-blue-600 text-white">
<aside className="bg-gray-50 border-gray-200">
```

## Utility Functions

### Format Utilities (`src/lib/formatUtils.ts`)

- `formatCurrency(value, currency?, locale?)` - Format numbers as currency
- `formatNumber(value, locale?, maxDecimals?)` - Format numbers
- `formatDateTime(value, locale?, options?)` - Format dates and times

All re-exported from `src/lib/utils.ts` for convenience.

### Badge Utilities (`src/lib/badgeUtils.ts`)

Provides consistent status badge colors:

- `getPartnerStatusColor(status)` - Partner verification status badges
- `getOrderStatusColor(status)` - Order status badges

These utilities return Tailwind classes that integrate with both light and dark modes.

## Status Badge Colors

### Partner Statuses

- **Pending**: Amber/yellow
- **Under Review**: Blue
- **Clarification Needed**: Orange
- **Approved**: Emerald/green
- **Rejected**: Red
- **Suspended**: Muted (theme-aware)

### Order Statuses

- **Pending**: Amber/yellow
- **Confirmed**: Blue
- **Picked Up**: Purple
- **Completed**: Emerald/green
- **Cancelled**: Red

## Dark Mode Support

The theme automatically supports dark mode through the `.dark` class. All theme colors have dark mode variants defined in `index.css`.

To toggle dark mode, add the `dark` class to the `<html>` or `<body>` element:

```tsx
<html className="dark">
```

## Component Examples

### Loading Spinner

```tsx
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
```

### Page Headers

```tsx
<div>
  <h1 className="text-3xl font-bold">Dashboard</h1>
  <p className="text-muted-foreground mt-1">Overview of your system</p>
</div>
```

### Sidebar Navigation

```tsx
<aside className="bg-sidebar border-r border-sidebar-border">
  <div className="border-b border-sidebar-border">
    <h1 className="text-sidebar-foreground">Admin Portal</h1>
    <p className="text-muted-foreground">user@example.com</p>
  </div>
</aside>
```

### Status Badges

```tsx
import { getPartnerStatusColor } from "../lib/badgeUtils";

<Badge className={getPartnerStatusColor(status)} variant="outline">
  {status.toUpperCase()}
</Badge>;
```

## Migration Checklist

When adding new components or pages:

- [ ] Use theme color classes (e.g., `bg-background`, `text-foreground`)
- [ ] Avoid hardcoded colors (e.g., `bg-gray-500`, `text-blue-600`)
- [ ] Use `text-muted-foreground` for secondary text
- [ ] Use `border-border` for borders
- [ ] Use badge utilities for status indicators
- [ ] Test in both light and dark modes
- [ ] Use format utilities from `formatUtils.ts`

## Benefits

1. **Consistency**: Single source of truth for all colors
2. **Maintainability**: Easy to update the entire theme from one place
3. **Accessibility**: OKLCH colors provide better perceptual uniformity
4. **Dark Mode**: Built-in support with automatic color adjustments
5. **Developer Experience**: Semantic class names make intent clear
