// Dr. Robert Fortino — patient-facing weight-loss PWA prototype. Plain JS, no build step, no outside scripts.
//
// PREVIEW: nothing leaves this device. Before real patients use it, every "TODO(HIPAA)", "TODO(auth)" and
// "TODO(payments)" below (and in index.html) must be done.
//
// TODO(auth): there is no login. Real patient accounts need a HIPAA-eligible identity provider (signed BAA),
// MFA option, secure httpOnly session cookies (never tokens in localStorage), automatic sign-out on shared
// devices, and server-side checks on every request. Weight history would then sync to that account instead of
// living only in localStorage.

"use strict";

// Placeholder practice details: change them here, in one place.
const CONFIG = {
  price: "$XXX",                    // TODO(confirm): placeholder monthly membership price
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

// ---------- Router (#home, #quiz, #progress, #learn, #learn/<slug>, #membership, #book, #menu, #privacy) ----------
const TAB_FOR = { home: "home", quiz: "home", progress: "progress", learn: "learn", article: "learn",
                  book: "book", membership: "menu", menu: "menu", privacy: "menu" };

function route() {
  const [name, arg] = (location.hash.slice(1) || "home").split("/");
  let view = name === "learn" && arg ? "article" : name;
  if (!$(`[data-view="${view}"]`)) view = "home";
  if (view === "article" && !renderArticle(arg)) { location.replace("#learn"); return; }

  $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
  $$(".tabbar a").forEach((a) => {
    if (a.dataset.tab === TAB_FOR[view]) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (view === "progress") renderProgress();
  if (view === "menu") renderInstallState();
  window.scrollTo(0, 0);
  $("#main").focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);

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

// ---------- 3) Progress tracker (this device only) ----------
// TODO(HIPAA): stored unencrypted in localStorage on this device only. Real use needs the synced, access-
// controlled backend described in index.html and the TODO(auth) note above.
const STORE = "fortino.weights";
const loadWeights = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
};
const saveWeights = (list) => localStorage.setItem(STORE, JSON.stringify(list));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = (iso, opts = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(iso + "T12:00:00").toLocaleDateString(undefined, opts);
const fmtW = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

const weightForm = $("#weight-form");
weightForm.elements.date.value = todayISO();
weightForm.elements.date.max = todayISO();

weightForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const w = parseFloat(weightForm.elements.weight.value);
  const date = weightForm.elements.date.value;
  const err = $("#weight-error");
  weightForm.elements.weight.classList.toggle("invalid", !(w >= 50 && w <= 1000));
  if (!(w >= 50 && w <= 1000)) { err.textContent = "Please enter a weight between 50 and 1000 lbs."; return; }
  if (!date || date > todayISO()) { err.textContent = "Please choose today or an earlier date."; return; }
  err.textContent = "";
  const list = loadWeights();
  const existing = list.find((x) => x.date === date);
  if (existing) existing.weight = w; else list.push({ date, weight: w });
  list.sort((a, b) => a.date.localeCompare(b.date));
  saveWeights(list);
  weightForm.elements.weight.value = "";
  weightForm.elements.date.value = todayISO();
  toast(existing ? `Updated ${fmtDate(date)}.` : "Saved on this device.");
  renderProgress();
});

$("#history").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-date]");
  if (!btn || !confirm(`Delete the entry for ${fmtDate(btn.dataset.date)}?`)) return;
  saveWeights(loadWeights().filter((x) => x.date !== btn.dataset.date));
  renderProgress();
});
$("#clear-weights").addEventListener("click", () => {
  if (!confirm("Delete all weight entries on this device? This can't be undone.")) return;
  localStorage.removeItem(STORE);
  renderProgress();
});

