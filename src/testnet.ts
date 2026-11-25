/**
 * Stellar Testnet contracts released 2026-11-24, each verified by fetching
 * the deployed WASM and comparing its sha256 (see stealthbridge-contracts
 * deployments/testnet/release-20261124.v1.json). Testnet only.
 */
export const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const TESTNET_CONTRACTS = Object.freeze({
  smartAccountFactory: "CAUJ5FMGDISNYEU7T6EQDYRLFF7CVC5F2PXJVEHQHY7HM275I2X6ITH6",
  smartAccountWasmSha256: "b28681dab8e85c1082904d67bb33589ed97be91e15dce95d693fc688d86cddc8",
  governanceGate: "CAFL7OVK2HN3VFZKUPGMVJGE5STWA2XKM2EUNBO76FH6KGRJJKD46DLA",
  settlementAdapter: "CALGHOJZA7TG2JLWX3VG3NK4HP5A77WZHX6B5U7BG3OD5TJYAGT6GY4K",
  corridorRegistry: "CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB",
  policyRegistry: "CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5",
  feeVault: "CBJWFVGD3D2QEFTICRT2GMQRANVR32735OSZ5F77MLBCURDROYGEL362",
  /** Paused: its only verification key was forgeable and has been revoked. */
  privacyVerifierPaused: "CBFFDYLDWCN2D7U3MMVX75TFE5MHZX6OYL66HHWZXEGOCL5YBTZCXAOV",
} as const);
