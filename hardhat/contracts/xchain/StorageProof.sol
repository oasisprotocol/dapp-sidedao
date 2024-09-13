// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { MerklePatriciaProofVerifier, RLPReader } from "./lib/MerklePatriciaProofVerifier.sol";

import { AccountCache } from './AccountCache.sol';

contract StorageProof {
    AccountCache public accountCache;

    constructor (AccountCache in_accountCache)
    {
        accountCache = in_accountCache;
    }

    function verifyStorage(
        bytes32 blockHash,
        address accountAddress,
        uint256 slot,
        address key,
        bytes memory rlpStorageProof
    )
        external view
        returns (bytes32 data)
    {
        // Address must convert via uint to bytes32 for correct padding style
        return verifyStorage(blockHash, accountAddress, slot, bytes32(uint256(uint160(bytes20(key)))), rlpStorageProof);
    }

    function verifyStorage(
        bytes32 blockHash,
        address accountAddress,
        uint256 slot,
        bytes32 key,
        bytes memory rlpStorageProof
    )
        public view
        returns (bytes32 data)
    {
        AccountCache.Account memory account = accountCache.get(blockHash, accountAddress);

        bytes32 storageKey = keccak256(abi.encodePacked(key, slot));

        bytes32 hashedStorageKey = keccak256(abi.encodePacked(storageKey));

        bytes memory accountDetailsBytes = MerklePatriciaProofVerifier.extractProofValue(
            account.storageRoot,
            abi.encodePacked(hashedStorageKey),
            RLPReader.toList(RLPReader.toRlpItem(rlpStorageProof)));

        return RLPReader.toBytes32(RLPReader.toRlpItem(accountDetailsBytes));
    }
}
