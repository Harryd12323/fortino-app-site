// Learn → Move and Learn → Mind content. Plain data; app.js renders it.
//
// TODO(confirm): CLINICAL REVIEW BY DR. FORTINO BEFORE LAUNCH. Everything in this file was adapted from two research
// reports (a short-workout library for early medical weight loss, and an evidence-based wellness library). Every
// session, script, evidence line and safety note needs sign-off, and every safety message needs a defined escalation
// path inside the practice.
//
// Rules for editing (keep them):
//   - no weight-loss, results or outcome promises; no calorie claims ("burn", "fat-burning")
//   - no moral food words (clean, cheat, bad, junk, guilty, forbidden)
//   - eating practices support the patient's nutrition and medical plan; they never replace it
//   - Mind scripts are original wording from the wellness report; don't paste in scripts from other programs

"use strict";

// ---------- MOVE ----------
// steps drive the timer: { sec, title, text }. howTo is the short written version shown on the card.

const step = (sec, title, text = "") => ({ sec, title, text });

// A circuit: each move for `work` seconds, then `rest` seconds to rest or change position; optional rest between rounds.
function circuit(rounds, moves, work, rest, roundRest = 0) {
  const out = [];
  for (let r = 1; r <= rounds; r++) {
    moves.forEach((m, i) => {
      out.push(step(work, `${m.name} · round ${r} of ${rounds}`, m.cue));
      const next = moves[i + 1] || (r < rounds ? moves[0] : null);
      out.push(step(rest, "Rest or get ready", next ? `Next: ${next.name}.` : "Last one done. Breathe easy."));
    });
    if (roundRest && r < rounds) out.push(step(roundRest, "Rest", `Round ${r} done. Rest for a minute.`));
  }
  return out;
}

