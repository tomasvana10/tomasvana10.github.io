/**
 * @typedef {"red" | "yellow" | "blue" | "green" | "black" | "azure" | "violet" | "mediumturquoise" | "saddlebrown"} CodePegColour
 */

import { Cookies } from "./utils.js";

/**
 * @typedef {"black" | "ghostwhite"} KeyPegColour
 */
const MUS_DEFAULTS = {
  guesses: 10,
  guessSlots: 4,
  codePegColours: 6,
  disableManualAfterInput: 1,
};
const GUESSES =
  Number(Cookies.getCookie("MUS_guesses")) || MUS_DEFAULTS.guesses; // acts as a constraint + affects html
const GUESS_SLOTS =
  Number(Cookies.getCookie("MUS_guess_slots")) || MUS_DEFAULTS.guessSlots; // acts as a constraint + affects html
const CODE_PEG_COLOURS = [
  "red",
  "yellow",
  "blue",
  "green",
  "black",
  "azure",
  "violet",
  "mediumturquoise",
  "saddlebrown",
].slice(
  0,
  Number(Cookies.getCookie("MUS_code_peg_colours")) ||
    MUS_DEFAULTS.codePegColours,
); // acts as a constraint + affects html
const DISABLE_MANUAL_AFTER_INPUT = Boolean(
  Number(
    Cookies.getCookie("MUS_disable_manual_after_input") ||
      MUS_DEFAULTS.disableManualAfterInput,
  ),
);
const KEY_PEG_COLOURS = ["black", "ghostwhite"];
const MAJOR_MEDIA_BREAKPOINT = 768;
const MY_GITHUB = "https://github.com/tomasvana10";
const MODALS = [
  "winDialog",
  "failureDialog",
  "keybindsDialog",
  "howToPlayDialog",
  "settingsDialog",
  "codeViewDialog",
];

export {
  MUS_DEFAULTS,
  GUESSES,
  GUESS_SLOTS,
  DISABLE_MANUAL_AFTER_INPUT,
  MY_GITHUB,
  MAJOR_MEDIA_BREAKPOINT,
  CODE_PEG_COLOURS,
  KEY_PEG_COLOURS,
  MODALS,
};
