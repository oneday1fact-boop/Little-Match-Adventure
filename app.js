"use strict";
const app = document.querySelector("#app");
const SAVE_KEY = "little-match-adventure-v2";
const WORLDS = [
  {
    id: "meadow",
    animals: ["rabbit", "cat", "dog", "cow", "pig", "chick", "sheep", "horse"],
    mascot: "rabbit",
  },
  {
    id: "forest",
    animals: [
      "fox",
      "bear",
      "owl",
      "squirrel",
      "raccoon",
      "deer",
      "rabbit",
      "hedgehog",
    ],
    mascot: "fox",
  },
  {
    id: "ocean",
    animals: [
      "whale",
      "turtle",
      "octopus",
      "crab",
      "fish",
      "seahorse",
      "seal",
      "penguin",
    ],
    mascot: "whale",
  },
  {
    id: "safari",
    animals: [
      "lion",
      "elephant",
      "giraffe",
      "zebra",
      "monkey",
      "hippo",
      "parrot",
      "crocodile",
    ],
    mascot: "lion",
  },
];
const locales = window.LMA_LOCALES;
function detectLanguage() {
  for (const language of navigator.languages || [navigator.language || "en"]) {
    if (locales[language]) return language;
    if (/^zh/i.test(language))
      return /TW|HK|MO|Hant/i.test(language) ? "zh-Hant" : "zh-Hans";
    const base = language.split("-")[0];
    if (locales[base]) return base;
  }
  return "en";
}
let state = {
  version: 2,
  completed: [0, 0, 0, 0],
  games: 0,
  pendingAd: false,
  language: detectLanguage(),
  music: false,
  effects: true,
  active: null,
  lastWorld: 0,
};
let storageAvailable = true;
function validBoard(board) {
  if (
    !board ||
    !Number.isInteger(board.world) ||
    board.world < 0 ||
    board.world >= WORLDS.length ||
    !Number.isInteger(board.stage) ||
    board.stage < 1 ||
    board.stage > 20 ||
    board.stage > state.completed[board.world] + 1
  )
    return false;
  const pairs = pairCount(board.stage);
  if (
    !Array.isArray(board.cards) ||
    board.cards.length !== pairs * 2 ||
    !Array.isArray(board.matched) ||
    board.matched.length >= board.cards.length ||
    new Set(board.matched).size !== board.matched.length
  )
    return false;
  const counts = {};
  for (const animal of board.cards) {
    if (!WORLDS[board.world].animals.includes(animal)) return false;
    counts[animal] = (counts[animal] || 0) + 1;
  }
  if (Object.values(counts).some((count) => count !== 2)) return false;
  if (
    board.matched.some(
      (index) =>
        !Number.isInteger(index) || index < 0 || index >= board.cards.length,
    )
  )
    return false;
  return board.matched.every((index) =>
    board.cards.every(
      (animal, other) =>
        animal !== board.cards[index] || board.matched.includes(other),
    ),
  );
}
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (
      saved &&
      Array.isArray(saved.completed) &&
      saved.completed.length === 4 &&
      saved.completed.every((n) => Number.isInteger(n) && n >= 0 && n <= 20)
    )
      state.completed = saved.completed;
    if (saved && Number.isSafeInteger(saved.games) && saved.games >= 0)
      state.games = saved.games;
    if (saved && typeof saved.pendingAd === "boolean")
      state.pendingAd = saved.pendingAd;
    if (saved && Object.hasOwn(locales, saved.language))
      state.language = saved.language;
    if (saved && typeof saved.music === "boolean") state.music = saved.music;
    if (saved && typeof saved.effects === "boolean")
      state.effects = saved.effects;
    if (
      saved &&
      Number.isInteger(saved.lastWorld) &&
      saved.lastWorld >= 0 &&
      saved.lastWorld < 4
    )
      state.lastWorld = saved.lastWorld;
    if (saved && validBoard(saved.active)) state.active = saved.active;
  } else {
    try {
      const old = JSON.parse(localStorage.getItem("little-match-adventure-v1"));
      if (
        old &&
        Number.isInteger(old.completed) &&
        old.completed >= 0 &&
        old.completed <= 20
      )
        state.completed[0] = old.completed;
      if (old && typeof old.sound === "boolean") state.effects = old.sound;
    } catch {
      /* A damaged legacy save must not prevent a fresh game. */
    }
  }
} catch {
  /* Invalid data falls back to a fresh local save. */
}
let game = null;
let screen = { name: "home", world: 0 };
let timers = [];
let installPrompt;
const n = (value) => new Intl.NumberFormat(state.language).format(value);
function t(key, values = {}) {
  return (locales[state.language][key] || locales.en[key] || key).replace(
    /\{(\w+)\}/g,
    (_, name) =>
      typeof values[name] === "number" ? n(values[name]) : (values[name] ?? ""),
  );
}
function worldName(index) {
  return locales[state.language].worldNames[index];
}
function animalName(id) {
  return locales[state.language].animals[id];
}
function pairCount(stage) {
  return Math.min(8, 3 + Math.floor((stage - 1) / 3));
}
function art(id, className = "", decorative = false) {
  return `<img class="${className}" src="assets/animals/${id}.svg" alt="${decorative ? "" : animalName(id)}" draggable="false">`;
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  const warning = document.querySelector("#storage-warning");
  warning.hidden = storageAvailable;
  warning.textContent = t("storageWarning");
  document.querySelector("#save-status").textContent = storageAvailable
    ? t("progressSaved")
    : t("storageWarning");
}
function later(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
function clearGame() {
  clearTimers();
  game = null;
}
function stashBoard() {
  if (!game || game.won) return;
  state.active = {
    world: game.world,
    stage: game.stage,
    cards: game.cards,
    matched: [...game.matched],
  };
  save();
}
function unlocked(world) {
  return world === 0 || state.completed[world - 1] === 20;
}
function theme(world = null) {
  document.body.dataset.world = world === null ? "" : WORLDS[world].id;
}
function refreshChrome() {
  document.documentElement.lang = state.language;
  document.documentElement.dir = locales[state.language].dir;
  document.querySelector("#language-label").textContent = t("language");
  document.querySelector("#language").value = state.language;
  for (const key of ["music", "effects"]) {
    const button = document.querySelector(`#${key}`);
    button.setAttribute("aria-label", t(`${key}${state[key] ? "Off" : "On"}`));
    button.setAttribute("aria-pressed", String(state[key]));
    button.title = t(key);
  }
  document.querySelector("#footer-message").textContent = t("footer");
  document.querySelector("#install").textContent = t("install");
  document.querySelector("#install").hidden =
    Boolean(window.AndroidAds) ||
    window.matchMedia("(display-mode: standalone)").matches;
  document.querySelector("#ad-dialog").setAttribute("aria-label", t("advert"));
  window.LMAAudio.configure(state);
  save();
}
const languageSelect = document.querySelector("#language");
Object.entries(locales).forEach(([code, data]) => {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = data.name;
  languageSelect.append(option);
});
languageSelect.onchange = () => {
  state.language = languageSelect.value;
  refreshChrome();
  if (screen.name === "game") {
    renderBoard();
  } else if (screen.name === "map") map(screen.world);
  else if (screen.name === "win") celebrate(screen.world, screen.stage, false);
  else home();
};
for (const key of ["music", "effects"])
  document.querySelector(`#${key}`).onclick = () => {
    state[key] = !state[key];
    window.LMAAudio.unlock();
    refreshChrome();
  };
document.addEventListener("click", (event) => {
  if (event.target.closest("button, select, a")) {
    window.LMAAudio.unlock();
    window.LMAAudio.click();
  }
});
document.querySelector(".brand").onclick = (event) => {
  event.preventDefault();
  if (!window.LMAAds.isActive()) home();
};
function home() {
  clearGame();
  screen = { name: "home", world: state.lastWorld };
  theme();
  const resume = state.active;
  const total = state.completed.reduce((a, b) => a + b, 0);
  app.innerHTML = `<section class="hero"><div><span class="eyebrow">${t("tagline")}</span><h1>${t("title1")}<br><em>${t("title2")}</em></h1><p>${t("intro")}</p><button class="button" id="play">${resume ? t("resume") : total ? t("continue") : t("play")} <span class="arrow">→</span></button><div class="hero-mini">${art("chick", "", true)}<span>${t("note")}</span></div></div><div class="hero-art"><div class="hero-art-caption"><span class="eyebrow">LITTLE MATCH ADVENTURE</span><span>${worldName(0)}</span></div><div class="animal-scene">${art("rabbit")}${art("fox")}</div><span class="art-flower one" aria-hidden="true">✿</span><span class="art-flower two" aria-hidden="true">✿</span></div></section><section aria-labelledby="world-title"><div class="section-title"><div><span class="eyebrow">${t("collection")}</span><h2 id="world-title">${t("worlds")}</h2><p>${t("worldIntro")}</p></div><span class="world-count">${n(total)} <span>/ ${n(80)}</span></span></div><div class="worlds">${WORLDS.map((world, index) => `<button class="world-card ${unlocked(index) ? "available" : "locked"}" data-world="${index}" ${unlocked(index) ? "" : "disabled"} aria-label="${worldName(index)}${unlocked(index) ? "" : ` — ${t("unlock")}`}"><div class="world-art ${world.id}"><span class="world-number">${t("world", { n: index + 1 })}</span>${art(world.mascot, "world-animal", true)}${unlocked(index) ? "" : '<span class="lock-icon" aria-hidden="true">⌑</span>'}</div><div class="world-info"><h3>${worldName(index)}</h3><div class="progress-track"><span style="width:${state.completed[index] * 5}%"></span></div><div class="world-bottom"><span>${t("stages", { n: state.completed[index] })}</span><span>${unlocked(index) ? `${t("explore")} →` : "—"}</span></div></div></button>`).join("")}</div></section>`;
  document.querySelector("#play").onclick = () => {
    if (resume) start(resume.world, resume.stage, true);
    else {
      let world = state.lastWorld;
      if (!unlocked(world)) world = 0;
      start(world, Math.min(state.completed[world] + 1, 20));
    }
  };
  document
    .querySelectorAll(".world-card[data-world]")
    .forEach(
      (button) => (button.onclick = () => map(Number(button.dataset.world))),
    );
}
function map(world) {
  clearGame();
  screen = { name: "map", world };
  theme(world);
  state.lastWorld = world;
  save();
  app.innerHTML = `<button class="back" id="back"><span class="arrow">←</span> ${t("back")}</button><div class="map-hero">${art(WORLDS[world].mascot, "map-mascot")}<div><span class="eyebrow">${t("world", { n: world + 1 })}</span><h1>${worldName(world)}</h1><p>${t("worldIntro")}</p></div></div><div class="stage-grid">${Array.from({ length: 20 }, (_, i) => `<button class="stage ${i < state.completed[world] ? "done" : i === state.completed[world] ? "current" : ""}" data-stage="${i + 1}" ${i > state.completed[world] ? "disabled" : ""} aria-label="${t("stage", { n: i + 1 })}${i < state.completed[world] ? ` — ${t("complete")}` : ""}"><span>${i < state.completed[world] ? "✿" : n(i + 1)}</span><small>${t("stage", { n: i + 1 })}</small></button>`).join("")}</div>`;
  document.querySelector("#back").onclick = home;
  document.querySelectorAll("[data-stage]").forEach(
    (button) =>
      (button.onclick = () => {
        const stage = Number(button.dataset.stage);
        start(
          world,
          stage,
          Boolean(
            state.active &&
              state.active.world === world &&
              state.active.stage === stage,
          ),
        );
      }),
  );
}
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function start(world, stage, resume = false) {
  if (
    !unlocked(world) ||
    stage < 1 ||
    stage > Math.min(20, state.completed[world] + 1)
  )
    return;
  const board =
    resume &&
    state.active &&
    validBoard(state.active) &&
    state.active.world === world &&
    state.active.stage === stage
      ? state.active
      : null;
  clearGame();
  const pairs = pairCount(stage);
  const chosen = shuffled(WORLDS[world].animals).slice(0, pairs);
  game = {
    world,
    stage,
    pairs,
    cards: board ? board.cards : shuffled([...chosen, ...chosen]),
    open: [],
    matched: new Set(board ? board.matched : []),
    busy: false,
    won: false,
    note: "note",
  };
  screen = { name: "game", world, stage };
  theme(world);
  state.lastWorld = world;
  stashBoard();
  renderBoard();
}
function renderBoard() {
  if (!game) return;
  const { world, stage, pairs } = game;
  app.innerHTML = `<button class="back" id="back"><span class="arrow">←</span> ${worldName(world)}</button><section class="game-shell"><div class="page-heading"><span class="eyebrow">${worldName(world)} · ${t("stage", { n: stage })}</span><h1>${t("boardTitle")}</h1><p>${t("boardIntro")}</p></div><div class="game-toolbar"><span class="game-status" role="status" id="progress"></span><div class="game-actions"><button class="small-button" id="hint"><span aria-hidden="true">✧</span> ${t("hint")}</button><button class="small-button" id="restart"><span aria-hidden="true">↻</span> ${t("restart")}</button></div></div><div class="board ${pairs > 6 ? "large" : ""}" aria-label="${t("boardIntro")}">${game.cards.map((animal, i) => `<button class="tile" data-card="${i}" data-animal="${animal}" aria-pressed="false"><span class="card-back" aria-hidden="true"><span>✿</span></span><span class="face" aria-hidden="true">${art(animal, "", true)}</span><span class="match-check" aria-hidden="true">✓</span></button>`).join("")}</div><p class="game-note" id="note" aria-live="polite"></p></section>`;
  document.querySelector("#back").onclick = () => map(world);
  document.querySelector("#restart").onclick = () => start(world, stage);
  document.querySelector("#hint").onclick = requestHint;
  document
    .querySelectorAll("[data-card]")
    .forEach(
      (button) => (button.onclick = () => flip(Number(button.dataset.card))),
    );
  renderCards();
}
function renderCards() {
  if (!game) return;
  document.querySelectorAll("[data-card]").forEach((button, index) => {
    const matched = game.matched.has(index);
    const revealed = game.open.includes(index);
    button.classList.toggle("matched", matched);
    button.classList.toggle("revealed", revealed);
    button.disabled = matched || game.busy || revealed;
    button.setAttribute(
      "aria-label",
      matched
        ? t("matched", { animal: animalName(game.cards[index]) })
        : revealed
          ? animalName(game.cards[index])
          : t("hidden", { n: index + 1 }),
    );
    button.setAttribute("aria-pressed", String(matched || revealed));
  });
  document.querySelector("#hint").disabled =
    game.busy || game.open.length > 0 || game.won;
  document.querySelector("#progress").textContent = t("pairs", {
    n: game.matched.size / 2,
    total: game.pairs,
  });
  document.querySelector("#note").textContent = t(game.note || "note");
}
function flip(index) {
  if (
    !game ||
    game.busy ||
    game.won ||
    game.matched.has(index) ||
    game.open.includes(index)
  )
    return;
  game.open.push(index);
  if (game.open.length === 2) {
    const [a, b] = game.open;
    if (game.cards[a] === game.cards[b]) {
      game.matched.add(a);
      game.matched.add(b);
      game.open = [];
      game.note = "match";
      if (game.matched.size === game.cards.length) {
        game.won = true;
        game.busy = true;
        state.completed[game.world] = Math.max(
          state.completed[game.world],
          game.stage,
        );
        state.games++;
        state.active = null;
        if (state.games % 3 === 0) state.pendingAd = true;
        save();
        later(finishGame, 600);
      } else stashBoard();
    } else {
      game.busy = true;
      game.note = "retry";
      later(() => {
        game.open = [];
        game.busy = false;
        renderCards();
      }, 1000);
    }
  }
  renderCards();
}
async function finishGame() {
  const { world, stage } = game;
  if (state.pendingAd) await showScheduledAd();
  celebrate(world, stage);
}
async function showScheduledAd() {
  await window.LMAAds.show("interstitial", t);
  state.pendingAd = false;
  save();
}
function requestHint() {
  if (!game || game.busy || game.open.length || game.won) return;
  const dialog = document.querySelector("#reward-dialog");
  document.querySelector("#reward-label").textContent = t("advert");
  document.querySelector("#reward-title").textContent = t("rewardTitle");
  document.querySelector("#reward-description").textContent = t("rewardBody");
  document.querySelector("#reward-watch").textContent = t("watchAd");
  document.querySelector("#reward-cancel").textContent = t("cancel");
  document.querySelector("#reward-cancel").onclick = () => dialog.close();
  document.querySelector("#reward-watch").onclick = async () => {
    dialog.close();
    const currentGame = game;
    game.busy = true;
    game.note = "adLoading";
    renderCards();
    const result = await window.LMAAds.show("rewarded", t);
    if (game !== currentGame) return;
    game.busy = false;
    if (result.rewarded || result.status === "unavailable")
      revealHint(result.status === "unavailable");
    else {
      game.note = "note";
      renderCards();
    }
  };
  dialog.showModal();
}
function revealHint(unavailable = false) {
  const first = game.cards.findIndex((_, i) => !game.matched.has(i));
  const second = game.cards.findIndex(
    (animal, i) =>
      i !== first && !game.matched.has(i) && animal === game.cards[first],
  );
  game.busy = true;
  game.open = [first, second];
  game.note = unavailable ? "adUnavailable" : "hintNote";
  renderCards();
  later(() => {
    game.open = [];
    game.busy = false;
    game.note = "note";
    renderCards();
  }, 1900);
}
function celebrate(world, stage, playSound = true) {
  clearGame();
  screen = { name: "win", world, stage };
  theme(world);
  if (playSound) window.LMAAudio.celebrate();
  app.innerHTML = `<section class="win"><div class="confetti" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100}%;--r:${i * 29}deg"></i>`).join("")}</div><span class="eyebrow">${worldName(world)}</span><div class="win-stars" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div><div class="win-animals">${art(WORLDS[world].animals[0], "", true)}${art(WORLDS[world].animals[1], "", true)}${art(WORLDS[world].animals[2], "", true)}</div><h1 tabindex="-1">${t(stage === 20 ? "winFinal" : "winTitle")}</h1><p>${t("winSub", { n: stage })}</p><div class="win-progress"><span style="--progress:${state.completed[world] * 5}%"></span></div><span class="win-progress-label">${t("stages", { n: state.completed[world] })}</span><div class="win-actions"><button class="button" id="next">${t(stage < 20 ? "next" : world < 3 ? "explore" : "replay")} <span class="arrow">→</span></button><button class="button secondary" id="map">${t("worldMap")}</button></div></section>`;
  document.querySelector("#map").onclick = () => map(world);
  document.querySelector("#next").onclick = () =>
    stage < 20
      ? start(world, stage + 1)
      : world < 3
        ? map(world + 1)
        : start(world, 1);
  document.querySelector(".win h1").focus({ preventScroll: true });
}
const help = document.querySelector("#help-dialog");
document.querySelector("#help-close").onclick = () => help.close();
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("appinstalled", () => {
  document.querySelector("#install").hidden = true;
  installPrompt = null;
});
document.querySelector("#install").onclick = async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    return;
  }
  document.querySelector("#help-title").textContent = t("install");
  document.querySelector("#help-message").textContent = t("installHelp");
  document.querySelector("#help-close").textContent = t("close");
  help.showModal();
};
window.lmaAndroidBack = () => {
  if (window.LMAAds.isActive()) return true;
  const dialog = document.querySelector("dialog[open]");
  if (dialog) {
    dialog.close();
    return true;
  }
  if (screen.name === "game" || screen.name === "win") {
    map(screen.world);
    return true;
  }
  if (screen.name === "map") {
    home();
    return true;
  }
  return false;
};
window.addEventListener("pagehide", stashBoard);
refreshChrome();
home();
if (state.pendingAd) showScheduledAd();
if (
  "serviceWorker" in navigator &&
  !window.AndroidAds &&
  ["http:", "https:"].includes(location.protocol)
) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* Online gameplay remains available. */
  });
}

const privacyDialog = document.querySelector("#privacy-dialog");
document.querySelector("#privacy-open").onclick = () => privacyDialog.showModal();
document.querySelector("#privacy-close").onclick = () => privacyDialog.close();