function renderProgress() {
  const list = loadWeights();
  const first = list[0], last = list[list.length - 1];
  const change = list.length > 1 ? last.weight - first.weight : null;
  $("#stats").innerHTML = "";
  [["Latest", last ? `${fmtW(last.weight)} lbs` : "—"],
   ["Change", change === null ? "—" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${fmtW(Math.abs(change))} lbs`],
   ["Entries", String(list.length)]].forEach(([k, v]) => {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = v;
    const s = document.createElement("small"); s.textContent = k;
    d.append(b, s); $("#stats").append(d);
  });

  const ul = $("#history");
  ul.replaceChildren();
  [...list].reverse().forEach((x) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="w"></span><span class="d"></span><button type="button" aria-label="">✕</button>`;
    $(".w", li).textContent = `${fmtW(x.weight)} lbs`;
    $(".d", li).textContent = fmtDate(x.date);
    const btn = $("button", li); btn.dataset.date = x.date; btn.setAttribute("aria-label", `Delete ${fmtDate(x.date)}`);
    ul.append(li);
  });
  if (!list.length) ul.innerHTML = `<li><span class="d">No entries yet.</span></li>`;
  $("#clear-weights").hidden = !list.length;
  drawChart(list);
}

function drawChart(list) {
  const svg = $("#chart"), NS = "http://www.w3.org/2000/svg";
  const W = 340, H = 190, L = 40, R = 14, T = 14, B = 28;
  svg.replaceChildren();
  const el = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    svg.append(n); return n;
  };
  if (!list.length) {
    el("text", { x: W / 2, y: H / 2, "text-anchor": "middle", class: "empty" }, "Log your first weight to see your trend");
    $("#chart-desc").textContent = "No weight entries yet.";
    return;
  }
  const ws = list.map((x) => x.weight);
  const lo = Math.floor((Math.min(...ws) - 2) / 5) * 5, hi = Math.ceil((Math.max(...ws) + 2) / 5) * 5;
  const ts = list.map((x) => new Date(x.date + "T12:00:00").getTime());
  const t0 = ts[0], t1 = ts[ts.length - 1];
  const x = (t) => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (w) => T + (1 - (w - lo) / (hi - lo)) * (H - T - B);

  const step = Math.max(5, Math.ceil((hi - lo) / 4 / 5) * 5);
  for (let v = lo; v <= hi; v += step) {
    el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "grid" });
    el("text", { x: L - 6, y: y(v) + 3.5, "text-anchor": "end", class: "axis" }, String(v));
  }
  const short = { month: "short", day: "numeric" };
  el("text", { x: x(t0), y: H - 8, "text-anchor": t1 === t0 ? "middle" : "start", class: "axis" }, fmtDate(list[0].date, short));
  if (t1 !== t0) el("text", { x: x(t1), y: H - 8, "text-anchor": "end", class: "axis" }, fmtDate(list[list.length - 1].date, short));

  const pts = list.map((p, i) => [x(ts[i]), y(p.weight)]);
  if (pts.length > 1) {
    const line = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
    el("path", { d: `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - B} L${pts[0][0].toFixed(1)},${H - B} Z`, class: "area" });
    el("path", { d: line, class: "line" });
  }
  pts.forEach(([a, b]) => el("circle", { cx: a, cy: b, r: 3.5, class: "dot" }));
  $("#chart-desc").textContent = `Weight chart with ${list.length} entr${list.length === 1 ? "y" : "ies"}, from ` +
    `${fmtW(list[0].weight)} lbs on ${fmtDate(list[0].date)} to ${fmtW(list[list.length - 1].weight)} lbs on ${fmtDate(list[list.length - 1].date)}.`;
}

// ---------- 4) Resource library ----------
// Starter content written for patients. Rules for anyone editing (marketing/compliance):
//   - no weight-loss numbers, timelines of results, or promises ("lose X lbs", "guaranteed")
//   - no before/after or needle/injection imagery
//   - don't name other weight-loss drugs alongside GLP-1s
//   - general information only: always point back to the patient's own physician
// TODO(confirm): have Dr. Fortino or his clinical team review and approve each guide before launch.
// TODO(photo): the photos are placeholders (Unsplash, free license; see images/CREDITS.md). Swap in real ones.
const NOT_ADVICE = `<p class="disclaimer">General information, not medical advice. Your own physician's instructions
  always come first. In an emergency, call 911.</p>`;
