// Learn → Stretch illustrations: original line drawings made for this app (not copied or traced from Mayo Clinic,
// AAOS or any other source). Each stretch has two frames, the starting position and the movement (cyan arrows show
// the direction), plus a third frame for a seated easier version. Frames are small pose data drawn by one renderer,
// so every figure shares one style and the whole set stays a few KB. TODO(confirm): Dr. Fortino reviews with the text.
"use strict";

const ART = { navy: "#163a60", cyan: "#1fa5ce", tint: "#e8f1f8", prop: "#9fb4c7", skin: "#ffffff" };
// Everyday adults: a = average build, short hair; b = larger-bodied, bun; c = larger-bodied, curly hair; d = average, bob
const BODIES = { a: { w: 15, limb: 4.2, hair: "short" }, b: { w: 24, limb: 5, hair: "bun" },
                 c: { w: 23, limb: 4.9, hair: "curly" }, d: { w: 16, limb: 4.3, hair: "bob" } };
const GROUND = 112;

const r1 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");

function hairSVG(kind, [x, y], face) {
  const cap = `<path d="M${x - 8.4},${y} A8.4,8.4 0 0 1 ${x + 8.4},${y} Q${x},${y - 3.5} ${x - 8.4},${y}Z" fill="${ART.navy}"/>`;
  if (kind === "short") return cap;
  if (kind === "bun") {
    const bx = face ? x - face * 9 : x, by = face ? y - 4 : y - 10;
    return cap + `<circle cx="${bx}" cy="${by}" r="3.6" fill="${ART.navy}"/>`;
  }
  if (kind === "curly") return [-5, 0, 5].map((dx) => `<circle cx="${x + dx}" cy="${y - 6.5 + Math.abs(dx) / 2.5}" r="3.6" fill="${ART.navy}"/>`).join("");
  // bob: cap that comes down the sides
  return `<path d="M${x - 8.6},${y + 5} L${x - 8.6},${y} A8.6,8.6 0 0 1 ${x + 8.6},${y} L${x + 8.6},${y + 5}
    Q${x + 6},${y - 2} ${x},${y - 3.5} Q${x - 6},${y - 2} ${x - 8.6},${y + 5}Z" fill="${ART.navy}"/>`;
}

// small eyes, so you can tell which way someone faces
function faceSVG(f) {
  const [x, y] = f.head, dot = (cx) => `<circle cx="${r1(cx)}" cy="${y + 1}" r="1.1" fill="${ART.navy}"/>`;
  return f.face ? dot(x + f.face * 4.2) : dot(x - 3) + dot(x + 3);
}

