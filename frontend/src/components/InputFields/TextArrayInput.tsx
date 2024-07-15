import React, { FC } from 'react';
import { TextArrayControls } from './hooks';
import classes from "./index.module.css";
import { StringUtils } from '../../utils/string.utils';

const TrashIcon: FC<{label: string, remove: () => void}> = ({label, remove}) => {
  return (
    <div title={label} className={classes.removeIcon} onClick={remove}>
      <svg width="14" height="19" viewBox="0 0 14 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 16.5C1 17.6 1.9 18.5 3 18.5H11C12.1 18.5 13 17.6 13 16.5V4.5H1V16.5ZM14 1.5H10.5L9.5 0.5H4.5L3.5 1.5H0V3.5H14V1.5Z"
          fill="#323232" />
      </svg>
    </div>
  )
}

const AddIcon: FC<{ label: string, add: () => void }> = ({ label, add }) => {
  return (
    <div className={StringUtils.clsx("niceLine", classes.addIcon)} onClick={add}>
      <svg width="28" height="25" viewBox="0 0 28 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_2028_18630)">
          <path
            d="M12 2.5C6.48 2.5 2 6.98 2 12.5C2 18.02 6.48 22.5 12 22.5C17.52 22.5 22 18.02 22 12.5C22 6.98 17.52 2.5 12 2.5ZM17 13.5L13 13.5L13 17.5H11L11 13.5L7 13.5L7 11.5H11L11 7.5H13L13 11.5H17V13.5Z"
            fill="#130FFF" />
        </g>
        <defs>
          <clipPath id="clip0_2028_18630">
            <rect width="24" height="24" fill="white" transform="translate(0 0.5)" />
          </clipPath>
        </defs>
      </svg>
      { label }
    </div>
  )

}

export const TextArrayInput: FC<TextArrayControls & {}> = (
  {
    name,
    label,
    description,
    value,
    placeholders,
    setSpecificValue,
    canAddValue,
    canRemoveValue,
    addLabel = 'Add',
    addValue,
    removeLabel = 'Remove',
    removeValue,
  }
) => {

  const handleChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) =>
    setSpecificValue(index, event.target.value)

  const wrappedField = (
    <div className={classes.textArrayValue}>
      {value.map((value, index) => (
        <div key={`edit-${index}`} className={"niceLine"}>
          <input
            name={name}
            key={`edit-${index}`}
            placeholder={placeholders[index]}
            value={value}
            onChange={(event) => handleChange(index, event)}
            className={classes.textValue}
          />
          {canRemoveValue(index) && <TrashIcon label={removeLabel} remove={() => removeValue(index)} />}
        </div>
      ))}
      {canAddValue && <AddIcon label={addLabel} add={addValue} />}
    </div>
  )

  return (
    <div className={classes.fieldContainer}>
      {!!label
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