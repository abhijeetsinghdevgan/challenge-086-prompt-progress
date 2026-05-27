/**
 * Progress Hub — four ways to measure forward motion
 */

const CIRCUMFERENCE = 2 * Math.PI * 52; // day ring radius
const MOVIE_DURATION = 7440; // 2h 04m in seconds
const BOOK_TOTAL = 304;
const PAGES_PER_DAY = 28;

const CHAPTERS = [
  { page: 1, label: "Ch. 1 · Karhide" },
  { page: 24, label: "Ch. 4 · The Place" },
  { page: 58, label: "Ch. 7 · The Question" },
  { page: 92, label: "Ch. 10 · Spring" },
  { page: 128, label: "Ch. 12 · Oniasbeddin" },
  { page: 162, label: "Ch. 14 · Orgoreyn" },
  { page: 198, label: "Ch. 16 · Between" },
  { page: 240, label: "Ch. 18 · On the Ice" },
  { page: 280, label: "Ch. 20 · A Fool's Errand" },
];

// --- Utilities ---

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatClock(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// --- Day progress ---

const dayRingFill = document.getElementById("dayRingFill");
const dayPct = document.getElementById("dayPct");
const dayElapsed = document.getElementById("dayElapsed");
const dayRemaining = document.getElementById("dayRemaining");

function updateDay() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);

  const elapsedMs = now - start;
  const totalMs = end - start;
  const pct = (elapsedMs / totalMs) * 100;

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  dayRingFill.style.strokeDashoffset = offset;

  dayPct.textContent = `${Math.round(pct)}%`;

  const elapsedMin = Math.floor(elapsedMs / 60000);
  const remainMin = Math.ceil((end - now) / 60000);
  dayElapsed.textContent = formatClock(elapsedMin);
  dayRemaining.textContent = formatClock(remainMin);
}

// --- Movie progress ---

const movieScrubber = document.getElementById("movieScrubber");
const movieCurrent = document.getElementById("movieCurrent");
const movieRemaining = document.getElementById("movieRemaining");
const moviePct = document.getElementById("moviePct");
const moviePlay = document.getElementById("moviePlay");
const playIcon = document.getElementById("playIcon");
const playLabel = document.getElementById("playLabel");

let moviePosition = Number(movieScrubber.value);
let moviePlaying = false;
let movieTimer = null;

function renderMovie() {
  moviePosition = clamp(moviePosition, 0, MOVIE_DURATION);
  movieScrubber.value = moviePosition;

  const remaining = MOVIE_DURATION - moviePosition;
  const pct = Math.round((moviePosition / MOVIE_DURATION) * 100);

  movieCurrent.textContent = formatTime(moviePosition);
  movieRemaining.textContent = `${formatTime(remaining)} left`;
  moviePct.textContent = pct;
}

function tickMovie() {
  if (!moviePlaying) return;
  moviePosition += 1;
  if (moviePosition >= MOVIE_DURATION) {
    moviePosition = MOVIE_DURATION;
    setMoviePlaying(false);
  }
  renderMovie();
}

function setMoviePlaying(playing) {
  moviePlaying = playing;
  moviePlay.setAttribute("aria-pressed", String(playing));
  playIcon.textContent = playing ? "❚❚" : "▶";
  playLabel.textContent = playing ? "Pause" : "Play";

  clearInterval(movieTimer);
  if (playing) {
    movieTimer = setInterval(tickMovie, 1000);
  }
}

movieScrubber.addEventListener("input", () => {
  moviePosition = Number(movieScrubber.value);
  renderMovie();
});

moviePlay.addEventListener("click", () => {
  if (moviePosition >= MOVIE_DURATION) moviePosition = 0;
  setMoviePlaying(!moviePlaying);
});

renderMovie();

// --- Book progress ---

const bookSlider = document.getElementById("bookSlider");
const bookPageNum = document.getElementById("bookPageNum");
const bookChapter = document.getElementById("bookChapter");
const bookBarFill = document.getElementById("bookBarFill");
const bookEta = document.getElementById("bookEta");
const bookPagesEl = document.getElementById("bookPages");

function buildBookPages() {
  const fragment = document.createDocumentFragment();
  const count = 24;
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("div");
    bar.className = "book-page";
    bar.dataset.index = i;
    fragment.appendChild(bar);
  }
  bookPagesEl.appendChild(fragment);
}

function chapterForPage(page) {
  let label = CHAPTERS[0].label;
  for (const ch of CHAPTERS) {
    if (page >= ch.page) label = ch.label;
  }
  return label;
}

function updateBook() {
  const page = Number(bookSlider.value);
  const pct = (page / BOOK_TOTAL) * 100;

  bookPageNum.textContent = page;
  bookChapter.textContent = chapterForPage(page);
  bookBarFill.style.width = `${pct}%`;

  const pagesLeft = BOOK_TOTAL - page;
  const daysLeft = Math.ceil(pagesLeft / PAGES_PER_DAY);
  bookEta.textContent =
    pagesLeft <= 0
      ? "Finished!"
      : `~${daysLeft} day${daysLeft === 1 ? "" : "s"} left at ${PAGES_PER_DAY} pgs/day`;

  const bars = bookPagesEl.querySelectorAll(".book-page");
  const readBars = Math.round((page / BOOK_TOTAL) * bars.length);
  bars.forEach((bar, i) => {
    bar.classList.toggle("book-page--read", i < readBars);
  });
}

bookSlider.addEventListener("input", updateBook);
buildBookPages();
updateBook();

// --- Personal goal (localStorage) ---

const STORAGE_KEY = "progressHubGoal";
const goalName = document.getElementById("goalName");
const goalSlider = document.getElementById("goalSlider");
const goalFill = document.getElementById("goalFill");
const goalText = document.getElementById("goalText");
const goalMilestones = document.getElementById("goalMilestones");
const goalReset = document.getElementById("goalReset");

const MILESTONES = [0, 25, 50, 75, 100];

function loadGoal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.name) goalName.value = data.name;
    if (typeof data.pct === "number") goalSlider.value = data.pct;
  } catch {
    /* ignore corrupt storage */
  }
}

function saveGoal() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      name: goalName.value,
      pct: Number(goalSlider.value),
    })
  );
}

function renderMilestones(pct) {
  goalMilestones.innerHTML = MILESTONES.map((m) => {
    const done = pct >= m;
    return `<span class="${done ? "done" : ""}">${m}%</span>`;
  }).join("");
}

function updateGoal() {
  const pct = Number(goalSlider.value);
  goalFill.style.width = `${pct}%`;
  goalText.textContent = `${pct}%`;
  renderMilestones(pct);
  saveGoal();
}

goalSlider.addEventListener("input", updateGoal);
goalName.addEventListener("change", saveGoal);
goalName.addEventListener("blur", saveGoal);

goalReset.addEventListener("click", () => {
  goalSlider.value = 0;
  updateGoal();
});

loadGoal();
updateGoal();

// --- Init ---

updateDay();
setInterval(updateDay, 30_000);
