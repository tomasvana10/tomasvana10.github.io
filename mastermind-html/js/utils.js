import { MUS_DEFAULTS } from "./constants.js";

function shadeColour(color, percent) {
  const num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = ((num >> 8) & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;

  return `rgb(${Math.min(255, Math.max(0, R))}, ${Math.min(
    255,
    Math.max(0, G),
  )}, ${Math.min(255, Math.max(0, B))})`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasOverflow(container, onlyX = false, onlyY = false) {
  if (onlyX) {
    return container.scrollWidth > container.clientWidth;
  }
  if (onlyY) {
    return container.scrollHeight > container.clientHeight;
  }
  return (
    container.scrollHeight > container.clientHeight ||
    container.scrollWidth > container.clientWidth
  );
}

class Cookies {
  static setCookie(name, value, days = 365) {
    let d = new Date();
    d.setDate(d.getDate() + days);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }

  static getCookie(name) {
    try {
      document;
    } catch {
      return "";
    }
    return (
      document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() ||
      ""
    );
  }

  static resetUserSettings() {
    Cookies.setCookie("MUS_guesses", MUS_DEFAULTS.guesses);
    Cookies.setCookie("MUS_guess_slots", MUS_DEFAULTS.guessSlots);
    Cookies.setCookie("MUS_code_peg_colours", MUS_DEFAULTS.codePegColours);
    Cookies.setCookie(
      "MUS_disable_manual_after_input",
      MUS_DEFAULTS.disableManualAfterInput,
    );
  }
}

class StatTrack {
  /**
   *
   * @param {import("./constants.js").CodePegColour[]} codemakerCode
   * @param {import("./constants.js").CodePegColour[][]} codebreakerCodes
   * @param {number} guesses
   * @param {number} maxGuesses
   * @param {number} guessSlots
   * @param {import("./constants.js").CodePegColour[]} colours
   * @param {"win" | "loss"} result
   */
  static addGameRecord(
    codemakerCode,
    codebreakerCodes,
    guesses,
    maxGuesses,
    guessSlots,
    colours,
    result,
  ) {
    const stats = StatTrack._getStats();

    stats.push({
      codemakerCode,
      codebreakerCodes: StatTrack._compressCodebreakerCodes(
        codebreakerCodes,
        colours,
      ),
      guesses,
      maxGuesses,
      guessSlots,
      colours,
      result,
      time: Date.now(),
    });

    StatTrack._setStats(stats);
  }

  static getHTMLRepresentation() {
    const stats = StatTrack._getStats();
    const total = stats.length;
    const won = stats.filter(stat => stat.result === "win").length;
    const lost = stats.filter(stat => stat.result === "loss").length;
    return `
    <div>
      <p><b>Games Played</b>: ${total}</p>
      ${
        total
          ? `<p><b>Games Won</b>: ${won} (<em>${((won / total) * 100).toFixed(2)}%</em>)</p>
        <p><b>Games Lost</b>: ${lost} (<em>${((lost / total) * 100).toFixed(2)}%</em>)</p>`
          : ""
      }
      <p><b>NOTE</b>: Skipped games are not recorded.</p>
      <br><p>More stat insights coming soon!</p>
    </div>
    `;
  }

  /**
   * @param {import("./constants.js").CodePegColour[][]} codebreakerCodes
   * @param {import("./constants.js").CodePegColour[]} colours
   */
  static _compressCodebreakerCodes(codebreakerCodes, colours) {
    return codebreakerCodes.map(code =>
      code.map(colour => colours.indexOf(colour)),
    );
  }

  static _getStats() {
    let stats = localStorage.getItem("mastermind_game-record");
    if (!stats) {
      localStorage.setItem("mastermind_game-record", "[]");
      stats = [];
    } else {
      stats = JSON.parse(stats);
    }

    return stats;
  }

  static _setStats(stats) {
    localStorage.setItem("mastermind_game-record", JSON.stringify(stats));
  }
}

export { shadeColour, randomChoice, hasOverflow, Cookies, StatTrack };
