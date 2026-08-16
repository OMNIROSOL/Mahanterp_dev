# Architecture Refactoring & Backend Integration Plan

This plan outlines the technical steps to transition the ERP application from a mock-heavy frontend prototype to a scalable, production-ready system.

## Proposed Changes

### 1. Codebase Consolidation
- **[DELETE] [AIAssistant.tsx](file:///c:/ERP_AUTOMATION/AIAssistant.tsx) (root)**: Standardize on the component-based version in `components/`.
- **[DELETE] [ModernSidebar.tsx](file:///c:/ERP_AUTOMATION/components/shared/ModernSidebar.tsx)**: Consolidate with [Sidebar.tsx](file:///c:/ERP_AUTOMATION/components/shared/Sidebar.tsx) to maintain UI consistency.
- **[DELETE] Build/Div logs**: Remove [build_log.txt](file:///c:/ERP_AUTOMATION/build_log.txt), [divs_log.txt](file:///c:/ERP_AUTOMATION/divs_log.txt), etc.

### 2. State Management & Data Layer
- **[NEW] `store/useERPStore.ts`**: Implement **Zustand** for global state (Approvals, Sessions).
- **[NEW] `hooks/useInvoices.ts`**, **`hooks/useQuotes.ts`**: Extract business logic and calculations from views.
- **[MODIFY] [services/mockDataService.ts](file:///c:/ERP_AUTOMATION/services/mockDataService.ts)**: Refactor to a standard `apiService` that uses `fetch/axios` instead of `localStorage`.

### 3. Backend Implementation (Conceptual)
- **[NEW] `server/` directory**: Initialize a Node.js/Prisma backend.
- **[NEW] `prisma/schema.prisma`**: Define the database schema for PostgreSQL based on existing [types.ts](file:///c:/ERP_AUTOMATION/types.ts).

---

## Verification Plan

### Automated Tests
- **Unit Tests**: Run `npm test` (to be initialized) to verify tax and total calculation logic in the new hooks.
- **Integration Tests**: Verify that changing a Quote to 'Accepted' correctly triggers the creation of a Sales Order in the global state.

### Manual Verification
1. **State Persistence**: Verify that data survives page refreshes using the new Zustand store (initially persisted to `sessionStorage`).
2. **UI Integrity**: Check that all 44 views still render correctly after logic extraction.
3. **AI Service**: Test the `geminiService` with a valid API key and verified model name.
