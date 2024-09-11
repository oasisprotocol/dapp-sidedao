// Exponential easing function to use
function easeInOutExpo(x: number): number {
  return x === 0
    ? 0
    : x === 1
      ? 1
      : x < 0.5
        ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2
}

/**
 * Gradually "tune" a value from a start to and end, during a time period
 */
export const tuneValue = (props: {
  startValue: number
  endValue: number
  stepInMs: number
  transitionTime: number
  setValue: (value: number) => void
  easing?: boolean
}) => {
  const { startValue, endValue, stepInMs, transitionTime, setValue, easing } = props

  const neededSteps = (transitionTime * 1000) / stepInMs

  let step = 0

  const timer = setInterval(() => {
    step++
    // console.log("At step", step)
    const currentValue = easing
      ? Math.round(startValue + (endValue - startValue) * easeInOutExpo(step / neededSteps))
      : Math.round(startValue + (step * (endValue - startValue)) / neededSteps)
    setValue(currentValue)
    if (step === neededSteps) {
      clearInterval(timer)
    }
  }, stepInMs)
}
