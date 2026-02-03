# Specification

## Summary
**Goal:** Make “Op Hours” in reports/exports exactly match the “Total Operator Hours” computed and displayed in the Data Entry form for the same production entry.

**Planned changes:**
- Update backend operator-hours computation used when creating/saving a ProductionEntry to match the frontend utility logic (duty-time threshold rule, lunch-break deduction rule, and equivalent calculations).
- Store Total Operator Hours with fractional precision (hours/minutes/seconds) rather than whole-hours-only when the form shows minutes/seconds.
- Ensure Reports table and CSV/HTML exports read and display the backend-stored Total Operator Hours value so it matches the Data Entry form’s displayed value for newly saved entries.

**User-visible outcome:** After saving a new production entry, the Reports “Op Hours” value and exported operator-hours columns match the Data Entry form’s “Total Operator Hours” exactly (including minutes/seconds and threshold/lunch-break rules).