const MOVE_SESSIONS = [
  { id: "mobility-reset", name: "Mobility Reset", min: 5, kind: "gentle",
    equipment: "No equipment", impact: "Low",
    forWhat: "Gentle movement after sitting for a while, easier joint movement, and an easy option on low-energy days or before another workout.",
    howTo: ["March slowly in place (seated is fine), 1 minute.", "Shoulder rolls, then gentle arm reaches, 45 seconds.",
      "Hip hinge: push your hips back only as far as feels natural, 1 minute.", "Rock gently from heels to the balls of your feet, 45 seconds.",
      "Slow side steps, 45 seconds.", "Small, comfortable upper-body turns, hips facing forward, 45 seconds."],
    steps: [
      step(60, "March in place", "March slowly in place. Marching while seated is fine too."),
      step(45, "Shoulders and arms", "Roll your shoulders, then reach your arms gently forward and up."),
      step(60, "Hip hinge", "Keep your back comfortable and push your hips back only as far as feels natural, then stand tall."),
      step(45, "Heel-to-toe rock", "Rock gently from your heels toward the balls of your feet. Hold something steady if you like."),
      step(45, "Side steps", "Take slow side steps."),
      step(45, "Upper-body turns", "Make small, comfortable turns with your upper body while your hips stay mostly facing forward."),
    ],
    safety: "Use a seated or supported version if your balance is unsteady or you feel dizzy. If you have a new injury, recent surgery, severe vertigo or new symptoms you can't explain, ask your care team first." },

  { id: "chair-strength", name: "Chair Strength Starter", min: 8, kind: "strength",
    equipment: "Sturdy chair and wall space", impact: "Low",
    forWhat: "Leg strength for getting up from a chair, beginner upper-body strength, stronger calves, and confidence with strength exercise.",
    howTo: ["Warm up: seated marching and gentle arm movements, 1 minute.",
      "Chair sit-to-stands, 45 seconds. Use the armrests or your hands on your thighs if you need to. Rest 15 seconds.",
      "Wall push-ups, 45 seconds. Step your feet closer to the wall to make it easier. Rest 15 seconds.",
      "Holding the chair, slow calf raises, 45 seconds. Rest 15 seconds.",
      "Repeat those three exercises once.", "Cool down: gentle walking or seated marching, 1 minute.",
      "Stop each exercise while you're still moving with control. You don't need to push to your limit."],
    steps: [
      step(60, "Warm up", "March while seated and move your arms gently."),
      ...circuit(2, [
        { name: "Chair sit-to-stands", cue: "Use the armrests or your hands on your thighs if you need to. Stay in control." },
        { name: "Wall push-ups", cue: "Step your feet closer to the wall to make it easier." },
        { name: "Calf raises", cue: "Hold the chair. Rise up slowly and lower with control." },
      ], 45, 15),
      step(60, "Cool down", "Walk gently or march while seated."),
    ],
    safety: "Use a sturdy chair that won't roll or slide. If you have knee or hip arthritis, recent leg surgery, balance problems, or shoulder or wrist pain, ask your care team how to adjust. Use a higher chair or a partial stand if a full stand hurts." },

  { id: "strength-basics", name: "No-Equipment Strength Basics", min: 10, kind: "strength",
    equipment: "No equipment; clear wall space", impact: "Low",
    forWhat: "A beginner full-body strength routine for your legs, hips, upper body and calves, and better coordination.",
    howTo: ["Two rounds. Each move for 40 seconds, then 20 seconds to rest or change position:",
      "Shallow bodyweight squat. Go only as low as is comfortable.", "Wall push-up.",
      "Hip hinge, sliding your hands toward your thighs.", "Standing calf raise.",
      "Alternating standing knee lift. Touch the wall lightly for balance if needed."],
    steps: circuit(2, [
      { name: "Shallow squat", cue: "Go only as low as is comfortable." },
      { name: "Wall push-up", cue: "Step your feet closer to the wall to make it easier." },
      { name: "Hip hinge", cue: "Slide your hands toward your thighs as your hips move back." },
      { name: "Calf raise", cue: "Rise up slowly and lower with control." },
      { name: "Knee lifts", cue: "Lift one knee, then the other. Touch the wall lightly for balance if needed." },
    ], 40, 20),
    safety: "Hold a wall or counter if your balance is unsteady. Knee, hip, back, shoulder or wrist problems may need a different move. Stop for sharp pain; don't push through it." },

  { id: "band-basics", name: "Band Full-Body Basics", min: 15, kind: "strength",
    equipment: "Long resistance band; sturdy chair optional", impact: "Low",
    forWhat: "Whole-body strength and muscle endurance, and a strength habit you can repeat.",
    howTo: ["Warm up, 3 minutes: easy marching, shoulder circles, practice sit-to-stands and hip hinges.",
      "Each move for 45 seconds, then 15 seconds to change: sit-to-stands or shallow squats; seated band rows (band looped securely around your feet); standing band chest press (band securely around your upper back); band hip hinges (stand securely on the middle of the band, holding the ends); slow calf raises.",
      "Repeat the five moves once.", "Cool down, 2 minutes: gentle walking and relaxed breathing."],
    steps: [
      step(180, "Warm up", "Easy marching, shoulder circles, a few practice sit-to-stands, and hip hinges."),
      ...circuit(2, [
        { name: "Sit-to-stands or squats", cue: "Shallow squats are fine. Stay in control." },
        { name: "Seated band rows", cue: "Loop the band securely around your feet and pull your elbows back." },
        { name: "Band chest press", cue: "Band securely around your upper back. Press forward, then return slowly." },
        { name: "Band hip hinge", cue: "Stand securely on the middle of the band, hold the ends, and hinge at your hips." },
        { name: "Calf raises", cue: "Slow and controlled." },
      ], 45, 15),
      step(120, "Cool down", "Walk gently and breathe easy."),
    ],
    safety: "Check the band for tears before each session. Never attach it to anything that could move, and keep it away from your face in case it snaps back. Go lighter if your shoulders, back, hips or knees complain. If you have diabetic eye disease (retinopathy), ask your care team before doing harder strength work." },

  { id: "balance-builder", name: "Balance Builder", min: 10, kind: "gentle",
    equipment: "Sturdy chair, counter or wall for support", impact: "Low",
    forWhat: "Balance, steadier legs, and more confidence when standing and walking.",
    howTo: ["2 minutes of gentle marching and side-to-side weight shifts, holding support as needed.",
      "Feet close together for 30 seconds, then relax for 30 seconds.",
      "Semi-tandem stance (one foot slightly ahead), 30 seconds each side.",
      "Heel-to-toe stance, up to 30 seconds each side, close to your support.",
      "Supported single-leg stand, up to 20 seconds each leg. Repeat once.",
      "5 slow heel-to-toe steps along a counter in each direction.",
      "Gentle weight shifts until the 10-minute mark. Keep your eyes open throughout."],
    steps: [
      step(120, "March and shift", "March gently and shift your weight side to side. Hold your support as needed."),
      step(30, "Feet together", "Stand with your feet close together, near your support."),
      step(30, "Relax", "Relax and breathe."),
      step(30, "Semi-tandem: side 1", "One foot slightly ahead of the other."),
      step(30, "Semi-tandem: side 2", "Switch feet."),
      step(30, "Heel-to-toe: side 1", "One heel right in front of the other toes, close to your support. Up to 30 seconds."),
      step(30, "Heel-to-toe: side 2", "Switch feet."),
      step(20, "One leg: left", "Hold your support and stand on your left leg, up to 20 seconds."),
      step(20, "One leg: right", "Now your right leg."),
      step(20, "One leg: left", "Once more on the left."),
      step(20, "One leg: right", "Once more on the right."),
      step(60, "Heel-to-toe steps", "Take 5 slow heel-to-toe steps along a counter, then 5 back."),
      step(160, "Weight shifts", "Gentle weight shifts, side to side, until the end."),
    ],
    safety: "Always stay within reach of your support, and keep your eyes open. If you've fallen before, or have severe nerve problems in your feet, inner-ear or dizziness problems, or vision problems, ask your care team first; you may need supervision or physical therapy." },

  { id: "after-meal-walk", name: "After-Meal Walk", min: 10, kind: "cardio",
    equipment: "Comfortable shoes; treadmill optional", impact: "Low",
    forWhat: "Light activity after a meal and less time sitting. For people with type 2 diabetes, short walks after meals may help with blood sugar after eating.",
    howTo: ["Walk easily for 2 minutes.", "Walk at a purposeful but comfortable pace for 6 minutes. You should be able to talk in sentences.",
      "Slow to an easy pace for the last 2 minutes."],
    steps: [
      step(120, "Easy walk", "Walk at an easy pace."),
      step(360, "Purposeful walk", "A purposeful but comfortable pace. You should be able to talk in sentences."),
      step(120, "Easy walk", "Slow down to an easy pace."),
    ],
    safety: "If you take insulin or a sulfonylurea, ask your care team for a plan first, since activity can lower blood sugar. If you feel very full, queasy, or have heartburn or stomach upset after eating, it's fine to wait or skip it. If you have a foot wound, ask your care team about a non-walking option." },

  { id: "low-impact-cardio", name: "Low-Impact Cardio", min: 15, kind: "cardio",
    equipment: "No equipment", impact: "Low",
    forWhat: "Heart and lung fitness, movement confidence, and more activity in your day, with no jumping.",
    howTo: ["Warm up with an easy march, 2 minutes.",
      "1 minute each: side steps, alternating heel digs, moderate marching, side steps with comfortable arm reaches, easy marching.",
      "Repeat that set once.", "Cool down, 3 minutes: march more and more gently, then relax.",
      "Seated version: do the same moves sitting down if standing is hard on your joints."],
    steps: [
      step(120, "Warm up", "Easy march."),
      ...[1, 2].flatMap((r) => [
        step(60, `Side steps · round ${r} of 2`, "Step side to side at a comfortable pace."),
        step(60, `Heel digs · round ${r} of 2`, "Tap one heel forward, then the other."),
        step(60, `March · round ${r} of 2`, "Moderate march: breathing faster, but you can still talk."),
        step(60, `Side steps and reaches · round ${r} of 2`, "Side steps with comfortable arm reaches."),
        step(60, `Easy march · round ${r} of 2`, "Ease off and march gently."),
      ]),
      step(180, "Cool down", "March more and more gently, then relax."),
    ],
    safety: "A seated version works if standing is hard on your joints, or if you have balance limits or foot problems. Stop right away for chest discomfort, feeling faint, unusual shortness of breath, or a sudden drop in what you can do, and contact your care team." },

  { id: "walk-intervals", name: "Walk Intervals", min: 20, kind: "cardio",
    equipment: "Comfortable shoes; treadmill optional", impact: "Low to medium",
    forWhat: "Heart and lung fitness and walking endurance, building toward your weekly activity goal.",
    howTo: ["Walk easily for 3 minutes.", "Walk at a moderate pace for 2 minutes (use the talk test), then easily for 1 minute.",
      "Do that 2-and-1 pattern five times in all.", "Walk easily for the last 2 minutes."],
    steps: [
      step(180, "Easy walk", "Warm up at an easy pace."),
      ...[1, 2, 3, 4, 5].flatMap((r) => [
        step(120, `Moderate · ${r} of 5`, "Walk faster: breathing quicker, but you can still talk in sentences."),
        step(60, `Easy · ${r} of 5`, "Slow down and recover."),
      ]),
      step(120, "Easy walk", "Ease off to finish."),
    ],
    safety: "If you're just starting out, your balance is unsteady, or your care team has advised gentle exercise, walk at an easy pace the whole time instead of doing intervals. A slower pace, flat ground, shorter fast parts, or the bike are options if your joints hurt." },

  { id: "bike-intervals", name: "Stationary Bike Intervals", min: 20, kind: "cardio",
    equipment: "Stationary bike", impact: "Low",
    forWhat: "Heart and lung fitness with less weight on your joints, if cycling suits you better than walking.",
    howTo: ["Pedal easily with very light resistance for 3 minutes.",
      "Pedal faster or add a little resistance for 2 minutes (moderate effort), then pedal easily for 1 minute.",
      "Do that 2-and-1 pattern five times in all.", "Pedal easily for the last 2 minutes.",
      "Keep resistance low enough that you pedal smoothly, not grinding against a heavy load."],
    steps: [
      step(180, "Easy pedaling", "Very light resistance."),
      ...[1, 2, 3, 4, 5].flatMap((r) => [
        step(120, `Moderate · ${r} of 5`, "Pedal faster or add a little resistance. Keep it smooth; no grinding."),
        step(60, `Easy · ${r} of 5`, "Easy pedaling."),
      ]),
      step(120, "Easy pedaling", "Ease off to finish."),
    ],
    safety: "Set the seat so your knee stays slightly bent at the bottom of each pedal stroke. If getting on the bike is hard, or you have balance, knee or hip limits, or dizziness, a recumbent bike or a supervised option may suit you better. Stop for chest discomfort, faintness or unusual breathlessness." },

  { id: "strength-circuit", name: "Full-Body Strength Circuit", min: 25, kind: "strength",
    equipment: "Sturdy chair plus a resistance band or light dumbbells", impact: "Low to medium",
    forWhat: "A step up in whole-body strength and muscle endurance, and keeping everyday strength and function as your program goes on.",
    howTo: ["Warm up, 4 minutes: walking, shoulder movements, supported squats and hip hinges.",
      "Each move for 40 seconds, then 20 seconds to change: chair sit-to-stands or squats; band or light dumbbell rows; wall or counter push-ups; hip hinges with very light resistance; light overhead presses (or supported calf raises if overhead moves don't suit you).",
      "Rest 1 minute. Do the circuit three times in all, resting 1 minute between rounds.",
      "Cool down, 4 minutes: easy walking and gentle stretches.",
      "Don't hold your breath. Breathe out on the harder part of each move."],
    steps: [
      step(240, "Warm up", "Walk, move your shoulders, and do a few supported squats and hip hinges."),
      ...circuit(3, [
        { name: "Sit-to-stands or squats", cue: "Use the chair. Breathe out as you stand." },
        { name: "Rows", cue: "Band or light dumbbells. Pull your elbows back, then return slowly." },
        { name: "Wall or counter push-ups", cue: "Breathe out as you push away." },
        { name: "Hip hinges", cue: "Very light resistance. Push your hips back, then stand tall." },
        { name: "Overhead press or calf raises", cue: "Light overhead presses, or supported calf raises if overhead moves don't suit you." },
      ], 40, 20, 60),
      step(240, "Cool down", "Easy walking and gentle stretches."),
    ],
    safety: "Don't hold your breath; breathe out on the harder part of each move. If you have heart disease, a condition that isn't under control, joint restrictions, recent surgery, or diabetic eye or nerve complications, ask your care team to adjust this circuit first." },
];

