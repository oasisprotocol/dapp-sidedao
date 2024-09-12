import { createContext, FC, PropsWithChildren, useContext, useState } from 'react'

interface CardState {
  knownMine: string[]
  knownOther: string[]
}

interface CardProviderContext {
  readonly state: CardState
  registerOwnership: (pollId: string, mine: boolean) => void
}

const CardContext = createContext<CardProviderContext>({} as CardProviderContext)

const ownership = new Map<string, boolean>()

export const CardContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [myIDList, setMyIDList] = useState<string[]>([])
  const [otherIDList, setOtherIDList] = useState<string[]>([])

  const registerOwnership = (pollId: string, mine: boolean) => {
    if (!ownership.has(pollId) || ownership.get(pollId) !== mine) {
      // console.log('Change:', pollId, 'is mine?', mine)
      ownership.set(pollId, mine)
      setMyIDList(
        Array.from(ownership.entries())
          .filter(([_, value]) => value)
          .map(([key, _]) => key),
      )
      setOtherIDList(
        Array.from(ownership.entries())
          .filter(([_, value]) => !value)
          .map(([key, _]) => key),
      )
    }
  }

  // TODO: reset ownership info on user change
  const context: CardProviderContext = {
    state: {
      knownMine: myIDList,
      knownOther: otherIDList,
    },
    registerOwnership,
  }

  return <CardContext.Provider value={context}>{children}</CardContext.Provider>
}

export const useCardContext = () => {
  const value = useContext(CardContext)
  if (Object.keys(value).length === 0) {
    throw new Error('[useCardContext] Component not wrapped within a Provider')
  }

  return value
}
