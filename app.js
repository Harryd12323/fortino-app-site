// Dr. Robert Fortino — patient-facing weight-loss PWA prototype. Plain JS, no build step, no outside scripts.
// Five tabs: Today · Progress · Plan · Care · Learn (plus the readiness quiz and the ⋯ "More" page).
//
// PREVIEW: nothing leaves this device. Before real patients use it, every "TODO(HIPAA)", "TODO(auth)" and
// "TODO(payments)" below (and in index.html) must be done, and every "TODO(confirm)" / "TODO(confirm with Doc)"
// approved by the practice.
//
// TODO(auth): TEST BUILD ONLY. "Account & sync" below signs people in with Supabase (6-digit email code) and syncs
// habits, check-ins, waist entries and wins to the user_data table (supabase/schema.sql, Row Level Security).
// That project has NO BAA, so it may hold made-up data only. Before real patients use it:
//   - Supabase HIPAA add-on + signed BAA (Team plan or above), and a BAA-covered host (GitHub Pages isn't);
//   - session tokens: supabase-js keeps them in localStorage. A static site can't use httpOnly cookies, so this
//     needs a server or edge function in front, or an explicit risk decision;
//   - MFA option, idle timeout / sign-out on shared devices, audit logging, and the practice's privacy notice.
//
// Guardrails (see index.html): no weight tracking or weight-loss numbers, no dose advice, no brand "same as" or
// compounded claims, no before/after or needle imagery, guides report rather than prescribe.

"use strict";

const CONFIG = {
  price: "$XXX",                    // TODO(confirm): placeholder monthly membership price
  // TODO(confirm with Doc): daily targets must be set by the patient's physician (later: per patient, from their
  // record). Leave them null until then; the app shows "set with your care team" instead of a generic number.
  targets: { protein: null, hydration: null, movement: null },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

$$("[data-config]").forEach((el) => { el.textContent = CONFIG[el.dataset.config]; });

// ---------- Toast ----------
let toastTimer;
function toast(msg, ms = 3500) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// ---------- Dates and on-device storage ----------
// TODO(HIPAA): all of this is unencrypted localStorage (plus the test-account sync below). See TODO(auth) above.
const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const todayISO = () => iso(new Date());
const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const fmtDate = (s, opts = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(s + "T12:00:00").toLocaleDateString(undefined, opts);
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); queuePush(key); };
const KEYS = { habits: "fortino.habits", checkins: "fortino.checkins", waist: "fortino.waist", wins: "fortino.wins",
               goal: "fortino.goal", workoutTimes: "fortino.workoutTimes",   // these two: this device only, not synced
               oldWeights: "fortino.weights" };   // oldWeights: left by the earlier version; only ever deleted

// ---------- Account & sync (TEST BUILD, see TODO(auth) above) ----------
// localStorage stays the working copy, so the app works offline. When signed in, every save() is also upserted to
// Supabase (one row per key). On sign-in, account data is merged with whatever is on this device.
// Signing out removes the synced data from this device.
const SYNCED = [KEYS.habits, KEYS.checkins, KEYS.waist, KEYS.wins];
const SB = window.SUPABASE_CONFIG || {};
const sb = window.supabase && SB.url && !SB.url.includes("YOUR-PROJECT-REF")
  ? window.supabase.createClient(SB.url, SB.publishableKey, { auth: { flowType: "pkce", detectSessionInUrl: false } })
  : null;
let user = null;
const pending = new Set();
let pushTimer;
const where = () => (user ? "to your account" : "on this device");

function queuePush(key) {
  if (!user || !SYNCED.includes(key)) return;
  pending.add(key);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushPending, 500);
}
async function pushPending() {
  if (!user || !pending.size) return;
  const rows = [...pending].map((key) => ({ user_id: user.id, key, value: load(key, null) })).filter((r) => r.value !== null);
  pending.clear();
  const { error } = rows.length ? await sb.from("user_data").upsert(rows) : {};
  if (error) { rows.forEach((r) => pending.add(r.key)); console.warn("Sync failed", error); }
  renderAccount();
}
window.addEventListener("online", pushPending);

// Habits and check-ins are keyed by day (the account's copy wins for the same day); waist entries and wins are
// lists with ids (union, nothing dropped).
const merge = (local, remote) => Array.isArray(remote)
  ? [...remote, ...(local || []).filter((x) => !remote.some((y) => y.id === x.id))]
  : { ...local, ...remote };

async function pullAll() {
  const { data, error } = await sb.from("user_data").select("key, value");
  if (error) { console.warn("Sync failed", error); toast("Couldn't load your account data. Check your connection."); return; }
  const remote = Object.fromEntries(data.map((r) => [r.key, r.value]));
  SYNCED.forEach((key) => {
    const local = load(key, null);
    if (local === null && !(key in remote)) return;
    const value = local === null ? remote[key] : key in remote ? merge(local, remote[key]) : local;
    localStorage.setItem(key, JSON.stringify(value));
    if (JSON.stringify(value) !== JSON.stringify(remote[key])) pending.add(key);
  });
  await pushPending();
  route();
}

function renderAccount() {
  if (!sb) return;
  $("#account").hidden = false;
  $("#account-out").hidden = Boolean(user);
  $("#signed-in-bar").hidden = !user;
  $("#signed-in-email").textContent = user ? user.email : "";
  $("#account-in").hidden = !user;
  $(".preview-pill").title = user ? "Test account: use made-up information only" : "Nothing is sent or stored on a server yet";
  if (!user) return;
  $("#account-email").textContent = user.email;
  $("#sync-status").textContent = pending.size
    ? "Some changes haven't synced yet. They'll sync when you're back online."
    : "Your habits, check-ins, waist entries and wins are synced.";
}

if (sb) {
  // The sign-in email's link (desktop testing until custom SMTP lets the email show the 6-digit code) comes back as
  // ?code=… and only works in the browser that asked for it. A failed link reports ?error_description=… or the same
  // in the hash. Clear these from the address bar before the hash router runs, then finish signing in.
  const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
  const code = q.get("code"), linkError = q.get("error_description") || h.get("error_description");
  if (code || linkError) history.replaceState(null, "", location.pathname + (h.has("error_description") ? "" : location.hash));
  if (linkError) toast(`That sign-in link didn't work: ${linkError}. Please ask for a new one under More.`, 7000);
  else if (code) sb.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) toast("That sign-in link didn't work. Open it in the same browser where you asked for it, or ask for a new one under More.", 8000);
  });
  sb.auth.onAuthStateChange((event, session) => {
    const prev = user;
    user = session ? session.user : null;
    // Supabase advises against awaiting its own calls inside this callback, so the work runs just after it.
    setTimeout(() => {
      if (user && (!prev || prev.id !== user.id)) {
        if (event === "SIGNED_IN") toast("Signed in.");
        pullAll();
      }
      renderAccount();
    });
  });
  renderAccount();
}

// ---------- Router ----------
// #today (default) #progress #plan #care #care/book #learn #learn/move #learn/mind #learn/<slug> #quiz #more #privacy
const ALIASES = { home: "today", membership: "plan", book: "care", menu: "more" };   // links from older versions
const TAB_FOR = { today: "today", quiz: "today", progress: "progress", plan: "plan", care: "care",
                  learn: "learn", article: "learn" };

