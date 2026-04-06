# Customer Info Manager

## Current State

The app has two modes (tabs): "New Entry" and "Update Existing". Both access a Google Sheet tab named "Master" via an Apps Script Web App URL stored in localStorage. The Update Existing flow uses a mobile lookup → account cards (up to 10 Member ID boxes) → fetch by Member ID → edit form pattern. Settings are stored in localStorage.

## Requested Changes (Diff)

### Add
- A third tab: **Payment History**
- Mobile number lookup UI identical to Update Existing (input + Fetch button)
- After fetch: show account cards (same card UI as Update Existing) filtered by phone number from the Payment sheet's `Phone` column
- After selecting an account card: fetch all payments from the `Payment` sheet where `Membership` matches the selected Member ID (the `Membership` column in the Payment sheet holds the Membership No like "R 5/50")
- Display payments in a read-only table with columns: Member Name, Date, Amount, Method, Reference, Recorded By
- No edit/delete actions — read-only view only
- New Apps Script action: `fetchPayments` — accepts `memberId` parameter, queries the `Payment` sheet tab, returns matching rows

### Modify
- `AppMode` type: extend from `"new" | "update"` to `"new" | "update" | "payment"`
- Tab bar: add a third tab button "Payment History" alongside existing tabs
- Apps Script: add `fetchPayments(memberId)` action that reads the `Payment` sheet and returns rows where `Membership` column matches the memberId

### Remove
- Nothing removed

## Implementation Plan

1. Extend `AppMode` type to include `"payment"`
2. Add "Payment History" tab button in the tab bar (same style as existing tabs)
3. Add payment-specific state: `paymentLookupMobile`, `paymentAccounts`, `paymentSelectedMembership`, `paymentRows`, `isFetchingPayments`
4. Add lookup UI block (same as Update Existing lookup block) shown only when `mode === "payment"`
5. After fetching accounts via `fetchAll`, show account cards — same card component already used in Update Existing
6. After selecting a card, call Apps Script with `action=fetchPayments&memberId=<selectedMemberId>`
7. Display results in a shadcn Table component: columns Name, Date, Amount, Method, Reference, Recorded By
8. Empty state: "No payments found for this account"
9. The Apps Script `fetchPayments` action reads the `Payment` sheet, matches rows where `Membership` column equals the passed memberId, returns array of payment objects
10. Provide updated Google Apps Script code in the chat response
