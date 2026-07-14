import { encodePacked, keccak256 } from "viem";

/**
 * Must exactly mirror UserRegistry.sol's expected hash:
 * keccak256(abi.encodePacked(wallet, password))
 *
 * Plaintext passwords never leave the browser - only this hash is sent
 * on-chain, whether in a read-only login check or a changePassword transaction.
 */
export function hashPassword(wallet: `0x${string}`, password: string): `0x${string}` {
  return keccak256(encodePacked(["address", "string"], [wallet, password]));
}
