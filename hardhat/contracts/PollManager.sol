// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";

import { IPollManager } from "../interfaces/IPollManager.sol";
import { IPollACL } from "../interfaces/IPollACL.sol";
import { IPollManagerACL } from "../interfaces/IPollManagerACL.sol";
import { IGaslessVoter } from "../interfaces/IGaslessVoter.sol";

contract PollManager is IERC165, IPollManager {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    uint256 public constant MAX_CHOICES = 8;

    uint8 constant FLAG_ACTIVE = 1<<0;
    uint8 constant FLAG_PUBLISH_VOTERS = 1<<1;
    uint8 constant FLAG_PUBLISH_VOTES = 1<<2;
    uint8 constant FLAG_HIDDEN = 1<<3;
    uint8 constant FLAG_WEIGHT_LOG10 = 1<<4;
    uint8 constant FLAG_WEIGHT_ONE = 1<<5;

    // ------------------------------------------------------------------------
    // ERRORS

    // Errors relating to the creation of polls
    error Create_NotAllowed();
    error Create_AlreadyExists();
    error Create_NoChoices();
    error Create_InvalidACL();
    error Create_TooManyChoices();

    // Errors relating to voting on polls
    error Vote_NotAllowed();
    error Vote_NotActive();
    error Vote_UnknownChoice();

    // Errors relating to the closing of polls
    error Close_NotAllowed();
    error Close_NotActive();

    // Misc. errors relating to info about polls
    error Poll_NotPublishingVotes();
    error Poll_NotPublishingVoters();
    error Poll_StillActive();
    error Poll_NotActive();


    // ------------------------------------------------------------------------
    // EVENTS

    event ProposalCreated(bytes32 id);

    event ProposalClosed(bytes32 indexed id, uint256 topChoice);


    // ------------------------------------------------------------------------
    // DATA STRUCTURES

    struct ProposalParams {
        uint8 numChoices;
        uint8 flags;            // bit flag of FLAG_ vars
        uint32 closeTimestamp;  // approx year 2106
        IPollACL acl;
        bytes metadata;
    }

    struct Proposal {
        uint8 topChoice;
        ProposalParams params;
    }

    struct ProposalWithId {
        bytes32 id;
        Proposal proposal;
    }

    struct Choice {
        uint weight;
        uint8 choice;
    }

    struct Ballot {
        /// voter -> choice id
        mapping(address => Choice) votes;
        /// list of voters that submitted their vote
        address[] voters;
        /// Obscure votes using this xor mask
        uint256 xorMask;
        /// choice id -> vote count
        uint256[MAX_CHOICES] voteCounts;
        uint totalVotes;
    }


    // ------------------------------------------------------------------------
    // CONFIDENTIAL / INTERNAL STORAGE

    mapping(bytes32 => Ballot) private s_ballots;

    IPollManagerACL private immutable s_managerACL;

    mapping(bytes32 => uint256) private s_pastProposalsIndex;


    // ------------------------------------------------------------------------
    // PUBLIC STORAGE

    IGaslessVoter public immutable GASLESS_VOTER;

    mapping(bytes32 => Proposal) public PROPOSALS;

    EnumerableSet.Bytes32Set private ACTIVE_PROPOSALS;

    bytes32[] public PAST_PROPOSALS;


    // ------------------------------------------------------------------------

    constructor(IPollManagerACL in_managerACL, IGaslessVoter in_gaslessVoter)
    {
        s_managerACL = in_managerACL;

        GASLESS_VOTER = in_gaslessVoter;
    }

    // IERC165
    function supportsInterface(bytes4 interfaceId)
        external pure
        returns (bool)
    {
        return interfaceId == type(IERC165).interfaceId
            || interfaceId == type(IPollManager).interfaceId;
    }

    function getACL()
        external view
        returns (IPollManagerACL)
    {
        return s_managerACL;
    }

    function getPollACL(bytes32 proposalId)
        external view
        returns (IPollACL)
    {
        return PROPOSALS[proposalId].params.acl;
    }

    function create(
        ProposalParams calldata in_params,
        bytes calldata in_aclData
    )
        external payable
        returns (bytes32)
    {
        return createFor(in_params, in_aclData, msg.sender);
    }

    function createFor(
        ProposalParams memory in_params,
        bytes calldata in_aclData,
        address in_owner
    )
        public payable
        returns (bytes32)
    {
        if (!s_managerACL.canCreatePoll(address(this), in_owner)) {
            revert Create_NotAllowed();
        }

        // User-provided ACL must adhere to IPollACL interface
        if( ! in_params.acl.supportsInterface(type(IPollACL).interfaceId) ) {
            revert Create_InvalidACL();
        }

        in_params.flags |= FLAG_ACTIVE;

        if (in_params.numChoices == 0) {
            revert Create_NoChoices();
        }

        if (in_params.numChoices > MAX_CHOICES) {
            revert Create_TooManyChoices();
        }

        bytes32 proposalId = getProposalId(in_params, in_aclData, in_owner);

        if (PROPOSALS[proposalId].params.numChoices != 0) {
            revert Create_AlreadyExists();
        }

        PROPOSALS[proposalId] = Proposal({
            params: in_params,
            topChoice:0
        });

        Ballot storage ballot = s_ballots[proposalId];

        uint xorMask = ballot.xorMask = uint256(keccak256(abi.encodePacked(address(this), in_owner)));

        for (uint256 i; i < in_params.numChoices; ++i)
        {
            ballot.voteCounts[i] = xorMask;
        }

        GASLESS_VOTER.onPollCreated{value:msg.value}(proposalId, in_owner);

        if( in_params.acl != IPollACL(address(0)) )
        {
            in_params.acl.onPollCreated(proposalId, in_owner, in_aclData);
        }

        // Hidden proposals will not show in the public list
        if( 0 == (in_params.flags & FLAG_HIDDEN) )
        {
            ACTIVE_PROPOSALS.add(proposalId);

            emit ProposalCreated(proposalId);
        }

        return proposalId;
    }

    function bool2int(bool a)
        internal pure
        returns (uint b)
    {
        assembly {
            b := a
        }
    }

    function canVoteOnPoll(bytes32 in_proposalId, address in_voter, bytes calldata in_data)
        public view
        returns (uint out_weight)
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];

        // Proposal must be active to vote
        if ( 0 == (proposal.params.flags & FLAG_ACTIVE) ) {
            revert Vote_NotActive();
        }

        // No votes allowed after it's closed
        uint closeTimestamp = proposal.params.closeTimestamp;
        if( closeTimestamp != 0 ) {
            if( block.timestamp >= closeTimestamp ) {
                revert Vote_NotActive();
            }
        }

        out_weight = proposal.params.acl.canVoteOnPoll(address(this), in_proposalId, in_voter, in_data);
        if( out_weight == 0 ) {
            revert Vote_NotAllowed();
        }
    }

    function log10(uint x) internal pure returns (uint result)
    {
        // XXX: is it necessary to make it constant time?
        unchecked {
            while (x >= 10) {
                x /= 10;
                result++;
            }
        }
    }

    function internal_castVote(
        address in_voter,
        bytes32 in_proposalId,
        uint8 in_choiceId,
        bytes calldata in_data
    )
        internal
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];
        uint8 flags = proposal.params.flags;

        // Cannot vote if we have 0 weight. Prevents internal confusion with weight=0
        if( 0 == (flags & FLAG_ACTIVE) )
        {
            revert Vote_NotActive();
        }

        uint weight = canVoteOnPoll(in_proposalId, in_voter, in_data);

        // User is not allowed to vote if they have zero-weight
        if( weight == 0 ) {
            revert Vote_NotAllowed();
        }

        if( 0 != flags & FLAG_WEIGHT_LOG10 ) {
            weight = log10(weight);
        }
        else if( 0 != flags & FLAG_WEIGHT_ONE ) {
            weight = 1;
        }

        uint256 numChoices = proposal.params.numChoices;

        if (in_choiceId >= numChoices)
        {
            revert Vote_UnknownChoice();
        }

        Ballot storage ballot = s_ballots[in_proposalId];

        Choice storage existingVote = ballot.votes[in_voter];

        // Use the first weight that was provided
        // As varying weights mid-poll will mess up the ballot voteCounts
        uint existingWeight = existingVote.weight;
        weight = (bool2int(existingWeight == 0) * weight)
               + (bool2int(existingWeight != 0) * existingWeight);

        // Cycle the xor mask on each vote
        // Ensures storage I/O patterns are uniform across all votes
        uint xorMask = ballot.xorMask;
        uint nextXorMask = uint256(keccak256(abi.encodePacked(xorMask)));
        uint existingChoice = existingVote.choice;
        for (uint256 i; i < numChoices; ++i)
        {
            // Modify the vote count in constant time
            uint z = ballot.voteCounts[i];
            uint a = bool2int(i == existingChoice) * existingWeight;
            uint b = bool2int(i == in_choiceId) * weight;
            z ^= xorMask;
            z -= a;
            z += b;
            z ^= nextXorMask;
            ballot.voteCounts[i] = z;
        }

        ballot.xorMask = nextXorMask;

        // Note: this code path reveals (via gas) whether the vote is the first
        //       or if it's somebody changing their vote
        if( 0 == existingWeight )
        {
            ballot.totalVotes += existingWeight;

            if ( 0 != (flags & (FLAG_PUBLISH_VOTERS|FLAG_PUBLISH_VOTES)) )
            {
                ballot.voters.push(in_voter);
            }
        }

        existingVote.weight = weight;
        existingVote.choice = in_choiceId;
    }

    /**
     * Allow the designated proxy voting contract to vote on behalf of a voter
     */
    function proxy(
        address in_voter,
        bytes32 in_proposalId,
        uint8 in_choiceId,
        bytes calldata in_data
    )
        external
    {
        if( msg.sender != address(GASLESS_VOTER) ) {
            revert Vote_NotAllowed();
        }

        internal_castVote(in_voter, in_proposalId, in_choiceId, in_data);
    }

    function vote(bytes32 in_proposalId, uint8 in_choiceId, bytes calldata in_data)
        external
    {
        internal_castVote(msg.sender, in_proposalId, in_choiceId, in_data);
    }

    /// Paginated access to the active proposals
    /// Pagination is in reverse order, so most recent first
    /// Hidden proposals are not included in this list
    function getActiveProposals(uint256 in_offset, uint256 in_limit)
        external view
        returns (uint out_count, ProposalWithId[] memory out_proposals)
    {
        out_count = ACTIVE_PROPOSALS.length();

        if ((in_offset + in_limit) > out_count)
        {
            in_limit = out_count - in_offset;
        }

        out_proposals = new ProposalWithId[](in_limit);

        for (uint256 i; i < in_limit; ++i)
        {
            bytes32 id = ACTIVE_PROPOSALS.at(out_count - 1 - in_offset - i);

            out_proposals[i] = ProposalWithId({
                id: id,
                proposal: PROPOSALS[id]
            });
        }
    }

    /// Past proposals are in reverse order
    /// So the most recently closed proposal pops up in the list after closure
    /// Hidden proposals are not included in this list
    function getPastProposals(uint256 in_offset, uint256 in_limit)
        external view
        returns (uint out_count, ProposalWithId[] memory out_proposals)
    {
        out_count = PAST_PROPOSALS.length;

        if ((in_offset + in_limit) > out_count)
        {
            in_limit = out_count - in_offset;
        }

        out_proposals = new ProposalWithId[](in_limit);

        for (uint256 i; i < in_limit; ++i)
        {
            bytes32 id = PAST_PROPOSALS[out_count - 1 - in_offset - i];

            out_proposals[i] = ProposalWithId({
                id: id,
                proposal: PROPOSALS[id]
            });
        }
    }

    /// Permanently delete a proposal and associated data
    /// If the proposal isn't closed, it will be closed first
    function close(bytes32 in_proposalId)
        public
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];
        uint8 flags = proposal.params.flags;
        if ( 0 == (flags & FLAG_ACTIVE) ) {
            revert Close_NotActive();
        }

        // If no timestamp is specified, only poll creator can close (at any time)
        uint closeTimestamp = proposal.params.closeTimestamp;
        if( closeTimestamp == 0 )
        {
            if (!proposal.params.acl.canManagePoll(address(this), in_proposalId, msg.sender)) {
                revert Close_NotAllowed();
            }
        }
        else {
            // Otherwise, anybody can close, $now >= closeTimestamp
            if( block.timestamp < closeTimestamp ) {
                revert Close_NotAllowed();
            }
        }

        Ballot storage ballot = s_ballots[in_proposalId];

        uint256 topChoice;
        uint256 topChoiceCount;
        uint256 xorMask = ballot.xorMask;
        for (uint8 i; i < proposal.params.numChoices; ++i)
        {
            uint256 choiceVoteCount = ballot.voteCounts[i] ^ xorMask;
            if (choiceVoteCount > topChoiceCount)
            {
                topChoice = i;
                topChoiceCount = choiceVoteCount;
            }
        }

        proposal.topChoice = uint8(topChoice);
        proposal.params.flags = flags & ~FLAG_ACTIVE;

        // If proposal isn't hidden, remove from active list, to past list + emit events
        if( 0 == flags & FLAG_HIDDEN )
        {
            ACTIVE_PROPOSALS.remove(in_proposalId);
            s_pastProposalsIndex[in_proposalId] = PAST_PROPOSALS.length;
            PAST_PROPOSALS.push(in_proposalId);
            emit ProposalClosed(in_proposalId, topChoice);
        }

        proposal.params.acl.onPollClosed(in_proposalId);

        GASLESS_VOTER.onPollClosed(in_proposalId);
    }

    error Destroy_NotFound();

    function destroy(bytes32 in_proposalId)
        external
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];
        if ( 0 == proposal.params.numChoices ) {
            revert Destroy_NotFound();
        }

        uint8 flags = proposal.params.flags;

        if( 0 == flags & FLAG_ACTIVE )
        {
            close(in_proposalId);
        }

        delete PROPOSALS[in_proposalId];

        Ballot storage ballot = s_ballots[in_proposalId];

        for( uint i = 0; i < ballot.voters.length; i++ )
        {
            delete ballot.votes[ballot.voters[i]];
        }

        delete s_ballots[in_proposalId];

        // Remove proposal from past proposals list
        if( 0 != (flags & FLAG_HIDDEN) )
        {
            uint idx = s_pastProposalsIndex[in_proposalId];
            uint cnt = PAST_PROPOSALS.length;
            if( idx != (cnt - 1) ) {
                PAST_PROPOSALS[idx] = PAST_PROPOSALS[cnt-1];
            }
            PAST_PROPOSALS.pop();
            delete s_pastProposalsIndex[in_proposalId];
        }
    }

    function getVoteCounts(bytes32 in_proposalId)
        external view
        returns (uint256[] memory)
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];

        Ballot storage ballot = s_ballots[in_proposalId];

        // Cannot get vote counts while poll is still active
        if ( 0 != (proposal.params.flags & FLAG_ACTIVE) ) {
            revert Poll_StillActive();
        }

        uint256[] memory unmaskedVoteCounts = new uint256[](MAX_CHOICES);
        uint256 xorMask = ballot.xorMask;
        for (uint256 i; i<unmaskedVoteCounts.length; i++) {
            unmaskedVoteCounts[i] = ballot.voteCounts[i] ^ xorMask;
        }
        return unmaskedVoteCounts;
    }

    function internal_paginateBallot(bytes32 in_proposalId, uint in_offset, uint in_limit)
        internal view
        returns (uint out_count, uint out_limit, Ballot storage out_ballot)
    {
        Proposal storage proposal = PROPOSALS[in_proposalId];
        out_ballot = s_ballots[in_proposalId];

        uint8 flags = proposal.params.flags;

        if ( 0 == (flags & FLAG_PUBLISH_VOTES) ) {
            revert Poll_NotPublishingVotes();
        }

        if ( 0 != (flags & FLAG_ACTIVE) ) {
            revert Poll_StillActive();
        }

        out_count = out_ballot.voters.length;

        if ((in_offset + in_limit) > out_count)
        {
            out_limit = out_count - in_offset;
        }
        else {
            out_limit = out_limit;
        }
    }

    function getVotes(bytes32 in_proposalId, uint in_offset, uint in_limit)
        external view
        returns (
            uint out_count,
            address[] memory out_voters,
            Choice[] memory out_choices
        )
    {
        Ballot storage ballot;

        (out_count, in_limit, ballot) = internal_paginateBallot(in_proposalId, in_offset, in_limit);

        out_choices = new Choice[](in_limit);
        out_voters = new address[](in_limit);

        for (uint256 i; i < in_limit; i++)
        {
            address voter = ballot.voters[in_offset + i];
            out_choices[i] = ballot.votes[voter];
            out_voters[i] = voter;
        }
    }

    function getVoters(bytes32 in_proposalId, uint in_offset, uint in_limit)
        external view
        returns (
            uint out_count,
            address[] memory out_voters
        )
    {
        Ballot storage ballot;

        (out_count, in_limit, ballot) = internal_paginateBallot(in_proposalId, in_offset, in_limit);

        out_voters = new address[](in_limit);

        for (uint256 i; i < in_limit; i++)
        {
            address voter = ballot.voters[in_offset + i];
            out_voters[i] = voter;
        }
    }

    function ballotIsActive(bytes32 in_id)
        external view
        returns (bool)
    {
        return PROPOSALS[in_id].params.flags & FLAG_ACTIVE != 0;
    }

    function getProposalId(
        ProposalParams memory in_params,
        bytes calldata in_aclData,
        address in_owner
    )
        public pure
        returns (bytes32)
    {
        return keccak256(abi.encode(in_owner, in_params, in_aclData));
    }
}
