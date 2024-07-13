import { FC, PropsWithChildren } from 'react';
import classes from './index.module.css'
import { LogoIcon } from '../icons/LogoIcon'
import { ConnectWallet } from '../ConnectWallet'
import { useAppState } from '../../hooks/useAppState'
import { StringUtils } from '../../utils/string.utils'
import { useInView } from 'react-intersection-observer'
import { LayoutBase } from '../LayoutBase'
import { Button } from '../Button';
import { Alert } from '../Alert';
import { Link } from 'react-router-dom';

type LayoutVariation = "landing" | "dashboard" | "light" | "dark"

const layoutClasses: Partial<Record<LayoutVariation, string>> = {
  landing: 'landing-layout',
  dashboard: "dashboard-layout",
  dark: "dark-layout",
}

const logoColor: Record<LayoutVariation, string> = {
  landing: "var(--navy-blue)",
  dark: "white",
  dashboard: "var(--navy-blue)",
  light: "var(--navy-blue)",
}

export const Layout: FC<PropsWithChildren & {variation: LayoutVariation}> = ({variation,children}) => {
  const {
    state: {
      // isInitialLoading,
      appError,
      isMobileScreen,
      // isUpcomingVote
    },
    clearAppError,
  } = useAppState()

  const { ref, inView } = useInView({
    threshold: 1,
    initialInView: true,
  })

  return (
    <>
      {isMobileScreen && <div className={classes.inViewPlaceholder} ref={ref} />}
      <LayoutBase extraClasses={layoutClasses[variation]}>
        <header
          className={StringUtils.clsx(
            classes.header,
            isMobileScreen && !inView ? classes.headerSticky : undefined,
          )}
        >
          <Link to={'/'}>
            <LogoIcon className={classes.logo} color={logoColor[variation]} />
          </Link>
          <h1>Oasis</h1>
          {
            // !isInitialLoading && !isUpcomingVote &&
            <ConnectWallet mobileSticky={isMobileScreen && !inView} />
          }
        </header>
        <section>
        {appError && (
            <Alert
              type="error"
              actions={
                <Button variant="text" onClick={clearAppError}>
                  &lt; Go back&nbsp;
                </Button>
              }
            >
              {StringUtils.truncate(appError)}
            </Alert>
          )}
          {/*{isInitialLoading && (*/}
          {/*  <Alert headerText="Please wait" type="loading" actions={<span>Fetching poll...</span>} />*/}
          {/*)}*/}
          {!appError && children}
          {/*{!isInitialLoading && !appError && isUpcomingVote && <UpcomingVotePage />}*/}
        </section>
      </LayoutBase>
    </>
  )
}
