import { FC } from 'react';
import { JazzIcon } from '../JazzIcon';
import classes from "./index.module.css"

export const MyPollIcon: FC<{creator: string}> = ({creator}) => (
  <div title={"This is my poll!"} className={classes.myPollIndicator}>
    <JazzIcon address={creator} size={24}  />
  </div>
)

