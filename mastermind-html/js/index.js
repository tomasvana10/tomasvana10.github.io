const GUESSES = 10; // acts as a constraint + affects html
const GUESS_SLOTS = 4; // acts as a constraint (does not affect html)
const MY_GITHUB = "https://github.com/tomasvana10";
const ROW_TO_COL_MEDIA_BREAKPOINT = 768;
/**
 * @typedef {"red" | "yellow" | "blue" | "green" | "black" | "azure"} CodePegColour
 */
const CODE_PEG_COLOURS = ["red", "yellow", "blue", "green", "black", "azure"];
/**
 * @typedef {"black" | "ghostwhite"} KeyPegColour
 */
const KEY_PEG_COLOURS = ["black", "white"];

let winDialog, failureDialog, keybindsDialog, howToPlayDialog;

// game-related variables
let codebreakerCode = []; // >= 0, <= GUESS_SLOTS
let activeGameSliceIndex = 0; // >= 0, <= GUESSES - 1
let postGameConclusion = false;

let modalOpen = false;
let codemakerCode = [];
let temporaryFeedbackRunningTasks = new Map();

window.onresize = () => updateGameSlicesBasedOnOverflow();

window.onload = () => {
  setRows();
  makeGithubLinksClickable();
  updateGameSlicesBasedOnOverflow();
  createCodePickerPegs();
  applyButtonListeners();
  winDialog = document.getElementById("winDialog");
  failureDialog = document.getElementById("failureDialog");
  keybindsDialog = document.getElementById("keybindsDialog");
  howToPlayDialog = document.getElementById("howToPlayDialog");

  newGame();
};