function route() {
  let [name, arg] = (location.hash.slice(1) || "today").split("/");
  if (ALIASES[name]) { if (name === "book") arg = "book"; name = ALIASES[name]; }
  const sub = name === "learn" && (arg === "move" || arg === "mind") ? arg : "articles";   // Learn sub-tabs
  let view = name === "learn" && arg && sub === "articles" ? "article" : name;
  if (!$(`[data-view="${view}"]`)) view = "today";
  if (view === "article" && !renderArticle(arg)) { location.replace("#learn"); return; }

  $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
  $$(".tabbar a").forEach((a) => {
    if (a.dataset.tab === TAB_FOR[view]) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (view === "today") renderToday();
  if (view === "progress") renderProgress();
  if (view === "more") renderInstallState();
  if (view === "learn") showLearnPanel(sub);
  $("#main").focus({ preventScroll: true });
  if (view === "care" && arg === "book") $("#book").scrollIntoView();
  else window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// ---------- Habits (shared by Today and Progress) ----------
const HABITS = [
  { id: "protein", label: "Protein target", icon: "🥚" },
  { id: "hydration", label: "Hydration target", icon: "💧" },
  { id: "movement", label: "Movement or strength", icon: "👟" },
];
const habitsLog = () => load(KEYS.habits, {});
const isDone = (log, day, id) => Boolean(log[day] && log[day][id]);
function setHabit(day, id, done) {
  const log = habitsLog();
  log[day] = { ...(log[day] || {}), [id]: done };
  if (!Object.values(log[day]).some(Boolean)) delete log[day];
  save(KEYS.habits, log);
}
// Current streak: consecutive days ending today, or ending yesterday if today isn't ticked yet.
function currentStreak(log, id) {
  let n = 0, i = isDone(log, todayISO(), id) ? 0 : 1;
  while (isDone(log, daysAgoISO(i), id)) { n++; i++; }
  return n;
}
function bestStreak(log, id) {
  const days = Object.keys(log).filter((d) => log[d][id]).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    const next = prev && iso(new Date(new Date(prev + "T12:00:00").getTime() + 864e5)) === d;
    run = next ? run + 1 : 1; best = Math.max(best, run); prev = d;
  }
  return best;
}

// ---------- TODAY ----------
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
function greeting(d = new Date()) {
  const part = (opt) => d.toLocaleDateString("en-US", opt);
  return `Happy ${part({ weekday: "long" })}, ${part({ month: "long" })} ${ordinal(d.getDate())}`;
}

// TODO(confirm with Doc): placeholder weekly plan of Move sessions (library.js), index 0 = Sunday. A gentle early
// mix: strength on non-consecutive days (Tue, Thu). Later this should come from the patient's care plan.
const WEEK_PLAN = ["mobility-reset", "after-meal-walk", "chair-strength", "balance-builder", "strength-basics",
                   "low-impact-cardio", "after-meal-walk"];
const todaysSession = () => MOVE_SESSIONS.find((m) => m.id === WEEK_PLAN[new Date().getDay()]);
const fmtTime = (t) => new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function renderGoal() {
  const goal = load(KEYS.goal, "");
  $("#goal-show").hidden = !goal;
  $("#goal-form").hidden = Boolean(goal);
  $("#goal-text").textContent = goal;
}

function renderWorkout() {
  const w = todaysSession(), day = todayISO();
  $("#workout-title").textContent = w.name;
  $("#workout-min").textContent = `${w.min} min`;
  $("#workout-detail").textContent = w.forWhat;
  $("#workout-equipment").textContent = w.equipment;
  $("#workout-safety").textContent = w.safety;
  $("#workout-start").textContent = `Start ${w.min}-minute timer`;
  const t = load(KEYS.workoutTimes, {})[day];
  $("#workout-time-form").hidden = Boolean(t);
  $("#workout-time-show").hidden = !t;
  if (t) $("#workout-time-text").textContent = `Planned for ${fmtTime(t)}`;
  // Done ticks the "Movement or strength" habit, so it counts toward that streak.
  const done = isDone(habitsLog(), day, "movement"), btn = $("#workout-done");
  btn.textContent = done ? "✓ Done for today" : "Mark as done";
  btn.setAttribute("aria-pressed", done);

}

function renderToday() {
  $("#today-title").textContent = greeting();
  renderGoal();
  renderWorkout();
  const log = habitsLog(), day = todayISO();
  const ul = $("#today-habits");
  ul.replaceChildren();
  HABITS.forEach((h) => {
    const done = isDone(log, day, h.id);
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" class="habit-btn" aria-pressed="${done}">
        <span class="habit-icon" aria-hidden="true"></span>
        <span class="habit-text"><strong></strong><small></small></span>
        <span class="habit-check" aria-hidden="true">${done ? "✓" : ""}</span></button>`;
    $(".habit-icon", li).textContent = h.icon;
    $("strong", li).textContent = h.label;
    $("small", li).textContent = CONFIG.targets[h.id] ? `Target: ${CONFIG.targets[h.id]}` : "Target: set with your care team";
    $("button", li).addEventListener("click", () => {
      setHabit(day, h.id, !done);
      if (!done) toast(`${h.label}: done for today.`);
      renderToday();
    });
    ul.append(li);
  });

  const c = load(KEYS.checkins, {})[day];
  $("#checkin-form").hidden = Boolean(c);
  $("#checkin-done").hidden = !c;
  if (c) {
    $("#checkin-summary").textContent = `Energy: ${c.energy} · Hunger: ${c.hunger} · Stomach: ${c.stomach}`;
    $("#checkin-stomach").hidden = c.stomach !== "Bothering me";
  }
  $("#newcomer").hidden = Object.keys(log).length > 0 || Object.keys(load(KEYS.checkins, {})).length > 0;

  // Guide of the day: rotates through the library
  const g = GUIDES[Math.floor(Date.now() / 864e5) % GUIDES.length];
  const tip = $("#tip-card");
  tip.href = `#learn/${g.slug}`;
  tip.innerHTML = `<img alt="" width="800" height="450" loading="lazy"><span class="tip-text"><small>Today's read</small><strong></strong><span></span></span>`;
  $("img", tip).src = g.img; $("img", tip).style.objectPosition = g.pos || ""; $("strong", tip).textContent = g.title; $(".tip-text > span", tip).textContent = g.summary;
}

const checkinForm = $("#checkin-form");
checkinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = checkinForm.elements;
  const answer = (n) => (f[n].value || "");
  if (!answer("energy") || !answer("hunger") || !answer("stomach")) {
    $(".form-error", checkinForm).textContent = "Please answer all three.";
    return;
  }
  $(".form-error", checkinForm).textContent = "";
  const all = load(KEYS.checkins, {});
  all[todayISO()] = { energy: answer("energy"), hunger: answer("hunger"), stomach: answer("stomach") };
  save(KEYS.checkins, all);
  toast(`Check-in saved ${where()}.`);
  renderToday();
});
$("#checkin-edit").addEventListener("click", () => {
  const c = load(KEYS.checkins, {})[todayISO()];
  if (c) ["energy", "hunger", "stomach"].forEach((n) => {
    const r = $(`input[name="${n}"][value="${c[n]}"]`, checkinForm); if (r) r.checked = true;
  });
  $("#checkin-form").hidden = false; $("#checkin-done").hidden = true;
});

// Goal
const goalForm = $("#goal-form");
$("#goal-ideas").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") { goalForm.elements.goal.value = e.target.textContent; goalForm.elements.goal.focus(); }
});
goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const goal = goalForm.elements.goal.value.trim(), err = $(".form-error", goalForm);
  if (!goal) { err.textContent = "Write a goal, or tap one of the ideas."; return; }
  // Guardrail: the app doesn't track weight, so goals stay about habits and how you feel.
  if (/\d\s*(lb|lbs|pound|kg|kilo)|\b(lose|losing|drop|shed)\b.*\d/i.test(goal)) {
    err.textContent = "Let's keep this about habits or how you want to feel. Your care team tracks the medical side with you.";
    return;
  }
  err.textContent = "";
  save(KEYS.goal, goal.slice(0, 100));
  toast("Goal saved.");
  renderToday();
});
$("#goal-edit").addEventListener("click", () => {
  goalForm.elements.goal.value = load(KEYS.goal, "");
  $("#goal-show").hidden = true; goalForm.hidden = false; goalForm.elements.goal.focus();
});

