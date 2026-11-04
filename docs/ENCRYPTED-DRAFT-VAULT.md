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
