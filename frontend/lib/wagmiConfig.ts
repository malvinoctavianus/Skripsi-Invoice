import { http, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});