// Workout time and done
const timeForm = $("#workout-time-form");
timeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const t = timeForm.elements.time.value;
  $("#workout-time-error").textContent = t ? "" : "Choose a time.";
  if (!t) return;
  save(KEYS.workoutTimes, { [todayISO()]: t });   // only today's plan is kept
  toast(`Workout planned for ${fmtTime(t)}.`);
  renderToday();
});
$("#workout-time-edit").addEventListener("click", () => {
  timeForm.elements.time.value = load(KEYS.workoutTimes, {})[todayISO()] || "";
  $("#workout-time-show").hidden = true; timeForm.hidden = false; timeForm.elements.time.focus();
});
$("#workout-start").addEventListener("click", (e) => {
  const w = todaysSession();
  openPlayer({ name: w.name, timed: true, steps: w.steps,
    safety: "Stop for chest pain, fainting, unusual shortness of breath, or sharp pain.", opener: e.currentTarget });
});
$("#workout-done").addEventListener("click", () => {
  const done = isDone(habitsLog(), todayISO(), "movement");
  setHabit(todayISO(), "movement", !done);
  if (!done) toast("Nice work. Movement ticked for today.");
  renderToday();
});

// ---------- PROGRESS (behaviors only; never weight) ----------
function renderProgress() {
  const log = habitsLog(), wrap = $("#streaks");
  wrap.replaceChildren();
  HABITS.forEach((h) => {
    const card = document.createElement("div");
    card.className = "card streak";
    card.innerHTML = `<div class="streak-head"><span class="habit-icon" aria-hidden="true"></span><h2 class="h3"></h2>
        <span class="streak-num"><b></b><small>day streak</small></span></div>
      <div class="week-row" role="group"></div><p class="fine streak-best"></p>`;
    $(".habit-icon", card).textContent = h.icon;
    $("h2", card).textContent = h.label;
    $(".streak-num b", card).textContent = currentStreak(log, h.id);
    const best = bestStreak(log, h.id);
    $(".streak-best", card).textContent = best ? `Best streak: ${best} day${best === 1 ? "" : "s"}` : "Pick a day to start a streak.";
    const row = $(".week-row", card);
    row.setAttribute("aria-label", `${h.label}, this week`);
    // This week, Sunday to Saturday. i counts days back from today; days later this week (i < 0) can't be ticked yet.
    const sinceSunday = new Date().getDay();
    for (let i = sinceSunday; i > sinceSunday - 7; i--) {
      const day = daysAgoISO(i), done = isDone(log, day, h.id), future = i < 0;
      const b = document.createElement("button");
      b.type = "button"; b.className = "day"; b.setAttribute("aria-pressed", done); b.disabled = future;
      b.setAttribute("aria-label", `${h.label}, ${fmtDate(day, { weekday: "long", month: "short", day: "numeric" })}: ${future ? "upcoming" : done ? "done" : "not done"}`);
      b.innerHTML = `<small></small><span>${done ? "✓" : ""}</span>`;
      $("small", b).textContent = i === 0 ? "Today" : fmtDate(day, { weekday: "narrow" });
      b.addEventListener("click", () => { setHabit(day, h.id, !done); renderProgress(); });
      row.append(b);
    }
    wrap.append(card);
  });
  renderLog("#waist-log", load(KEYS.waist, []), (x) => `${x.inches} in`, KEYS.waist);
  renderLog("#win-log", load(KEYS.wins, []), (x) => x.text, KEYS.wins);
}

// A plain list, newest first. No differences or totals are worked out (guardrail: no loss numbers).
function renderLog(sel, list, text, key) {
  const ul = $(sel);
  ul.replaceChildren();
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).forEach((x) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="log-text"></span><span class="log-date"></span><button type="button">✕</button>`;
    $(".log-text", li).textContent = text(x);
    $(".log-date", li).textContent = fmtDate(x.date, { month: "short", day: "numeric" });
    const b = $("button", li);
    b.setAttribute("aria-label", `Delete ${text(x)}, ${fmtDate(x.date)}`);
    b.addEventListener("click", () => {
      if (!confirm("Delete this entry?")) return;
      save(key, load(key, []).filter((y) => y.id !== x.id));
      renderProgress();
    });
    ul.append(li);
  });
}

const waistForm = $("#waist-form");
waistForm.elements.date.value = todayISO();
waistForm.elements.date.max = todayISO();
waistForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = parseFloat(waistForm.elements.waist.value), date = waistForm.elements.date.value;
  const err = $(".form-error", waistForm);
  if (!(v >= 15 && v <= 90)) { err.textContent = "Please enter a measurement between 15 and 90 inches."; return; }
  if (!date || date > todayISO()) { err.textContent = "Please choose today or an earlier date."; return; }
  err.textContent = "";
  save(KEYS.waist, [...load(KEYS.waist, []), { id: Date.now(), date, inches: v }]);
  waistForm.elements.waist.value = "";
  toast(`Saved ${where()}.`);
  renderProgress();
});

const winForm = $("#win-form");
$("#win-ideas").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") { winForm.elements.win.value = e.target.textContent; winForm.elements.win.focus(); }
});
winForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = winForm.elements.win.value.trim();
  if (!text) { $(".form-error", winForm).textContent = "Write a win, or tap one of the ideas."; return; }
  $(".form-error", winForm).textContent = "";
  save(KEYS.wins, [...load(KEYS.wins, []), { id: Date.now(), date: todayISO(), text: text.slice(0, 140) }]);
  winForm.reset();
  toast(`Nice. Win saved ${where()}.`);
  renderProgress();
});

$("#clear-all").addEventListener("click", async () => {
  const scope = user ? "on this device and in your account" : "on this device";
  if (!confirm(`Delete everything this app saved ${scope} (habits, check-ins, waist entries, wins)? This can't be undone.`)) return;
  if (user) {
    const { error } = await sb.from("user_data").delete().eq("user_id", user.id);
    if (error) { toast("Couldn't delete your account data. Check your connection and try again."); return; }
    pending.clear();
  }
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  toast(`Deleted ${scope}.`);
  renderAccount();
});

// ---------- 2) Readiness quiz ----------
// Answers live only in this object (memory). Closing or reloading the tab forgets them.
const quiz = { step: 1, answers: {} };
const quizForm = $("#quiz-form");
const STEPS = 4;

function showStep(n) {
  quiz.step = n;
  $$(".step", quizForm).forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  $("#quiz-bar").style.width = `${(n / STEPS) * 100}%`;
  $(".progressbar").setAttribute("aria-valuenow", n);
  $("#quiz-step-label").textContent = `Step ${n} of ${STEPS}`;
  $("#quiz-back").hidden = n === 1;
  $("#quiz-next").textContent = n === STEPS ? "See my plan preview" : "Next";
  $("#quiz-error").textContent = "";
  const first = $(`.step[data-step="${n}"] input`, quizForm);
  if (first && n > 1) first.focus({ preventScroll: true });
}

