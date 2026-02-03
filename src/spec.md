# Specification

## Summary
**Goal:** Fix time formatting on Data Entry, correct Total Operator Hours calculations to scale with Quantity Produced and match frontend/backend logic, and restore Admin add/edit/delete for signed-in users.

**Planned changes:**
- Update Data Entry display for “Cycle Time for 10 Hour Target” and “Cycle Time for 12 Hour Target” to always show minutes+seconds (e.g., `0m 45s`, `1m 05s`) with correct rounding and minute/second carry.
- Fix Total Operator Hours calculation on the Data Entry page to scale proportionally with “Quantity Produced” (and include downtime) rather than behaving as if quantity is always 1.
- Align backend ProductionEntry.totalOperatorHours computation with the duty-time threshold rule:
  - duty time < 12 hours: (10-hour target cycle time × quantity produced) + downtime
  - duty time ≥ 12 hours: (12-hour target cycle time × quantity produced) + downtime
- Ensure the Total Operator Hours shown on Data Entry matches the value stored and later displayed in Admin → Reports (no mismatch).
- Restore Admin CRUD (add/edit/delete) for Products, Machines, and Operators for signed-in users by fixing authorization/permissions blocking intended authenticated usage; keep Admin write actions restricted when not signed in.

**User-visible outcome:** On the Data Entry page, target cycle times display consistently as minutes and seconds, Total Operator Hours updates correctly based on Quantity Produced and downtime, saved entries report the same operator hours in Admin → Reports, and signed-in users can again add/edit/delete Products/Machines/Operators from Admin without authorization errors.
