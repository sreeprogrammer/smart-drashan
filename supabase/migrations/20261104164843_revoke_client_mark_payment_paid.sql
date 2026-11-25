/*
# Stop clients from marking special darshan bookings as paid

1. Modified Functions
- `mark_payment_paid(uuid)` remains in place but is no longer executable by anon, authenticated or PUBLIC.

2. Security
- Special darshan payments must be confirmed by a real payment gateway, not by the browser.
- Until a gateway is connected, no client role can flip a booking to paid.
*/

REVOKE EXECUTE ON FUNCTION public.mark_payment_paid(uuid) FROM PUBLIC, anon, authenticated;
