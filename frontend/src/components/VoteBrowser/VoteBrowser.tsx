import { FC } from 'react'
import { ListOfChoices, ListOfVotes } from '../../types'
import { useVoteBrowserData } from './useVoteBrowserData'
import { InputFieldGroup } from '../InputFields'
import { HighlightedText } from '../HighlightedText'
import classes from './index.module.css'
import { useEthereum } from '../../hooks/useEthereum'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

const VOTES_ON_PAGE = 10

export const VoteBrowser: FC<{ choices: ListOfChoices; votes: ListOfVotes; totalVotes: bigint }> = ({
  choices,
  votes,
  totalVotes,
}) => {
  const { userAddress } = useEthereum()
  const {
    inputFields,
    searchPatterns,
    pageNumber,
    numberOfPages,
    displayedVotes,
    goToPrevPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    hasFilters,
    clearFilters,
  } = useVoteBrowserData(choices, votes, totalVotes, VOTES_ON_PAGE)

  console.log('user address is', userAddress)

  return (
    <div className={classes.voteBrowser}>
      <h4>Individual votes:</h4>
      <InputFieldGroup fields={inputFields} />

      <div className={classes.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>Weight</th>
              <th>Vote</th>
            </tr>
          </thead>
          <tbody>
            {displayedVotes.map(vote => {
              const { voter, weight, choiceString } = vote
              const mine = voter.toLowerCase() === userAddress.toLowerCase()
              return (
                <tr key={voter}>
                  <td className={mine ? classes.myVote : undefined}>
                    <MaybeWithTooltip overlay={mine ? 'This is my vote' : undefined}>
                      <span>
                        <HighlightedText text={voter} patterns={searchPatterns} />
                        {mine && ' 🛈'}
                      </span>
                    </MaybeWithTooltip>
                  </td>
                  <td>{weight.toString()}</td>
                  <td>
                    <i>{choiceString}</i>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!displayedVotes.length && (
          <div className={classes.noDataFound}>
            <span>No votes found.</span>
            {hasFilters && <a onClick={clearFilters}>Clear filters</a>}
          </div>
        )}
        {numberOfPages > 1 && (
          <div className={classes.pagination}>
            <MaybeWithTooltip overlay={'Fo to first page'}>
              <a onClick={goToFirstPage}>&lt;&lt;</a>
            </MaybeWithTooltip>
            <MaybeWithTooltip overlay={'Go to previous page'}>
              <a onClick={goToPrevPage}>&lt;</a>
            </MaybeWithTooltip>
            <span>
              {pageNumber} of {numberOfPages}
            </span>
            <MaybeWithTooltip overlay={'Go to next page'}>
              <a onClick={goToNextPage}>&gt;</a>
            </MaybeWithTooltip>
            <MaybeWithTooltip overlay={'Go to last page'}>
              <a onClick={goToLastPage}>&gt;&gt;</a>
            </MaybeWithTooltip>
          </div>
        )}
      </div>
    </div>
  )
}
