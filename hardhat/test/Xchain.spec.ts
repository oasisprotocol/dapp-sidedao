import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256 } from "ethers";

import { HeaderCache } from "../src/contracts";
import { chain_info, getBlockHeaderRLP, xchainRPC } from "@oasisprotocol/side-dao-contracts";

describe("Cross-chain", function () {
    let headerCache: HeaderCache;

    before(async () => {
        const factory = await ethers.getContractFactory('HeaderCache');
        headerCache = await factory.deploy();
    });

    it('Header Serialization', async () => {
        for( const k of Object.keys(chain_info) )
        {
            const chainId = Number(k);
            const chain = chain_info[chainId];

            if( chain.cannotMakeStorageProofs ) {
                continue;
            }

            const rpc = xchainRPC(chainId);

            const block = await rpc.getBlock('latest', false);
            expect(block).to.not.be.null;

            // Verify the RLP encoded block header matches
            const headerRlp = await getBlockHeaderRLP(rpc, block!.hash!);
            const headerHash = keccak256(headerRlp)
            expect(headerHash).eq(block!.hash);

            // Verify header can be decoded by contract
            const header = await headerCache.extractHeader(headerRlp);
            expect(Number(header.blockTimestamp)).eq(block!.timestamp);

            // Add header to on-chain header cache
            const tx = await headerCache.add(headerRlp);
            await tx.wait();

            // Retrieve header from on-chain header cache
            const info = await headerCache.get(headerHash);
            expect(Number(info.blockTimestamp)).eq(Number(header.blockTimestamp));
        }
    });
});
