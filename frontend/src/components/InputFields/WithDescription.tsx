import { FC, PropsWithChildren } from 'react'
import { InputFieldControls } from './useInputField'
import classes from './index.module.css'

export const WithDescription: FC<
  PropsWithChildren<{ field: Pick<InputFieldControls<any>, 'description'> }>
> = props => {
  const { field, children } = props
  const { description } = field
  return !!description ? (
    <label>
      <div className={classes.fieldDescription}>{description}</div>
      {children}
    </label>
  ) : (
    children
  )
}
