import {
  GUESSES,
  CODE_PEG_COLOURS,
  GUESS_SLOTS,
  MAJOR_MEDIA_BREAKPOINT,
  MY_GITHUB,
  MODALS,
  DISABLE_MANUAL_AFTER_INPUT,
} from "./constants.js";
import {
  shadeColour,
  randomChoice,
  hasOverflow,
  Cookies,
  StatTrack,
} from "./utils.js";

let winDialog,
  failureDialog,
  keybindsDialog,
  howToPlayDialog,
  settingsDialog,
  statsDialog,
  codeViewDialog;
let manualInputCheckbox;

// game-related variables
let activeGameSliceIndex = 0; // >= 0, <= GUESSES - 1
let postGameConclusion = false;
let manualColourInputSelection = "";

let modalOpen = false;
let temporaryFeedbackRunningTasks = new Map();

class CodebreakerCode extends Array {
  #EMPTY = "__EMPTY__";
  static record = [];

  constructor(maxLength, ...args) {
    super(...args);
    this.length = maxLength;
    this.fill(this.#EMPTY);
  }

  get trueLength() {
    return this.filter(val => val !== this.#EMPTY).length;
  }

  done() {
    CodebreakerCode.record.push(this);
  }

  set(index, val) {
    if (index > this.length - 1) {
      throw new Error(`Index must be less than or equal to ${this.length - 1}`);
    }
    this[index] = val;
    this.#setInDom(index, val);
  }

  #setInDom(index, val) {
    const codePegHolders = getActiveCodePegHolders();
    const holder = [...codePegHolders.children].filter(el =>
      el.classList.contains("code-peg-holder"),
    )[index];
    if (holder.firstChild) holder.removeChild(holder.firstChild);
    holder.appendChild(createCodePeg(val));
  }

  reset() {
    this.fill(this.#EMPTY);
  }

  push(val) {
    const index = this.findIndex(item => item === this.#EMPTY);

    if (index !== -1) {
      this[index] = val;
      this.#pushToDOM(val);
    }
    return this.length;
  }

  #pushToDOM(val) {
    const codePegHolders = getActiveCodePegHolders();
    for (const el of codePegHolders.children) {
      if (
        !el.classList.contains("code-peg-connector") &&
        !el.querySelector(".code-peg")
      ) {
        el.appendChild(createCodePeg(val));
        break;
      }
    }
  }

  pop() {
    const index = this.findLastIndex(item => item !== this.#EMPTY);
    if (index !== -1) {
      const value = this[index];
      this[index] = this.#EMPTY;
      this.#popFromDom();
      return value;
    }
    return undefined;
  }

  #popFromDom() {
    const codePegHolders = getActiveCodePegHolders();
    for (const el of [...codePegHolders.children].reverse()) {
      if (el.querySelector(".code-peg")) {
        el.removeChild(el.firstChild);
        break;
      }
    }
  }
}

let codemakerCode = [];
let codebreakerCode = new CodebreakerCode(GUESS_SLOTS);

window.onresize = () => updateGameSlicesBasedOnOverflow();

window.onload = () => {
  setGameSlices();
  if (GUESS_SLOTS > 1) {
    setCodePegHolders();
    setKeyPegHolders();
  }

  manualInputCheckbox = document.getElementById("manualInputCheckbox");
  manualInputCheckbox.checked = false;
  // prevent clicks on "Code Peg Picker" text modifying the manualInputCheckbox state
  document.querySelector(".bold-subtitle > span").onclick = event => {
    event.preventDefault();
  };

  makeGithubLinksClickable();
  updateGameSlicesBasedOnOverflow();
  createCodePickerPegs();
  applyButtonListeners();
  applyModalCloseButtonListeners();
  applyFormSubmitListeners();
  applyCSSStyles();
  assignDialogVariables();
  setDefaultFormValues();

  newGame(true);
};

document.onkeydown = event => {
  if (event.key === "Escape") {
    modalOpen = false;
    return document.activeElement.blur();
  }
  if (modalOpen || postGameConclusion) return;
  if (event.key === "Backspace") {
    deleteCodePeg();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (
      document.activeElement.onclick ||
      document.activeElement.nodeName === "INPUT"
    ) {
      return document.activeElement.click();
    }
    if (event.shiftKey) {
      newGame();
    } else {
      submitGuess();
    }
  } else if (
    parseInt(event.key) <= CODE_PEG_COLOURS.length &&
    parseInt(event.key) > 0
  ) {
    addCodePeg(CODE_PEG_COLOURS[parseInt(event.key) - 1]);
  }
};

/* DOM-RELATED FUNCTIONS */
function applyButtonListeners() {
  document.getElementById("deleteCodePegButton1").onclick = deleteCodePeg;
  document.getElementById("deleteCodePegButton2").onclick = deleteCodePeg;
  document.getElementById("submitGuessButton").onclick = submitGuess;
  document.getElementById("newGameButton1").onclick = () => newGame();
  [
    document.getElementById("newGameButton2"),
    document.getElementById("newGameButton3"),
  ].forEach(
    el =>
      (el.onclick = () => {
        winDialog.close();
        failureDialog.close();
        modalOpen = false;
        newGame();
      }),
  );
  document.getElementById("keybindsButton").onclick = () => {
    keybindsDialog.showModal();
    modalOpen = true;
  };
  document.getElementById("howToPlayButton").onclick = () => {
    howToPlayDialog.showModal();
    modalOpen = true;
  };
  document.getElementById("settingsButton").onclick = () => {
    settingsDialog.showModal();
    document.getElementById("guessesInput").blur();
    modalOpen = true;
  };
  document.getElementById("statsButton").onclick = () => {
    statsDialog.showModal();
    statsDialog.querySelector("#statsDialogInsertionNode").innerHTML =
      StatTrack.getHTMLRepresentation();
    modalOpen = true;
  };
  document.getElementById("codeViewContainer").onclick = () => {
    codeViewDialog.showModal();
    modalOpen = true;
  };
  document.getElementById("resetUserSettingsButton").onclick = () => {
    Cookies.resetUserSettings();
    window.location.reload();
  };
  manualInputCheckbox.onchange = event => {
    if (!event.target.checked) updateManualColourInputSelection("");
  };
}

function applyModalCloseButtonListeners() {
  MODALS.forEach(
    id =>
      (document
        .getElementById(id)
        .querySelector(".modal-close-button").onclick = () => {
        document.getElementById(id).close();
        modalOpen = false;
      }),
  );
}

function applyFormSubmitListeners() {
  document.getElementById("settingsFormButton").onclick = event => {
    event.preventDefault();
    window.location.reload();
    submitSettingsForm();
  };
}

function openConfirmationDialog(
  onConfirm,
  buttonText = ["No", "Yes"],
  buttonColourScheme = ["btn-error", "btn-success"],
  appendToMessage = "",
  title = "Confirmation",
  message = "Are you sure you want to proceed with this action?",
) {
  const dialog = document.getElementById("confirmationDialog");
  const modalTitle = document.getElementById("CdialogTitle");
  const modalMessage = document.getElementById("CdialogMessage");
  const cancelButton = document.getElementById("CdialogCancelButton");
  const confirmButton = document.getElementById("CdialogConfirmButton");

  dialog.showModal();
  modalTitle.textContent = title;
  modalMessage.textContent = message + " " + appendToMessage;
  cancelButton.textContent = buttonText[0];
  confirmButton.textContent = buttonText[1];
  cancelButton.className = `btn ${buttonColourScheme[0]}`;
  confirmButton.className = `btn ${buttonColourScheme[1]}`;

  confirmButton.onclick = () => {
    dialog.close();
    onConfirm();
  };

  cancelButton.onclick = () => {
    dialog.close();
  };
}

function applyCSSStyles() {
  if ((window.innerWidth < 427 || !isOnPhone()) && GUESS_SLOTS > 4) {
    const scale = window.innerWidth < 427 ? "0.4" : "0.8";
    document
      .querySelectorAll(".game-slice")
      .forEach(slice => (slice.style.scale = scale));
  }
  if (GUESS_SLOTS > 4 && isOnPhone()) {
    document
      .querySelectorAll(".key-peg-holders")
      .forEach(holder => (holder.style.gridTemplateColumns = "repeat(3, 1fr)"));
  }
}

function assignDialogVariables() {
  winDialog = document.getElementById(MODALS[0]);
  failureDialog = document.getElementById(MODALS[1]);
  keybindsDialog = document.getElementById(MODALS[2]);
  howToPlayDialog = document.getElementById(MODALS[3]);
  settingsDialog = document.getElementById(MODALS[4]);
  statsDialog = document.getElementById(MODALS[5]);
  codeViewDialog = document.getElementById(MODALS[6]);
}

function setDefaultFormValues() {
  document.getElementById("guessesInput").value = GUESSES;
  document.getElementById("guessSlotsInput").value = GUESS_SLOTS;
  document.getElementById("codePegColoursInput").value =
    CODE_PEG_COLOURS.length;
  document.getElementById("disableManualAfterInput").checked =
    DISABLE_MANUAL_AFTER_INPUT;
}

function submitSettingsForm() {
  Cookies.setCookie(
    "MUS_guesses",
    document.getElementById("guessesInput").value,
  );
  Cookies.setCookie(
    "MUS_guess_slots",
    document.getElementById("guessSlotsInput").value,
  );
  Cookies.setCookie(
    "MUS_code_peg_colours",
    document.getElementById("codePegColoursInput").value,
  );
  Cookies.setCookie(
    "MUS_disable_manual_after_input",
    Number(document.getElementById("disableManualAfterInput").checked),
  );
}

function createCodePickerPegs() {
  const picker = document.querySelector("#codePegPicker .picker");
  for (const colour of CODE_PEG_COLOURS)
    picker.appendChild(
      createCodePeg(colour, true, event => addCodePeg(colour, event), true),
    );
}

function makeGithubLinksClickable() {
  document
    .querySelectorAll(".github-clickable")
    .forEach(node =>
      node.addEventListener("click", () =>
        window.open(MY_GITHUB, "_blank").focus(),
      ),
    );
}

function createEnumeration(index) {
  const enumeration = document.createElement("div");
  enumeration.className = "enumeration";
  enumeration.innerHTML = `${index}`;
  return enumeration;
}

function setGameSlices() {
  const slices = document.getElementById("gameSlices");
  const firstSlice = slices.children[0];
  firstSlice.id = "game-slice-0";
  firstSlice.append(createEnumeration(1));

  for (let i = 1; i < GUESSES; i++) {
    const newSlice = firstSlice.cloneNode(true);
    newSlice.id = `game-slice-${i}`;
    slices.appendChild(newSlice);
    newSlice.querySelector(".enumeration").innerHTML = `${i + 1}`;
  }
}

function setCodePegHolders() {
  document.querySelectorAll(".game-slice").forEach((slice, index) => {
    const holders = slice.querySelector(".code-peg-holders");
    for (let i = 0; i <= GUESS_SLOTS - 1; i++) {
      const connector = document.createElement("div");
      connector.className = "code-peg-connector";
      const holder = document.createElement("div");
      holder.dataset.index = `${i}`;
      holder.className = "code-peg-holder";
      holder.tabIndex = "-1";
      holder.onclick = () => {
        if (manualColourInputSelection && activeGameSliceIndex === index) {
          codebreakerCode.set(i, manualColourInputSelection);
          if (DISABLE_MANUAL_AFTER_INPUT) {
            updateManualColourInputSelection("");
          }
        }
      };
      if (i > 0) holders.appendChild(connector);
      holders.appendChild(holder);
    }
  });
}

function setKeyPegHolders() {
  document.querySelectorAll(".game-slice").forEach(slice => {
    const holders = slice.querySelector(".key-peg-holders");
    for (let i = 0; i <= GUESS_SLOTS - 1; i++) {
      const holder = document.createElement("div");
      holder.dataset.index = `${i}`;
      holder.className = "key-peg-holder";
      holders.appendChild(holder);
    }
  });
}

function updateGameSlicesBasedOnOverflow() {
  const slices = document.getElementById("gameSlices");
  if (hasOverflow(slices, true)) {
    slices.style.justifyContent = "start";
    slices.style.paddingLeft = "10px";
    bindScrollToGameSlices();
  } else {
    slices.style.justifyContent = "center";
    slices.style.paddingLeft = "0px";
    unbindScrollFromGameSlices();
  }
}

function bindScrollToGameSlices() {
  const slices = document.getElementById("gameSlices");
  slices.onwheel = event => {
    if (event.ctrlKey) return; // allow event to pass, as the user is likely zooming with ctrl + scroll
    if (
      (event.deltaY > 0 &&
        slices.scrollLeft + slices.clientWidth >= slices.scrollWidth) ||
      (event.deltaY < 0 && slices.scrollLeft <= 0)
    ) {
      return; // allow event to pass, as scrolling has no effect (end of container reached)
    }
    event.preventDefault();
    if (window.innerWidth > MAJOR_MEDIA_BREAKPOINT) {
      slices.scrollLeft += event.deltaY;
    } else {
      slices.scrollTop += event.deltaY;
    }
  };
}

function unbindScrollFromGameSlices() {
  const slices = document.getElementById("gameSlices");
  slices.onwheel = () => {};
}

function isOnPhone() {
  return window.innerWidth < MAJOR_MEDIA_BREAKPOINT;
}

function focusFirstEmptyPegHolder() {
  const holders = [...getActiveCodePegHolders().children].filter(holder =>
    holder.classList.contains("code-peg-holder"),
  );
  const index = holders.findIndex(el => !el.querySelector(".code-peg"));
  if (index === -1) return holders[0].focus();
  holders[index].focus();
}

function updateGameSliceTabIndices(setNew) {
  document
    .querySelectorAll(".code-peg-holder")
    .forEach(el => (el.tabIndex = "-1"));
  if (!setNew) return;
  getActiveCodePegHolders()
    .querySelectorAll(".code-peg-holder")
    .forEach(el => (el.tabIndex = "0"));
  focusFirstEmptyPegHolder();
}

function updateManualColourInputSelection(colour) {
  document
    .querySelectorAll(".game-slice")
    .forEach(el => el.classList.remove("manual"));
  if (colour) getActiveGameSlice().classList.add("manual");
  updateGameSliceTabIndices(Boolean(colour));
  document.querySelectorAll(".picker .code-peg").forEach(el => {
    if (el.dataset.colour !== colour) return el.classList.remove("manual");
    el.classList.add("manual");
  });
  if (!colour) {
    manualInputCheckbox.checked = false;
  } else {
    manualInputCheckbox.checked = true;
  }
  manualColourInputSelection = colour;
}

/**
 * @param {import("./constants.js").CodePegColour} colour
 */
function createCodePeg(
  colour,
  cursorPointer = false,
  onClick = null,
  tabIndex = false,
) {
  const peg = document.createElement("div");
  peg.classList.add("code-peg");
  peg.dataset.colour = colour;
  peg.style.background = `radial-gradient(circle at 57.5% 40%, ${colour}, ${shadeColour(
    colour,
    -30,
  )} 70%, ${shadeColour(colour, -50)})`;
  peg.style.boxShadow = `
    -3px 3px 10px 2px rgba(0, 0, 0, 0.6),
    2px -2px 8px rgba(255, 255, 255, 0.5) inset
  `;
  if (cursorPointer) peg.style.cursor = "pointer";
  if (onClick) peg.onclick = event => onClick(event);
  if (tabIndex) {
    peg.tabIndex = "0";
    peg.role = "button";
    peg.ariaLabel = "button";
  }
  return peg;
}

/**
 * @param {import("./constants.js").KeyPegColour} colour
 */
function createKeyPeg(colour) {
  const peg = document.createElement("div");
  peg.classList.add("key-peg");
  peg.style.background = `radial-gradient(circle at 60% 30%, ${colour}, ${shadeColour(
    colour,
    -40,
  )} 150%, ${shadeColour(colour, -50)})`;
  peg.style.boxShadow = `
    -3px 3px 9px 2px rgba(0, 0, 0, 0.6),
    1px -1px 4px rgba(255, 255, 255, 0.5) inset
  `;

  return peg;
}

function createCodebreakerPegSequenceElement() {
  const div = document.createElement("div");
  div.className = "codemaker-revealed-code";
  for (const colour of codemakerCode) {
    div.appendChild(createCodePeg(colour));
  }
  return div;
}

function getActiveGameSlice() {
  return document.querySelector(`#game-slice-${activeGameSliceIndex}`);
}

function getActiveCodePegHolders() {
  return getActiveGameSlice().querySelector(".code-peg-holders");
}

function getActiveKeyPegHolders() {
  return getActiveGameSlice().querySelector(".key-peg-holders");
}

function scrollActiveGameSliceIntoView() {
  const onPhone = isOnPhone();
  if (hasOverflow(document.getElementById("gameSlices", !onPhone, onPhone)))
    getActiveGameSlice().scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
}

function setTemporaryFeedbackText(selector, text, timeout = 750) {
  if (temporaryFeedbackRunningTasks.get(selector)) return;
  const el = document.querySelector(selector);
  const originalText = el.innerText.trim();
  el.innerText = text;
  temporaryFeedbackRunningTasks.set(selector, true);
  setTimeout(() => {
    el.innerText = originalText;
    temporaryFeedbackRunningTasks.set(selector, false);
  }, timeout);
}

function setAttemptsCountInWinModal() {
  winDialog.querySelector("p").innerHTML =
    `Great job! You broke the code in ${activeGameSliceIndex} ${activeGameSliceIndex === 1 ? "guess" : "guesses"}!`;
}

function toggleCodeViewButton(state) {
  const view = document.getElementById("codeViewContainer");
  if (state) {
    codeViewDialog.insertBefore(
      createCodebreakerPegSequenceElement(),
      codeViewDialog.lastElementChild,
    );
    codeViewDialog.children[1].remove();
    return view.classList.add("active");
  }
  return view.classList.remove("active");
}

/* GAME-RELATED FUNCTIONS */
/**
 *
 * @param {import("./constants.js").CodePegColour} colour
 * @param {KeyboardEvent} event
 */
function addCodePeg(colour, event = undefined) {
  if (postGameConclusion) return;
  if (event?.shiftKey || manualInputCheckbox.checked) {
    if (event.target.dataset.colour === manualColourInputSelection)
      return updateManualColourInputSelection("");
    return updateManualColourInputSelection(colour);
  }
  updateManualColourInputSelection("");
  codebreakerCode.push(colour);
  scrollActiveGameSliceIntoView();
}

function deleteCodePeg() {
  if (postGameConclusion) return;
  codebreakerCode.pop();
  scrollActiveGameSliceIntoView();
}

function wipeAllBoardPegs() {
  document
    .querySelectorAll(".game-slice .key-peg, .game-slice .code-peg")
    .forEach(node => node.remove());
}

function applyKeyPegs(evaluationMap) {
  const keyPegHolders = getActiveKeyPegHolders();
  let keyPegCount =
    evaluationMap.correctPositionAndColour + evaluationMap.correctColourOnly;
  for (let i = 0; i < keyPegCount; i++) {
    const pickingFrom =
      evaluationMap.correctPositionAndColour > 0
        ? "correctPositionAndColour"
        : "correctColourOnly";
    const keyPegColour =
      pickingFrom === "correctPositionAndColour" ? "black" : "ghostwhite";

    const firstAvailable = [...keyPegHolders.children].find(
      node => !node.children.length,
    );
    firstAvailable.appendChild(createKeyPeg(keyPegColour));
    evaluationMap[pickingFrom]--;
  }
}

function makeCode() {
  codemakerCode = [];
  for (let i = 0; i < GUESS_SLOTS; i++) {
    codemakerCode.push(randomChoice(CODE_PEG_COLOURS));
  }
}

function newGame(onload = false, force = false) {
  if (!postGameConclusion && !onload && !force) {
    return openConfirmationDialog(
      () => newGame(false, true),
      ["Keep Playing", "New Game"],
      ["", "btn-success"],
      "You have not finished your current game.",
    );
  }

  document
    .querySelectorAll(".game-slice")
    .forEach(slice => slice.classList.remove("active"));
  activeGameSliceIndex = 0;
  postGameConclusion = false;
  toggleCodeViewButton(false);
  codebreakerCode = new CodebreakerCode(GUESS_SLOTS);
  updateManualColourInputSelection("");
  setTemporaryFeedbackText("#newGameButton1", "Started!");
  wipeAllBoardPegs();
  makeCode();
  getActiveGameSlice().classList.add("active");
  scrollActiveGameSliceIntoView();
}

function evaluateGuess(codemakerCode, codebreakerCode) {
  let correctPositionAndColour = 0;
  let correctColourOnly = 0;
  const codemakerColours = [...codemakerCode];
  const codebreakerColours = [...codebreakerCode];

  // check for position & colour
  for (let i = 0; i < codebreakerCode.length; i++) {
    if (codebreakerColours[i] === codemakerColours[i]) {
      correctPositionAndColour++;
      // prevent "correctColourOnly" from being incremented falsely if the user guessed the given colour
      // in another place as well
      codemakerColours[i] = null;
      codebreakerColours[i] = null;
    }
  }

  // check for correct colour only
  for (let i = 0; i < codebreakerCode.length; i++) {
    if (
      codebreakerColours[i] !== null &&
      codemakerColours.includes(codebreakerColours[i])
    ) {
      correctColourOnly++;
      codemakerColours[codemakerColours.indexOf(codebreakerColours[i])] = null;
    }
  }
  return { correctPositionAndColour, correctColourOnly };
}

function submitGuess() {
  if (postGameConclusion) return;
  if (codebreakerCode.trueLength < GUESS_SLOTS)
    return alert(
      `Error: Your guess must be equivalent to the amount of guess slots (${GUESS_SLOTS}).`,
    );
  const evaluation = evaluateGuess(codemakerCode, codebreakerCode);
  applyKeyPegs(JSON.parse(JSON.stringify(evaluation)));

  codebreakerCode.done();
  codebreakerCode = new CodebreakerCode(GUESS_SLOTS);
  updateManualColourInputSelection("");
  const oldActiveGameSlice = getActiveGameSlice();
  activeGameSliceIndex++;

  let result;
  if (evaluation.correctPositionAndColour === GUESS_SLOTS) {
    result = "win";
    setAttemptsCountInWinModal();
    winDialog.showModal();
    modalOpen = true;
    postGameConclusion = true;
    toggleCodeViewButton(true);
    confetti({ particleCount: 200, disableForReducedMotion: true });
  } else if (activeGameSliceIndex + 1 > GUESSES) {
    result = "loss";
    document.querySelector(".codemaker-revealed-code")?.remove();
    failureDialog.showModal();
    modalOpen = true;
    failureDialog.insertBefore(
      createCodebreakerPegSequenceElement(),
      failureDialog.lastElementChild,
    );
    postGameConclusion = true;
    toggleCodeViewButton(true);
  } else {
    // next game slice
    oldActiveGameSlice.classList.remove("active");
    getActiveGameSlice().classList.add("active");
    scrollActiveGameSliceIntoView();
  }

  if (postGameConclusion) {
    StatTrack.addGameRecord(
      codemakerCode,
      CodebreakerCode.record,
      result === "win" ? activeGameSliceIndex + 1 : activeGameSliceIndex,
      GUESSES,
      GUESS_SLOTS,
      CODE_PEG_COLOURS,
      result,
    );
  }
}

export { evaluateGuess };
