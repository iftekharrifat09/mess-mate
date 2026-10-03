# Complete backend and persistence upgrade

## Goal
Make every recent feature enforce the same rules in the API, MongoDB, and temporary local storage, then synchronize offline changes safely when MongoDB reconnects.

## Changes
- Harden member service status across create and edit requests for meals, deposits, costs, and bazar dates.
- Add database-safe fields and indexes for service status, automatic previous-month deposits, unique bazar dates, and unique months; backfill legacy records when the server connects.
- Move Previous Month Adjustment into one backend request that replaces only auto-generated deposits and updates the toggle together, while retaining local fallback behavior.
- Validate mess ownership and manager permissions on month, member, meal, deposit, cost, bazar, settings, and activity-log changes.
- Make month creation/reset preserve Mess Expense data unless the explicit clear option is sent, keep the new toggle off, and clean related settings when deleting a month.
- Add proper bazar update support and enforce one date per mess both online and locally.
- Queue recent offline writes and service-status changes, remap temporary month IDs, and replay them after reconnection without duplicating records.
- Align frontend request types and response handling with the upgraded API.
- Fix the activity-log server startup issue and add backend audit records for key manager actions.

## Verification
- Run backend syntax checks and the project’s existing checks.
- Confirm the latest preview build log is successful.
- Exercise public/local fallback behavior where authentication allows; report any authenticated flow that cannot be tested here.

## Technical details
- Existing MongoDB collections remain compatible; upgrades run idempotently during connection.
- Legacy deposits continue to display, while new automatic adjustments use an explicit source marker instead of relying only on note text.
- No current UI styling or card behavior will be changed.
