// Run: node tests/test.js
// Generates many classes at every quality level and checks every rule.
var G = require("../generator.js");
var fails = 0, total = 0, all = [];
for (var q = 0; q <= 10; q++) {
  for (var s = 0; s < 60; s++) {
    var players = G.generate(q, s * 7919 + q);
    var errs = G.validate(players, q);
    total++;
    if (errs.length) { fails++; if (fails < 6) console.log("Q" + q + " seed " + s + ":", errs.slice(0, 3)); }
    all = all.concat(players);
  }
}
function share(fn) { var c = {}; all.forEach(function (x) { var k = fn(x); c[k] = (c[k] || 0) + 1; });
  var o = {}; Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (k) { o[k] = +(c[k] / all.length).toFixed(3); }); return o; }
console.log("classes:", total, "failed:", fails);
console.log("dark skin:", share(function (x) { return x.meta.dark; }));
console.log("hair color:", share(function (x) { return x.player.appearance.browC; }));
console.log("stars:", share(function (x) { return x.player.pot / 2; }));
console.log("positions:", share(function (x) { return x.player.pos; }));
console.log("archetype:", share(function (x) { return x.meta.arcs[0]; }));
// file round-trip
var c = G.makeClass(6, 2026), text = G.buildFile(c.players, "Test");
var parsed = JSON.parse(text);
console.log("file ok:", parsed.draftClass.length === 60, "bytes", text.length, "rating float kept:", text.indexOf('"rating":0.0') > 0);
process.exit(fails ? 1 : 0);
