# Hoopland Draft Class Generator

Generate 60-player Hoopland draft classes that look and play like real prospects. Every player gets a distinct look, a real archetype, tendencies that match their skills, and a growth curve. Runs entirely in the browser, with no install and no uploads.

**Use it:** open `index.html`, or the GitHub Pages link once it's set up (see below).

1. Choose how loaded the class is (see **Class makeup** below).
2. Click **Generate class** and check the draft board. The Age, OVR and Ceiling columns each have a dropdown to sort low to high or high to low.
3. Rename the file if you want (the name also shows in game), then click **Download**. Star counts stay hidden by default so the class stays a surprise: tick **Show star counts** to put them in the file name (for example "Draft Class 3x5 16x4.5 #12345") and to see what a Random range rolled.
4. In Hoopland, load the `.txt` as a draft class.

Your settings and custom players are remembered in your browser.

Leave the seed empty for a new class every click. Type a seed to rebuild an exact class.

## Class makeup

**Auto scaling** (default 60 players; set any class size from 9 to 300, and the 3.5★ count scales with it): set the number of 5★ and 4.5★ prospects with the slider or by typing it. Switch either one to **Random** and enter a range, and each class rolls a count inside it. 4★ and 3.5★ fill the rest using the scaling below.

**Set every tier:** type exactly how many 5★, 4.5★, 4★, 3.5★ and 3★ prospects you want. The class size is their total (9 to 300).

### Advanced settings

- **Archetype minimums:** guarantee at least a certain number of players with an archetype. 0 keeps the normal mix. Positions stay evenly split by swapping slots; if you ask for more than the positions allow, the page tells you.
- **Custom players:** add your own players with first name, last name, jersey number, stars and archetype. Anything left on Random is rolled normally, and looks are always rolled. If you pick a star tier that's already full, one spot from the biggest tier is converted, and the page tells you.

## Auto scaling

3.5 stars is the floor. More 5-stars means fewer 3.5-stars.

| 5★ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.5★ | 18 | 16 | 14 | 12 | 10 | 9 | 7 | 6 | 5 | 4 | 3 |

The rest are 4 and 4.5 stars. The 4.5-star slider picks how many of them are 4.5 (it starts at a suggested value and tops out at every non-3.5 player). At 3 five-stars, 80% of the class is 4★ or better.

**4-star share:** to change the mix, drag the 4★ slider to the share of the class you want. Spots fill in order: 5★, then 4.5★, then 4★ up to your share, and **3.5★ take everything left**. For example, 3 five-stars, 10 four-and-a-halfs and a 20% 4★ share in a 60-player class gives 12 4★ and 35 3.5★. **Use scaling** returns to the table above.

- **Ceiling OVR:** Hoopland grows every player to his star tier's full ceiling, so that's what the file stores. 5★ = 100, 4.5★ = 93, 4★ = 86, 3.5★ = 79.
- **Starting OVR** = ceiling minus 15 to 27, usually close to 21, so players in the same star tier start at different levels (a 4★ starts anywhere from 59 to 71). The 3 best prospects start 7 to 14 below their ceiling.
- **Diamonds in the rough:** 20% of 4.5★ and 5★ prospects (and 10% of 4★) start 28 to 35 below their ceiling instead. A raw 5★ can start at 65, below a typical 4★, and still grow to 100. The draft board tags them.
- **Ages:** pick one next to the Generate button.
  - **Draft 19–22** (default): random 19 to 22.
  - **Freshmen: all 18**: every player enters college at 18.
  - **Freshmen: dynamic**: 18 (70%), 19 (29%), 17 (1%). Nobody is over 19.

## Players

- **Positions:** an equal split across the 9 Hoopland positions, PG, G, SG, GF, SF, F, PF, FC and C (6 or 7 each in a 60-player class). Height follows position.
- **Archetypes:**
  - Common: 3-and-D, Post Scorer, Rim Protector, Slasher, Shot Creator.
  - Rare: Point Forward, Playmaker, Rim Runner, Glass Cleaner, Defensive Specialist.
  - Rarest: Sharpshooter, Stretch Big.
  - 4.5 to 5★ prospects blend in a second archetype, for example "Sharpshooting Shot Creator".
- **Skills:** split across the 12 attributes by archetype (core, support, weak), with a ±40% roll on each so no two players match.
  - **Specialty (core) skills always max out at 16 to 18.** Better prospects lean toward 18.
  - **19 and 20 are rare**, and a player gets at most one: 5★ 30% get a 20 and 30% a 19; 4.5★ 3% a 20 and 15% a 19; 4★ 7% a 19; 3.5★ 3%; 3★ 1%.
  - Support skills top out at 13 to 17, everything else at 11 to 16. Only a 5★ can push an off-skill past 17.
  - **Bonus family:** each player gets a small lift to one skill family outside his core: Finishing, Shooting, Creating, Rebounding or Defense. It lifts the whole family a little (Rebounding raises both offensive and defensive rebounding by 2 or 3), never one skill a lot.
  - **Weak spot:** one non-core skill is cut roughly in half.
  - The draft board shows both under the archetype, for example "+Rebounding · weak passing".
- **Tendencies:** follow the archetype, but a player can't lean hard into a shot he can't make.
- **Badges:** rare. Spark Plug is the most common, then Clamps and Dimer. Limitless goes only to 4.5★+ shooters.
- **Countries:** 87% US, 5% CA, 3% AU, 3% FR, 1% each DE, RS. Names come from each country. US hometowns are a random state, using one game-made city per state; other countries use exact city coordinates the game itself uses (any other coordinate makes Hoopland fall back to Tirana, Albania).

## Looks

- **Skin:** about 50/50 light and dark, with no in-between tones.
- **Hair color:**
  - Dark skin always has black hair.
  - Light skin gets black, brown, blond or red, but only colors that contrast with the skin.
  - 1% get wild dyed hair.
- **Eyes:** dark-skinned players always have black eyes. No light brown eyes for anyone.
- **Brows and facial hair** always match.
- **Banned styles:** hair 29, 39, 40, 45, 47 to 49, 52, 57, 58, 63, 64, 68, 69, 80 to 82, 90, 91, 101 to 105, 115, 116, 124, 125, 127, 128, 131, 165 to 167. Facial hair 4, 8 to 14, 19 to 24, 31.
- **Color 262539** is never used.
- **Gear:** 18 players per class wear it, the 9 best plus 9 from the bottom half. Each wearer uses one color, and the same set goes on all 4 uniforms.
  - **Headwear:** IDs 1 to 25, never 10 to 13.
  - **Arms:** an inside shirt, a full sleeve, shoulder only, wrist only, or shoulder plus wrist. An elbow is only colored as part of a full sleeve.
  - **Legs:** knees, shins, or both, always mirrored left and right.
- **Jersey numbers:** 0 to 11 are most common, then 00, 20, 21, 23, 25, 30, 31, 41. Rare: 24, 77, 88 and other numbers real NBA players wear.

Every class is checked against all of these rules before you can download it.

## Put it on GitHub Pages

1. Create a new repository and upload the files themselves, not a folder containing them. `index.html` must sit at the top level of the repo.
2. Open **Settings → Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, then save.
3. After a minute your generator is live at `https://<your-username>.github.io/<repo-name>/`.

## Files

| File | What it does |
|---|---|
| `index.html` | The page |
| `app.js` | Slider, table and download |
| `generator.js` | All generation rules and the validator |
| `data.js` | Name pools and hometowns |
| `template.js` | The known-good Hoopland file shell the class is written into |
| `tests/test.js` | `node tests/test.js` generates 850 classes and checks every rule |
