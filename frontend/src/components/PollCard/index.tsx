import { Proposal } from '../../types'
import { FC, useEffect } from 'react'
import { micromark } from 'micromark'
import { Link } from 'react-router-dom'
import classes from './index.module.css'
import { GasRequiredIcon } from '../icons/GasRequiredIcon'
import { NoGasRequiredIcon } from '../icons/NoGasRequiredIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { HourGlassIcon } from '../icons/HourGlassIcon'
import { StringUtils } from '../../utils/string.utils'
import { useExtendedPoll } from '../../hooks/useExtendedPoll'
import { PollAccessIndicatorWrapper } from './PollAccessIndicator'
import { getVerdict } from '../InputFields'
import { findTextMatches } from '../HighlightedText/text-matching'
import { getHighlightedTextHtml, HighlightedText } from '../HighlightedText'
import { dashboard } from '../../constants/config'

const Arrow: FC<{ className: string }> = ({ className }) => (
  <svg
    width="20"
    height="15"
    viewBox="0 0 20 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M13 0.119751L11.59 1.52975L16.17 6.11975H0V8.11975H16.17L11.58 12.7098L13 14.1198L20 7.11975L13 0.119751Z"
      fill="#0500E1"
    />
  </svg>
)

const PollStatusIndicator: FC<{ active: boolean; isPastDue: boolean }> = ({ active, isPastDue }) => {
  return active ? (
    <div
      className={StringUtils.clsx(classes.pollStatusActive, 'niceLine')}
      title={isPastDue ? 'Voting has already finished.' : 'Voting is currently active.'}
    >
      Active {isPastDue && <HourGlassIcon size={'small'} />}
    </div>
  ) : (
    <div className={classes.pollStatusCompleted} title={'Poll is closed, results are available.'}>
      Completed
    </div>
  )
}

const GaslessStatusIndicator: FC<{ possible: boolean | undefined }> = ({ possible }) =>
  possible === undefined ? (
    <SpinnerIcon size={'medium'} spinning />
  ) : possible ? (
    <NoGasRequiredIcon />
  ) : (
    <GasRequiredIcon />
  )

export const PollCard: FC<{
  proposal: Proposal
  registerOwnership: (id: string, mine: boolean) => void
  registerMatch: (searchPatterns: string[], pollId: string) => void
  hideInaccessible?: boolean
  searchPatterns: string[]
}> = ({ proposal, registerOwnership, hideInaccessible, searchPatterns, registerMatch }) => {
  const { poll, proposalId, gaslessPossible, isMine, permissions, checkPermissions, isLoading, error } =
    useExtendedPoll(proposal, {
      onDashboard: true,
    })

  useEffect(() => {
    if (proposalId && isMine !== undefined) registerOwnership(proposalId, isMine)
  }, [proposalId, isMine])

  if (!poll) return

  const {
    id: pollId,
    proposal: { active },
    ipfsParams: {
      name,
      description,
      options: { closeTimestamp },
      // acl,
    },
  } = poll

  const renderedDescription = micromark(description)

  const textMatches = searchPatterns.length
    ? findTextMatches(`${name} ${renderedDescription}`, searchPatterns)
    : []
  const hasAllMatches = textMatches.length === searchPatterns.length
  if (!hasAllMatches) return

  registerMatch(searchPatterns, pollId)

  const highlightedDescription =
    getHighlightedTextHtml({
      text: renderedDescription,
      patterns: searchPatterns,
    }) ?? ''

  if (hideInaccessible && !permissions.error && !getVerdict(permissions.canVote) && !isMine) return

  const isPastDue = !!closeTimestamp && new Date().getTime() / 1000 > closeTimestamp

  return (
    <Link to={`/polls/${pollId}`} style={{ textDecoration: 'none' }}>
      <div className={classes.pollCard}>
        <div className={classes.pollCardTop}>
          <h4 className={active ? classes.activePollTitle : undefined}>
            <span>
              <HighlightedText text={name} patterns={searchPatterns} />
            </span>
            {dashboard.showPermissions && (
              <PollAccessIndicatorWrapper
                permissions={permissions}
                isActive={active}
                retest={checkPermissions}
              />
            )}
          </h4>
                  isMine={isMine}
          <Arrow className={active ? classes.activePollArrow : classes.passivePollArrow} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
        <div className={classes.pollCardBottom}>
          <PollStatusIndicator active={active} isPastDue={isPastDue} />
          {dashboard.showGasless && <GaslessStatusIndicator possible={gaslessPossible} />}
        </div>
      </div>
    </Link>
  )
}
