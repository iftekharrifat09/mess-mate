# DESCO two-step connection

## User experience
- First, collect and verify the DESCO phone/email and password. Save the encrypted credentials on the server only after a successful login.
- After the session is saved, reveal the account-number field. Verify the entered number against the accounts returned by that saved login, then store it only when it matches.
- Keep existing credentials and account intact when a verification fails. If login credentials are changed successfully, clear the previously selected account so it must be verified again.
- Start balance, usage, transaction, and alert requests only when both a saved login and a verified account exist.

## Implementation
- Split the manager-only backend flow into session verification/save and account verification/save actions while retaining the single-file API architecture.
- Update the settings response and frontend API/service types to report saved-session and verified-account state separately.
- Make Manage Mess progressively show the account field after session verification, with loading, success, error, change-login, and remove states.
- Validate the account ownership check and setup-state rules; run backend syntax, frontend type/build checks, and verify the UI flow where available.