function checkStep(n) {
  const radio = { 1: "goal", 2: "sex", 3: "timeline" }[n];
  if (radio) {
    const picked = $(`input[name="${radio}"]:checked`, quizForm);
    if (!picked) return "Please choose an option to continue.";
    quiz.answers[radio] = picked.value;
    return "";
  }
  const name = quizForm.elements.name, email = quizForm.elements.email, consent = quizForm.elements.consent;
  name.classList.toggle("invalid", !name.value.trim());
  email.classList.toggle("invalid", !EMAIL_RE.test(email.value.trim()));
  if (!name.value.trim()) return "Please enter your name.";
  if (!EMAIL_RE.test(email.value.trim())) return "Please enter a valid email address.";
  if (!consent.checked) return "Please tick the box to continue.";
  quiz.answers.name = name.value.trim();
  // TODO(HIPAA): this is where the lead (name, email, answers, consent + timestamp) would be sent to the
  // practice's HIPAA-compliant backend/CRM over HTTPS. Not sent anywhere in this preview.
  return "";
}

quizForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = checkStep(quiz.step);
  if (err) { $("#quiz-error").textContent = err; return; }
  if (quiz.step < STEPS) showStep(quiz.step + 1);
  else showResult();
});
// Picking an answer moves on by itself, like most app quizzes.
quizForm.addEventListener("change", (e) => {
  if (e.target.type === "radio" && quiz.step < STEPS) setTimeout(() => quizForm.requestSubmit(), 180);
});
$("#quiz-back").addEventListener("click", () => showStep(Math.max(1, quiz.step - 1)));

function showResult() {
  const a = quiz.answers;
  quizForm.hidden = true;
  $(".quiz-head").hidden = true;
  $("#quiz-result").hidden = false;
  $("#result-title").textContent = `${a.name}, here's what getting started could look like`;
  const dl = $("#result-summary");
  dl.replaceChildren();
  [["Goal", a.goal], ["About you", a.sex], ["Timeline", a.timeline]].forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });
  $("#result-timeline-note").textContent = a.timeline === "Just exploring"
    ? "No rush. The free resources are a good place to start, and a consult is there whenever you're ready."
    : "A free consult is the first step. The team can talk through timing with you.";
  window.scrollTo(0, 0);
}

$("#quiz-restart").addEventListener("click", () => {
  quiz.answers = {};
  quizForm.reset();
  $$(".invalid", quizForm).forEach((el) => el.classList.remove("invalid"));
  quizForm.hidden = false;
  $(".quiz-head").hidden = false;
  $("#quiz-result").hidden = true;
  showStep(1);
});

// ---------- LEARN: the guide library ----------
// TO ADD A GUIDE: add one object to GUIDES (slug, category, title, summary, img, alt, minutes, body, sources).
// Its card, its category filter chip and its page appear automatically. New category? Add it to CATEGORIES.
//
// Content rules ("report, don't prescribe"):
//   - say what research or clinical guidance reports, and cite it honestly (what was studied, in whom, how strong);
//     don't stretch a finding beyond what the source says
//   - no weight-loss numbers, results or promises; no drug or brand names; no "same as" or compounded claims
//   - no dose advice, ever; point back to the patient's own physician
//   - any direct suggestion to the patient carries a TODO(confirm with Doc) comment until Dr. Fortino approves it,
//     and every guide shows "Draft · awaiting review" until reviewed: true
// TODO(photo): photos are placeholders (Unsplash, free license; see images/CREDITS.md). Swap in real ones.
const CATEGORIES = ["Getting started", "Feeling your best", "Nutrition", "Movement", "Real life", "The basics", "Your visit"];

const SRC = {
  advisory: { label: "Mozaffarian D, et al. Nutritional priorities to support GLP-1 therapy for obesity: a joint advisory from the American College of Lifestyle Medicine, the American Society for Nutrition, the Obesity Medicine Association and The Obesity Society. Am J Clin Nutr. 2025;122(1):344–367.",
              url: "https://doi.org/10.1016/j.ajcnut.2025.04.023" },
  label: { label: "U.S. FDA. Prescribing information for GLP-1 receptor agonist medicines (Drugs@FDA).",
           url: "https://www.accessdata.fda.gov/scripts/cder/daf/" },
  pag: { label: "U.S. Department of Health and Human Services. Physical Activity Guidelines for Americans, 2nd edition. 2018.",
         url: "https://health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines" },
  buffey: { label: "Buffey AJ, et al. The acute effects of interrupting prolonged sitting time in adults with standing and light-intensity walking on biomarkers of cardiometabolic health: a systematic review and meta-analysis. Sports Med. 2022;52:1765–1787.",
            url: "https://pubmed.ncbi.nlm.nih.gov/35147898/" },
  ginger: { label: "Viljoen E, et al. A systematic review and meta-analysis of the effect and safety of ginger in the treatment of pregnancy-associated nausea and vomiting. Nutr J. 2014;13:20.",
            url: "https://pubmed.ncbi.nlm.nih.gov/24642205/" },
  tsa: { label: "Transportation Security Administration. Liquid medications (What Can I Bring?).",
         url: "https://www.tsa.gov/travel/security-screening/whatcanibring/items/liquid-medications" },
};

const NOT_ADVICE = `<p class="disclaimer">General information, not medical advice. It reports what research and guidance
  say; your own physician's instructions always come first. In an emergency, call 911.</p>`;
// TODO(confirm with Doc): the practice should approve this safety wording.
const CALL_US = `<div class="callout urgent"><h2>Call the practice right away if you have</h2><ul>
  <li>Stomach pain that is severe or won't go away, with or without vomiting</li>
  <li>Vomiting or diarrhea that stops you keeping fluids down, or signs of dehydration such as dizziness or very
  dark urine</li>
  <li>Any symptom that worries you</li></ul>
  <p><strong>Call 911</strong> for swelling of the face, lips or throat, trouble breathing, or any other emergency.</p></div>`;

