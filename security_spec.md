# Security Specification - Voyago

## Data Invariants
1. A user document can only be created/updated by the user with the matching UID.
2. Saved destinations and bookings must belong to a specific user and can only be accessed/modified by that user.
3. The `explorerLevel`, `availablePoints`, and `totalTrips` fields in the user document should ideally be calculated by the system, but for now we'll allow the user to create their initial profile. Subsequent updates to these "tier" fields should be protected (or handled via system logic if we had cloud functions, but here we'll use strict rules).
4. `auth.token.email_verified` must be true for all writes.

## The "Dirty Dozen" Payloads (Examples)
1. **Identity Spoofing**: User A trying to create User B's profile.
2. **Identity Spoofing (Write)**: User A trying to save a destination to User B's list.
3. **Privilege Escalation**: User A trying to set their `explorerLevel` to 'Platinum'.
4. **Data Injection**: User A trying to save a destination with a 1MB string title.
5. **Orphaned Write**: Creating a booking without a matching user (though subcollections prevent this naturally).
6. **Value Poisoning**: Updating `availablePoints` with a boolean.
7. **Temporal Violation**: Setting `createdAt` to a future or past date (must use `request.time`).
8. **Insecure Read**: Non-authenticated user trying to list all users.
9. **Insecure List**: User A trying to list User B's bookings.
10. **Ghost Field**: Adding `isAdmin: true` to a user profile update.
11. **Terminal State Bypass**: Updating a 'completed' booking to 'cancelled'.
12. **ID Poisoning**: Using a 10KB string as a `userId`.

## Firestore Rules Runner
(Logic implemented in firestore.rules)
