# Kawasaki Mule 550 (KAF300C, 2000) — "runs but no power under load"

Engine **FE290D-DS09**, e/no FE290DE402516. 286 cc, 9 HP, air-cooled OHV.

**Symptom:** runs, but has no power under load — will not climb a hill.
**Already replaced, none of which fixed it:** starter · carburetor · primary
(drive) clutch · secondary (driven) clutch · **drive belt**.

**The entire drive side is new.** That eliminates the usual answer and is why
this is a harder problem than it looks.

---

## Read this before you pick up a tool

You asked to start with a compression test. That is the right instinct — you
have replaced the whole drive side and it did not help, so settling the engine
question is the sensible next move.

But there is a trap in it, and it is the reason this document is ordered the way
it is.

**Many Kawasaki FE-series engines carry an automatic compression release (ACR)**
— a small weight on the camshaft that cracks the exhaust valve open at cranking
speed so the starter does not have to fight full compression. On an engine with
an ACR, a cranking compression test reads **far lower than the engine's true
compression**. Healthy FE engines routinely show 60–90 psi cranking. If you read
that number against a "should be 120+ psi" rule of thumb, you will conclude the
engine is worn out and start pricing a rebuild for an engine that is fine.

**I could not verify from a Kawasaki source whether the FE290D specifically has
an ACR.** Two research attempts failed. So this procedure does not depend on
the answer: you will do a compression test for the record, and then a
**leak-down test**, which is immune to the question entirely — it measures
cylinder sealing with the engine stopped and both valves closed, so an ACR
cannot affect it, and unlike a compression test it tells you *where* the leak is.

**Do not condemn this engine on a cranking compression number alone.**

---

## STAGE 0 — Free checks. Do these first. (30 minutes, $0)

With the belt, both clutches and the carburetor already replaced, the drive side
is eliminated. What remains that costs nothing:

### 0.1 — Is the exhaust plugged?  ← TOP SUSPECT NOW

Carbon-plugged muffler or spark arrestor is the textbook "idles beautifully,
falls on its face under load," and this engine is 25 years old. With the
driveline ruled out, this is the most likely cheap answer on the machine.

An engine cannot make power it cannot exhale. Restriction does almost nothing at
idle and strangles the engine at full load — exactly your symptom.

- Pull the spark arrestor screen. If it is caked, wire-brush it or burn the
  carbon off with a torch.
- **The decisive test:** loosen the muffler clamp or drop the muffler entirely,
  then drive it 100 feet. It will be obnoxiously loud. **If it suddenly pulls,
  you have found it.**

### 0.2 — Are the brakes dragging?

A seized caliper or over-adjusted parking brake feels exactly like an engine
with no power, and no engine test will ever show it.

- Jack up the rear end.
- Spin each rear wheel by hand — free, with light drag at most.
- After a short drive, put a hand near each hub. A dragging brake runs hot.

### 0.3 — Does the throttle actually reach wide open?

A stretched cable or misadjusted stop means you never get full throttle.
Common, free, and invisible from the driver's seat.

- Have someone floor the pedal while you watch the throttle plate at the carb.
  **It must swing to its full-open stop.**
- Confirm the choke is fully OFF when running. A partly closed choke runs rich
  and gutless.

### 0.4 — Is the new CVT actually set up right?

Not a criticism — a correctly-chosen belt installed with wrong geometry still
slips, and you have new parts on both ends now.

- **Belt width and length** — confirm the new belt matches spec. A belt slightly
  too narrow rides deep in the sheave and never reaches full ratio, which kills
  hill climbing specifically.
- **Sheave alignment** — the primary and secondary must be in the same plane.
- **Belt deflection** — to the manual's spec.
- **Do both sheaves move freely?** Grab the primary and work it open and shut.
  A clutch that binds part way will not shift under load.
- Any oil or grease on the belt or sheave faces will make a new belt slip like
  an old one. Clean with brake cleaner if so.

## STAGE 1 — Fuel supply under demand (45 minutes, ~$15)

You replaced the carburetor. You may not have replaced what *feeds* it. A
starvation problem upstream shows up only when demand is high — which is to say,
on a hill.

### 1.1 — Tank vent
Drive it up the hill with the fuel cap **loosened**. If it pulls noticeably
better, the tank vent is plugged and the tank is pulling a vacuum. Clean or
replace the vent.

