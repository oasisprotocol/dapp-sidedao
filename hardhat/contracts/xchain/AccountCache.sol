// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { HeaderCache } from './HeaderCache.sol';
import { MerklePatriciaProofVerifier, RLPReader } from "./lib/MerklePatriciaProofVerifier.sol";

contract AccountCache {
    struct Account {
        uint256 nonce;
        uint256 balance;
        bytes32 storageRoot;
        bytes32 codeHash;
    }

    /// Account not found in the cache for that block!
    error AccountNotFound(bytes32 headerHash, address accountAddress);

    mapping(bytes32 => mapping(address => Account)) private cachedAccounts;

    HeaderCache public headerCache;

    constructor (HeaderCache in_headerCache)
    {
        headerCache = in_headerCache;
    }

    function exists (bytes32 blockHash, address accountAddress)
        public view
        returns (bool)
    {
        return cachedAccounts[blockHash][accountAddress].storageRoot != bytes32(0);
    }

    function get (bytes32 blockHash, address accountAddress)
        public view
        returns (Account memory account)
    {
        account = cachedAccounts[blockHash][accountAddress];

        if( account.storageRoot == bytes32(0) )
        {
            revert AccountNotFound(blockHash, accountAddress);
        }
    }

    function verifyAccount (
        bytes32 stateRoot,
        address accountAddress,
        bytes memory rlpAccountProof
    )
        public pure
        returns (Account memory account)
    {
        bytes memory accountDetailsBytes = MerklePatriciaProofVerifier.extractProofValue(
            stateRoot,
            abi.encodePacked(keccak256(abi.encodePacked(accountAddress))),
            RLPReader.toList(RLPReader.toRlpItem(rlpAccountProof)));

        RLPReader.RLPItem[] memory accountDetails = RLPReader.toList(RLPReader.toRlpItem(accountDetailsBytes));

        account.nonce = RLPReader.toUint(accountDetails[0]);
        account.balance = RLPReader.toUint(accountDetails[1]);
        account.storageRoot = RLPReader.toBytes32(accountDetails[2]);
        account.codeHash = RLPReader.toBytes32(accountDetails[3]);
    }

    function add (
        bytes32 blockHash,
        address accountAddress,
        bytes memory rlpAccountProof
    )
        public
        returns (Account memory account)
    {
        HeaderCache.Header memory header = headerCache.get(blockHash);

        if( ! exists(blockHash, accountAddress) )
        {
            account = verifyAccount(header.stateRoot, accountAddress, rlpAccountProof);

            cachedAccounts[blockHash][accountAddress] = account;
        }
        else {
            account = get(blockHash, accountAddress);
        }
    }
}
