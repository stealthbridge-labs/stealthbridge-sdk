import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validBeneficiaryDirectory,
  validUpsertBeneficiaryInput,
} from "../dist/account-beneficiaries.js";

const OWNER = "GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const W_ADDR = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6A";

describe("account beneficiaries SDK validation", () => {
  test("accepts Protocol 30 G/M/C/W inputs and rejects markup or bad addresses", () => {
    assert.equal(
      validUpsertBeneficiaryInput({
        id: "11111111-1111-4111-8111-111111111111",
        recipient_address: W_ADDR,
        label: "Testnet Muxed Vault",
        flow: "business",
      }),
      true,
    );
    assert.equal(
      validUpsertBeneficiaryInput({
        id: "11111111-1111-4111-8111-111111111111",
        recipient_address: "not-a-strkey",
        label: "Bad",
        flow: "personal",
      }),
      false,
    );
    assert.equal(
      validUpsertBeneficiaryInput({
        id: "11111111-1111-4111-8111-111111111111",
        recipient_address: OWNER,
        label: "<script>alert(1)</script>",
        flow: "personal",
      }),
      false,
    );
  });

  test("rejects directory payloads claiming identity verification or execution authority", () => {
    const valid = {
      schema_version: 1,
      network: "testnet",
      source: "neon-account-beneficiaries",
      account_address: OWNER,
      identity_verified: false,
      payment_execution_enabled: false,
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          recipient_address: W_ADDR,
          recipient_kind: "muxed-contract",
          label: "Treasury W",
          flow: "business",
          created_at_unix: 1795000000,
          updated_at_unix: 1795000000,
        },
      ],
    };
    assert.equal(validBeneficiaryDirectory(valid, OWNER), true);
    assert.equal(
      validBeneficiaryDirectory({ ...valid, identity_verified: true }, OWNER),
      false,
    );
    assert.equal(
      validBeneficiaryDirectory({ ...valid, payment_execution_enabled: true }, OWNER),
      false,
    );
  });
});