### 1.2 — Flow volume, not just "fuel is getting there"
- Pull the fuel line at the carburetor inlet into a clear container.
- If gravity-fed: open the valve and time it. You want a steady, full-bore
  stream, not a dribble.
- If it has a pump: crank the engine and watch for strong, rhythmic pulses.
- A weak stream that still "flows" is exactly what starves an engine under load
  while running fine at idle.

### 1.3 — Filter and pickup screen
- Replace the inline fuel filter. They are cheap and they clog invisibly.
- There is a screen on the pickup inside the tank. On a 25-year-old machine with
  a rotting fuel system it may be furred over. Pull it and look.

### 1.4 — Inspect every inch of fuel line
Same failure that took the mower down. Squeeze the lines — hard, cracked, or
sticky means replace all of it. A line that is soft inside can collapse under
suction and starve the engine only under high demand.

---

## STAGE 2 — Ignition under load (30 minutes, ~$5)

A coil can make a fat blue spark at cranking and break down once cylinder
pressure rises. That is a load-only symptom.

### 2.1 — Read the plug
Pull it and look before you clean it. It is a free diagnostic:
- **Light tan / grey** — mixture is right.
- **Black and sooty** — running rich. Check choke and air filter.
- **White / blistered** — running lean. Points back to Stage 1.
- **Oily** — oil getting past rings or valve guides. Note this; it matters at
  Stage 4.

Replace the plug and set the gap to spec. **Get the gap spec from the manual —
do not eyeball it.**

### 2.2 — Check for a sheared flywheel key
A partially sheared key retards ignition timing and produces exactly this
symptom: it runs, but it has nothing under load. It is a known failure after a
hard backfire or a sudden stop.
- Pull the recoil/flywheel cover.
- Pull the flywheel and inspect the woodruff key in the crankshaft keyway.
- **Any shear, deformation, or offset means replace it.** They cost a couple of
  dollars. Do not reuse a damaged key.

### 2.3 — Spark under load
With the plug out and grounded, spark will always look fine. The honest test is
a spark tester with an adjustable gap, run while the engine is loaded. If spark
becomes intermittent as the engine works, the coil is breaking down.

---

## STAGE 3 — Governor (20 minutes, $0)

The governor opens the throttle as load increases. If it is misadjusted or the
linkage is worn, the engine simply will not respond to load — the exact
complaint.

- With the engine OFF, move the governor arm through its travel. It should be
  free, with no slop at the pivot and no bent linkage.
- Check that the governor spring is the correct one and is hooked in the correct
  hole. A spring in the wrong hole changes the governed speed completely.
- **Static adjustment** (procedure is in the FE290D manual — follow it, do not
  improvise): generally, loosen the clamp bolt on the governor arm, push the arm
  so the throttle goes wide open, rotate the governor shaft to its stop in the
  same direction, then tighten the clamp bolt.
- Listen on the hill: an engine whose governor is working will *change note* as
  it loads. One that just quietly dies away is not being given throttle.

---

## STAGE 4 — Compression, then leak-down (the engine verdict)

Only now, with the cheap and likely causes eliminated.

### 4.1 — Valve lash FIRST

**Adjust valve lash before testing compression.** A tight valve — especially a
tight exhaust valve — holds the valve slightly open, which both lowers
compression and burns the valve. If you test compression first you will measure
the symptom and misread it as a worn engine.

- Engine must be **COLD** for this. Lash changes with temperature.
- Get the intake and exhaust clearances from the FE290D service manual.
- Set the piston at top dead center on the compression stroke (both valves
  closed, rocker arms loose).
- Set each clearance with a feeler gauge, hold the adjuster, tighten the lock
  nut, then **re-measure** — lash almost always changes as you tighten.

If a valve was badly tight, re-run the machine before going further. That may be
the whole problem.

### 4.2 — Compression test

**What you need:** a compression tester with a screw-in hose (not the rubber-cone
push-in type — it will not seal reliably), in the correct thread for this plug
hole. Take the old plug to the store and match the threads.

1. **Warm the engine up** and shut it off. A cold engine reads low.
2. Disable the ignition — pull the plug wire and **ground it to the block**. A
   floating plug wire can spike the coil and damage it.
