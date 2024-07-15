import React, { FC, useCallback } from 'react';
import { TextFieldControls } from './hooks';
import classes from "./index.module.css";
import { StringUtils } from '../../utils/string.utils';

export const TextInput: FC<TextFieldControls & {}> = (
  {
    name,
    label,
    description,
    value,
    placeholder,
    setValue,
    error,
    clearError,
  }
) => {

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    [setValue]
  )

  const field = <input
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={handleChange}
    className={classes.textValue}
  />

  const wrappedField = (
    <div className={StringUtils.clsx(classes.textValue, error ? classes.fieldWithError : "")}>
      {field}
      <div className={classes.fieldError} onClick={clearError}>
        {error}
      </div>
    </div>
  )

  return (
    <div className={classes.fieldContainer}>
      { (!!label || !!description)
        ? (
          <label>
            <div className={classes.fieldLabel}>
              {label}
            </div>
            <div className={classes.fieldDescription}>
              {description}
            </div>
            {wrappedField}
          </label>
        ) : wrappedField
      }
    </div>
  )
}