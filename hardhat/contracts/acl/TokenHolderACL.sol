// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { IPollACL } from "../../interfaces/IPollACL.sol";

interface ITokenWithBalance {
    function balanceOf(address) external view returns (uint);
}

/// Only holder tokens (specified by creator) can vote
/// Uses balanceOf() protocol, supports ERC-20 & ERC-721 tokens
contract TokenHolderACL is IPollACL
{
    struct PollSettings {
        address owner;
        address token;
    }

    /// User that's allowed to modify the voter list
    mapping (bytes32 => PollSettings) polls;

    function supportsInterface(bytes4 interfaceId)
        public pure
        returns(bool)
    {
        return interfaceId == type(IPollACL).interfaceId;
    }

    /// Initialize ACL for the poll with the list of voters
    function onPollCreated(bytes32 in_proposalId, address in_creator, bytes calldata in_data)
        external
    {
        address token = abi.decode(in_data, (address));

        bytes32 pid = keccak256(abi.encode(msg.sender, in_proposalId));

        require( polls[pid].owner == address(0) );

        polls[pid] = PollSettings({
            owner: in_creator,
            token: token
        });
    }

    /// Clean up storage when the poll is closed
    function onPollClosed(bytes32 in_proposalId)
        external
    {
        bytes32 pid = keccak256(abi.encode(msg.sender, in_proposalId));

        delete polls[pid];
    }

    /// Can user modify the allow list for voters
    function canManagePoll(address in_dao, bytes32 in_proposalId, address in_user)
        external view
        returns(bool)
    {
        bytes32 pid = keccak256(abi.encode(in_dao, in_proposalId));

        return polls[pid].owner == in_user;
    }

    /// Does user hold a non-zero balance of the token required to vote?
    function canVoteOnPoll(address in_dao, bytes32 in_proposalId, address in_user, bytes calldata in_data)
        external view
        returns(uint)
    {
        require( in_data.length == 0, "DATA!" );

        bytes32 pid = keccak256(abi.encode(in_dao, in_proposalId));

        PollSettings storage poll = polls[pid];

        require( poll.owner != address(0), "404!" );

        ITokenWithBalance token = ITokenWithBalance(poll.token);

        return token.balanceOf(in_user);
    }
}