const GUIDES = [
  { slug: "week-by-week", category: "Getting started", minutes: 4,
    title: "Your first months on a GLP-1: what to expect",
    summary: "What the early weeks often look like, based on how these programs are usually run.",
    img: "images/article-walking.jpg", alt: "A woman smiling as she walks down a leafy city street", pos: "center top",
    sources: [SRC.label, SRC.advisory],
    body: `<p>Everyone's experience is different, and your physician sets the pace of your plan. This is a general
      picture of how the first months often go, drawn from the medicines' prescribing information and published
      clinical guidance.</p>
      <div class="week"><span class="when">Before you start</span><h2>Your evaluation</h2>
        <p>Dr. Fortino's team reviews your health history, current medications and goals, and may order lab work.
        It's a good time to ask how to take and store your medication and what to do about a missed dose.</p></div>
      <div class="week"><span class="when">Weeks 1–4</span><h2>Getting used to it</h2>
        <p>The prescribing information for these medicines describes starting at a low dose and increasing gradually,
        on a schedule your physician sets. Stomach side effects such as nausea are the most commonly reported, and are
        reported most often when starting or after a dose increase. Many people say they feel full sooner.</p></div>
      <div class="week"><span class="when">Weeks 5–8</span><h2>Settling in</h2>
        <p>Your physician may review your dose based on how you're doing. Side effects can return for a few days after
        a change. The 2025 joint nutrition advisory highlights regular, nutrient-dense meals and enough fluids
        during this phase.</p></div>
      <div class="week"><span class="when">Weeks 9–12</span><h2>Building habits</h2>
        <p>The same advisory emphasizes enough protein plus strength training, because weight loss can include loss
        of muscle. Check-ins with your care team look at how you feel, any side effects and your progress.</p></div>
      <div class="week"><span class="when">Month 3 and beyond</span><h2>The long game</h2>
        <p>Progress looks different for everyone and is rarely a straight line. You and your physician keep reviewing
        the plan, including how long to continue.</p></div>
      <p><strong>Don't stop or change your dose on your own.</strong> Your physician decides your dose; talk with the care team first.</p>
      ${CALL_US}` },

  { slug: "side-effect-tips", category: "Feeling your best", minutes: 4,
    title: "Side-effect tips sheet",
    summary: "What clinical guidance suggests for the most common stomach side effects.",
    img: "images/article-calm-beach.jpg", alt: "A calm, misty beach in the early morning",
    sources: [SRC.label, SRC.advisory, SRC.ginger],
    // TODO(confirm with Doc): each strategy below is a direct suggestion; Dr. Fortino to approve or edit.
    body: `<p>Stomach side effects are the most commonly reported ones with GLP-1 medicines. The prescribing
      information notes they're reported most often when starting or after a dose increase. These are strategies
      that published guidance describes; ask your care team which fit you.</p>
      <h2>Nausea</h2>
      <p>The 2025 joint advisory from four nutrition and obesity-medicine societies lists eating smaller meals,
      eating slowly, stopping when you feel full and limiting high-fat, greasy foods.</p>
      <p class="fine"><strong>About ginger:</strong> a 2014 review of 12 trials found ginger eased nausea in
      <em>pregnancy</em>. It hasn't been studied in people taking GLP-1 medicines, so treat it as something some
      people try, not a proven fix.</p>
      <h2>Constipation</h2>
      <p>Guidance points to enough fluids, fiber from foods like vegetables, fruit, beans and oats (often added
      gradually), and regular movement. Check with the care team before taking a laxative.</p>
      <h2>Diarrhea</h2>
      <p>Replacing fluids matters most. Ask the care team whether an electrolyte drink makes sense for you.</p>
      <h2>Heartburn or burping</h2>
      <p>Smaller portions and not lying down soon after eating are commonly suggested. Some people find fizzy
      drinks, alcohol or coffee make it worse.</p>
      <h2>Feeling tired or lightheaded</h2>
      <p>Eating very little can leave you low on energy and fluids, which is why guidance stresses not skipping
      meals entirely and getting enough protein and fluids. If you also take diabetes medication, ask which signs of
      low blood sugar to watch for.</p>
      ${CALL_US}` },

  { slug: "grocery-list", category: "Nutrition", minutes: 3,
    title: "High-protein grocery list",
    summary: "Foods that fit the protein, fiber and fluid priorities in recent nutrition guidance.",
    img: "images/article-protein.jpg", alt: "A carton of brown and pale blue eggs on a wooden counter",
    sources: [SRC.advisory],
    // TODO(confirm with Doc): the list and the "building a plate" order are suggestions to approve.
    body: `<p>The 2025 joint advisory on nutrition with GLP-1 therapy emphasizes enough protein (to help preserve
      muscle), fiber, fluids, and minimally processed, nutrient-dense foods. Here's a list built around those
      priorities. Screenshot it for the store.</p>
      <h2>Protein</h2>
      <ul class="checklist"><li>Eggs or egg whites</li><li>Plain Greek yogurt</li><li>Cottage cheese</li>
      <li>Skinless chicken or turkey breast</li><li>Fish and seafood: salmon, tuna, shrimp</li>
      <li>Lean beef or pork tenderloin</li><li>Tofu, tempeh or edamame</li><li>Beans and lentils</li></ul>
      <h2>Vegetables</h2>
      <ul class="checklist"><li>Leafy greens and salad mixes</li><li>Broccoli and cauliflower</li>
      <li>Peppers, zucchini, cucumbers, carrots</li><li>Frozen vegetable blends without sauce</li></ul>
      <h2>Fruit</h2>
      <ul class="checklist"><li>Berries (fresh or frozen)</li><li>Apples, oranges, bananas</li></ul>
      <h2>Whole grains and fiber</h2>
      <ul class="checklist"><li>Oats</li><li>Quinoa or brown rice</li><li>Whole-grain bread or wraps</li></ul>
      <h2>Healthy fats (small portions)</h2>
      <ul class="checklist"><li>Avocado</li><li>Olive oil</li><li>Nuts, seeds and nut butter</li></ul>
      <h2>Easy grab-and-go</h2>
      <ul class="checklist"><li>String cheese</li><li>Hard-boiled eggs</li><li>Hummus with cut vegetables</li>
      <li>Turkey roll-ups</li><li>Ready-to-drink protein shakes (check the sugar)</li></ul>
      <h2>Drinks</h2>
      <ul class="checklist"><li>Water</li><li>Sparkling water, if bubbles don't bother you</li>
      <li>Unsweetened tea</li><li>Broth</li></ul>
      <div class="callout"><h2>Building a plate</h2><p>A common approach is protein first, then vegetables, then a
      smaller portion of whole grains or fruit. How much protein is right for you is something your physician
      decides, especially if you have kidney disease or a special diet.</p></div>` },

  { slug: "moving-more", category: "Movement", minutes: 3,
    title: "Strength and movement: what the research says",
    summary: "Why strength work and short walks come up again and again in the guidance.",
    img: "images/article-beach-walk.jpg", alt: "Two people walking along a quiet beach",
    sources: [SRC.pag, SRC.advisory, SRC.buffey],
    // TODO(confirm with Doc): check-with-your-physician wording and any activity suggestions.
    body: `<h2>Strength work</h2>
      <p>The U.S. Physical Activity Guidelines recommend muscle-strengthening activity on two or more days a week for
      adults. The 2025 joint advisory on GLP-1 therapy pairs strength training with enough protein to help
      preserve muscle during weight loss.</p>
      <h2>Overall activity</h2>
      <p>The same federal guidelines recommend 150 to 300 minutes a week of moderate activity such as brisk walking,
      and note that some activity is better than none.</p>
      <h2>Short walks after sitting</h2>
      <p>A 2022 review pooled seven short laboratory studies in adults. Breaking up long sitting with light walking
      lowered blood sugar and insulin after meals more than sitting did. These were one-day studies, so they show a
      short-term effect, not long-term results.</p>
      <p>Check with your physician before starting a new exercise routine, especially if you have a heart, joint or
      other health condition.</p>` },

  { slug: "travel-holidays", category: "Real life", minutes: 4,
    title: "Staying on track while traveling and over the holidays",
    summary: "Trips, parties and family dinners, without losing your rhythm.",
    img: "images/home-coast.jpg", alt: "Beach dunes and a wooden fence at sunrise",
    sources: [SRC.tsa, SRC.advisory],
    // TODO(confirm with Doc): medication-travel wording, alcohol wording and the party strategies.
    body: `<p>Vacations and holidays are part of life, and one big meal or trip doesn't undo your work. Here's
      what official guidance and other patients' experience suggest.</p>
      <h2>Traveling with medication</h2>
      <p>TSA allows medically necessary liquid medication over 3.4 oz in carry-on bags in reasonable quantities.
      Tell the officer at the start of screening; it may get extra screening. TSA recommends, but doesn't require,
      keeping the pharmacy label on it.</p>
      <p>Ask your pharmacy how to keep your medication at the right temperature while traveling, and ask the care
      team how to time doses if you'll cross time zones or travel on a dose day.</p>
      <h2>At parties and holiday meals</h2>
      <p>Strategies many people use: a protein-rich snack before going out, looking over everything before filling a
      plate, starting with protein and vegetables, and eating slowly, which also matches the advisory's tips for
      stomach side effects. "No thanks, I'm full" is a complete sentence.</p>
      <p>Alcohol can add to stomach upset and dehydration for some people. Ask your care team what's right for you.</p>
      <h2>On the road</h2>
      <p>Packing snacks and water helps when meals are unpredictable. At restaurants, grilled dishes, sauces on the
      side and boxing up half are easy swaps.</p>
      <h2>Keep moving</h2>
      <p>A walk after a big meal, on the boardwalk or along the beach, fits the research on short walks after
      sitting (see "Strength and movement").</p>
      <div class="callout"><h2>Back home</h2><p>Pick your routine back up at the next meal, tick your habits on the
      Today tab, and bring any questions to your next check-in.</p></div>` },

  { slug: "what-are-glp-1s", category: "The basics", minutes: 3,
    title: "What are GLP-1 medications?",
    summary: "How this group of medicines works, in plain English.",
    img: "images/article-ocean.jpg", alt: "Sun shining over gentle ocean waves",
    sources: [SRC.label, SRC.advisory],
    body: `<p>GLP-1 is a hormone your gut releases after you eat. It helps signal fullness and helps your body manage
      blood sugar. GLP-1 medicines act like that hormone. According to their prescribing information, they can:</p>
      <ul><li>help you feel full sooner and for longer</li><li>slow how quickly your stomach empties</li>
      <li>help regulate blood sugar</li></ul>
      <h2>Good to know</h2>
      <ul><li>They're prescription-only. A licensed physician decides whether one is appropriate for you.</li>
      <li>Stomach side effects are the most commonly reported. See the side-effect tips sheet.</li>
      <li>They aren't right for everyone. Their labeling includes warnings, for example about certain thyroid
      cancers, and they're generally not used during pregnancy.</li>
      <li>The 2025 joint advisory notes that, on their own, they're not enough: nutrition, activity, sleep and other
      habits matter too.</li></ul>` },

  { slug: "first-consult", category: "Your visit", minutes: 2,
    title: "What to expect at your first consult",
    summary: "How to prepare, and what you'll talk about with Dr. Fortino's team.",
    img: "images/article-consult.jpg", alt: "A smiling woman outside a bright office building", pos: "center top",
    sources: [],
    body: `<p>Your first consult is a conversation, with no obligation.</p>
      <h2>What to bring</h2>
      <ul class="checklist"><li>A list of your current medications and supplements</li>
      <li>Any recent lab results, if you have them</li><li>Your questions, written down</li></ul>
      <h2>What you'll talk about</h2>
      <ul><li>Your goals and what you've tried before</li><li>Your health history</li>
      <li>Whether a program, and which kind, makes sense for you</li><li>Next steps, which may include lab work</li></ul>` },
];

