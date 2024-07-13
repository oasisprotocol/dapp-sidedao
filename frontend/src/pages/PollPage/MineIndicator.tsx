import React, { FC } from 'react';
import { JazzIcon } from '../../components/JazzIcon';

const doNothing = (e: React.MouseEvent) => e.preventDefault()

export const MineIndicator: FC<{creator: string}> = ({creator}) => (
  <>
    &nbsp;
    <a href="#" title={"This is my poll!"} onClick={  doNothing } >
      <JazzIcon address={creator} size={24}  />
    </a>
  </>
)

