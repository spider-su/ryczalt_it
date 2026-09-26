# Post-hardening corrective fixes

## Physical-device verification required

The following must be verified on Android and iOS hardware or representative native builds:

- one biometric prompt on app restart when protected login is enabled;
- cancellation and failed biometric authentication returning to normal sign-in without exposing the session;
- changed biometric enrollment or inaccessible SecureStore credential recovering through normal sign-in;
- Android and iOS SecureStore behavior with `requireAuthentication: true`;
- payment timeout behavior where the server may have committed the mutation.

The JavaScript tests mock SecureStore/biometric APIs and do not prove native prompt count, enrollment invalidation, or device credential behavior.
