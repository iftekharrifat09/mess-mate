# DESCO Electricity System Upgrade

## What will change
- Replace direct browser calls to legacy DESCO endpoints with authenticated requests through the app server, following the uploaded integration flow.
- Let a manager save DESCO login details and the account number. Keep the password encrypted on the server; never store DESCO credentials in browser storage or return them to the app.
- Log in to DESCO server-side, resolve the configured account number to its account ID, and retrieve balance, realtime balance, account summary, monthly usage, daily usage, and recharge transactions.
- Adapt the dashboard card and refresh behavior to display the new response formats and preserve the existing balance alerts and usage views where the new API provides equivalent data.
- Update backend configuration guidance and verify credential handling and response parsing without using the uploaded password.

## Technical details
- Keep implementation in the existing React `src/` tree and single Express `backend/index.js` deployment.
- Add manager-only server endpoints for saving/removing DESCO credentials and fetching account data. Store encrypted credentials in MongoDB using authenticated encryption with a backend environment key; do not fall back to localStorage for secrets.
- Add the encryption-key name to the environment example and fail safely with a clear setup error if the backend key is absent.
- Retain existing DESCO low-balance notification behavior, adapting its request to the new login/account resolution flow.
