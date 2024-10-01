import { FC } from 'react'
import { ListOfVoters } from '../../types'
import { useVoterBrowserData } from './useVoterBrowserData'
import { InputFieldGroup } from '../InputFields'
import { HighlightedText } from '../HighlightedText'
import classes from './index.module.css'
import { useEthereum } from '../../hooks/useEthereum'

const VOTES_ON_PAGE = 10

export const VoterBrowser: FC<{ voters: ListOfVoters }> = ({ voters }) => {
  const { userAddress } = useEthereum()
  const {
    inputFields,
    searchPatterns,
    pageNumber,
    numberOfPages,
    displayedVoters,
    goToPrevPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    hasFilters,
    clearFilters,
  } = useVoterBrowserData(voters, VOTES_ON_PAGE)

  return (
    <div className={classes.voterBrowser}>
      <h4>Voters:</h4>
      <InputFieldGroup fields={inputFields} />

      <div className={classes.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {displayedVoters.map(voter => {
              const mine = voter.toLowerCase() === userAddress.toLowerCase()
              return (
                <tr key={voter}>
                  <td
                    className={mine && displayedVoters.length > 1 ? classes.myVote : undefined}
                    title={'This is my vote'}
                  >
                    <HighlightedText text={voter} patterns={searchPatterns} />
                    {mine && (
                      <>
                        <span className={classes.myVote}>🛈</span>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!displayedVoters.length && (
          <div className={classes.noDataFound}>
            <span>No voters found.</span>
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