const CALL_US = `<div class="callout urgent"><h2>Call the practice right away if you have</h2><ul>
  <li>Stomach pain that is severe or won't go away, with or without vomiting</li>
  <li>Vomiting or diarrhea that stops you keeping fluids down, or signs of dehydration such as dizziness or very
  dark urine</li>
  <li>Any symptom that worries you</li></ul>
  <p><strong>Call 911</strong> for swelling of the face, lips or throat, trouble breathing, or any other emergency.</p></div>`;

const ARTICLES = [
  { slug: "week-by-week", tag: "Getting started", title: "Your first months on a GLP-1: what to expect, week by week",
    summary: "A calm, step-by-step picture of the early weeks, and what to focus on in each.",
    img: "images/article-walking.jpg", alt: "A woman smiling as she walks down a leafy city street",
    body: `<p>Everyone's experience is different, and your physician sets the pace of your plan. Here's a general picture
      of how the first few months often go, so nothing catches you off guard.</p>
      <div class="week"><span class="when">Before you start</span><h2>Your evaluation</h2>
        <p>Dr. Fortino's team reviews your health history, current medications and goals, and may order lab work.
        Ask anything: how and when to take your medication, what to do if you miss a dose, and how to store it.</p></div>
      <div class="week"><span class="when">Weeks 1–4</span><h2>Getting used to it</h2>
        <p>Plans usually start at a low dose so your body can adjust. You may notice you feel full sooner or think
        about food less. Stomach side effects such as nausea are most common now and often ease with time.</p>
        <p><strong>Focus on:</strong> small meals, protein first, water through the day, and noticing how you feel.</p></div>
      <div class="week"><span class="when">Weeks 5–8</span><h2>Settling in</h2>
        <p>Your physician may adjust your dose based on how you're doing. Side effects can come back for a few days
        after a change, so the habits from the first month still help.</p>
        <p><strong>Focus on:</strong> regular meals, a daily walk, and good sleep.</p></div>
      <div class="week"><span class="when">Weeks 9–12</span><h2>Building habits</h2>
        <p>Check-ins look at how you feel, any side effects and your progress. This is a good time to add
        strength exercises and settle into a grocery routine.</p>
        <p><strong>Focus on:</strong> strength work two or three times a week, and planning meals ahead.</p></div>
      <div class="week"><span class="when">Month 3 and beyond</span><h2>The long game</h2>
        <p>Progress looks different for everyone and is rarely a straight line. Slow weeks and plateaus are normal.
        You and your physician keep reviewing the plan, including how long to continue.</p></div>
      <p><strong>Never stop or change your dose on your own.</strong> Talk with the care team first.</p>
      ${CALL_US}` },

  { slug: "side-effect-tips", tag: "Feeling your best", title: "Side-effect tips sheet",
    summary: "Simple, practical ways to ease the most common stomach side effects.",
    img: "images/article-calm-beach.jpg", alt: "A calm, misty beach in the early morning",
    body: `<p>The most common side effects affect the stomach. They tend to be strongest when you start or after a dose
      change, and often ease as your body adjusts. These tips help many people; your care team can help too.</p>
      <h2>Nausea</h2>
      <ul><li>Eat smaller meals, slowly, and stop at the first sign of fullness.</li>
      <li>Choose plain foods such as toast, crackers, rice or soup when you feel queasy.</li>
      <li>Go easy on greasy, fried, very sweet or spicy foods.</li>
      <li>Stay upright for a while after eating.</li>
      <li>Sip cold water or ginger tea through the day.</li></ul>
      <h2>Constipation</h2>
      <ul><li>Drink water steadily through the day.</li>
      <li>Add fiber slowly: vegetables, fruit, beans, oats.</li>
      <li>Move every day; even a short walk helps.</li>
      <li>Ask the care team before taking a laxative.</li></ul>
      <h2>Diarrhea</h2>
      <ul><li>Replace fluids, and ask about an electrolyte drink.</li>
      <li>Avoid greasy foods and sugar-free sweets made with sugar alcohols.</li></ul>
      <h2>Heartburn or burping</h2>
      <ul><li>Keep portions small and avoid lying down for a few hours after eating.</li>
      <li>Cut back on fizzy drinks, alcohol and coffee if they bother you.</li></ul>
      <h2>Feeling tired or lightheaded</h2>
      <ul><li>Don't skip meals entirely, even when you're not hungry.</li>
      <li>Include protein at each meal and keep drinking water.</li>
      <li>Stand up slowly.</li>
      <li>If you also take diabetes medication, ask the care team which signs of low blood sugar to watch for.</li></ul>
      ${CALL_US}` },

  { slug: "grocery-list", tag: "Nutrition", title: "High-protein grocery list",
    summary: "A ready-to-use list for easy, satisfying meals when your appetite is smaller.",
    img: "images/article-produce.jpg", alt: "Fresh broccoli and lettuce at a market",
    body: `<p>When you're eating less, every bite matters. Protein helps you feel satisfied and helps protect muscle.
      Take this list to the store, or screenshot it.</p>
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
      <h2>Easy grab-and-go snacks</h2>
      <ul class="checklist"><li>String cheese</li><li>Hard-boiled eggs</li><li>Hummus with cut vegetables</li>
      <li>Turkey roll-ups</li><li>Ready-to-drink protein shakes (check the sugar)</li></ul>
      <h2>Drinks</h2>
      <ul class="checklist"><li>Water</li><li>Sparkling water, if bubbles don't bother you</li>
      <li>Unsweetened tea</li><li>Broth</li></ul>
      <div class="callout"><h2>Building a plate</h2><p>Start with protein, fill up with vegetables, then add a
      small portion of whole grains or fruit. If you have kidney disease or a special diet, ask the care team
      before increasing protein.</p></div>` },

  { slug: "travel-holidays", tag: "Real life", title: "Staying on track while traveling and over the holidays",
    summary: "Trips, parties and family dinners, without losing your rhythm.",
    img: "images/article-beach-walk.jpg", alt: "Two people walking along a quiet beach",
    body: `<p>Vacations and holidays are part of life. A little planning keeps you comfortable and on track, and one
      big meal or trip doesn't undo your progress.</p>
      <h2>Before you go</h2>
      <ul><li>Pack your medication in your carry-on, in its original pharmacy packaging with the label.</li>
      <li>Follow the storage instructions from your pharmacy, and ask how to keep it at the right temperature on
      the road.</li>
      <li>If your dose day falls on a travel day or you'll cross time zones, ask the care team how to time it.</li>
      <li>Bring a little more than you need in case of delays.</li></ul>
      <h2>At parties and holiday meals</h2>
      <ul><li>Have a protein-rich snack before you go, so you don't arrive starving.</li>
      <li>Look over everything before you fill your plate; choose what you really love.</li>
      <li>Start with protein and vegetables, use a smaller plate, and eat slowly.</li>
      <li>"No thanks, I'm full" is a complete sentence. Leftovers are always an option.</li>
      <li>Alcohol can make stomach side effects worse. Ask the care team what's right for you, and alternate with
      water.</li></ul>
      <h2>On the road</h2>
      <ul><li>Pack easy snacks: protein bars, nuts, string cheese.</li>
      <li>Drink plenty of water, especially on flights.</li>
      <li>At restaurants, choose grilled over fried, ask for sauces on the side, and box half to take home.</li></ul>
      <h2>Keep moving</h2>
      <ul><li>Take a walk after big meals: around the neighborhood, on the boardwalk, or along the beach.</li>
      <li>Explore on foot when you travel.</li></ul>
      <div class="callout"><h2>Back home</h2><p>Go straight back to your usual routine at the next meal, and log
      your weight in the Progress tab when you're ready. Bring any questions to your next check-in.</p></div>` },

  { slug: "what-are-glp-1s", tag: "The basics", title: "What are GLP-1 medications?",
    summary: "How this group of medicines works, in plain English.",
    img: "images/article-ocean.jpg", alt: "Sun shining over gentle ocean waves",
    body: `<p>GLP-1 is a hormone your gut releases after you eat. It helps signal fullness and helps your body manage
      blood sugar.</p>
      <p>GLP-1 medications act like that hormone. In general, they can:</p>
      <ul><li>help you feel full sooner and for longer</li><li>slow how quickly your stomach empties</li>
      <li>help regulate blood sugar</li></ul>
      <h2>Good to know</h2>
      <ul><li>They're prescription-only. A licensed physician decides whether one is appropriate for you.</li>
      <li>Side effects such as nausea, constipation or diarrhea are common, especially when starting or changing a
      dose. See the side-effect tips sheet.</li>
      <li>They aren't right for everyone. For example, they're generally not used during pregnancy or by people with a
      personal or family history of certain thyroid cancers.</li>
      <li>They work alongside changes in eating and activity, not instead of them.</li></ul>` },

  { slug: "first-consult", tag: "Your visit", title: "What to expect at your first consult",
    summary: "How to prepare, and what you'll talk about with Dr. Fortino's team.",
    img: "images/article-consult.jpg", alt: "A smiling woman outside a bright office building",
    body: `<p>Your first consult is a conversation, with no obligation.</p>
      <h2>What to bring</h2>
      <ul class="checklist"><li>A list of your current medications and supplements</li>
      <li>Any recent lab results, if you have them</li><li>Your questions, written down</li></ul>
      <h2>What you'll talk about</h2>
      <ul><li>Your goals and what you've tried before</li><li>Your health history</li>
      <li>Whether a program, and which kind, makes sense for you</li><li>Next steps, which may include lab work</li></ul>` },
];

