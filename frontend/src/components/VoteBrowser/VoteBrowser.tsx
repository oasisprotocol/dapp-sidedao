import { FC } from 'react'
import { ListOfChoices, ListOfVotes } from '../../types'
import { useVoteBrowserData } from './useVoteBrowserData'
import { InputFieldGroup } from '../InputFields'
import { HighlightedText } from '../HighlightedText'
import classes from './index.module.css'
import { useEthereum } from '../../hooks/useEthereum'

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
                  <td className={mine ? classes.myVote : undefined} title={'This is my vote'}>
                    <HighlightedText text={voter} patterns={searchPatterns} />
                    {mine && ' 🛈'}
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
            <a title={'Go to first page'} onClick={goToFirstPage}>
              &lt;&lt;
            </a>
            <a title={'Go to previous page'} onClick={goToPrevPage}>
              &lt;
            </a>
            <span>
              {pageNumber} of {numberOfPages}
            </span>
            <a title={'Go to next page'} onClick={goToNextPage}>
              &gt;
            </a>
            <a title={'Go to last page'} onClick={goToLastPage}>
              &gt;&gt;
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
