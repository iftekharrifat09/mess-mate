# Dashboard and member card fixes

## Changes
- Calculate dashboard utility dues using only members whose service includes expenses, matching the Mess Expenses page.
- Keep every dashboard member card the same height in each grid row, including Meals Only and Expenses Only cards.
- Improve small-screen layouts so names, status tags, balances, and due details wrap without overlap.
- Refresh the Active Members card with clearer service status placement and compact mobile-friendly actions.

## Verification
- Compare the dashboard utility amount with the Member Dues amount.
- Check dashboard and Members pages at desktop and mobile widths.
- Confirm the preview builds without errors.

## Technical details
- Reuse the existing service-status helpers when determining the expense-member divisor.
- Limit changes to dashboard/member presentation and the dashboard dues calculation; existing records remain unchanged.
