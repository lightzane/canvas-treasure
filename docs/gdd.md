# Canvas Treasure

_a top-down exploration / mystery game — design doc_

> "Player sees" = actual in-game text. "Dev note" = private, never shown in-game.

---

## Premise

- She experiences: an invitation, an event later today, a town visibly prepping
- Some NPCs ask for help, some don't
- Actually happening: it's for her — nobody says "birthday" until the very end
- Mood: bright daylight, happy colors, no dusk

---

## Sequence of Events

Overview of the entire game flow. Click # to jump to the full detail in Events.

| #   | Event                                                     | Area                                                | Participants                                   | Tasks/Items unlocked                         |
| --- | --------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| 1   | [Waking up](#waking-up)                                   | Home (bedroom)                                      | Player                                         | —                                            |
| 2   | [The postcard](#the-postcard)                             | Home (mailbox)                                      | Player, Mama, Papa                             | Invitation postcard                          |
| 3   | [The near-miss](#the-near-miss)                           | Mansion                                             | Player, Dao Ming Si, Staff                     | Find Hua Ze Lei; Find Dao Ming Si's keys     |
| 4   | [Meeting Hua Ze Lei](#meeting-hua-ze-lei)                 | Park                                                | Player, Hua Ze Lei                             | Catch 3 sheets                               |
| 5   | [Sheet 1](#sheet-1)                                       | Park                                                | Player, Hua Ze Lei                             | Sheet 1                                      |
| 6   | [Chasing sheet 2](#chasing-sheet-2)                       | Park → flower shop (front) → beach path (southwest) | Player                                         | —                                            |
| 7   | [Inside the flower shop](#inside-the-flower-shop)         | Flower shop, interior                               | Player, Florist                                | —                                            |
| 8   | [Retrieving sheet 2](#retrieving-sheet-2)                 | Beach path, dune grass                              | Player, Florist                                | Shears; Sheet 2                              |
| 9   | [Hua Ze Lei finds her again](#hua-ze-lei-finds-her-again) | Near flower shop                                    | Player, Hua Ze Lei                             | Wear Running Shoes                           |
| 10  | [Wearing the shoes](#wearing-the-shoes)                   | Home                                                | Player, Mama, Papa                             | Running Shoes; gates "The bottle"            |
| 11  | [The bottle](#the-bottle)                                 | Beach                                               | Player                                         | Treasure map; Investigate the mansion garden |
| 12  | [Caught in the garden](#caught-in-the-garden)             | Mansion grounds                                     | Player, Dao Ming Si, Hua Ze Lei                | Music box; Find Mei Zuo & Xi Men's stall     |
| 13  | [Xi Men and Mei Zuo's stall](#xi-men-and-mei-zuos-stall)  | Southeast                                           | Player, Mei Zuo, Xi Men                        | —                                            |
| 14  | [Dao Ming Si's favor](#dao-ming-sis-favor)                | Mansion                                             | Player, Dao Ming Si, Staff                     | Access to Main Event (south entrance)        |
| 15  | [Main Event](#main-event)                                 | Park, south entrance / red carpet                   | Player, Mama, Papa, F4, everyone (not You yet) | Access to the front                          |
| 16  | [The chest opens](#the-chest-opens)                       | Park, front of gathering                            | Player, everyone, You                          | Heart Photo (completed); Our Photo           |

---

## Reference

**The three main photo-objects:**

- **Invitation postcard** — photo of an opened chest, empty photo-frame-slot inside, unlabeled
- **Our Photo** — a different photo, inside the one real chest, found at the finale → fits the postcard's slot
- Neighbors' postcards say "invitation," normal complete photo — that comparison is what tells her hers is different
- **Heart Photo** — Hua Ze Lei's three tracing-paper sheets, layered → Reveal photo

**Cast (roster only — see Events for what happens):**

- **Dao Ming Si** — mansion owner, loud, full of himself, secretly decent. Reachable from the start.
- **Hua Ze Lei** — quiet, near the cherry tree. Spawns after the Dao Ming Si event.
- **Mei Zuo** / **Xi Men** — two separate tasks in the journal on purpose (so it doesn't tip off they're together ahead of time), even though the actual scene has them sharing one stall. Both spawn after "Caught in the garden," not after Sheet 2 anymore.
- **Mama** / **Papa** — at home. No scripted role beyond ambient presence and Mama's dialogue moments (postcard comparison, parcel mention).
- **Decline-NPCs** — offer help, get waved off. Atmosphere only.
- **Slip-NPCs** — say things like hints, easter eggs, everything in hindsight. Scattered widely.
- **You** — nowhere on the map until the finale event. First appearance fully scripted.

**The world** (rough, not exact — spacious, no compression):

- Home — center
- Mansion — east of home
- Park — center, south of mansion. Has (at least) two entrances: south (hers, used for the finale) and north (blocked to her the whole game — reserved for your scripted entrance)
- Flower shop — west of park
- Beach — southwest. First visited via the sheet 2 chase (Events 6-7); further content still brainstorming

**Systems:**

- Equipment — worn, not carried (Running Shoes: toggleable run)
- Bag — items (inventory)
  - Journal — auto-updating tasks
  - Map — fills in as explored

**Dev note — tracing paper:**

- Thin, semi-translucent sheets, architectural-drafting style
- In-character for a sketch artist
- Marks align when layered — no torn edges needed to interlock

---

## EVENTS

_The script. Every event below is a self-contained block: heading, then location/cast, then content._

---

### Waking up

| Area           | Participants |
| -------------- | ------------ |
| Home (bedroom) | Player       |

**Detail:**

_Nothing here_

---

### The postcard

| Area               | Participants                  |
| ------------------ | ----------------------------- |
| Home (living room) | Player, Mama, Papa (backyard) |

**Detail:**

1. Player steps out of the room
2. Mama mentions there is a parcel for us, a tiny chest and a postcard.
3. Mama mentions the neighbors got postcards too — theirs say "invitation," normal complete photo
4. That comparison tells her hers is different
5. Heads out

**Script:**

**Unlocks:**

- _(item)_ Invitation postcard, chest.
- _(task)_ Find the treasure missing in postcard

**Note:** The postcard has a photo of an opened chest with something missing in the middle where a photo
can be inserted in place.

**Dev Note:** There should be things over the house (e.g. running shoes) but only the running shoes would be
interactive later. For now, we just prompt "A pair of running shoes."

---

### The near-miss

| Area                   | Participants               |
| ---------------------- | -------------------------- |
| Mansion (east of home) | Player, Dao Ming Si, Staff |

**Script:**

> **STAFF** _(too quick)_: "—and don't let her see the—"
>
> **DAO MING SI** _(covering, loud)_: "The _what_? There is no—" _(sees her)_ "Oh. Perfect timing."
>
> _Recovers instantly into full arrogance._
>
> **DAO MING SI**: "Staff — breakfast, now." _(backing away)_ "I've lost my car keys. Devastating."
>
> **STAFF**: "...Sir, I didn't think you lost your keys."
>
> **DAO MING SI**: "Am I asking for your opinion?"
>
> "Maybe Hua Ze Lei has them. Or Xi Men. Or Mei Zuo Whichever—" _(stops)_ "Actually — never mind. I'll handle this myself."
>
> _He exits._
>
> **STAFF**: "...You're welcome to go looking for the young master's 'keys,' if you'd like something to do."

**Unlocks:** _(task)_ Find Hua Ze Lei

---

### Meeting Hua Ze Lei

| Area                                     | Participants       |
| ---------------------------------------- | ------------------ |
| Park (cherry tree), south of the mansion | Player, Hua Ze Lei |

**Detail:**

1. A gust scatters three sheets of tracing paper from his sketchbook

**Unlocks:** _(task)_ Catch Hua Ze Lei's 3 sheets

---

### Sheet 1

| Area | Participants       |
| ---- | ------------------ |
| Park | Player, Hua Ze Lei |

**Script:**

> _She picks it up — a single curved stroke, narrowing to a point._
>
> **PLAYER** _(thought)_: "...huh. Kind of looks like a 'V'." _(beat)_ "...Vic?" _(shakes it off)_ "No. I'm overthinking a piece of paper."
>
> **HUA ZE LEI**: "...Oh no worries! No need to catch all that."

**Unlocks:** _(item)_ Tracing-paper sheet 1

---

### Chasing sheet 2

| Area                                                | Participants |
| --------------------------------------------------- | ------------ |
| Park → flower shop (front) → beach path (southwest) | Player       |

**Detail:**

1. Sheet 2 flees southwest, away from the park
2. It comes to rest at the flower shop front — she catches up, interacts with it
3. On interaction, a gust takes it further; nobody did that
4. Ends up further southwest than she's been before, the shoreline coming into view

**Dev note:** the flower shop stop is a deliberate pause in the chase, not just a waypoint — it's what puts the flower shop on her radar before she needs to backtrack to it for the shears in "Retrieving sheet 2." Guided discovery, not a cold introduction.

**Dev note:** this is what actually gets her to the beach for the first time — the chase leads her there, not a task marker sending her there directly.

---

### Inside the flower shop

| Area                  | Participants    |
| --------------------- | --------------- |
| Flower shop, interior | Player, Florist |

**Detail:**

1. After the sheet flies off from the shop front, she steps inside — curiosity, not chasing anymore
2. Florist is mid-task, tending plants, trimming stems
3. Small talk only — no task, no item. Whatever she says, the Florist's replies keep circling back to shears/cutting, in passing, as a normal part of the job

**Script:**

> **FLORIST 1** _(not looking up, mid-trim)_: "Careful where you step — I've got cuttings all over today."
>
> **FLORIST 2**: "We're preparing these for later event"
>
> **FLORIST 3**: "Want to borrow shears and help us cutting? Don't worry we got this already. Thank you!"

**Dev note:** the hint is deliberately soft — nothing here is a task or a prompt to remember something. It's just planting (no pun intended) the idea "florist = shears" before she needs it in "Retrieving sheet 2," so the passerby line there lands as a confirmation, not a cold introduction.

**Unlocks:** —

**Script During Retrieving Sheet 2:**

> **FLORIST 3**: "Want to borrow shears and help us cutting? Don't worry we got this already. Thank you!"
>
> **FLORIST 3**: "Oh I see! You need it for something else? Alright, here you go!"

**Unlocks:** _(item)_ Garden Shears

---

### Retrieving sheet 2

| Area                                                                | Participants    |
| ------------------------------------------------------------------- | --------------- |
| Beach path, tangled in dune grass → briefly back to the flower shop | Player, Florist |

**Detail:**

1. Sheet 2's caught in thick dune grass blocking part of the public beach path — visible, unreachable by hand
2. Not solvable by hand; needs cutting

**Dev note:** public land, not private property — the earlier thicket-behind-the-flower-shop version had her cutting someone's backyard, which didn't hold up. Overgrown grass blocking a public path is fair game.

**Script — establishing the shears, on the spot:**

> _(a passerby, unprompted)_: "Stuff like that grows in fast around here. The florist keeps shears, if you ever need to borrow some."

3. She backtracks to the flower shop, borrows them, returns, cuts through

**Unlocks:** _(item)_ Tracing-paper sheet 2

**Resolved:** just the sheet — no extra reveal, no shortcut. Keeping it simple.

---

### Hua Ze Lei finds her again

| Area                           | Participants       |
| ------------------------------ | ------------------ |
| Near the flower shop / thicket | Player, Hua Ze Lei |

**Script:**

> **HUA ZE LEI**: "...You're still at it." _(ambles over)_ "Your mother passed by. Said to remind you — you left without your running shoes. You could catch them fast or explore the area pretty quickly while wearing those."
>
> **HUA ZE LEI**: "Apparently." _(turns to leave, pauses)_ "I should get moving too. Still need to grab things from Xi Men and Mei Zuo — confetti, apparently." _(dry almost-laugh)_ "Don't ask me why they're in charge of that."

**Unlocks:** _(task)_ Wear Running Shoes at Home

---

### Wearing the shoes

| Area | Participants                                 |
| ---- | -------------------------------------------- |
| Home | Player, Mama and Papa (background, backyard) |

**Detail:**

1. Equips Running Shoes at home
2. Mama and Papa are outside in the backyard, talking — ambient, no dialogue needed, just life happening

**Script:**

> **MAMA:** Oh wow running shoes! You can now move faster between maps, try it out on the beach!

**Unlocks:**

- _(equipment)_ Running Shoes
- _(event)_ "The bottle" only becomes accessible at the beach after this event

---

### The bottle

| Area                                                        | Participants |
| ----------------------------------------------------------- | ------------ |
| Beach, a separate return visit (after the shoes/Lei scenes) | Player       |

**Detail:**

1. Rumor lines from beach locals first, before she finds anything — _"Grew up with all sorts washing in on this shore — the occasional real treasure map, if you believe the old-timers."_
2. A bottle washed up on the sand
3. Inside: a genuine treasure map, X marking a spot — not the beach itself
4. The map points toward Dao Ming Si's mansion grounds

**Unlocks:**

- _(item)_ Treasure map
- _(task)_ Investigate the mansion garden (spawns a subtle interactive object)

---

### Caught in the garden

| Area                                            | Participants                    |
| ----------------------------------------------- | ------------------------------- |
| Dao Ming Si's mansion grounds (garden, outdoor) | Player, Dao Ming Si, Hua Ze Lei |

**Detail:**

1. Following the treasure map from "The bottle," she lets herself into the mansion grounds
2. She finds the treasure spot in the garden — a music box, tentatively (open to a better idea)
3. Uses the shears again to get to it (same tool from the beach-path thicket — no new item needed)

**Script:**

> **DAO MING SI** _(catching her, genuinely startled)_: "Why are you here? Why are you cutting my garden?!"
>
> _Hua Ze Lei arrives._
>
> **HUA ZE LEI**: "Ah Si — I did mention to her. I'm the one who lost something in your garden. (whispers) Give me music box before he notices my acting. (normal voice) Thank you for finding it for me."
>
> **DAO MING SI** _(turning on Lei instead, already losing interest)_: "Lei, why do you have things in my garden? ...Well, anyway. Let's continue. There's an event to come."
>
> **HUA ZE LEI** _(to her, once Dao Ming Si's gone)_: "I heard Ah Si said you're looking for Xi Men and Mei Zuo — for some car keys."
> "They're southeast, near the market stalls. See you later — I'll go help Ah Si in the park first."

**Dev note:** all park entrances get blocked from this point on — tied narratively to Lei heading off to help with event prep. Staff/NPCs physically stand at each entrance turning people away:

> **STAFF/NPC** _(at each entrance)_: "Sorry — can't let you through right now. Young master's orders."

Same line reusable at every blocked entrance, no need to write unique dialogue per spot. She should notice small visible changes nearby (a few more flowers, an early soft-launch decoration or two) without anything explained.

**Unlocks:**

- _(task)_ Find Mei Zuo & Xi Men's stall (spawns them in the world)
- world-state: park entrances blocked

---

### Xi Men and Mei Zuo's stall

| Area                                                          | Participants                             |
| ------------------------------------------------------------- | ---------------------------------------- |
| Southeast, near the market stalls (unexplored zone until now) | Player, Mei Zuo, Xi Men, background NPCs |

**Dev note — visiting early:** if she reaches this spot before the "Caught in the garden" trigger has fired, Mei Zuo and Xi Men aren't there yet — only the line of girls waiting, ambient, no dialogue. Consistent with the spawn-trigger system (see Cast, Reference section) — they don't exist at this location until unlocked.

**Detail:**

1. A line of girls waiting at their stall — the deal is a kiss for every balloon blown
2. She watches for a moment, then decides to help — reaches for a balloon herself

**Script — the near-miss, triggered by her trying to help:**

> **XI MEN**: "We're preparing balloons for the event— car keys? I don't have it. Mei Zuo?"
>
> **MEI ZUO**: "I knew I gave them back to Ah Si."
>
> **XI MEN**: "Maybe check back at the Dao Ming Si's mansion."
>
> **MEI ZUO**: "That's why these girls thought we're looking for a _kiss_ where it's actually a _keys_!"

**Dev note:** Spawns the staff in mansion where it can easily be seen.

---

### Dao Ming Si's favor

| Area    | Participants                |
| ------- | --------------------------- |
| Mansion | Player, Dao Ming Si's Staff |

**Detail:**

1. The staff will see will guide the player to go south entrance of the park
2. Once done, Staff finds her:

**Script:**

> **STAFF** _(mock-solemn)_: "Ah — there you are. Good news: the young master's keys have been found.
> The event's starting. You'll want the park's south entrance — the north's closed off today."

---

### Main Event

| Area                                                                                                              | Participants                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The park, south entrance — a red carpet leading up to the gathering. Same park as the "Meeting Hua Ze Lei" event. | Player, Mama, Papa, Dao Ming Si, Hua Ze Lei, Mei Zuo, Xi Men, everyone she's met (not You yet — see "The chest opens") |

**Script:**

> _She reaches the south entrance. A red carpet stretches ahead of her._
>
> **MAMA**: "You're almost late for the event!"
>
> **PAPA**: "Go on — Dao Ming Si's already there."
>
> _Along the carpet, the F4 are lined up on either side, the same way Mama and Papa are._
>
> **DAO MING SI**: "My keys were never actually lost. I just panicked — I was worried you might've seen the cake."
>
> **HUA ZE LEI** _(interrupting)_: "But nevertheless — to make up for it, we found the last page you were looking for. Go on, straight ahead."
>
> **XI MEN**: "There she is wooooooooh!"
>
> **MEI ZUO**: "Alright everyone clap your hands cheers!"
>
> _She walks up the middle of the carpet. A crowd, cheering, clapping. Decorations and food everywhere._

**Unlocks:** access to the front of the gathering, where You are waiting

**Resolves:**

- _task_ Dao Ming Si's Car keys,
- _task_ Hua Ze Lei's catch 3 sheets

---

### The chest opens

| Area                             | Participants                    |
| -------------------------------- | ------------------------------- |
| The park, front of the gathering | Player, everyone she's met, You |

**Script:**

> **YOU**: "Love, love — I saw this last page, and caught it for you."
>
> _She receives it. Places it with the other two, piece by piece. Together, they form a heart._
>
> _A full-screen moment — the assembled Heart Photo fills view, everything else fades back, as if she's completely absorbed in looking at it._
>
> _She lowers it._
>
> **EVERYONE**: "Happy birthday!"

**Detail (continued):**

1. F4 reveal the chest she's had all along — the one from home, carried or already here
2. Our Photo is inside under the top layer — she checks, sees it, fits the postcard's frame-slot

**Unlocks:**

- _(item)_ Heart Photo (completed)
- _(item)_ Our Photo

**Open — reserved for you, not scripted here:** additional personal messages, and an F4 performance. Structure ends here; content's yours to add.
