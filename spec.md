# Specification

## Summary
**Goal:** Add report deletion functionality and remove the login requirement so the app is directly accessible without authentication.

**Planned changes:**
- Add a `deleteProductionEntry(id)` backend function that deletes a production entry by ID with no authorization check
- Add a `useDeleteProductionEntry` React Query mutation hook that calls the backend delete function, invalidates the entries cache, and shows success/error toasts
- Add a Delete button to each row in the ReportsViewer component with a confirmation prompt before deletion
- Add a Delete button in the individual report detail/expanded view with a confirmation prompt; close the detail view after deletion
- Remove the login button from the Header component
- Remove all authentication guards from App.tsx so DataEntryPage and AdminDashboard are accessible without login
- Prevent ProfileSetupDialog from appearing on app load

**User-visible outcome:** Users can open the app directly without any login prompt, and can delete any production report from both the reports list and the individual report detail view after confirming a prompt.