let guideFilter = "All";
function renderGuideList() {
  const used = CATEGORIES.filter((c) => GUIDES.some((g) => g.category === c));
  const chips = $("#guide-filters");
  chips.replaceChildren();
  ["All", ...used].forEach((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = c; b.setAttribute("aria-pressed", c === guideFilter);
    b.addEventListener("click", () => { guideFilter = c; renderGuideList(); });
    chips.append(b);
  });
  const list = $("#guide-list");
  list.replaceChildren();
  used.filter((c) => guideFilter === "All" || c === guideFilter).forEach((c) => {
    const h = document.createElement("h2"); h.className = "h3 section-title"; h.textContent = c;
    const ul = document.createElement("ul"); ul.className = "articles";
    GUIDES.filter((g) => g.category === c).forEach((g) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="#learn/${g.slug}"><img loading="lazy" width="800" height="450" alt=""><small></small><strong></strong><span></span></a>`;
      $("img", li).src = g.img; $("img", li).style.objectPosition = g.pos || "";   // pos: keep faces in the crop
      $("small", li).textContent = `${g.minutes} min read${g.reviewed ? "" : " · Draft"}`;
      $("strong", li).textContent = g.title; $("span", li).textContent = g.summary;
      ul.append(li);
    });
    list.append(h, ul);
  });
}

function renderArticle(slug) {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return false;
  const sources = g.sources.length
    ? `<h2>Sources</h2><ol class="sources">${g.sources.map(() => "<li><a target=\"_blank\" rel=\"noopener\"></a></li>").join("")}</ol>` : "";
  $("#article-body").innerHTML = `<img class="article-photo" width="800" height="450"><p class="eyebrow"></p><h1></h1>
    ${g.reviewed ? "" : '<p class="draft-flag">Draft · awaiting review by Dr. Fortino</p>'}
    ${g.body}${sources}${NOT_ADVICE}<a href="#care/book" class="btn btn-primary btn-block">Request a free consult</a>`;
  const img = $("#article-body .article-photo"); img.src = g.img; img.alt = g.alt; img.style.objectPosition = g.pos || "";
  $("#article-body .eyebrow").textContent = `${g.category} · ${g.minutes} min read`;
  $("#article-body h1").textContent = g.title;
  $$("#article-body .sources a").forEach((a, i) => { a.href = g.sources[i].url; a.textContent = g.sources[i].label; });
  return true;
}
renderGuideList();

// ---------- LEARN → Move and Mind (content in library.js; TODO(confirm) clinical review) ----------
function showLearnPanel(sub) {
  $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== sub; });
  $$(".subtabs a").forEach((a) => {
    if (a.dataset.sub === sub) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

const MOVE_ICONS = {
  strength: `<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>`,
  cardio: `<svg viewBox="0 0 24 24"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></svg>`,
  gentle: `<svg viewBox="0 0 24 24"><path d="M4 15c2.5-4 5.5-4 8 0s5.5 4 8 0"/><path d="M4 9c2.5-4 5.5-4 8 0s5.5 4 8 0"/></svg>`,
};

function renderMove() {
  const list = $("#move-list");
  MOVE_SESSIONS.forEach((m) => {
    const el = document.createElement("article");
    el.className = "card session";
    el.innerHTML = `<div class="card-row"><span class="round-icon" aria-hidden="true">${MOVE_ICONS[m.kind]}</span>
        <div><h2 class="h3"></h2><p class="muted-line"></p></div><span class="tag tag-soft"></span></div>
      <p class="session-impact"></p>
      <p><strong>What it's for:</strong> <span class="for"></span></p>
      <details><summary>Step-by-step</summary><ol class="howto"></ol></details>
      <p class="safety-note"><strong>Safety:</strong> <span></span></p>
      <button type="button" class="btn btn-primary btn-block"></button>`;
    $("h2", el).textContent = m.name;
    $(".muted-line", el).textContent = m.equipment;
    $(".tag", el).textContent = `${m.min} min`;
    $(".session-impact", el).textContent = `${m.impact} impact`;
    $(".for", el).textContent = m.forWhat;
    m.howTo.forEach((t) => { const li = document.createElement("li"); li.textContent = t; $(".howto", el).append(li); });
    $(".safety-note span", el).textContent = m.safety;
    const btn = $("button", el);
    btn.textContent = `Start ${m.min}-minute timer`;
    btn.addEventListener("click", () => openPlayer({ name: m.name, timed: true, steps: m.steps,
      safety: "Stop for chest pain, fainting, unusual shortness of breath, or sharp pain.", opener: btn }));
    list.append(el);
  });
}

let feeling = null;
function renderMind() {
  const chips = $("#feel-chips");
  chips.replaceChildren();
  FEELINGS.forEach((f) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = f.label; b.setAttribute("aria-pressed", f === feeling);
    b.addEventListener("click", () => { feeling = f === feeling ? null : f; renderMind(); });
    chips.append(b);
  });
  const shown = feeling ? MIND_PRACTICES.filter((p) => feeling.ids.includes(p.id)) : MIND_PRACTICES;
  $("#feel-hint").textContent = feeling
    ? `Try ${shown.map((p) => p.name).join(" or ")}. Tap "${feeling.label}" again to see all practices.`
    : "Pick one to see practices that may help, or browse them all below.";

  const list = $("#mind-list");
  list.replaceChildren();
  shown.forEach((p) => {
    const el = document.createElement("article");
    el.className = "card practice";
    el.innerHTML = `<div class="card-row"><div><h2 class="h3"></h2></div><span class="tag tag-soft"></span></div>
      <p class="for"></p>
      <button type="button" class="btn btn-primary btn-block">Start</button>
      <p class="dont-have-to"></p>
      <p class="fine"><strong>Evidence:</strong> <span class="ev"></span></p>
      <div class="${p.pro ? "pro-note" : "safety-note"}">${p.pro ? "<strong>Talk to a professional</strong>" : "<strong>Safety:</strong>"} <span></span></div>`;
    $("h2", el).textContent = p.name;
    $(".tag", el).textContent = p.time;
    $(".for", el).textContent = p.forWhat;
    $(".dont-have-to", el).textContent = p.dontHave;
    $(".ev", el).textContent = p.evidence;
    $("div:last-child span", el).textContent = p.safety;
    const btn = $("button", el);
    btn.setAttribute("aria-label", `Start ${p.name}`);
    btn.addEventListener("click", () => openPlayer({ name: p.name, timed: false,
      steps: p.steps.map((text) => ({ text })), safety: p.safety, opener: btn }));
    list.append(el);
  });
}
renderMove();
renderMind();

// ---------- Step player: a timer for Move, self-paced steps for Mind ----------
const player = { steps: [], i: 0, timed: false, running: false, endAt: 0, leftMs: 0, ticker: null, lock: null, opener: null };
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

async function keepAwake(on) {   // keep the phone screen on while a timer runs (where supported)
  try {
    if (on && !player.lock && "wakeLock" in navigator) player.lock = await navigator.wakeLock.request("screen");
    if (!on && player.lock) { await player.lock.release(); player.lock = null; }
  } catch { player.lock = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && player.running) { player.lock = null; keepAwake(true); }
});

function openPlayer({ name, timed, steps, safety, opener }) {
  Object.assign(player, { steps, timed, i: 0, opener, running: false });
  $("#player-name").textContent = name;
  $("#player-safety").textContent = safety;
  $("#player-clock").hidden = !timed;
  $("#player-pause").hidden = !timed;
  $("#player-run").hidden = false; $("#player-end").hidden = true;
  $("#player-close").textContent = "End";
  $("#player").hidden = false;
  goToStep(0);
  if (timed) startTimer();
  (timed ? $("#player-title") : $("#player-text")).focus();
}

function goToStep(i) {
  player.i = i;
  const st = player.steps[i], n = player.steps.length, last = i === n - 1;
  $("#player-count").textContent = `Step ${i + 1} of ${n}`;
  $("#player-title").textContent = player.timed ? st.title : `Step ${i + 1}`;
  $("#player-title").hidden = !player.timed;
  $("#player-text").textContent = st.text;
  const next = player.steps[i + 1];
  $("#player-next").textContent = player.timed && next ? `Next: ${next.title}` : "";
  $("#player-back").disabled = i === 0;
  $("#player-skip").textContent = last ? "Finish" : "Next";
  $("#player-skip").className = `btn ${player.timed ? "btn-ghost" : "btn-primary"}`;
  if (player.timed) {
    player.leftMs = st.sec * 1000;
    player.endAt = Date.now() + player.leftMs;
    paintClock();
  } else {
    $("#player-bar").style.width = `${((i + 1) / n) * 100}%`;
  }
}

function paintClock() {
  const left = player.running ? player.endAt - Date.now() : player.leftMs;
  const st = player.steps[player.i];
  $("#player-clock").textContent = fmtClock(left);
  const total = player.steps.reduce((a, s) => a + s.sec, 0) * 1000;
  const done = player.steps.slice(0, player.i).reduce((a, s) => a + s.sec, 0) * 1000 + (st.sec * 1000 - Math.max(0, left));
  $("#player-bar").style.width = `${(done / total) * 100}%`;
}

function tick() {
  // Date-based, so a throttled background tab catches up correctly.
  while (player.running && Date.now() >= player.endAt) {
    if (player.i === player.steps.length - 1) { finishPlayer(); return; }
    const from = player.endAt;
    goToStep(player.i + 1);
    player.endAt = from + player.steps[player.i].sec * 1000;
    if (navigator.vibrate) navigator.vibrate(200);
  }
  if (player.running) paintClock();
}

function startTimer() {
  player.running = true;
  player.endAt = Date.now() + player.leftMs;
  clearInterval(player.ticker);
  player.ticker = setInterval(tick, 250);
  $("#player-pause").textContent = "Pause";
  keepAwake(true);
}
function pauseTimer() {
  player.leftMs = player.endAt - Date.now();
  player.running = false;
  clearInterval(player.ticker);
  $("#player-pause").textContent = "Resume";
  paintClock();
  keepAwake(false);
}

function finishPlayer() {
  player.running = false;
  clearInterval(player.ticker);
  keepAwake(false);
  $("#player-run").hidden = true; $("#player-end").hidden = false;
  $("#player-close").textContent = "Close";
  $("#player-end-title").textContent = player.timed ? "Session complete" : "Practice complete";
  $("#player-end-text").textContent = player.timed
    ? "Nice work. Notice how your body feels, and drink some water if you need it."
    : "Notice how you feel now: different, the same, or somewhere in between. Any of those is fine.";
  $("#player-tick").hidden = !player.timed || isDone(habitsLog(), todayISO(), "movement");
  $("#player-end-title").focus();
}

function closePlayer() {
  player.running = false;
  clearInterval(player.ticker);
  keepAwake(false);
  $("#player").hidden = true;
  if (player.opener) player.opener.focus();
}

$("#player-pause").addEventListener("click", () => (player.running ? pauseTimer() : startTimer()));
$("#player-skip").addEventListener("click", () => {
  if (player.i === player.steps.length - 1) { finishPlayer(); return; }
  goToStep(player.i + 1);
});
$("#player-back").addEventListener("click", () => { if (player.i > 0) goToStep(player.i - 1); });
$("#player-close").addEventListener("click", closePlayer);
$("#player-tick").addEventListener("click", () => {
  setHabit(todayISO(), "movement", true);
  $("#player-tick").hidden = true;
  toast(`Movement ticked for today. Saved ${where()}.`);
});

// ---------- 5) Membership interest + 6) consult request (nothing is sent) ----------
$("#join-btn").addEventListener("click", () => {
  const f = $("#join-form"); f.hidden = false; f.elements.name.focus();
});

function wireForm(form, onDone) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $(".form-error", form);
    let msg = "";
    $$("input[required]", form).forEach((inp) => {
      const v = inp.value.trim();
      const bad = !v || (inp.type === "email" && !EMAIL_RE.test(v)) || (inp.type === "tel" && v.replace(/\D/g, "").length < 10)
        || (inp.type === "date" && (v < inp.min || v > todayISO()));
      inp.classList.toggle("invalid", bad);
      if (bad && !msg) msg = inp.type === "email" ? "Please enter a valid email address."
        : inp.type === "tel" ? "Please enter a phone number with area code."
        : inp.type === "date" && v ? "Please enter a valid date of birth." : "Please fill in every field.";
    });
    err.textContent = msg;
    if (msg) return;
    onDone(form);
    form.reset();
  });
}
wireForm($("#join-form"), (f) => {
  // TODO(HIPAA): send to the practice's HIPAA-compliant CRM (BAA) here. TODO(payments): hosted checkout later.
  toast("Thanks! This is a preview, so nothing was sent yet.", 5000);
  f.hidden = true;
});
// Sign-in by 6-digit email code: a link opens Safari, not the installed iPhone app, so the code is the main path.
// It needs custom SMTP so the Supabase "Magic Link" email template can show {{ .Token }}. Until then the default
// email only has a link, which works for desktop testing (handled above, under "if (sb)").
const codeForm = $("#code-form");
let signinEmail = "";
function showSigninStep(step) {
  $("#signin-form").hidden = step !== "email";
  codeForm.hidden = step !== "code";
  $$(".form-error", $("#account-out")).forEach((e) => { e.textContent = ""; });
  if (step === "code") codeForm.elements.code.focus();
}
wireForm($("#signin-form"), (f) => {
  const email = f.elements.email.value.trim(), btn = $("button", f);
  btn.disabled = true;
  sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }).then(({ error }) => {
    btn.disabled = false;
    if (error) { $(".form-error", f).textContent = error.status === 429
      ? "Too many sign-in emails. Please wait a minute and try again." : "Couldn't send the code. Please try again."; return; }
    signinEmail = email;
    $("#code-sent").textContent = `We emailed ${email}. Enter the 6-digit code below, or open the sign-in link in the email in this browser.`;
    codeForm.reset();
    showSigninStep("code");
  });
});
codeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = codeForm.elements.code, code = input.value.replace(/\D/g, ""), err = $(".form-error", codeForm);
  const btn = $("button[type=submit]", codeForm);
  input.classList.toggle("invalid", code.length !== 6);
  if (code.length !== 6) { err.textContent = "Please enter the 6-digit code from the email."; return; }
  err.textContent = "";
  btn.disabled = true;
  const { error } = await sb.auth.verifyOtp({ email: signinEmail, token: code, type: "email" });
  btn.disabled = false;
  if (error) {
    input.classList.add("invalid");
    err.textContent = error.status === 429 ? "Too many tries. Please wait a minute and try again."
      : "That code didn't work. It may have expired, so check it or get a new one.";
    return;
  }
  codeForm.reset();
  showSigninStep("email");
});
$("#code-back").addEventListener("click", () => showSigninStep("email"));
$("#signout").addEventListener("click", async () => {
  await pushPending();
  if (pending.size && !confirm("Some changes haven't synced to your account yet and will be lost. Sign out anyway?")) return;
  await sb.auth.signOut();
  pending.clear();
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  showSigninStep("email");
  toast("Signed out. Your data was removed from this device.");
});
// Office choice only matters for in-person consults.
const bookForm = $("#book-form");
bookForm.elements.dob.max = todayISO();
const syncOffice = () => { $("#book-office").hidden = bookForm.elements.mode.value !== "In person"; };
bookForm.addEventListener("change", syncOffice);
bookForm.addEventListener("reset", () => setTimeout(syncOffice));
wireForm(bookForm, () => {
  // TODO(HIPAA): send to a HIPAA-compliant scheduling system (BAA) here, or link to the practice's booking tool.
  toast("Preview only: your request wasn't sent. Please contact the practice directly to book.", 6000);
});

// ---------- Add to Home Screen ----------
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; renderInstallState(); });
window.addEventListener("appinstalled", () => { deferredPrompt = null; renderInstallState(); toast("Added to your Home Screen."); });

const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);

const ICON_SHARE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;
const ICON_DOTS = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;

function renderInstallState() {
  $("#install-state").textContent = isStandalone() ? "Installed" : "";
}

function openInstall() {
  const body = $("#install-body");
  if (isStandalone()) {
    body.innerHTML = `<p>You're already using the app from your Home Screen. You're all set.</p>`;
  } else if (deferredPrompt) {
    body.innerHTML = `<p>Your browser can add it in one tap.</p>
      <button type="button" class="btn btn-primary btn-block" id="install-now">Add to Home Screen</button>`;
    $("#install-now").addEventListener("click", async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      closeInstall();
      if (outcome === "accepted") toast("Added. Look for it on your Home Screen.");
    });
  } else if (isIOS) {
    body.innerHTML = `<ol class="howto">
        <li>Tap the <span class="kbd">${ICON_SHARE} Share</span> button (bottom of the screen in Safari, or top right
          on iPad).</li>
        <li>Scroll down and tap <span class="kbd">Add to Home Screen</span>.</li>
        <li>Tap <span class="kbd">Add</span> in the top right corner.</li>
      </ol>
      <p class="fine">Don't see it? Open this page in Safari and try again.</p>`;
  } else if (isAndroid) {
    body.innerHTML = `<ol class="howto">
        <li>Tap the <span class="kbd">${ICON_DOTS} menu</span> in the top right of Chrome.</li>
        <li>Tap <span class="kbd">Add to Home screen</span> or <span class="kbd">Install app</span>.</li>
        <li>Tap <span class="kbd">Install</span> or <span class="kbd">Add</span> to confirm.</li>
      </ol>
      <p class="fine">Using a different browser? Look for the same option in its menu.</p>`;
  } else {
    body.innerHTML = `<p>On a phone, open this page and choose <strong>Add to Home Screen</strong> from the browser's
      menu (Share menu on iPhone).</p>
      <p>On a computer in Chrome or Edge, click the install icon at the right end of the address bar, or open the
      browser menu and choose <strong>Install</strong>.</p>`;
  }
  $("#install-sheet").hidden = false;
  $("#install-close").focus();
}
function closeInstall() { $("#install-sheet").hidden = true; $("#install-open").focus(); }
$("#install-open").addEventListener("click", openInstall);
$("#install-close").addEventListener("click", closeInstall);
$("#install-sheet").addEventListener("click", (e) => { if (e.target.id === "install-sheet") closeInstall(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("#install-sheet").hidden) closeInstall();
  if (!$("#player").hidden) closePlayer();
});

// ---------- Service worker (offline + installable). Needs https or localhost. ----------
if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // When a newly published version's worker takes over (sw.js: skipWaiting + clients.claim), reload once so this
  // page runs the new files instead of the old copies it already loaded. Not on a first visit (no worker yet).
  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) { reloading = true; location.reload(); }
    });
  }
}

showStep(1);
route();
