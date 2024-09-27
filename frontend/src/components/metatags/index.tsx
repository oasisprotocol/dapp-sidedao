import { ReactNode } from 'react'
import { appDescription, appRootUrl } from '../../constants/config'

export const defaultMetatags: ReactNode[] = [
  <meta name="twitter:card" content="summary_large_image" />,
  <meta name="twitter:description" content={appDescription} />,
  <meta property="og:description" content={appDescription} />,
  <meta name="twitter:image" content={`${appRootUrl}/thumbnail.png`} />,
  <meta property="og:image" content={`${appRootUrl}/thumbnail.png`} />,
]