3. Remove the spark plug.
4. Screw the tester in hand-tight. Do not use tools on it.
5. **Hold the throttle WIDE OPEN and the choke fully OPEN.** This is the step
   most often skipped, and a closed throttle will read low and send you chasing
   nothing.
6. Crank the engine through **at least 5–6 compression strokes**, until the
   gauge needle stops climbing. Note the highest reading.
7. Note how fast it came up. A healthy cylinder jumps most of the way on the
   first two strokes. One that creeps up slowly is leaking.

**Record the number. Do not act on it yet** — see the ACR warning at the top.

**Wet test.** Squirt about a teaspoon of engine oil into the plug hole and
repeat.
- **Reading rises significantly** → the leak is past the **piston rings** (the
  oil temporarily seals them). That is a teardown.
- **Reading barely changes** → rings are probably fine and the leak is at a
  **valve** or the **head gasket**. That is a much cheaper repair.

That wet/dry comparison is the useful part of a compression test, and it works
regardless of whether there is an ACR, because the ACR affects both readings
equally.

### 4.3 — Leak-down test — the decisive one

This is the test that actually answers the question, and it is the reason the
ACR uncertainty does not matter.

**What it does:** puts regulated shop air into the cylinder with the piston at
TDC on the compression stroke and both valves closed, and measures what
percentage leaks out. The engine does not turn, so a compression release cannot
affect it.

**You need:** a leak-down tester (two gauges, ~$40–70) and an air compressor.

1. Engine warm, ignition disabled, plug out.
2. Bring the piston to **TDC on the compression stroke**. Both valves must be
   closed — turn the engine by hand and feel for compression, then find the top.
   Getting this wrong invalidates the whole test.
3. **Lock the engine so it cannot spin.** Put it in gear with the brake set.
   Air pressure on the piston will try to turn the crank hard, and it will hurt
   you if it gets away.
4. Connect the tester and regulate air in per the tester's instructions.
5. Read the leakage percentage.

**And this is the part a compression test cannot do — listen for where it goes:**

| Where you hear air | What is leaking |
|---|---|
| **Carburetor / intake** | intake valve not sealing |
| **Exhaust / muffler** | exhaust valve not sealing — *the classic cause of no power under load* |
| **Oil fill / dipstick / breather** | piston rings or cylinder wall |
| **Bubbles in coolant, or hissing into the adjacent passage** | head gasket |

**Rough interpretation:**
- **Under 10%** — excellent.
- **10–20%** — acceptable on an engine of this age.
- **20–30%** — worn; likely contributing to your symptom.
- **Over 30%** — a real problem. Where you heard the air tells you what to fix.

**A leaking exhaust valve is the single most common engine-side cause of "runs
fine, no power on a hill,"** and it is repairable with a valve job — far short of
a rebuild.

---

## Decision point

- **Leak-down good (under ~20%), valves set right** → the engine is not your
  problem. Go back to Stage 0 — most likely the exhaust, the brakes, or the CVT
  setup. With the driveline parts all new, geometry is more suspect than wear.
- **Leak-down bad at the exhaust valve** → valve job. Check the seat and whether
  the valve is burnt.
- **Leak-down bad at the rings** (and the wet compression test confirmed it) →
  now you are talking about a rebuild or a replacement engine, and it is worth
  pricing both against what the machine is worth.

---

## What I could not verify, and how to get it

Two research runs failed on me, so the following numbers are **not in this
document on purpose** rather than guessed at. Getting any of them wrong costs
real money.

| Need | Where to get it |
|---|---|
| FE290D compression spec (standard + service limit) | FE290D service manual |
| **Whether FE290D has an ACR** | camshaft parts diagram — look for a compression-release weight on the cam |
| Valve lash, intake and exhaust | FE290D service manual |
| Spark plug type and gap | manual, or a dealer with the engine code |
| Spark plug thread size (for the tester adapter) | take the old plug to the store |
| CVT drive belt part number | Kawasaki dealer, **quote model KAF300C, year 2000** |

**When you call a dealer, give them: Mule 550, KAF300C, year 2000, engine code
FE290D-DS09.** That is everything they need. Ask them to confirm the belt part
number against the VIN when you have it.