function propSVG(p) {
  const line = (w) => `stroke="${ART.prop}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const s = line(2), chair = line(3);
  if (p.t === "wall") return `<rect x="${p.x}" y="12" width="7" height="${GROUND - 12}" fill="${ART.tint}" ${s}/>`;
  if (p.t === "counter") return `<rect x="${p.x}" y="${p.y || 68}" width="${100 - p.x}" height="${GROUND - (p.y || 68)}" fill="${ART.tint}" ${s}/>`;
  if (p.t === "chair") {   // side view: back post on the left, seat to the right
    const x = p.x, y = p.y || 80;
    return `<path d="M${x},${y - 32} L${x},${GROUND} M${x},${y} L${x + 26},${y} L${x + 26},${GROUND}" fill="none" ${chair}/>`;
  }
  if (p.t === "chair-front") {   // front view, standing behind it: drawn over the figure
    const x = p.x;
    return `<path d="M${x - 17},${GROUND} L${x - 17},62 L${x + 17},62 L${x + 17},${GROUND} M${x - 17},86 L${x + 17},86"
      fill="none" ${chair}/>`;
  }
  if (p.t === "chair-back") {    // front view, sitting in it: the chair back shows behind the shoulders
    const x = p.x;
    return `<path d="M${x - 16},${p.y || 84} L${x - 16},40 L${x + 16},40 L${x + 16},${p.y || 84}" fill="none" ${chair}/>`;
  }
  return "";
}

function arrowHead([x, y], [dx, dy]) {
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, s = 5.5;
  const a = [x - ux * s - uy * s * 0.6, y - uy * s + ux * s * 0.6], b = [x - ux * s + uy * s * 0.6, y - uy * s - ux * s * 0.6];
  return `<path d="M${r1(a[0])},${r1(a[1])} L${r1(x)},${r1(y)} L${r1(b[0])},${r1(b[1])}" fill="none" stroke="${ART.cyan}"
    stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function arrowSVG(a) {
  const line = `fill="none" stroke="${ART.cyan}" stroke-width="2.6" stroke-linecap="round"`;
  if (a.line) {
    const [p, q] = a.line, d = [q[0] - p[0], q[1] - p[1]];
    return `<path d="M${pts([p])} L${pts([q])}" ${line}/>` + arrowHead(q, d) + (a.both ? arrowHead(p, [-d[0], -d[1]]) : "");
  }
  if (a.curve) {
    const [p, c, q] = a.curve;
    return `<path d="M${pts([p])} Q${pts([c])} ${pts([q])}" ${line}/>` + arrowHead(q, [q[0] - c[0], q[1] - c[1]])
      + (a.both ? arrowHead(p, [p[0] - c[0], p[1] - c[1]]) : "");
  }
  if (a.circle) {   // an almost-full circle with the head at the end; cw: clockwise on screen
    const [cx, cy, r] = a.circle, cw = a.cw !== false, start = -150, end = start + (cw ? 290 : -290);
    const at = (deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
    const p = at(start), q = at(end), t = (end * Math.PI) / 180;
    const tangent = cw ? [-Math.sin(t), Math.cos(t)] : [Math.sin(t), -Math.cos(t)];
    return `<path d="M${pts([p])} A${r},${r} 0 1 ${cw ? 1 : 0} ${pts([q])}" ${line}/>` + arrowHead(q, tangent);
  }
  return "";
}

// pose: { body, face (1 right, -1 left, 0 front), head:[x,y], neck:[x,y], hip:[x,y], arms:[[pts],[pts]],
//         legs:[[pts],[pts]] (first of each = the near side; the rest are drawn behind, lighter) }
function figureSVG(f) {
  const b = BODIES[f.body], back = "opacity=\"0.45\"";
  const limb = (list, extra = "") => `<polyline points="${pts(list)}" fill="none" stroke="${ART.navy}" stroke-width="${b.limb}"
    stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const near = 0;   // limb 0 is the near side; the others are drawn behind the body, lighter
  const out = [];
  (f.legs || []).forEach((l, i) => { if (i !== near) out.push(limb(l, f.face ? back : "")); });
  (f.arms || []).forEach((l, i) => { if (i !== near) out.push(limb(l, f.face ? back : "")); });
  // body: a soft capsule whose rounded ends sit inside the neck and hips (so it never covers the head)
  const dx = f.hip[0] - f.neck[0], dy = f.hip[1] - f.neck[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const top = [f.neck[0] + ux * b.w / 2, f.neck[1] + uy * b.w / 2], bottom = [f.hip[0] - ux * b.w * 0.3, f.hip[1] - uy * b.w * 0.3];
  const torso = `M${pts([top])} L${pts([bottom])}`;
  out.push(`<path d="${torso}" stroke="${ART.navy}" stroke-width="${b.w + 3.4}" stroke-linecap="round"/>`,
           `<path d="${torso}" stroke="${ART.tint}" stroke-width="${b.w}" stroke-linecap="round"/>`);
  if (f.legs && f.legs[near]) out.push(limb(f.legs[near]));
  out.push(`<circle cx="${f.head[0]}" cy="${f.head[1]}" r="8.4" fill="${ART.skin}" stroke="${ART.navy}" stroke-width="2.2"/>`,
           f.tilt ? `<g transform="rotate(${f.tilt} ${f.head[0]} ${f.head[1]})">${hairSVG(b.hair, f.head, f.face)}${faceSVG(f)}</g>`
                  : hairSVG(b.hair, f.head, f.face) + faceSVG(f));
  if (f.arms && f.arms[near]) out.push(limb(f.arms[near]));
  return out.join("");
}

function frameSVG(fr) {
  const under = (fr.props || []).filter((p) => p.t !== "chair-front").map(propSVG).join("");
  const over = (fr.props || []).filter((p) => p.t === "chair-front").map(propSVG).join("");
  return `<line x1="4" y1="${GROUND}" x2="96" y2="${GROUND}" stroke="${ART.prop}" stroke-width="2" stroke-linecap="round"/>`
    + under + figureSVG(fr.fig) + over + (fr.arrows || []).map(arrowSVG).join("");
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const CAPTIONS = ["Start", "Move", "Seated option"];

// The row of small frames for one stretch (HTML string; all content here is this file's own).
function stretchArt(key) {
  const set = STRETCH_ART[key];
  if (!set) return "";
  return `<div class="stretch-art${set.length > 2 ? " three" : ""}">` + set.map((fr, i) =>
    `<figure><svg viewBox="0 0 100 120" role="img" aria-label="${esc(fr.alt)}" focusable="false">${frameSVG(fr)}</svg>
     <figcaption>${CAPTIONS[i]}</figcaption></figure>`).join("") + "</div>";
}

// ---------- poses ----------
// Side view, facing right, standing at x. Returns a fresh pose to adjust.
function stand(x, body, more = {}) {
  return Object.assign({ body, face: 1, head: [x + 2, 22], neck: [x, 34], hip: [x, 66],
    arms: [[[x, 38], [x + 2, 53], [x + 3, 67]], [[x, 38], [x - 1, 53], [x - 2, 67]]],
    legs: [[[x, 66], [x + 1, 88], [x + 1, 109], [x + 8, 110]], [[x, 66], [x - 1, 88], [x - 1, 109], [x + 6, 110]]] }, more);
}
// Side view, facing right, sitting on a chair whose back post is at cx (seat at y 80).
function sit(cx, body, more = {}) {
  const hx = cx + 8;
  return Object.assign({ body, face: 1, head: [hx, 31], neck: [hx - 1, 43], hip: [hx, 74],
    arms: [[[hx, 47], [hx + 6, 61], [hx + 14, 70]], [[hx, 47], [hx + 4, 61], [hx + 12, 71]]],
    legs: [[[hx, 74], [hx + 22, 76], [hx + 22, 108], [hx + 29, 109]], [[hx, 74], [hx + 20, 77], [hx + 19, 108], [hx + 26, 109]]] }, more);
}
// Front view, standing at x.
function front(x, body, more = {}) {
  const s = BODIES[body].w / 2 + 2;
  return Object.assign({ body, face: 0, head: [x, 22], neck: [x, 34], hip: [x, 66],
    arms: [[[x + s, 38], [x + s + 3, 53], [x + s + 4, 67]], [[x - s, 38], [x - s - 3, 53], [x - s - 4, 67]]],
    legs: [[[x + 5, 68], [x + 6, 89], [x + 6, 109], [x + 11, 110]], [[x - 5, 68], [x - 6, 89], [x - 6, 109], [x - 11, 110]]] }, more);
}
// Front view, sitting (upper body over a chair back; legs bent toward you).
function frontSit(x, body, more = {}) {
  const s = BODIES[body].w / 2 + 2;
  return Object.assign({ body, face: 0, head: [x, 30], neck: [x, 42], hip: [x, 76],
    arms: [[[x + s, 46], [x + s + 2, 61], [x + s - 2, 75]], [[x - s, 46], [x - s - 2, 61], [x - s + 2, 75]]],
    legs: [[[x + 6, 80], [x + 10, 86], [x + 10, 109], [x + 15, 110]], [[x - 6, 80], [x - 10, 86], [x - 10, 109], [x - 15, 110]]] }, more);
}

const holdChair = (x) => [[[x, 38], [x + 10, 50], [x + 21, 49]], [[x, 38], [x + 9, 51], [x + 20, 50]]];

const STRETCH_ART = {
  "wall-calf": [
    { alt: "An adult stands facing a wall with both hands on it, feet together.",
      props: [{ t: "wall", x: 84 }],
      fig: stand(62, "b", { arms: [[[62, 38], [72, 44], [83, 46]], [[62, 38], [71, 45], [82, 47]]] }) },
    { alt: "One foot has stepped back with its heel on the floor. The hips lean gently toward the wall; an arrow shows the lean.",
      props: [{ t: "wall", x: 84 }],
      fig: { body: "b", face: 1, head: [68, 24], neck: [65, 36], hip: [56, 67],
        arms: [[[65, 40], [74, 45], [83, 47]], [[65, 40], [73, 46], [82, 48]]],
        legs: [[[56, 67], [67, 87], [65, 109], [72, 110]], [[56, 67], [45, 88], [34, 108], [41, 110]]] },
      arrows: [{ line: [[38, 58], [52, 58]] }] },
  ],
  "cross-shoulder": [
    { alt: "An adult stands tall, facing you, arms relaxed.", fig: front(50, "d") },
    { alt: "One arm reaches across the chest at shoulder height, supported at the elbow by the other hand. An arrow shows the arm drawn gently in.",
      fig: front(50, "d", { arms: [[[60, 38], [46, 40], [32, 41]], [[40, 38], [37, 51], [47, 43]]] }),
      arrows: [{ line: [[20, 50], [31, 46]] }] },
  ],
  "march": [
    { alt: "An adult stands beside a chair, one hand resting on its back.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(54, "c", { arms: [[[54, 38], [63, 46], [72, 49]], [[54, 38], [52, 53], [51, 66]]] }) },
    { alt: "Marching in place: one knee lifts a little, with an arrow pointing up, while one hand stays on the chair.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(54, "c", { arms: [[[54, 38], [63, 46], [72, 49]], [[54, 38], [49, 52], [52, 64]]],
        legs: [[[54, 66], [66, 76], [64, 96], [71, 97]], [[54, 66], [53, 88], [53, 109], [60, 110]]] }),
      arrows: [{ line: [[40, 98], [40, 80]] }] },
    { alt: "Seated option: sitting in a chair and lifting one foot a little off the floor, with an arrow pointing up.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "c", { legs: [[[30, 74], [52, 71], [55, 100], [62, 100]], [[30, 74], [50, 77], [49, 108], [56, 109]]] }),
      arrows: [{ line: [[72, 106], [72, 90]] }] },
  ],
  "shoulder-circles": [
    { alt: "An adult stands tall, facing you, arms relaxed.", fig: front(50, "a") },
    { alt: "Arms held out to the sides at shoulder height. Circular arrows at the shoulders and hands show slow rolls and small circles.",
      fig: front(50, "a", { arms: [[[59, 38], [72, 38], [85, 38]], [[41, 38], [28, 38], [15, 38]]] }),
      arrows: [{ circle: [86, 38, 7] }, { circle: [14, 38, 7], cw: false },
               { curve: [[57, 30], [63, 24], [67, 31]] }, { curve: [[43, 30], [37, 24], [33, 31]] }] },
  ],
  "arm-circles": [
    { alt: "An adult stands tall, facing you, arms relaxed.", fig: front(50, "b") },
    { alt: "Arms held out to the sides with circular arrows at the hands, showing small arm circles.",
      fig: front(50, "b", { arms: [[[64, 38], [75, 38], [86, 39]], [[36, 38], [25, 38], [14, 39]]] }),
      arrows: [{ circle: [86, 39, 7] }, { circle: [14, 39, 7], cw: false }] },
  ],
  "heel-toe": [
    { alt: "An adult stands with both hands on a counter, feet flat.",
      props: [{ t: "counter", x: 70 }],
      fig: stand(52, "d", { arms: holdChair(52).map((a) => a.map(([x, y]) => [x, y + 18])) }) },
    { alt: "Rising a little onto the balls of the feet, then rocking back toward the heels. A two-way arrow shows the gentle up and down.",
      props: [{ t: "counter", x: 70 }],
      fig: stand(52, "d", { head: [54, 18], neck: [52, 30], hip: [52, 62],
        arms: holdChair(52).map((a) => a.map(([x, y]) => [x, y + 15])),
        legs: [[[52, 62], [53, 82], [54, 100], [60, 110]], [[52, 62], [51, 82], [51, 100], [57, 110]]] }),
      arrows: [{ line: [[36, 110], [36, 86]], both: true }] },
    { alt: "Seated option: sitting in a chair and lifting the heels, then the toes. A two-way arrow shows the movement.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "d", { legs: [[[30, 74], [52, 76], [54, 100], [61, 109]], [[30, 74], [50, 77], [50, 101], [57, 109]]] }),
      arrows: [{ line: [[74, 110], [74, 86]], both: true }] },
  ],
  "knee-lift": [
    { alt: "An adult stands with both hands on the back of a chair.",
      props: [{ t: "chair", x: 72 }], fig: stand(52, "a", { arms: holdChair(52) }) },
    { alt: "One knee lifts a few inches while both hands stay on the chair. An arrow points up.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(52, "a", { arms: holdChair(52), legs: [[[52, 66], [61, 82], [59, 102], [66, 103]], [[52, 66], [51, 88], [51, 109], [58, 110]]] }),
      arrows: [{ line: [[38, 100], [38, 84]] }] },
    { alt: "Seated option: a seated march, lifting one foot a little at a time, with an arrow pointing up.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "a", { legs: [[[30, 74], [52, 72], [54, 101], [61, 101]], [[30, 74], [50, 77], [49, 108], [56, 109]]] }),
      arrows: [{ line: [[72, 106], [72, 90]] }] },
  ],
  "neck-side": [
    { alt: "An adult sits tall in a chair, facing you, shoulders relaxed and head upright.",
      props: [{ t: "chair-back", x: 50 }], fig: frontSit(50, "c") },
    { alt: "The head tips gently, ear toward shoulder, while the shoulders stay down. A curved arrow shows the tilt.",
      props: [{ t: "chair-back", x: 50 }], fig: frontSit(50, "c", { head: [55, 32], tilt: 28 }),
      arrows: [{ curve: [[44, 14], [58, 12], [68, 24]] }] },
  ],
  "chest-opener": [
    { alt: "Side view: an adult stands with hands on hips and shoulders slightly rounded forward.",
      fig: stand(50, "d", { head: [56, 24], neck: [52, 35],
        arms: [[[52, 39], [44, 52], [51, 63]], [[52, 39], [45, 52], [50, 64]]] }) },
    { alt: "Standing tall: the shoulders draw gently back and the chest lifts a little. Arrows show the shoulders moving back and the chest lifting.",
      fig: stand(50, "d", { arms: [[[50, 38], [40, 51], [48, 63]], [[50, 38], [41, 51], [47, 64]]] }),
      arrows: [{ line: [[42, 38], [30, 38]] }, { line: [[66, 54], [66, 40]] }] },
  ],
  "seated-turn": [
    { alt: "An adult sits near the front of a chair, facing you, arms crossed over the chest.",
      props: [{ t: "chair-back", x: 50 }],
      fig: frontSit(50, "b", { arms: [[[62, 46], [62, 58], [42, 52]], [[38, 46], [38, 58], [58, 52]]] }) },
    { alt: "The upper body turns slowly to one side while the hips face forward. A curved arrow shows the turn.",
      props: [{ t: "chair-back", x: 50 }],
      fig: frontSit(50, "b", { head: [55, 30], neck: [53, 42],
        arms: [[[61, 46], [63, 58], [46, 53]], [[44, 46], [43, 58], [60, 52]]] }),
      arrows: [{ curve: [[30, 60], [52, 72], [74, 58]] }] },
  ],
  "hip-flexor": [
    { alt: "An adult stands behind a chair with both hands on its back, feet together.",
      props: [{ t: "chair", x: 72 }], fig: stand(52, "c", { arms: holdChair(52) }) },
    { alt: "One foot has stepped back, both knees soft, and the hips shift gently forward. An arrow shows the forward shift.",
      props: [{ t: "chair", x: 72 }],
      fig: { body: "c", face: 1, head: [56, 23], neck: [54, 35], hip: [52, 67], arms: holdChair(54),
        legs: [[[52, 67], [60, 88], [59, 109], [66, 110]], [[52, 67], [42, 88], [33, 107], [39, 110]]] },
      arrows: [{ line: [[30, 64], [42, 64]] }] },
  ],
  "leg-swing": [
    { alt: "An adult stands tall with one hand on the back of a chair.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(52, "a", { arms: [[[52, 38], [62, 46], [72, 49]], [[52, 38], [50, 53], [49, 66]]] }) },
    { alt: "One leg swings gently forward and back through a small range. A curved two-way arrow shows the swing.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(52, "a", { arms: [[[52, 38], [62, 46], [72, 49]], [[52, 38], [50, 53], [49, 66]]],
        legs: [[[52, 66], [41, 86], [33, 104], [39, 107]], [[52, 66], [52, 88], [52, 109], [59, 110]]] }),
      arrows: [{ curve: [[24, 92], [44, 108], [66, 98]], both: true }] },
  ],
  "thigh-stretch": [
    { alt: "An adult stands with one hand on the back of a chair.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(52, "b", { arms: [[[52, 38], [62, 46], [72, 49]], [[52, 38], [50, 53], [49, 66]]] }) },
    { alt: "One knee bends and the hand holds that ankle, bringing the heel gently toward the buttock. A curved arrow shows the heel moving up.",
      props: [{ t: "chair", x: 72 }],
      fig: stand(52, "b", { arms: [[[52, 38], [44, 55], [39, 72]], [[52, 38], [62, 46], [72, 49]]],
        legs: [[[52, 66], [50, 88], [37, 72]], [[52, 66], [52, 88], [52, 109], [59, 110]]] }),
      arrows: [{ curve: [[26, 96], [22, 80], [30, 68]] }] },
  ],
  "seated-knee": [
    { alt: "An adult sits tall in a sturdy chair with both feet on the floor.",
      props: [{ t: "chair", x: 22 }], fig: sit(22, "c") },
    { alt: "One knee straightens slowly so the lower leg lifts forward, then lowers. A curved arrow shows the leg rising.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "c", { legs: [[[30, 74], [52, 76], [80, 72], [83, 65]], [[30, 74], [50, 77], [49, 108], [56, 109]]] }),
      arrows: [{ curve: [[66, 104], [82, 98], [88, 80]] }] },
  ],
  "seated-march": [
    { alt: "An adult sits tall in a chair, hands resting on the seat, feet on the floor.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "b", { arms: [[[30, 47], [32, 62], [36, 78]], [[30, 47], [31, 62], [34, 78]]] }) },
    { alt: "One foot lifts an inch or two off the floor and lowers again. An arrow points up.",
      props: [{ t: "chair", x: 22 }],
      fig: sit(22, "b", { arms: [[[30, 47], [32, 62], [36, 78]], [[30, 47], [31, 62], [34, 78]]],
        legs: [[[30, 74], [52, 73], [53, 102], [60, 102]], [[30, 74], [50, 77], [49, 108], [56, 109]]] }),
      arrows: [{ line: [[72, 106], [72, 92]] }] },
  ],
  "side-shift": [
    { alt: "An adult stands behind a sturdy chair, facing you, both hands on its back, feet hip-width apart.",
      props: [{ t: "chair-front", x: 50 }],
      fig: front(50, "d", { arms: [[[60, 38], [64, 50], [62, 62]], [[40, 38], [36, 50], [38, 62]]] }) },
    { alt: "The weight shifts a little to one side and back, both feet staying on the floor. A two-way arrow shows the side-to-side shift.",
      props: [{ t: "chair-front", x: 50 }],
      fig: front(50, "d", { head: [55, 22], neck: [54, 34], hip: [55, 66],
        arms: [[[64, 38], [66, 50], [62, 62]], [[44, 38], [38, 50], [38, 62]]],
        legs: [[[60, 68], [59, 89], [56, 109], [61, 110]], [[50, 68], [47, 89], [44, 109], [39, 110]]] }),
      arrows: [{ line: [[32, 8], [68, 8]], both: true }] },
  ],
};
