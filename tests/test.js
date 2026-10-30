// Run: node tests/test.js
// Generates many classes across every setting and checks every rule.
var G = require("../generator.js");
var fails = 0, total = 0, all = [];
function run(opts, seed, label) {
  total++;
  var res;
  try { res = G.makeClass(opts, seed); } catch (e) { fails++; if (fails < 8) console.log(label, "THREW", e.message); return null; }
  all = all.concat(res.players);
  return res;
}
var R = G.makeRng(12345);
var ARCHS = Object.keys(G.ARCH);

// 1. auto scaling, every 5★ count, default and random 4.5★
for (var q = 0; q <= 10; q++) for (var s = 0; s < 30; s++) {
  var n45 = s % 2 ? undefined : R.randint(0, G.maxN45(q));
  run({ counts: G.countsFromAuto(q, n45) }, s * 7919 + q, "auto q" + q);
}
// 2. manual tier counts, including 3★ and odd class sizes
for (var s = 0; s < 150; s++) {
  var c = { 10: R.randint(0, 12), 9: R.randint(0, 25), 8: R.randint(0, 30), 7: R.randint(0, 20), 6: R.randint(0, 15) };
  if (G.totalOf(c) < 9) c[8] += 9;
  run({ counts: c }, 1000 + s, "manual");
}
// 3. archetype minimums
for (var s = 0; s < 120; s++) {
  var mins = {};
  for (var k = 0; k < 3; k++) mins[R.choice(ARCHS)] = R.randint(1, 12);
  var res = run({ counts: G.countsFromAuto(R.randint(0, 10)), archMin: mins }, 5000 + s, "mins");
}
// 4. custom players, including stars that force a slot conversion and archetypes outside the usual mix
for (var s = 0; s < 120; s++) {
  var custom = [];
  for (var k = 0; k < R.randint(1, 6); k++) custom.push({
    fn: "Test" + k, ln: "Player" + s, num: R.choice([null, "00", "7", "23", "67", ""]),
    pot: R.choice([null, 10, 9, 8, 7, 6]), arch: R.choice([null].concat(ARCHS))
  });
  var res = run({ counts: G.countsFromAuto(R.randint(0, 3)), custom: custom, archMin: s % 3 ? {} : { "Playmaker": 10 } }, 9000 + s, "custom");
}
// 4b. auto scaling at other class sizes
[9, 30, 120, 190, 300].forEach(function (n) {
  for (var s = 0; s < 6; s++) run({ counts: G.countsFromAuto(R.randint(0, 10), undefined, n) }, 7000 + n + s, "size " + n);
});
// 4b2. 4-star share set: 3.5-stars fill whatever is left
var fourBad = 0;
for (var s = 0; s < 60; s++) {
  var size = R.choice([30, 60, 60, 120]), q = R.randint(0, 10), h = R.randint(0, 20), n4 = R.randint(0, size);
  var c4 = G.countsFromAuto(q, h, size, n4);
  if (G.totalOf(c4) !== size || c4[8] > n4 || (c4[8] < n4 && c4[7] !== 0)) fourBad++;
  run({ counts: c4 }, 6000 + s, "four share");
}
if (fourBad) { fails += fourBad; console.log("4-star share counts wrong:", fourBad); }
// 4c. freshman age modes
["fresh18", "freshDynamic"].forEach(function (m) {
  for (var s = 0; s < 20; s++) run({ counts: G.countsFromAuto(R.randint(0, 10)), ages: m }, 8000 + s, "ages " + m);
});
// 5. bad settings are rejected cleanly
var rejected = 0;
[{ counts: { 10: 2, 9: 0, 8: 0, 7: 0, 6: 0 } },
 { counts: G.countsFromAuto(3), archMin: { "Slasher": 70 } },
 { counts: G.countsFromAuto(3), custom: [{ fn: "", ln: "X" }] }].forEach(function (o) {
  try { G.makeClass(o, 1); } catch (e) { rejected++; }
});
console.log("classes:", total, "failed:", fails, "| bad settings rejected:", rejected + "/3");
var c = G.makeClass({ counts: G.countsFromAuto(6) }, 2026), text = G.buildFile(c.players, "Test");
console.log("file ok:", JSON.parse(text).draftClass.length === 60, "rating float kept:", text.indexOf('"rating":0.0') > 0);
process.exit(fails || rejected !== 3 ? 1 : 0);
