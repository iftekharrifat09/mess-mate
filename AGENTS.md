# Architecture rules

- Keep the React frontend in the root `src/` tree and the deployable API in the single `backend/index.js` file, because this project depends on that deployment layout.
- Every write must enforce the same service-status, ownership, and uniqueness rules in MongoDB and local fallback storage, because either persistence mode may be active.
- Previous-month deposits use `source: previous_month_adjustment`; the legacy note remains display-only compatibility, because note text must not define record ownership.
- Offline mutations must be queued and replayed after MongoDB reconnects, because local storage is a temporary persistence layer rather than an independent data source.