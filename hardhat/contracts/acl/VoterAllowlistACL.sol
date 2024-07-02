// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { IPollACL } from "../../interfaces/IPollACL.sol";

/// Whitelist of voters
contract VoterAllowListACL is IPollACL
{
    /// User that's allowed to modify the voter list
    mapping (bytes32 => address) pollManager;

    /// Addresses that are allowed to vote
    mapping (bytes32 => mapping(address => bool)) eligibleVoters;

    /// List of addresses in the set that are allowed to vote
    mapping (bytes32 => address[]) eligibleVotersList;

    function supportsInterface(bytes4 interfaceId)
        public pure
        returns(bool)
    {
        return interfaceId == type(IPollACL).interfaceId;
    }

    function id(address in_dao, bytes32 in_proposalId)
        internal pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(in_dao, in_proposalId));
    }

    /// Initialize ACL for the poll with the list of voters
    function onPollCreated(bytes32 in_proposalId, address in_creator, bytes calldata in_data)
        external
    {
        address[] memory voters = abi.decode(in_data, (address[]));

        bytes32 pid = id(msg.sender, in_proposalId);

        eligibleVotersList[pid] = voters;

        for( uint i = 0; i < voters.length; i++ )
        {
            eligibleVoters[pid][voters[i]] = true;
        }

        pollManager[pid] = in_creator;
    }

    /// Clean up storage when the poll is closed
    function onPollClosed(bytes32 in_proposalId)
        external
    {
        bytes32 pid = id(msg.sender, in_proposalId);

        address[] memory voters = eligibleVotersList[pid];

        for( uint i = 0; i < voters.length; i++ )
        {
            delete eligibleVoters[pid][voters[i]];
        }

        delete eligibleVotersList[pid];
    }

    /// Can user modify the allow list for voters
    function canManagePoll(address in_dao, bytes32 in_proposalId, address in_user)
        external view
        returns(bool)
    {
        bytes32 pid = id(in_dao, in_proposalId);

        return pollManager[pid] == in_user;
    }

    /// Is user allowed to vote on the poll?
    function canVoteOnPoll(address in_dao, bytes32 in_proposalId, address in_user, bytes calldata)
        external view
        returns(uint)
    {
        bytes32 pid = id(in_dao, in_proposalId);

        return eligibleVoters[pid][in_user] == true ? 1 : 0;
    }
}