// ---------- MIND ----------
// Card template (from the wellness report), same order every time: what it's for, time, start, "you don't have to",
// evidence (one sentence), safety. pro: true shows the stronger "talk to a professional" note.

const MIND_PRACTICES = [
  { id: "breath-anchor", name: "Breath Anchor", time: "5 min",
    forWhat: "For ordinary stress, feeling scattered, or making a pause before you respond to a craving or a frustrating moment.",
    dontHave: "You don't have to clear your mind.",
    evidence: "Studies of breathing practices found small reductions in stress, anxiety and low mood, though this exact five-minute script hasn't been tested on its own.",
    safety: "Return to normal breathing if you feel dizzy, panicky, or uncomfortable. If focusing on your breath repeatedly triggers intense panic or distress, stop the exercise and talk with a health professional.",
    steps: [
      "Sit, stand, or lie somewhere comfortable. Let your eyes close or keep them softly open.",
      "Notice one place where your body is supported, such as your feet on the floor or your back against a chair.",
      "Take three natural breaths without trying to change anything.",
      "Now let your attention rest on the physical feeling of breathing. It might be the air at your nose, movement in your chest, or movement in your abdomen.",
      "If it feels comfortable, let the exhale become slightly longer than the inhale. Do not strain and do not hold your breath.",
      "Your mind will wander. That is not failure. When you notice it, quietly think, “thinking,” and return to the next breath.",
      "Continue for a few minutes.",
      "At the end, ask: “What is one useful choice I can make next?”",
    ] },

  { id: "ground-orient", name: "Ground and Orient", time: "3 min",
    forWhat: "For moments when your attention feels caught in worry, frustration, or mental overload.",
    dontHave: "You don't have to make the feeling go away.",
    evidence: "Grounding is one of the stress skills in the World Health Organization's Doing What Matters in Times of Stress guide; this exact three-minute sequence hasn't been studied on its own.",
    safety: "If you regularly experience flashbacks, feel detached from reality, or become more distressed during this exercise, stop and discuss this with a qualified professional.",
    steps: [
      "Pause what you are doing, as long as it is safe to pause.",
      "Feel your feet against the floor, or your body against the chair. Gently press into that support.",
      "Look around and notice three things you can see. No analysis is needed.",
      "Notice two sounds.",
      "Notice one physical point of contact, such as your feet, hands, or back.",
      "Take one comfortable breath.",
      "Ask: “Where am I, what am I doing, and what matters next?”",
      "Choose one small next action and return to your day.",
    ] },

  { id: "body-scan", name: "Body Scan", time: "8 min", pro: true,
    forWhat: "For noticing tension, moving out of a busy day, and getting ready to rest.",
    dontHave: "You don't have to relax anything, or close your eyes.",
    evidence: "Body scans are part of many mindfulness programs, but their benefits as a stand-alone practice aren't firmly established.",
    safety: "Stop or switch to an eyes-open grounding practice if focusing on your body brings up flashbacks, panic, dissociation, or intense distress. If this happens repeatedly, talk with a mental health professional.",
    steps: [
      "Sit or lie comfortably. Eyes may remain open.",
      "Begin with the places your body touches the chair, bed, or floor.",
      "Move attention to your feet. Notice pressure, temperature, tingling, heaviness, lightness, or nothing in particular.",
      "Slowly move attention through the lower legs, upper legs, abdomen, hands, arms, shoulders, face, and head.",
      "At each area, simply notice. You do not need to relax it or change it.",
      "If you find discomfort, try describing it neutrally: “warm,” “tight,” “pulsing,” or “pressure.”",
      "If focusing inside the body feels unpleasant, move your attention outward to the feeling of the chair or sounds in the room.",
      "Finish by noticing the body as a whole for two or three breaths.",
    ] },

  { id: "first-bites", name: "Mindful First Bites", time: "5–10 min", pro: true,
    forWhat: "For the start of a meal, to notice what's driving your eating and how the food tastes and feels.",
    dontHave: "You don't have to eat unusually slowly or get it perfect.",
    evidence: "Mindful eating programs have helped with emotional and automatic eating in studies, though they haven't been shown to change weight on their own.",
    safety: "Mindful eating is a wellness skill, not treatment for an eating disorder. Talk with your care team if you have recurrent episodes of feeling unable to control eating, purging, severe food restriction, or intense distress about eating or body weight.",
    steps: [
      "Before the first bite, pause for one comfortable breath.",
      "Notice what drew you to eat. Possibilities include physical hunger, routine, emotion, availability, social circumstances, or some combination. There is no “wrong” answer.",
      "Notice the food's appearance and smell.",
      "Take the first bite without looking at a screen. Notice taste, temperature, and texture.",
      "Do the same for the next few bites, without forcing yourself to eat unusually slowly.",
      "Pause briefly. Notice physical hunger, fullness, satisfaction, and emotion.",
      "Ask: “What would feel caring and appropriate right now?”",
      "Continue your meal according to your nutrition and medical plan. The goal is awareness, not perfect control.",
    ] },

  { id: "craving-wave", name: "Craving Wave", time: "5–10 min", pro: true,
    forWhat: "For making space between a food craving and an automatic response.",
    dontHave: "You don't have to fight the craving.",
    evidence: "Mindfulness programs appear to help with food cravings, but studies test whole programs, not this single technique.",
    safety: "Mindful eating is a wellness skill, not treatment for an eating disorder. Talk with your care team if you have recurrent episodes of feeling unable to control eating, purging, severe food restriction, or intense distress about eating or body weight. This practice is never meant to help you ignore real hunger or eat less than your plan.",
    steps: [
      "Pause and name the experience: “A craving is here.”",
      "Notice where you experience it. It might feel like a taste expectation, restlessness, tension, an image of food, or a thought such as “I need this now.”",
      "Rate the intensity from zero to ten only as a way to observe change, not as a test you must pass.",
      "For one or two minutes, watch what happens. Does the sensation become stronger, weaker, move, or stay about the same?",
      "When your mind starts arguing with the craving, return to the direct sensations.",
      "Remind yourself: “I do not have to fight this feeling, and I do not have to react automatically.”",
      "Recheck the intensity.",
      "Make a deliberate choice that fits your nutrition and medical plan. The exercise is about choice, not suppressing legitimate hunger.",
    ] },

  { id: "self-compassion", name: "Self Compassion Reset", time: "3 min",
    forWhat: "For feeling discouraged after a meal, a missed workout, or a day that didn't go the way you wanted.",
    dontHave: "You don't have to feel fine about what happened.",
    evidence: "In weight management studies, self-compassion practices reliably increased self-compassion and often helped with eating-related challenges.",
    safety: "If you feel hopeless or low most days, or have thoughts of harming yourself, that isn't a motivation problem. Please talk with your care team or a mental health professional.",
    steps: [
      "Name what happened without exaggerating it: “That did not go the way I wanted.”",
      "Notice the emotional response. Perhaps frustration, disappointment, embarrassment, or discouragement.",
      "Remind yourself: “Setbacks are part of changing behavior. One moment does not define the whole process.”",
      "Ask: “If someone I respected were in this situation, what would I say to them?”",
      "Offer yourself the same tone. For example: “I can be honest about this without attacking myself.”",
      "Ask one final question: “What is the smallest useful next action?”",
      "Do that action. The reset could simply mean returning to the next planned meal, activity, appointment, or other action in your care plan.",
    ] },

  { id: "muscle-release", name: "Progressive Muscle Release", time: "10 min",
    forWhat: "For physical tension, ordinary stress, and winding down toward rest. It may help you unwind.",
    dontHave: "You don't have to tense hard; mild effort is enough.",
    evidence: "A 2024 review found progressive muscle relaxation can help with stress and anxiety, though the studies varied and most involved repeated practice.",
    safety: "Don't tense any area that is injured, painful, recently operated on, or uncomfortable, and follow any physical restrictions from your care team.",
    steps: [
      "Sit or lie somewhere supported.",
      "Begin with your hands. Gently tense the muscles for about five seconds. Use mild effort, not maximum effort.",
      "Release completely and notice the contrast for about ten seconds.",
      "Repeat with the shoulders by gently raising them, then releasing.",
      "Continue through the face, abdomen, legs, and feet if comfortable.",
      "Skip any area that is injured, painful, recently operated on, or uncomfortable to tense.",
      "After the final release, notice the whole body resting without trying to make it feel any particular way.",
      "Take several natural breaths and finish.",
    ] },

  { id: "bedtime-settling", name: "Bedtime Settling", time: "10 min",
    forWhat: "For a busy mind at bedtime, and a steady routine for winding down. It's sleep preparation, not a treatment for insomnia.",
    dontHave: "You don't have to make yourself fall asleep.",
    evidence: "Mindfulness programs have modestly improved sleep quality compared with sleep education, though a single short practice isn't the same as a full program.",
    safety: "If sleep problems are ongoing or significant, talk with your healthcare provider.",
    steps: [
      "Get into a comfortable resting position.",
      "Let your breathing happen naturally. Your job is not to make yourself sleep.",
      "Notice the places where the bed or chair supports your body.",
      "Spend several breaths noticing the lower body, then the upper body, then the face. Let each area be as it is.",
      "When a thought about tomorrow appears, quietly label it “planning.”",
      "When a thought about today appears, label it “remembering.”",
      "Return attention to the feeling of support underneath you or to the sound of the room.",
      "If sleep comes, let the practice end. If it does not, the goal is simply to rest without fighting wakefulness.",
    ] },

  { id: "mindful-walk", name: "Mindful Walk", time: "10 min",
    forWhat: "For stress, mood and attention, and for movement that doesn't feel like a performance test.",
    dontHave: "You don't have to walk fast or far.",
    evidence: "Early research on mindful walking suggests benefits for stress and mood, but stronger studies are still needed.",
    safety: "If you have mobility limits or activity restrictions, try a seated practice such as Ground and Orient instead, and follow your care team's guidance.",
    steps: [
      "Choose a safe walking space and follow any activity restrictions from your care team.",
      "Before moving, notice your feet contacting the ground.",
      "Begin walking at a comfortable normal pace.",
      "For the first minute, notice the rhythm of your steps.",
      "Then notice how your feet contact and leave the ground.",
      "Gradually open your attention to sounds, light, temperature, and your surroundings.",
      "When your mind moves into planning or self criticism, notice that and return to the next step.",
      "For the final minute, let yourself simply walk without trying to improve anything.",
      "When you finish, notice whether your mental state is different, the same, or somewhere in between.",
    ] },

  { id: "kindness", name: "Kindness Practice", time: "6 min",
    forWhat: "For harsh self-criticism or discouragement, and a less combative relationship with yourself.",
    dontHave: "You don't have to love your body or use these exact words.",
    evidence: "Kindness practices improved positive mood and self-compassion in studies, though benefits were smaller when compared with other active approaches.",
    safety: "Use neutral wording or stop if these phrases create substantial distress. If this repeatedly brings up intense trauma-related reactions, talk with a professional.",
    steps: [
      "Sit comfortably and take one natural breath.",
      "Bring to mind the simple fact that you are trying to care for your health.",
      "Repeat slowly: “May I meet this moment with patience.”",
      "Then: “May I treat my body with care.”",
      "Then: “May I have the steadiness to keep beginning again.”",
      "If these phrases do not feel natural, replace them with language that does.",
      "Think briefly of someone else who is also working through something difficult.",
      "Offer the same intention: “May you have patience and steadiness too.”",
      "Finish by noticing one supportive action you can take today.",
    ] },

  { id: "values", name: "Values to Next Step", time: "4 min",
    forWhat: "For low motivation, especially once the newness of starting a program has worn off.",
    dontHave: "You don't have to feel motivated first.",
    evidence: "Acting on your values is one of the skills in the WHO's Doing What Matters stress guide; a short values prompt hasn't been studied on its own.",
    safety: "Values are a reason to act, not a test. If thinking about this brings up guilt, pick a different value or come back to it another day.",
    steps: [
      "Ask: “What matters to me about taking care of my health?”",
      "Choose one value rather than one number. Possibilities include energy, independence, strength, being present with family, consistency, confidence, or caring for your future self.",
      "Complete the sentence: “This matters to me because…”",
      "Now ask: “What is one small action today that would express that value?”",
      "Keep the action realistic. It might be following your planned meal, attending an appointment, taking a suitable walk, preparing for bedtime, or another action already in your care plan.",
      "Decide when you will do it.",
      "Finish with: “I do not need to feel perfectly motivated in order to take one useful step.”",
    ] },
];