document.onkeydown = event => {
  if (modalOpen || postGameConclusion) return;
  if (event.key === "Backspace") {
    deleteCodePeg();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (document.activeElement.onclick) {
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

/* TEST FUNCTIONS */
function test_generatePegs() {
  const el = document.getElementById("guess-interface");
  for (colour of CODE_PEG_COLOURS) {
    el.appendChild(createCodePeg(colour));
  }
  for (colour of KEY_PEG_COLOURS) {
    el.appendChild(createKeyPeg(colour));
  }
  document
    .querySelectorAll(".code-peg-holder")
    .forEach(holder =>
      holder.appendChild(createCodePeg(randomChoice(CODE_PEG_COLOURS)))
    );
  document
    .querySelectorAll(".key-peg-holder")
    .forEach(holder =>
      holder.appendChild(createKeyPeg(randomChoice(KEY_PEG_COLOURS)))
    );
}

/* DOM-RELATED FUNCTIONS */
function applyButtonListeners() {
  document.getElementById("deleteCodePegButton").onclick = deleteCodePeg;
  document.getElementById("submitGuessButton").onclick = submitGuess;
  document.getElementById("newGameButton").onclick = newGame;
  document.getElementById("keybindsButton").onclick = () =>
    keybindsDialog.showModal();
  document.getElementById("howToPlayButton").onclick = () =>
    howToPlayDialog.showModal();
}

function createCodePickerPegs() {
  const picker = document.querySelector("#code-peg-picker .picker");
  for (const colour of CODE_PEG_COLOURS)
    picker.appendChild(
      createCodePeg(colour, true, () => addCodePeg(colour), true)
    );
}

function makeGithubLinksClickable() {
  document
    .querySelectorAll("#github-clickable, #githubButton")
    .forEach(node =>
      node.addEventListener("click", () =>
        window.open(MY_GITHUB, "_blank").focus()
      )
    );
}

function setRows() {
  const rows = document.getElementById("game-slices");
  const firstRow = rows.children[0];
  firstRow.id = "game-slice-0";

  for (let i = 1; i < GUESSES; i++) {
    const newRow = firstRow.cloneNode(true);
    newRow.id = `game-slice-${i}`;
    rows.appendChild(newRow);
  }
}

function updateGameSlicesBasedOnOverflow() {
  const slices = document.getElementById("game-slices");
  if (hasOverflow(slices)) {
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
  const slices = document.getElementById("game-slices");
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
    if (window.innerWidth > ROW_TO_COL_MEDIA_BREAKPOINT) {
      slices.scrollLeft += event.deltaY;
    } else {
      slices.scrollTop += event.deltaY;
    }
  };
}

function unbindScrollFromGameSlices() {
  const slices = document.getElementById("game-slices");
  slices.onwheel = () => {};
}

/**
 * @param {CodePegColour} colour
 */
function createCodePeg(
  colour,
  cursorPointer = false,
  onClick = null,
  tabIndex = false
) {
  const peg = document.createElement("div");
  peg.classList.add("code-peg");
  peg.style.background = `radial-gradient(circle at 57.5% 40%, ${colour}, ${shadeColour(
    colour,
    -30
  )} 70%, ${shadeColour(colour, -50)})`;
  peg.style.boxShadow = `
    -7px 7px 15px 2px rgba(0, 0, 0, 0.6),
    2px -2px 8px rgba(255, 255, 255, 0.5) inset
  `;
  if (cursorPointer) peg.style.cursor = "pointer";
  if (onClick) peg.onclick = onClick;
  if (tabIndex) {
    peg.tabIndex = "0";
    peg.role = "button";
    peg.ariaLabel = "button";
  }
  return peg;
}

/**
 * @param {KeyPegColour} colour
 */
function createKeyPeg(colour) {
  const peg = document.createElement("div");
  peg.classList.add("key-peg");
  peg.style.background = `radial-gradient(circle at 60% 30%, ${colour}, ${shadeColour(
    colour,
    -40
  )} 150%, ${shadeColour(colour, -50)})`;
  peg.style.boxShadow = `
    -3px 3px 9px 2px rgba(0, 0, 0, 0.6),
    1px -1px 4px rgba(255, 255, 255, 0.5) inset
  `;

  return peg;
}

function createCodebreakerPegSequenceElement() {
  const div = document.createElement("div");
  div.id = "codemakerRevealedCode";
  for (const colour of codemakerCode) {
    div.appendChild(createCodePeg(colour));
  }
  return div;
}

function getActiveGameSlice() {
  return document.querySelector(`#game-slice-${activeGameSliceIndex}`);
}

function getActiveGameSlicePegHolders() {
  return getActiveGameSlice().querySelector(".code-peg-holders");
}

function getActiveGameSliceKeyHolders() {
  return getActiveGameSlice().querySelector(".key-peg-holders");
}

function scrollActiveGameSliceIntoView() {
  if (hasOverflow(document.getElementById("game-slices")))
    getActiveGameSlice().scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
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

/* GAME-RELATED FUNCTIONS */
/**
 *
 * @param {CodePegColour} colour
 */
function addCodePeg(colour) {
  if (postGameConclusion) return;
  const codePegHolders = getActiveGameSlicePegHolders();
  for (const node of codePegHolders.children) {
    if (
      !node.classList.contains("code-peg-connector") &&
      !node.querySelector(".code-peg")
    ) {
      node.appendChild(createCodePeg(colour));
      codebreakerCode.push(colour);
      break;
    }
  }
  scrollActiveGameSliceIntoView();
}

function deleteCodePeg() {
  if (postGameConclusion) return;
  const codePegHolders = getActiveGameSlicePegHolders();
  for (const node of [...codePegHolders.children].reverse()) {
    if (node.querySelector(".code-peg")) {
      node.removeChild(node.firstChild);
      codebreakerCode.pop();
      break;
    }
  }
  scrollActiveGameSliceIntoView();
}

function wipeAllBoardPegs() {
  document
    .querySelectorAll(".game-slice .key-peg, .game-slice .code-peg")
    .forEach(node => node.remove());
}

function setKeyPegs(evaluationMap) {
  const keyPegHolders = getActiveGameSliceKeyHolders();
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
      node => !node.children.length
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

function newGame() {
  let slice = getActiveGameSlice();
  if (!slice) {
    activeGameSliceIndex--;
    slice = getActiveGameSlice();
  }
  slice.classList.remove("active");
  activeGameSliceIndex = 0;
  postGameConclusion = false;
  setTemporaryFeedbackText("#newGameButton", "Started!");
  wipeAllBoardPegs();
  makeCode();
  getActiveGameSlice().classList.add("active");
}

function evaluateGuess() {
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
  if (codebreakerCode.length < GUESS_SLOTS)
    return alert(
      `Error: Your guess must be equivalent to the amount of guess slots (${GUESS_SLOTS}).`
    );
  const evaluation = evaluateGuess();
  setKeyPegs(JSON.parse(JSON.stringify(evaluation)));
  codebreakerCode = [];
  const oldActiveGameSlice = getActiveGameSlice();
  activeGameSliceIndex++;
  if (evaluation.correctPositionAndColour === GUESS_SLOTS) {
    // won
    winDialog.showModal();
    modalOpen = true;
    postGameConclusion = true;
    confetti({ particleCount: 200, disableForReducedMotion: true });
  } else if (activeGameSliceIndex + 1 > GUESSES) {
    // lost
    document.querySelector("#codemakerRevealedCode")?.remove();
    failureDialog.showModal();
    modalOpen = true;
    failureDialog.insertBefore(
      createCodebreakerPegSequenceElement(),
      failureDialog.lastElementChild
    );
    postGameConclusion = true;
  } else {
    // next game slice
    oldActiveGameSlice.classList.remove("active");
    getActiveGameSlice().classList.add("active");
    scrollActiveGameSliceIntoView();
  }
}

/* UTILITY FUNCTIONS */
function shadeColour(color, percent) {
  const num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = ((num >> 8) & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;

  return `rgb(${Math.min(255, Math.max(0, R))}, ${Math.min(
    255,
    Math.max(0, G)
  )}, ${Math.min(255, Math.max(0, B))})`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasOverflow(container) {
  return (
    container.scrollHeight > container.clientHeight ||
    container.scrollWidth > container.clientWidth
  );
}
