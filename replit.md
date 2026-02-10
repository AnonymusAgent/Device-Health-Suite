# DevicePulse

## Overview

DevicePulse is a mobile device diagnostics and monitoring app built with Expo/React Native. It provides real-time hardware information, performance monitoring, and stress testing capabilities for mobile devices. The app features a dark-themed UI with four main tabs: Dashboard (device health overview), Hardware (detailed specs and sensor info), Monitor (real-time performance charts), and Stress (CPU, memory, and battery stress tests). It includes a freemium model with premium features gated behind a RevenueCat-powered paywall.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: Expo Router with file-based routing. Tab navigation under `app/(tabs)/` with four screens: `index.tsx` (Dashboard), `hardware.tsx`, `monitor.tsx`, `stress.tsx`. A modal `paywall.tsx` route at the root level.
- **State Management**: React Query (`@tanstack/react-query`) for server state, React Context for premium status (`PremiumContext`), and local `useState` for UI state
- **Fonts**: Space Grotesk loaded via `@expo-google-fonts/space-grotesk`
- **UI Theme**: Dark-only theme defined in `constants/colors.ts`. Both `dark` and `light` keys map to the same dark palette — the app is dark mode exclusively.
- **Device APIs**: Heavy use of Expo modules — `expo-device`, `expo-battery`, `expo-sensors`, `expo-network`, `expo-file-system`, `expo-brightness`, `expo-location` for gathering hardware and system info
- **Charts**: Custom SVG-based charts using `react-native-svg` via `MiniChart` and `ProgressRing` components
- **Haptics**: `expo-haptics` used throughout for tactile feedback on interactions
- **Premium/IAP**: RevenueCat (`react-native-purchases`) integration managed through `PremiumContext`. Premium state cached in `AsyncStorage`. Features gated with `PremiumGate` component that overlays locked content with a gradient blur and unlock button.

### Backend (Express Server)
- **Framework**: Express 5 running on Node.js, defined in `server/index.ts`
- **Purpose**: Lightweight API server. Currently has minimal routes (just the structure in `server/routes.ts`). Serves a landing page template for web/deployment contexts.
- **CORS**: Dynamic CORS setup supporting Replit domains and localhost for development
- **Storage**: In-memory storage (`MemStorage` class in `server/storage.ts`) with a simple user CRUD interface. No database connection is actively used at runtime despite Drizzle being configured.
- **Build**: Server is bundled with esbuild for production (`server:build` script)

### Database Schema
- **ORM**: Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- **Schema**: Single `users` table in `shared/schema.ts` with `id` (UUID, auto-generated), `username` (unique text), and `password` (text)
- **Validation**: Zod schemas generated via `drizzle-zod` for insert operations
- **Current State**: Schema is defined and Drizzle is configured, but the server uses in-memory storage (`MemStorage`). The database needs to be provisioned and `db:push` run to sync the schema. The storage layer should be migrated from `MemStorage` to `DatabaseStorage` using Drizzle when a Postgres database is available.

### Key Development Scripts
- `expo:dev` — Start Expo dev server configured for Replit
- `server:dev` — Start the Express server in development with tsx
- `db:push` — Push Drizzle schema to PostgreSQL
- `expo:static:build` — Build static web bundle via custom build script
- `server:prod` — Run production server from bundled output

### Stress Testing Engine
- Located in `lib/stress-tests.ts`
- CPU stress tests (single-core and multi-core simulation using Fibonacci calculations)
- Memory stress tests and battery stress tests
- Results include pass/fail/warning status, scores, and detailed metrics
- Report generation capability for sharing results

## External Dependencies

### Third-Party Services
- **RevenueCat**: In-app purchase management for premium subscriptions. Configured via `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` environment variables. Manages entitlement `premium`.

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable. Used with Drizzle ORM. Schema migrations output to `./migrations` directory.

### Key Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN` — Public domain for API requests (set automatically on Replit)
- `REPLIT_DEV_DOMAIN` — Replit dev domain for CORS and Expo config
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY` — RevenueCat API key for iOS
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` — RevenueCat API key for Android

### Notable NPM Packages
- `expo` ~54.0.27 — Core framework
- `expo-router` ~6.0.17 — File-based routing
- `react-native-purchases` — RevenueCat SDK
- `react-native-svg` — SVG rendering for charts
- `react-native-gesture-handler` — Gesture handling
- `react-native-keyboard-controller` — Keyboard-aware scroll views
- `drizzle-orm` / `drizzle-zod` — Database ORM and schema validation
- `@tanstack/react-query` — Async state management
- `expo-linear-gradient` — Gradient backgrounds
- `patch-package` — Used in postinstall for patching dependencies