// "How are you feeling?" → practices (routing from the wellness report).
const FEELINGS = [
  { label: "Stressed", ids: ["breath-anchor", "ground-orient"] },
  { label: "About to eat on autopilot", ids: ["first-bites"] },
  { label: "Having a craving", ids: ["craving-wave"] },
  { label: "Discouraged", ids: ["self-compassion", "kindness"] },
  { label: "Can't switch off at night", ids: ["muscle-release", "bedtime-settling"] },
  { label: "Need motivation", ids: ["values"] },
  { label: "Want to move", ids: ["mindful-walk"] },
];

// ---------- MOVE: "Find your starting point" ----------
// TODO(confirm with Doc): these answers and rules pick a starting set from the sessions above; no new content.
// An activity suggestion, not medical advice. Joint pain or any listed symptom → "check with your care team" instead
// of recommendations. Starter-tier sessions only for people just starting out, low on energy, or 60 and over
// (the workout report's weeks 1 to 4 and its slower progression for older adults).

const START_QUIZ = {
  ages: ["18–29", "30–44", "45–59", "60–74", "75 or older"],          // index 3+ = 60 and over
  goals: [
    { id: "strength", label: "Build strength" }, { id: "endurance", label: "Improve endurance" },
    { id: "more", label: "Move more" }, { id: "balance", label: "Better balance" },
  ],
  struggles: [
    { id: "energy", label: "Low energy" }, { id: "pain", label: "Joint pain" },
    { id: "time", label: "Short on time" }, { id: "start", label: "Just starting out" },
  ],
  equipment: [{ id: "chair", label: "Chair" }, { id: "band", label: "Resistance band" }, { id: "bike", label: "Stationary bike" }],
  times: [{ max: 10, label: "5–10 min" }, { max: 15, label: "10–15 min" }, { max: 20, label: "15–20 min" }, { max: 30, label: "20 min or more" }],
  // Asked each time, never saved: they describe right now.
  symptoms: ["Chest pain or pressure", "Fainting, or feeling like you might faint", "Unusual shortness of breath",
             "Severe or persistent belly pain", "A new injury, or pain that's getting worse"],
};

