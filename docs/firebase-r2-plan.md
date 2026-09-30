# Firebase and R2 backend proposal

This proposal adds Google account sign-in and a small cloud backend around DeDe's existing local inference and encrypted vault architecture. The phone continues to run daily inference and build readable memory. Firebase identifies the account and delivers push signals; R2 holds client-encrypted vault history. Vast remains the synthetic model workshop. No cloud resources have been created by this proposal.

## Proposed responsibilities

| Component | Responsibility | Data it can see |
| --- | --- | --- |
| Mobile app | Local model, speech, law gates, memory retrieval and writing, encryption, biometric unlock | The owner's readable vault after unlock |
| PWA | Voice recording, preview and playback; synthetic remote-model testing until a qualified local runtime exists | Synthetic test inputs in the current test phase |
| Firebase Authentication | Google sign-in, account sessions and provider linking | Account identity and authentication metadata |
| Cloud Run control API | Verify Firebase identity, authorize devices, issue bounded storage permissions, validate contact consent and process beacon receipts | Required account, routing and synchronization metadata; ciphertext |
| Firestore | Device registry, accepted contacts, revocations, incident status and durable work records | Minimized operational metadata; no readable conversations, facts or notes |
| Firebase Cloud Messaging | Notify recipient devices that an authorized beacon is available | Opaque incident/wake identifiers and delivery routing |
| Private R2 vault bucket | Immutable encrypted objects and encrypted manifests | Ciphertext and storage metadata |
| Independent backup store | Second verified copy of the same encrypted objects | Ciphertext and storage metadata |

Cloud Run with a small TypeScript service and the Firebase Admin SDK is the proposed first control API. This keeps account verification, storage authorization and beacon delivery in one implementation. It is separate from the GPU workshop. Cloud Run's service identity supports access to Google services without checking service-account key files into the app. [Google service identity documentation](https://docs.cloud.google.com/run/docs/securing/service-identity)

## Account sign in and vault unlock

Use Firebase's Google provider for account sign-in, then send the Firebase ID token over HTTPS to the control API for verification. The API derives account ownership from the verified identity, never a client-supplied user ID. The implementation must qualify mobile redirect/popup behavior, token expiry/revocation, account linking and account switching. [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

Google sign-in does not unlock an encrypted vault by itself. Neither a Google password nor a Firebase ID token becomes the vault key. Tokens change and the authentication provider must not gain the ability to decrypt the vault. Preserve the existing random vault key and independent device, compatible passkey and recovery slots. A fingerprint authorizes use of the device credential locally. Reinstall/new-device recovery requires a working recovery slot or an approved existing device; recovering a Google account alone cannot recover missing encryption keys.

Map linked provider identities to a stable DeDe account ID. Provider changes must not fork the vault, transfer another account's vault or erase existing history. Revoke a lost device's future cloud access separately from account deletion. Previously decrypted copies cannot be remotely guaranteed erased.

## Encrypted synchronization

Create a dedicated private vault bucket and credentials separate from `dede-evidence`. The evidence bucket continues to hold synthetic evaluation and model exports. The client encrypts immutable events, media and versioned manifests before upload. Readable notes, transcripts, embeddings and vault keys do not enter Firestore, Cloud Run logs, FCM or Vast.

The API issues short-lived permissions for exact authorized objects and methods after checking device and account access. R2 credentials stay in the control API's secret store. Presigned URLs are bearer capabilities and must be kept out of logs; browser upload/download requires an explicit CORS policy. [R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

The app shows `saved locally`, `replicating`, `backed up` and `at risk` according to verified receipts. `Backed up` requires both remote failure domains to verify the accepted encrypted bytes and manifest state, as D68 already specifies. A dedicated Google Cloud Storage mirror is a candidate for the second provider; its region, cost, IAM and recovery behavior need evaluation before selection. Merely adding Firebase as a control backend does not create a second copy of the vault.

Concurrent devices need an authenticated manifest/history protocol, deterministic conflict handling and tombstones. A clean-device restore must reproduce the accepted canonical history digest. The plan makes no absolute promise about offline bytes that have not reached a remote store.

## Beacon delivery

Beacons use accepted contact relationships and the existing deterministic authorization rules. An alert goes to authorized contacts; there is no app-to-app calling feature in this proposal. The server verifies permission, revocation, expiry and incident identity before enqueueing delivery. Firestore transactions can maintain consistent operational state, but delivery retries still require explicit idempotency. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

FCM wakes or notifies supported clients. The web client needs notification permission, HTTPS and an explicit service-worker setup. Integrate messaging with the existing worker or pass its registration to FCM; do not accidentally replace the public offline worker with a second competing root registration. The encrypted incident content is fetched only by the authorized recipient. [FCM web setup](https://firebase.google.com/docs/cloud-messaging/web/get-started)

Preserve distinct states: requested, queued, provider accepted, device received, presented, acknowledged, cancelled, expired and failed. Provider acceptance is not proof that a phone sounded or someone saw the alert. Test recipient permission denial, offline devices, duplicates, revocation and cancellation races on physical phones. Push is not a guarantee of waking every phone.

## Model releases and integration tests

Release distribution is separate from vault storage. Versioned model/spine manifests must be signed, hash-verified and rollbackable. Firebase remote configuration, if used later, cannot replace artifact signatures or bypass law gates.

Run the teacher → unquantized student → quantized artifact → runtime → physical device ladder against shared conformance fixtures. The live sweep on `11912e2` is evidence for that deployed stack; it does not automatically qualify the small student. Actual integration tests must cover recording → STT → retrieved synthetic memory → graph → small model → self-check → TTS → playback, plus grounded notes, correction/deletion, crash/restart/restore and paired-client beacon receipts. No sampled response may be substituted for a model or speech output.

Use Firebase emulators in Docker for authentication/database rejection paths and crash/retry testing. Their results establish emulator behavior. Separately require real HTTPS Google sign-in, private R2/mirror read-back, actual provider delivery and physical microphone/speaker tests with synthetic accounts and data.

## Implementation order

1. Finish and audit the voice-first PWA; keep current voice availability explicit while the protected sweep runs.
2. Establish the Firebase project, HTTPS domain, Google provider configuration and budget/region choices. Ship verified sign-in and account isolation first.
3. Implement local encrypted synthetic memory and the vault protocol; provision dedicated R2 and independent mirror storage, then prove restore and deletion.
4. Implement accepted contact circles, beacon authorization, durable retries and device receipts; qualify two real recipient clients.
5. Complete the small model release and integration gates, including representative physical phones, before using personal data with local inference.

Project/domain selection, billing limits, mirror choice and recovery enrollment policy remain inputs to provisioning. Existing decisions and privacy rules continue to apply; this document proposes service placement without assigning or superseding a decision number.
