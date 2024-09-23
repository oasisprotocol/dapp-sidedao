import { FC, PropsWithChildren } from 'react'
import { InputFieldControls } from './useInputField'
import classes from './index.module.css'

export const WithLabelAndDescription: FC<
  PropsWithChildren<{ field: Pick<InputFieldControls<any>, 'label' | 'description'> }>
> = props => {
  const { field, children } = props
  const { label, description } = field
  return !!label || !!description ? (
    <label>
      <div className={classes.fieldLabel}>{label}</div>
      <div className={classes.fieldDescription}>{description}</div>
      {children}
    </label>
  ) : (
    children
  )
}
