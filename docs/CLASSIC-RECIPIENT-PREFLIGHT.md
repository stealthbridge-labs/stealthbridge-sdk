# Classic account existence is not identity or payment authorization

The SDK method classicRecipientPresence(G-address) calls the fixed, GET-only backend /v1/wallet/classic-recipient/{address} path. The result is a minimal public Stellar Testnet account existence check. The strict validator requires exact address, source, allowed timestamp window and explicit false flags for ownership, asset acceptance and payment execution. It rejects extra balances, signers and any authority claims.

This check does not verify control of the account, supported assets, regulated payout eligibility or permission to transfer. Customer input should only be sent on explicit request. No amount, recipient name, invoice or private witness enters this request.
