import { BigNumberish } from 'ethers'
import { StringUtils } from './string.utils';
import { RemainingTime } from '../types';

const dateFormatLong = new Intl.DateTimeFormat('en', {
  timeStyle: 'long',
  dateStyle: 'long',
})

const dateFormatShort = new Intl.DateTimeFormat('en', {
  dateStyle: 'long',
})

export abstract class DateUtils {
  static intlDateFormat(date: Date | number, { longFormat } = { longFormat: true }) {
    if (longFormat) {
      return dateFormatLong.format(date)
    }

    return dateFormatShort.format(date)
  }

  static unixFormatToDate(unixFormat: BigNumberish) {
    return new Date(Number(unixFormat) * 1000)
  }

  static calculateRemainingTimeFrom(deadline: number, now: number): RemainingTime {
    const isPastDue = now > deadline
    const totalSeconds = Math.floor((Math.abs(deadline - now)))

    return {
      isPastDue,
      totalSeconds,
      days: Math.floor(totalSeconds / (24 * 3600)),
      hours: Math.floor(totalSeconds % (24 * 3600) / 3600),
      minutes: Math.floor(totalSeconds % 3600 / 60),
      seconds: totalSeconds % 60
    }
  }

  static getTextDescriptionOfTime(remaining: RemainingTime | undefined): string | undefined {
    if (!remaining) return undefined;
    const hasDays = !!remaining.days
    const hasHours = hasDays || !!remaining.hours
    const hasMinutes = !hasDays && (hasHours || !!remaining.minutes)
    const hasSeconds = !hasHours
    const fragments: string[] = []
    if (hasDays) fragments.push(StringUtils.maybePlural(remaining.days, "day","days"))
    if (hasHours) fragments.push(StringUtils.maybePlural(remaining.hours, "hour", "hours"))
    if (hasMinutes) fragments.push(StringUtils.maybePlural(remaining.minutes,"minute", "minutes"))
    if (hasSeconds) fragments.push(StringUtils.maybePlural(remaining.seconds, "second", "seconds"))
    const timeString = fragments.join(", ")

    if (remaining.isPastDue) {
      return `Voting finished ${timeString} ago.`;
    } else {
      return `Poll closes in ${timeString}.`;
    }
  }


}
