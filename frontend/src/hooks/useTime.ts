import { useEffect, useState } from 'react';

export const useTime = () => {

  const [now, setNow] = useState(0);

  const updateTime = () => {
    setNow(Date.now() / 1000)
    setTimeout(
      updateTime,
      1000
    )
  }

  useEffect(
    updateTime,
    []
  )

  return {
    now
  }

}