// Equipment a session needs beyond a wall or counter (which everyone is assumed to have).
const SESSION_NEEDS = { "chair-strength": ["chair"], "band-basics": ["band"], "strength-circuit": ["chair", "band"], "bike-intervals": ["bike"] };
const STARTER_SESSIONS = ["mobility-reset", "chair-strength", "strength-basics", "balance-builder", "after-meal-walk", "low-impact-cardio"];
// For each goal: sessions that serve it (primary), then ones that round out the week (support), in order of preference.
const GOAL_SESSIONS = {
  strength: { primary: ["chair-strength", "strength-basics", "band-basics", "strength-circuit"], support: ["after-meal-walk", "low-impact-cardio", "walk-intervals"] },
  endurance: { primary: ["after-meal-walk", "low-impact-cardio", "walk-intervals", "bike-intervals"], support: ["strength-basics", "chair-strength", "band-basics"] },
  more: { primary: ["after-meal-walk", "mobility-reset", "low-impact-cardio"], support: ["strength-basics", "chair-strength"] },
  balance: { primary: ["balance-builder", "mobility-reset"], support: ["chair-strength", "strength-basics"] },
};

// answers: { age: index, goal, struggle, equipment: [ids], time: max minutes } → [{ id, why }] (up to 3)
function recommendSessions(a) {
  const beginner = a.struggle === "start" || a.struggle === "energy" || a.age >= 3;
  const has = (id) => (SESSION_NEEDS[id] || []).every((e) => a.equipment.includes(e));
  const fits = (id) => has(id) && MOVE_SESSIONS.find((m) => m.id === id).min <= a.time && (!beginner || STARTER_SESSIONS.includes(id));
  const usesKit = (id) => (SESSION_NEEDS[id] ? 1 : 0);
  const g = GOAL_SESSIONS[a.goal], goalWhy = `Fits your goal: ${START_QUIZ.goals.find((x) => x.id === a.goal).label.toLowerCase()}.`;
  let primary = g.primary.filter(fits), support = g.support.filter(fits);
  if (!beginner) primary = [...primary].sort((x, y) => usesKit(y) - usesKit(x));   // use the kit they said they have

  const picks = [];
  const add = (id, why) => { if (id && !picks.some((p) => p.id === id) && fits(id) && picks.length < 3) picks.push({ id, why }); };
  primary.slice(0, 2).forEach((id) => add(id, goalWhy));
  add(support[0], "Rounds out your week: strength and aerobic activity work well together.");
  [...primary, ...support].forEach((id) => add(id, goalWhy));
  add("mobility-reset", "A gentle way to get moving.");

  const swapIn = (id, why) => {
    if (picks.some((p) => p.id === id) || !fits(id)) return;
    if (picks.length === 3) picks.pop();
    picks.push({ id, why });
  };
  if (a.struggle === "energy") swapIn("mobility-reset", "An easy option for low-energy days.");
  if (a.age >= 3 && a.goal !== "balance") swapIn("balance-builder", "Balance practice builds steadiness and confidence on your feet.");
  return picks;
}
