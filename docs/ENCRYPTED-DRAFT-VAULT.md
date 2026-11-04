# Encrypted customer payment draft vault

The SDK's `encryptCustomerDraft` and `decryptCustomerDraft` use standard browser
Web Crypto only, so neither function performs network requests or signs a
transaction. Draft content is a bounded `{kind,corridor_id,recipient,amount,reference}`
object. AES-256-GCM uses a fresh 96-bit IV, a 128-bit random PBKDF2 salt and
600,000 iterations of PBKDF2-HMAC-SHA256 for each saved draft, with a 256-bit
derived key. The authentication context (AAD) binds the Testnet passphrase,
canonical G-address and random draft UUID. Neither vault key nor passphrase is
returned or stored by the SDK.

Use `validEncryptedCustomerDraft` to validate the untrusted encrypted envelope.
Use `validEncryptedDraftDirectory` to validate tenant-scoped responses returned
by the separately authenticated backend and BFF. The server stores only opaque
ciphertext and metadata, with a cap of eight records per account. Do not send
plaintext, password, auth tokens or secret witnesses to an API. The envelope
flags neither execution nor cryptographic proof success.

A wrong passphrase, foreign account, different slot UUID or modified IV/bytes
must fail decryption. Restoring the data does not restore live corridor, asset,
issuer, recipient ownership, approvals, ledger freshness or financial execution
readiness. Recheck them independently after every restore. The restored data are
an unsigned *planning draft*.

If a user downloads a backup JSON file, keep both the file and long unique
passphrase safe. It cannot be reset by StealthBridge. A low-entropy password
may still permit offline dictionary attacks. Do not confuse authenticated
file encryption with a ZK proof or smart-account authorization.

Run `npm run build && node --test tests/private-draft-vault.test.mjs`.

## Update, rotation and cross-device backup recovery

The browser-only `reencryptCustomerDraft(account, sourceId, previousPassword,
sourceEncrypted, destinationId, newPassword)` authenticates the old AES-GCM
record before deriving a new PBKDF2 key and randomly re-encrypting the draft.
Pass the same draft ID to rotate the secret on an existing record, or a new
random UUID to create an independent encrypted copy of an imported backup.
The old passphrase is not sent to the server, and an attacker cannot swap in a
record from another account, UUID or network.

The application, not the crypto helper, must enforce atomic `expected_revision`
compare-and-swap and recheck the account identity. Never send decrypted
payment fields (recipient, amount, reference) to the storage API.
Passphrase rotation does not rotate a smart-account signer, a passphrase for
another saved draft or an independently exported old backup. Old offline files
still decrypt with the old secret; communicate this to customers.

Regression cases cover incorrect old secrets, changed account/AAD, wrong slot,
altered IV, ciphertext rotation and freshly encrypted new slots.
