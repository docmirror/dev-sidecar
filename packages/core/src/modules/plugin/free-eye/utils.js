/**
 * Various utility functions shared by tests
 */

// Linking socket constants to human-readable strings
const FAMILY_VALUES = {
  IPv4: 4,
  IPv6: 6,
}
const PROTOCOL_VALUES = {
  TCP: 'tcp',
  UDP: 'udp',
}

class LogColors {
  /**
   * ANSI color codes for pretty terminal output
   * Update: Dev-sidecar doesn't support ANSI color codes in its console output.
   */
  static RESET = ''
  static RED = ''
  static GREEN = ''
  static YELLOW = ''
  static BLUE = ''
  static MAGENTA = ''
  static CYAN = ''
  static WHITE = ''
}

const DISPLAY_WIDTH = 50

function printHeader (title, isRes) { // test start, test res
  const sep = `\n${'='.repeat(DISPLAY_WIDTH)}\n`
  console.log(
    (isRes ? LogColors.MAGENTA : LogColors.CYAN)
    + sep + title.padStart(Math.floor((DISPLAY_WIDTH + title.length) / 2)).padEnd(DISPLAY_WIDTH) + sep
    + LogColors.RESET,
  )
}

function getResultIcon (success, infoStr = null) {
  let resColor, resIcon
  if (success === true) {
    resColor = LogColors.GREEN
    resIcon = '✔'
  } else if (success === false) {
    resColor = LogColors.RED
    resIcon = '✖'
  } else { // test inconclusive
    resColor = LogColors.YELLOW
    resIcon = '?'
  }
  if (infoStr !== null) {
    resIcon += ` ${infoStr}`
  }
  return `(${resColor}${resIcon}${LogColors.RESET})`
}

function getCensorsString (censors) {
  let resStr = ''
  if (censors && censors.length > 0) {
    for (const c of censors) {
      resStr += `    Censorship detected: ${LogColors.RED}${c}${LogColors.RESET}\n`
    }
  } else {
    resStr += '    No censorship detected\n'
  }
  return resStr
}

export default {
  FAMILY_VALUES,
  PROTOCOL_VALUES,
  LogColors,
  DISPLAY_WIDTH,
  printHeader,
  getResultIcon,
  getCensorsString,
};
