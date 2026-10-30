# Minimal, non-custodial recipient verification

recipientPresence(C-address) reads bounded public Testnet evidence about the existence of a Soroban contract instance only. validRecipientPresence requires a current observation, exact C-address, ledger and an explicit *false* for smart-account verification, authority, asset support, privacy and payments. It rejects raw WASM hashes, admin metadata, unknown fields, stale records and substituted addresses.

Contract instance presence is never treated as a deployable passkey account or an authorized recipient; no signing or transfer SDK method is added. This does not validate a contract-account __check_auth implementation. Real passkey accounts require audited OpenZeppelin code and pinned Kit compatibility, verifiers, factory, relayer policy, origin binding and recovery.