const articleList = $("#article-list");
ARTICLES.forEach((a) => {
  const li = document.createElement("li");
  li.innerHTML = `<a href="#learn/${a.slug}"><img loading="lazy" width="800" height="450"><small></small><strong></strong><span></span></a>`;
  const img = $("img", li); img.src = a.img; img.alt = "";
  $("small", li).textContent = a.tag; $("strong", li).textContent = a.title; $("span", li).textContent = a.summary;
  articleList.append(li);
});
function renderArticle(slug) {
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) return false;
  $("#article-body").innerHTML = `<img class="article-photo" width="800" height="450"><p class="eyebrow"></p><h1></h1>
    ${a.body}${NOT_ADVICE}<a href="#book" class="btn btn-primary btn-block">Book a free consult</a>`;
  const img = $("#article-body .article-photo"); img.src = a.img; img.alt = a.alt;
  $("#article-body .eyebrow").textContent = a.tag;
  $("#article-body h1").textContent = a.title;
  return true;
}

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
      const bad = !v || (inp.type === "email" && !EMAIL_RE.test(v)) || (inp.type === "tel" && v.replace(/\D/g, "").length < 10);
      inp.classList.toggle("invalid", bad);
      if (bad && !msg) msg = inp.type === "email" ? "Please enter a valid email address."
        : inp.type === "tel" ? "Please enter a phone number with area code." : "Please fill in every field.";
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
wireForm($("#book-form"), () => {
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#install-sheet").hidden) closeInstall(); });

// ---------- Service worker (offline + installable). Needs https or localhost. ----------
if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

showStep(1);
route();
