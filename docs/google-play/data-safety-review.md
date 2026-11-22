# Data Safety — review before submission

The free entrypoint does not use the product backend. It sends NIP to the official MF VAT register and authenticates with the official KSeF service using a locally stored token. Profile and credentials are held via SecureStore.

**Not a final Google Play declaration.** Audit the final AAB, manifest, SDKs (including Sentry native integration), telemetry, device identifiers, transmission and deletion semantics before answering data collection/sharing questions. Check whether user-supplied business NIP or token falls under applicable Google Play data categories. Confirm transport encryption, app access, ads and financial feature declarations. Do not assume 'no data collected' solely because there is no proprietary backend.
