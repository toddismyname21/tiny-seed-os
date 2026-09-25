---
name: check-blast-radius-first
description: Default to STOPPING before the edit, not after. Todd should not have to say "take your time" to get considered work — find what a change touches and show the blast radius BEFORE writing.
metadata:
  type: feedback
---

# Stop before the edit. Don't make Todd ask for care.

Todd, 2026-09-15:

> "you are out of control. If i don't specifically tell you to take your time, or
> take other parts of the system into account you just go forward with the work
> without taking anything into account. It is a recipe for disaster and the last
> couple of weeks since i switched to my own machine have been challenging."

**Why:** this is a live farm. Bad output reaches members, chefs, a food bank and a
pack crew within hours, and Todd's name is on all of it. Caution requested is
caution too late — by the time he says "slow down," I've usually already written
something.

## The proof, same day

Told to fix a label bug, I shipped a one-line change suppressing the CSA contents
footer for **all** `share_type='flex'` members. It typechecked and tests passed.
It was **wrong**: 4 members that week (Olivia Vareha, Laura McCurdy, Lois Brown,
Ellen Spolar) had bought a *"Small CSA Share" as a flex line item* — they DO get a
packed box and the packer needs its crop list. Only because Todd said *"make sure
you fully understand the system before making updates"* did I check and find them.

Same day, same root cause, four more times: asserted a member's biweekly parity
without opening her record; estimated a case weight instead of asking and put it
on an invoice; read a stale code comment instead of the function and emailed 41
people the wrong cutoff; sent a customer invoice without showing him first.

**The through-line: treating "I have enough to act" as the bar instead of "I have
checked what this touches."**

## The default, from now on

Before editing anything shared or member-facing:

1. **Find the other callers.** `grep` the symbol. Who else reads this field, this
   function, this template?
2. **Find the exceptions in the DATA, not the code.** The 4 CSA-Share buyers were
   invisible in the source and obvious in one query. Run the query.
3. **Show the blast radius, then stop.** "This touches X, Y, Z; here's who is
   affected; here's what I propose." Wait.
4. Verification AFTER the edit (typecheck/tests/simulate) is necessary but does
   NOT substitute for step 3 — my broken version passed all of it.

**Never require Todd to say "take your time" to get this.** If a task feels small
enough to skip these, that is exactly the signal to do them.

## Related
- [[source-of-truth-chain]] — look it up instead of asserting
- [[never-send-without-confirmation]] — the same discipline for outbound
- `.claude/rules/no-guessing.md`
