// Hoopland Draft Class Generator: core logic.
// Works in the browser (window.HDG) and in Node (require("./generator.js")).
(function (root) {
  "use strict";
  var DATA = root.HDG_DATA || (typeof require !== "undefined" ? require("./data.js") : null);
  var TEMPLATE = root.HDG_TEMPLATE || (typeof require !== "undefined" ? require("./template.js") : null);

  var CLASS_SIZE = 60, MAX_SIZE = 300;
  var SKILLS = ["LAY", "DNK", "INS", "MID", "TPT", "FTS", "DRB", "PAS", "ORE", "DRE", "STL", "BLK"];

  // ------------------------------------------------------------- RNG ----
  function makeRng(seed) {
    var a = seed >>> 0;
    function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var r = {
      random: next,
      randint: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      uniform: function (lo, hi) { return lo + next() * (hi - lo); },
      choice: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      weighted: function (items, weights) {
        var tot = 0, i;
        for (i = 0; i < weights.length; i++) tot += weights[i];
        var x = next() * tot;
        for (i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
        return items[items.length - 1];
      },
      pick: function (table) { return r.weighted(table.map(function (t) { return t[0]; }), table.map(function (t) { return t[1]; })); },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
        return arr;
      },
      sample: function (arr, k) { return r.shuffle(arr.slice()).slice(0, k); },
      gauss: function (mu, sd) {
        var u = 1 - next(), v = next();
        return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      }
    };
    return r;
  }

  function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
  function pad4(n) { return ("000" + n).slice(-4); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------------------------------------------------------- LOOKS ----
  var HAIR_BANNED = [29, 39, 40, 45, 47, 48, 49, 52, 57, 58, 63, 64, 68, 69, 80, 81, 82, 90, 91, 101, 102, 103, 104, 105,
    115, 116, 124, 125, 127, 128, 131, 165, 166, 167];
  var HAIR_IDS = range(0, 170).filter(function (i) { return HAIR_BANNED.indexOf(i) < 0; });

  var FHAIR_BANNED = [4, 8, 9, 10, 11, 12, 13, 14, 19, 20, 21, 22, 23, 24, 31];
  var FHAIR_COMMON = [1, 2, 3, 5, 15, 16, 17, 18];
  var FHAIR_RARE = range(1, 31).filter(function (i) { return FHAIR_BANNED.indexOf(i) < 0 && FHAIR_COMMON.indexOf(i) < 0; });

  var HEAD_BANNED = [10, 11, 12, 13];
  var HEAD_COMMON = [1, 4, 5, 18, 19, 20, 21, 24];
  var HEAD_RARE = [17, 25];
  var HEAD_MID = range(1, 25).filter(function (i) {
    return HEAD_BANNED.indexOf(i) < 0 && HEAD_COMMON.indexOf(i) < 0 && HEAD_RARE.indexOf(i) < 0;
  });

  var NEVER_COLORS = ["262539"];
  var SKIN_LIGHT = [["FFE3CC", 25], ["F7D6BC", 25], ["F4CCA1", 25], ["EBBF96", 15], ["E5AE78", 10]];
  var SKIN_DARK = [["945542", 25], ["7A4535", 25], ["623530", 22], ["4A2A22", 18], ["3A2019", 10]];
  var HAIR_DARK = [["141020", 100]];
  var HAIR_LIGHT = [["141020", 24], ["46211F", 22], ["6B3E26", 15], ["8A5A35", 8], ["E0B84A", 12], ["C9A13F", 10],
    ["C2562A", 5], ["97432A", 4]];
  var HAIR_WILD = ["E63946", "3BB273", "2F6BFF", "FF6FB5", "F2F2F2"];
  var EYE_DARK = [["141020", 70], ["46211F", 30]];
  var EYE_LIGHT = [["141020", 30], ["46211F", 25], ["472D3C", 15], ["154FA1", 12], ["2E6A42", 10], ["0D2F6D", 8]];

  var GEAR_NORMAL = [["PRI", 40], ["SEC", 25], ["FFFFFF", 25], ["4A4A55", 10]];
  var GEAR_SIGNATURE = ["7FD3FF", "E63946", "F77F00", "9B5DE5", "A3E635", "FF6FB5", "FFD23F", "14B8A6"];
  var UPPER_CONFIGS = [["shirt", 40], ["sleeve", 20], ["shirt_sleeve", 10], ["wrist", 16], ["shoulder_wrist", 6],
    ["shoulder", 4], ["both_wrists", 4]];
  var LOWER_CONFIGS = [["knees", 40], ["shins", 35], ["knees_shins", 25]];
  var LIMB_SLOTS = ["L_Shoulder", "R_Shoulder", "L_Elbow", "R_Elbow", "L_Wrist", "R_Wrist", "L_Knee", "R_Knee", "L_Shin", "R_Shin"];

  var NUM_VERY_COMMON = range(0, 11);
  var NUM_COMMON = [100, 20, 21, 23, 25, 30, 31, 41];   // 100 = "00" in Hoopland
  var NUM_RARE = [12, 13, 14, 15, 17, 22, 24, 32, 33, 34, 35, 44, 55, 77, 88];

  // code, weight, chance of dark skin (overall split lands near 50/50)
  // No UK: the game's own saves give no UK city to copy, and an unknown city shows up as Tirana, Albania.
  var COUNTRIES = [["US", 87, 0.52], ["CA", 5, 0.40], ["AU", 3, 0.25], ["FR", 3, 0.50], ["DE", 1, 0.15], ["RS", 1, 0.05]];

  // ------------------------------------------------------ ARCHETYPES ----
  // [posLo, posHi, core, support, weak, tendUp, tendDown, physicalLean, rarityWeight]
  var ARCH = {
    "3-and-D": [2, 5, "TPT STL", "DRE FTS LAY", "DRB PAS INS", "threePoint stealOffBall", "cross spin post", { STM: 2 }, 12],
    "Post Scorer": [5, 8, "INS LAY MID", "ORE DRE FTS", "TPT DRB STL", "post hook fades", "threePoint cross", { STR: 2 }, 12],
    "Rim Protector": [6, 8, "BLK DRE", "INS ORE DNK", "TPT MID DRB PAS", "block defReb takeCharge", "threePoint fades", { STR: 3 }, 12],
    "Slasher": [1, 4, "LAY DNK DRB", "MID STL FTS", "TPT INS BLK", "dunk floater cross spin", "threePoint fades", { SPD: 2 }, 12],
    "Shot Creator": [0, 4, "MID DRB TPT", "FTS LAY", "INS ORE BLK", "step fades cross pumpFake", "pass post", { SPD: 1 }, 12],
    "Point Forward": [3, 5, "PAS DRB LAY", "MID DRE TPT", "BLK ORE", "pass cross runPlay", "post hook", { SPD: 1 }, 6],
    "Playmaker": [0, 2, "PAS DRB", "LAY MID FTS STL", "INS ORE BLK DNK", "pass lob cross runPlay", "post dunk", { SPD: 2 }, 6],
    "Rim Runner": [6, 8, "DNK ORE", "BLK DRE LAY", "TPT MID DRB FTS", "dunk offReb", "threePoint fades step", { SPD: 1 }, 6],
    "Glass Cleaner": [5, 8, "ORE DRE", "INS BLK DNK", "TPT MID DRB PAS", "offReb defReb", "threePoint fades step", { STR: 3 }, 6],
    "Defensive Specialist": [1, 5, "STL BLK DRE", "LAY PAS", "TPT MID DRB", "stealOnBall stealOffBall takeCharge", "threePoint step fades", { SPD: 1 }, 6],
    "Sharpshooter": [0, 4, "TPT FTS MID", "DRB PAS", "INS DNK ORE BLK", "threePoint step pumpFake", "dunk post", { STM: 2 }, 5],
    "Stretch Big": [5, 8, "TPT INS DRE", "MID FTS BLK", "DRB STL", "threePoint pumpFake defReb", "dunk cross", { SPD: 1 }, 5]
  };
  var HYBRID_PARTNERS = {
    "Slasher": ["Playmaker", "Shot Creator", "Defensive Specialist", "Sharpshooter"],
    "Sharpshooter": ["Shot Creator", "Playmaker", "Slasher"],
    "Defensive Specialist": ["3-and-D", "Slasher", "Rim Protector"],
    "3-and-D": ["Slasher", "Shot Creator", "Defensive Specialist"],
    "Playmaker": ["Shot Creator", "Slasher", "Sharpshooter"],
    "Stretch Big": ["Rim Protector", "Post Scorer", "Point Forward"],
    "Rim Protector": ["Rim Runner", "Glass Cleaner", "Stretch Big", "Post Scorer"],
    "Post Scorer": ["Stretch Big", "Glass Cleaner", "Rim Protector"],
    "Rim Runner": ["Rim Protector", "Glass Cleaner"],
    "Shot Creator": ["Playmaker", "Slasher", "Sharpshooter"],
    "Point Forward": ["Slasher", "Shot Creator", "3-and-D"],
    "Glass Cleaner": ["Rim Protector", "Post Scorer", "Rim Runner"]
  };
  var ADJ = {
    "Slasher": "Slashing", "Sharpshooter": "Sharpshooting", "Defensive Specialist": "Lockdown", "3-and-D": "3-and-D",
    "Playmaker": "Playmaking", "Stretch Big": "Floor Spacing", "Rim Protector": "Rim Protecting", "Post Scorer": "Post Scoring",
    "Rim Runner": "Rim Running", "Shot Creator": "Shot Creating", "Point Forward": "Playmaking", "Glass Cleaner": "Glass Cleaning"
  };
  var W_CORE = 3, W_SUPPORT = 2, W_WEAK = 0.7, W_OTHER = 1.2;

  var TENDENCY_KEYS = ["dunk", "floater", "hook", "post", "twoPoint", "threePoint", "pumpFake", "fades", "pass", "lob", "cross",
    "spin", "step", "offReb", "runPlay", "defReb", "takeCharge", "stealOnBall", "stealOffBall", "block"];
  var TENDENCY_ATTR = {
    dunk: ["DNK"], floater: ["LAY"], hook: ["INS"], post: ["INS"], twoPoint: ["MID"], threePoint: ["TPT"],
    pumpFake: ["MID", "TPT"], fades: ["MID"], pass: ["PAS"], lob: ["PAS"], cross: ["DRB"], spin: ["DRB"],
    step: ["DRB", "TPT"], offReb: ["ORE"], defReb: ["DRE"], stealOnBall: ["STL"], stealOffBall: ["STL"], block: ["BLK"]
  };
  var PHYS = {
    G: { SPD: [14, 20], STR: [6, 10], STM: [16, 20] },
    F: { SPD: [10, 18], STR: [10, 18], STM: [15, 20] },
    C: { SPD: [8, 16], STR: [14, 20], STM: [14, 20] }
  };

  // ---------------------------------------------------------- BADGES ----
  var BADGE_NAMES = {
    SOF: "Soft Touch", TEA: "Tear Dropper", BUL: "Bully", DUN: "Dunk Artist",
    UNF: "Unfazed", LIM: "Limitless", SPO: "Spot Up", CLU: "Clutch Gene", SPA: "Spark Plug",
    DIM: "Dimer", CHE: "Chef", CLE: "Clean Up Crew", STE: "Step Dancer", FOO: "Foot Surgeon", HOT: "Hot Potato",
    LOC: "Locked In", MAG: "Magnet", TWO: "Two Way", BAL: "Ball Hawk", SNA: "Snatcher", CLA: "Clamps"
  };
  var BADGE_ODDS = { 10: [0.50, 0.15], 9: [0.25, 0.05], 8: [0.25, 0.05], 7: [0.10, 0] }; // [P one, P two]

  function badgeWeights(arcs, pos, pot, cap) {
    function has() { for (var i = 0; i < arguments.length; i++) if (arcs.indexOf(arguments[i]) >= 0) return true; return false; }
    return {
      SPA: 10,
      DIM: has("Playmaker", "Point Forward", "Shot Creator") ? 6 : (pos <= 2 ? 3 : 1),
      CLA: has("Defensive Specialist", "3-and-D", "Rim Protector") ? 6 : 1.5,
      SOF: pos >= 5 ? 4 : 0.3,
      TEA: pos <= 2 ? 4 : (pos <= 4 ? 1 : 0),
      DUN: has("Slasher", "Rim Runner") && cap.DNK >= 14 ? 1.5 : 0.3,
      BUL: has("Post Scorer", "Glass Cleaner", "Rim Protector", "Slasher") ? 1.2 : 0.2,
      UNF: has("Shot Creator", "Post Scorer") && cap.MID >= 13 ? 2 : (cap.MID >= 12 ? 0.6 : 0),
      LIM: pot >= 9 && cap.TPT >= 14 ? 3 : 0,
      SPO: has("Sharpshooter", "Stretch Big", "3-and-D") && cap.TPT >= 13 ? 3 : 0,
      CLU: 0.3,
      CHE: 0.8, HOT: 0.8,
      CLE: has("Glass Cleaner", "Rim Runner") ? 2 : 0.4,
      STE: has("Shot Creator", "Sharpshooter") ? 2 : 0.4,
      FOO: has("Slasher", "Shot Creator") && cap.DRB >= 14 ? 1.5 : 0.3,
      LOC: has("Defensive Specialist") ? 1.5 : 0.4,
      MAG: has("Glass Cleaner", "Rim Protector") ? 2 : 0.4,
      TWO: has("3-and-D", "Defensive Specialist") ? 1.5 : 0.4,
      BAL: has("Defensive Specialist", "3-and-D") || (pos <= 2 && cap.STL >= 13) ? 1.5 : 0.4,
      SNA: has("Rim Protector", "Defensive Specialist") && cap.BLK >= 13 ? 2 : 0.3
    };
  }

  // ---------------------------------------------------------- TIERS ----
  // 3.5 stars is the floor. N35[q] = number of 3.5-star prospects at quality q (at q=3, 80% are 4+ stars).
  var N35 = [18, 16, 14, 12, 10, 9, 7, 6, 5, 4, 3];
  // Class size defaults to 60; the 3.5-star count scales with it (N35 is per 60 players).
  // 4.5-star count is chosen by the user (slider); it comes out of the 4-star pool.
  function sz(size) { return size == null || isNaN(size) ? CLASS_SIZE : Math.max(9, Math.min(MAX_SIZE, Math.round(size))); }
  function n35Of(q, size) { size = sz(size); return Math.max(0, Math.min(size - q, Math.round(N35[q] * size / CLASS_SIZE))); }
  function maxN45(q, size) { size = sz(size); return Math.max(0, size - q - n35Of(q, size)); }
  function defaultN45(q, size) { return Math.round(maxN45(q, size) * (0.30 + 0.02 * q)); }
  function classTiers(q, n45, size) {
    size = sz(size); q = Math.min(q, size);
    var n35 = n35Of(q, size), rest = maxN45(q, size);
    if (n45 == null || isNaN(n45)) n45 = defaultN45(q, size);
    n45 = Math.max(0, Math.min(rest, Math.round(n45)));
    var n4 = rest - n45, pots = [];
    function add(p, n) { for (var i = 0; i < n; i++) pots.push(p); }
    add(10, q); add(9, n45); add(8, n4); add(7, n35);
    return pots;
  }
  function tierSummary(q, n45, size) {
    var p = classTiers(q, n45, size), c = { 10: 0, 9: 0, 8: 0, 7: 0 };
    p.forEach(function (x) { c[x]++; });
    return c;
  }

  // -------------------------------------------------------- HELPERS ----
  function lum(hex) {
    function ch(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  }
  function bucket(pos) { return pos <= 2 ? "G" : (pos <= 5 ? "F" : "C"); }
  function ovrOf(vals) { return 16 + vals.reduce(function (a, b) { return a + b; }, 0) / 2; }
  function fits(a, pos) { return ARCH[a][0] <= pos && pos <= ARCH[a][1]; }

  // Split `total` points over slots in [lo, hi], proportional to weights.
  function distribute(rng, total, weights, lo, hi) {
    lo = lo == null ? 1 : lo; hi = hi == null ? 20 : hi;
    var n = weights.length, room = hi - lo, i;
    var w = weights.map(function (x) { return x * rng.uniform(0.8, 1.2); });
    var vals = new Array(n).fill(0), free = range(0, n - 1), remaining = total - lo * n;
    while (free.length && remaining > 1e-9) {
      var sw = free.reduce(function (a, j) { return a + w[j]; }, 0);
      free.forEach(function (j) { vals[j] += remaining * w[j] / sw; });
      remaining = 0;
      var keep = [];
      free.forEach(function (j) {
        if (vals[j] > room) { remaining += vals[j] - room; vals[j] = room; } else keep.push(j);
      });
      free = keep;
    }
    var ints = vals.map(function (v) { return Math.floor(v + 1e-9); });
    var short = (total - lo * n) - ints.reduce(function (a, b) { return a + b; }, 0);
    var order = range(0, n - 1).sort(function (a, b) { return (vals[b] - ints[b]) - (vals[a] - ints[a]); });
    for (var k = 0; short > 0; k++) { i = order[k % n]; if (ints[i] < room) { ints[i]++; short--; } }
    return ints.map(function (v) { return v + lo; });
  }

  // Take `gap` points off proportionally to each cap.
  function removePoints(caps, gap) {
    var tot = caps.reduce(function (a, b) { return a + b; }, 0);
    var raw = caps.map(function (c) { return gap * c / tot; });
    var rem = raw.map(function (r) { return Math.floor(r); });
    var short = gap - rem.reduce(function (a, b) { return a + b; }, 0);
    var order = range(0, caps.length - 1).sort(function (a, b) { return (raw[b] - rem[b]) - (raw[a] - rem[a]); });
    for (var k = 0; short > 0; k++) { var i = order[k % caps.length]; if (caps[i] - rem[i] > 0) { rem[i]++; short--; } }
    return caps.map(function (c, j) { return c - rem[j]; });
  }

  // -------------------------------------------------------- ROLLERS ----
  function rollAppearance(rng, dark, skin) {
    var natural, eye;
    if (dark) { natural = rng.pick(HAIR_DARK); eye = rng.pick(EYE_DARK); }
    else {
      for (var t = 0; t < 50; t++) { natural = rng.pick(HAIR_LIGHT); if (Math.abs(lum(natural) - lum(skin)) >= 0.15) break; }
      eye = rng.pick(EYE_LIGHT);
    }
    var hairC = rng.random() < 0.01 ? rng.choice(HAIR_WILD) : natural;
    var r = rng.random(), fh = r < 0.45 ? 0 : (r < 0.90 ? rng.choice(FHAIR_COMMON) : rng.choice(FHAIR_RARE));
    return {
      skinC: skin, eyeC: eye, unibrow: rng.random() < 0.005, browC: natural,
      hair: pad4(rng.choice(HAIR_IDS)), hairC: hairC, fHair: pad4(fh), fHairC: natural
    };
  }

  function rollAccessories(rng, skin, wears) {
    var a = { headAcc: "none", headAccC: "FFFFFF" };
    LIMB_SLOTS.forEach(function (s) { a[s] = skin; });
    var signature = null;
    if (wears) {
      var color;
      if (rng.random() < 0.25) { signature = rng.choice(GEAR_SIGNATURE); color = signature; } else color = rng.pick(GEAR_NORMAL);
      var head, upper, lower;
      do { head = rng.random() < 0.55; upper = rng.random() < 0.70; lower = rng.random() < 0.45; } while (!(head || upper || lower));
      if (head) {
        var pool = rng.weighted([HEAD_COMMON, HEAD_MID, HEAD_RARE], [8 * HEAD_COMMON.length, 2 * HEAD_MID.length, HEAD_RARE.length]);
        a.headAcc = pad4(rng.choice(pool)); a.headAccC = color;
      }
      if (upper) {
        var side = rng.choice(["L", "R"]), cfg = rng.pick(UPPER_CONFIGS);
        var on = {
          shirt: ["L_Shoulder", "R_Shoulder"],
          sleeve: [side + "_Shoulder", side + "_Elbow", side + "_Wrist"],
          shirt_sleeve: ["L_Shoulder", "R_Shoulder", side + "_Elbow", side + "_Wrist"],
          wrist: [side + "_Wrist"],
          shoulder_wrist: [side + "_Shoulder", side + "_Wrist"],
          shoulder: [side + "_Shoulder"],
          both_wrists: ["L_Wrist", "R_Wrist"]
        }[cfg];
        on.forEach(function (s) { a[s] = color; });
      }
      if (lower) {
        var lc = rng.pick(LOWER_CONFIGS);
        ({ knees: ["L_Knee", "R_Knee"], shins: ["L_Shin", "R_Shin"], knees_shins: ["L_Knee", "R_Knee", "L_Shin", "R_Shin"] })[lc]
          .forEach(function (s) { a[s] = color; });
      }
    }
    a.sockC = rng.pick([["FFFFFF", 50], ["PRI", 35], ["SEC", 15]]);
    a.shoeC = rng.pick([["FFFFFF", 40], ["PRI", 30], ["SEC", 15], ["4A4A55", 15]]);
    if (signature && rng.random() < 0.6) { a.laceC = signature; a.soleC = signature; }
    else { a.laceC = rng.pick([["FFFFFF", 50], ["PRI", 30], ["SEC", 20]]); a.soleC = rng.pick([["FFFFFF", 50], ["PRI", 30], ["SEC", 20]]); }
    return [clone(a), clone(a), clone(a), clone(a)];
  }

  function skillWeights(arc) {
    var d = ARCH[arc], core = d[2].split(" "), sup = d[3].split(" "), weak = d[4].split(" "), w = {};
    SKILLS.forEach(function (s) {
      w[s] = core.indexOf(s) >= 0 ? W_CORE : sup.indexOf(s) >= 0 ? W_SUPPORT : weak.indexOf(s) >= 0 ? W_WEAK : W_OTHER;
    });
    return w;
  }
  function tendencyBase(arc) {
    var up = ARCH[arc][5].split(" "), down = ARCH[arc][6].split(" "), t = {};
    TENDENCY_KEYS.forEach(function (k) { t[k] = up.indexOf(k) >= 0 ? 3 : (down.indexOf(k) >= 0 ? -3 : 0); });
    return t;
  }
  function rollTendencies(rng, arcs, cap) {
    var prim = tendencyBase(arcs[0]), base = prim;
    if (arcs.length > 1) {
      var sec = tendencyBase(arcs[1]); base = {};
      TENDENCY_KEYS.forEach(function (k) { base[k] = 0.65 * prim[k] + 0.35 * sec[k]; });
    }
    var t = {};
    TENDENCY_KEYS.forEach(function (k) {
      var v = Math.round(base[k] + rng.randint(-2, 2)), attrs = TENDENCY_ATTR[k];
      if (attrs) {
        var a = Math.max.apply(null, attrs.map(function (x) { return cap[x]; }));
        if (a < 12) v = Math.min(v, 2);
        if (a < 7) v = Math.min(v, -1);
        if (a >= 16) v = Math.max(v, 0);
      }
      t[k] = Math.max(-5, Math.min(5, v));
    });
    return t;
  }
  function rollBadges(rng, arcs, pos, pot, cap) {
    var odds = BADGE_ODDS[pot] || [0.05, 0], r = rng.random();
    var n = r < odds[1] ? 2 : (r < odds[1] + odds[0] ? 1 : 0);
    var w = badgeWeights(arcs, pos, pot, cap), out = [];
    Object.keys(w).forEach(function (k) { if (w[k] <= 0) delete w[k]; });
    for (var i = 0; i < n; i++) {
      var keys = Object.keys(w), k = rng.weighted(keys, keys.map(function (x) { return w[x]; }));
      out.push({ id: k, xp: 0, level: 1, equipped: true }); delete w[k];
    }
    return out;
  }
  function makeName(rng, ctry, dark, used) {
    var N = DATA.NAMES[ctry];
    for (var t = 0; t < 500; t++) {
      var fpool = dark && N.first_dark && rng.random() < N.p_first_dark ? N.first_dark : N.first;
      var lpool = dark && N.last_dark && rng.random() < N.p_last_dark ? N.last_dark : N.last;
      var fn = rng.choice(fpool), ln = rng.choice(lpool), key = fn + "|" + ln;
      if (!used[key] && fn !== ln) { used[key] = true; return [fn, ln]; }
    }
    throw new Error("ran out of unique names");
  }

  // ---------------------------------------------------------- CLASS ----
  // opts = {
  //   counts: {10: n, 9: n, 8: n, 7: n, 6: n}   players per star tier (pot 10 = 5★ ... pot 6 = 3★)
  //   archMin: {"Slasher": n, ...}              at least n players with this primary archetype
  //   custom: [{fn, ln, num, pot, arch}]          num/pot/arch null = random
  // }
  var POTS = [10, 9, 8, 7, 6];
  function starLabel(pot) { return (pot / 2) + "★"; }
  function countsFromAuto(q5, n45, size) {
    var t = classTiers(q5, n45, size), c = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0 };
    t.forEach(function (p) { c[p]++; });
    return c;
  }
  // typical number of each archetype in a class of N (positions split evenly, rarity weights within each position)
  function expectedArch(N) {
    var out = {};
    Object.keys(ARCH).forEach(function (a) { out[a] = 0; });
    for (var pos = 0; pos <= 8; pos++) {
      var elig = Object.keys(ARCH).filter(function (a) { return fits(a, pos); });
      var tw = elig.reduce(function (t, a) { return t + ARCH[a][8]; }, 0);
      elig.forEach(function (a) { out[a] += (N / 9) * ARCH[a][8] / tw; });
    }
    return out;
  }
  function totalOf(counts) { return POTS.reduce(function (a, p) { return a + (counts[p] || 0); }, 0); }
  function parseNum(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (s === "") return null;
    if (s === "00") return 100;
    var n = parseInt(s, 10);
    return n >= 0 && n <= 99 && String(n) === s.replace(/^0(?=\d)/, "") ? n : null;
  }

  function checkOpts(opts) {
    var N = totalOf(opts.counts), errs = [];
    if (N < 9) errs.push("A class needs at least 9 players (one per position).");
    if (N > MAX_SIZE && !opts.slots) errs.push("A class can have at most " + MAX_SIZE + " players.");
    var mins = 0;
    Object.keys(opts.archMin || {}).forEach(function (a) { mins += opts.archMin[a] || 0; });
    var custom = opts.custom || [];
    if (custom.length > N) errs.push("You added " + custom.length + " custom players but the class only has " + N + ".");
    if (mins > N) errs.push("Archetype minimums add up to " + mins + " but the class only has " + N + " players.");
    custom.forEach(function (c, i) {
      if (!String(c.fn || "").trim() || !String(c.ln || "").trim()) errs.push("Custom player " + (i + 1) + " needs a first and last name.");
      if (c.arch && !ARCH[c.arch]) errs.push("Unknown archetype " + c.arch);
    });
    return errs;
  }

  // Lock a free slot that satisfies a requirement. Positions are swapped between free slots so the split stays even.
  function claimSlot(rng, slots, req, state, label) {
    var free = slots.filter(function (s) { return !s.locked; });
    var cands = req.pot != null ? free.filter(function (s) { return s.pot === req.pot; }) : free;
    if (!cands.length) {
      var byPot = {};
      free.forEach(function (s) { (byPot[s.pot] = byPot[s.pot] || []).push(s); });
      var donorPot = Object.keys(byPot).sort(function (a, b) { return byPot[b].length - byPot[a].length; })[0];
      var conv = rng.choice(byPot[donorPot]);
      state.notes.push(label + ": no free " + starLabel(req.pot) + " spot, so one " + starLabel(+donorPot) + " spot became " + starLabel(req.pot) + ".");
      conv.pot = req.pot; cands = [conv];
    }
    var slot;
    if (req.arch) {
      var fit = cands.filter(function (s) { return fits(req.arch, s.pos); });
      if (fit.length) slot = rng.choice(fit);
      else {
        slot = rng.choice(cands);
        var donors = free.filter(function (s) { return s !== slot && fits(req.arch, s.pos); });
        if (donors.length) { var d = rng.choice(donors), t = d.pos; d.pos = slot.pos; slot.pos = t; }
        else {
          slot.pos = rng.randint(ARCH[req.arch][0], ARCH[req.arch][1]);
          state.posBroken = true;
          state.notes.push(label + ": not enough " + req.arch + " positions left, so the position split is no longer even.");
        }
      }
      slot.arch = req.arch;
    } else slot = rng.choice(cands);
    slot.locked = true;
    return slot;
  }

  function generate(opts, seed) {
    var rng = makeRng(seed), counts = opts.counts, N = totalOf(counts);
    var state = { notes: [], posBroken: false };
    // slots: one per player, with a star tier and a position (equal split across pos 0-8)
    var slots;
    if (opts.slots) {
      // preset slots (e.g. regenerating an existing league): star tier and position are given per player
      slots = opts.slots.map(function (s, i) { return { pot: s.pot, pos: s.pos, arch: null, custom: null, locked: false, idx: i }; });
      state.posBroken = true;
    } else {
      var pots = [];
      POTS.forEach(function (p) { for (var k = 0; k < (counts[p] || 0); k++) pots.push(p); });
      var positions = [];
      for (var p = 0; p < 9; p++) for (var k = 0; k < Math.floor(N / 9); k++) positions.push(p);
      positions = positions.concat(rng.sample(range(0, 8), N - positions.length));
      rng.shuffle(positions);
      slots = pots.map(function (pt, i) { return { pot: pt, pos: positions[i], arch: null, custom: null, locked: false, idx: i }; });
    }

    // 1. custom players
    (opts.custom || []).forEach(function (c) {
      var s = claimSlot(rng, slots, { pot: c.pot || null, arch: c.arch || null }, state, (c.fn + " " + c.ln).trim());
      s.custom = c;
    });
    // 2. archetype minimums (narrowest position range first)
    var have = {};
    slots.forEach(function (s) { if (s.arch) have[s.arch] = (have[s.arch] || 0) + 1; });
    Object.keys(opts.archMin || {})
      .sort(function (a, b) { return (ARCH[a][1] - ARCH[a][0]) - (ARCH[b][1] - ARCH[b][0]); })
      .forEach(function (a) {
        for (var n = (have[a] || 0); n < (opts.archMin[a] || 0); n++) claimSlot(rng, slots, { pot: null, arch: a }, state, a + " minimum");
      });
    // 3. everyone else: archetype by rarity among those that play the slot's position
    slots.forEach(function (s) {
      if (s.arch) return;
      var elig = Object.keys(ARCH).filter(function (a) { return fits(a, s.pos); });
      s.arch = rng.weighted(elig, elig.map(function (a) { return ARCH[a][8]; }));
    });
    rng.shuffle(slots);

    // ceilings: Hoopland grows players to their star tier's full ceiling no matter what the stored caps say
    var capsOvr = slots.map(function (s) { return 30 + 7 * s.pot; });
    var tie = slots.map(function () { return rng.random(); });
    var order = range(0, N - 1).sort(function (a, b) { return (capsOvr[b] - capsOvr[a]) || (tie[b] - tie[a]); });
    var top3 = order.slice(0, Math.min(3, N));
    // gear: 30% of the class, half the best players, half random players from the bottom half
    var nWear = Math.round(N * 0.3), nBest = Math.ceil(nWear / 2);
    var best = order.slice(0, nBest);
    var bottom = order.slice(Math.ceil(N / 2)).filter(function (i) { return best.indexOf(i) < 0; });
    var wearers = best.concat(rng.sample(bottom, nWear - nBest));

    // reserve custom names so generated players can't take them
    var used = {};
    slots.forEach(function (s) { if (s.custom) used[s.custom.fn + "|" + s.custom.ln] = true; });

    var players = [];
    for (var i = 0; i < N; i++) {
      var slot = slots[i], pot = slot.pot, capOvr = capsOvr[i], pos = slot.pos, prim = slot.arch;
      var elig = Object.keys(ARCH).filter(function (a) { return fits(a, pos); });
      var arcs = [prim];
      if (pot >= 9) {
        var partners = HYBRID_PARTNERS[prim].filter(function (a) { return fits(a, pos); });
        if (!partners.length) partners = elig.filter(function (a) { return a !== prim; });
        if (partners.length) arcs.push(rng.choice(partners));
      }
      var w1 = skillWeights(prim), w = w1;
      if (arcs.length > 1) { var w2 = skillWeights(arcs[1]); w = {}; SKILLS.forEach(function (s) { w[s] = 0.6 * w1[s] + 0.4 * w2[s]; }); }
      var capv = distribute(rng, (capOvr - 16) * 2, SKILLS.map(function (s) { return w[s]; }));
      // starting OVR: ceiling minus 15 to 27 (centred on 21, so most land near it); the 3 best are 7 to 14 below
      var gapOvr = top3.indexOf(i) >= 0 ? rng.randint(7, 14) : 21 + rng.randint(-3, 3) + rng.randint(-3, 3);
      // diamonds in the rough: some high-potential prospects start far below their ceiling (28 to 35)
      var raw = top3.indexOf(i) < 0 && rng.random() < (pot >= 9 ? 0.20 : pot === 8 ? 0.10 : 0);
      if (raw) gapOvr = rng.randint(28, 35);
      var curv = removePoints(capv, gapOvr * 2);
      var cap = {}, attrs = {};
      SKILLS.forEach(function (s, j) { cap[s] = capv[j]; attrs[s] = [curv[j], capv[j]]; });
      var band = PHYS[bucket(pos)], lean = ARCH[prim][7];
      ["STR", "SPD", "STM"].forEach(function (s) {
        var v = rng.randint(band[s][0], band[s][1]) + (lean[s] || 0);
        v = Math.max(0, Math.min(20, v)); attrs[s] = [v, v];
      });
      var ht = Math.max(68, Math.min(89, Math.round(74 + pos * 1.375 + rng.gauss(0, 1.2))));
      var wt = Math.round(190 + (ht - 75) * 6.5 + (attrs.STR[0] - 12) * 2.5 + rng.gauss(0, 8));
      var c = rng.weighted(COUNTRIES, COUNTRIES.map(function (x) { return x[1]; }));
      var ctry = c[0], dark = rng.random() < c[2];
      var skin = rng.pick(dark ? SKIN_DARK : SKIN_LIGHT);
      var nm = slot.custom ? [String(slot.custom.fn).trim(), String(slot.custom.ln).trim()] : makeName(rng, ctry, dark, used);
      var town = rng.choice(DATA.LOCS[ctry]);
      var r = rng.random();
      var num = r < 0.60 ? rng.choice(NUM_VERY_COMMON) : (r < 0.88 ? rng.choice(NUM_COMMON) : rng.choice(NUM_RARE));
      if (slot.custom && parseNum(slot.custom.num) != null) num = parseNum(slot.custom.num);

      var pl = clone(TEMPLATE.PLAYER);
      var fields = {
        id: i + 1, tid: 0, fn: nm[0], ln: nm[1], tag: "", home: "", ctry: ctry,  // game fills hometown from loc; a typed home breaks its lookup
        loc: { x: town[0], y: town[1] },
        age: rng.randint(19, 22), ht: ht, wt: wt, yrs: 0, num: num, gender: 0, pos: pos,
        pri: 11, sec: rng.randint(1, 10),
        arc: arcs.length === 1 ? prim : ADJ[arcs[1]] + " " + prim,
        pot: pot, regressionAge: rng.choice([31, 32, 33, 33, 34, 34, 34, 35, 35, 36, 37]),
        appearance: rollAppearance(rng, dark, skin),
        attributes: attrs,
        skills: rollBadges(rng, arcs, pos, pot, cap),
        tendencies: rollTendencies(rng, arcs, cap),
        status: 0, usage: 0, rating: 0
      };
      Object.keys(fields).forEach(function (f) { pl[f] = fields[f]; });
      pl.accessories = rollAccessories(rng, skin, wearers.indexOf(i) >= 0);
      pl.suits = [{
        headAcc: "none", headAccC: "000000", jacketC: rng.choice(["1F2937", "141020", "393B55", "4A4A55"]),
        shirtC: "FFFFFF", tieC: rng.choice(["C42C36", "10316B", "306943", "141020"]),
        pantC: "1F2937", shoeC: "000000", laceC: "", soleC: "000000"
      }];
      players.push({ player: pl, meta: { arcs: arcs, top3: top3.indexOf(i) >= 0, wearer: wearers.indexOf(i) >= 0, dark: dark, custom: slot.custom, slot: slot.idx, raw: raw } });
    }
    function skillSum(pl, idx) { return SKILLS.reduce(function (a, s) { return a + pl.attributes[s][idx]; }, 0); }
    players.sort(function (a, b) {
      return (skillSum(b.player, 1) - skillSum(a.player, 1)) || (skillSum(b.player, 0) - skillSum(a.player, 0));
    });
    players.forEach(function (x, n) { x.player.id = n + 1; });
    var finalCounts = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0 };
    slots.forEach(function (s) { finalCounts[s.pot]++; });
    return { players: players, counts: finalCounts, notes: state.notes, posBroken: state.posBroken, nWear: nWear, nBest: nBest };
  }

  // ------------------------------------------------------- VALIDATOR ----
  function setKey(arr) { return arr.slice().sort().join(","); }
  var UPPER_OK = {}, LOWER_OK = {};
  [[], ["L_Shoulder", "R_Shoulder"], ["L_Wrist", "R_Wrist"]].forEach(function (s) { UPPER_OK[setKey(s)] = 1; });
  ["L", "R"].forEach(function (s) {
    [[s + "_Shoulder", s + "_Elbow", s + "_Wrist"], ["L_Shoulder", "R_Shoulder", s + "_Elbow", s + "_Wrist"],
      [s + "_Wrist"], [s + "_Shoulder", s + "_Wrist"], [s + "_Shoulder"]].forEach(function (x) { UPPER_OK[setKey(x)] = 1; });
  });
  [[], ["L_Knee", "R_Knee"], ["L_Shin", "R_Shin"], ["L_Knee", "R_Knee", "L_Shin", "R_Shin"]].forEach(function (s) { LOWER_OK[setKey(s)] = 1; });
  var ALLOWED_NUMS = NUM_VERY_COMMON.concat(NUM_COMMON, NUM_RARE);

  function validate(res, opts) {
    var players = res.players, N = players.length, errs = [];
    function bad(p, m) { errs.push(p.fn + " " + p.ln + ": " + m); }
    if (N !== totalOf(opts.counts)) errs.push("class size " + N + " does not match the tier counts");
    var got = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0 };
    players.forEach(function (x) { got[x.player.pot] = (got[x.player.pot] || 0) + 1; });
    POTS.forEach(function (p) { if (got[p] !== res.counts[p]) errs.push(starLabel(p) + " count " + got[p] + " != " + res.counts[p]); });
    var arcCount = {};
    players.forEach(function (x) { arcCount[x.meta.arcs[0]] = (arcCount[x.meta.arcs[0]] || 0) + 1; });
    Object.keys(opts.archMin || {}).forEach(function (a) {
      if ((arcCount[a] || 0) < opts.archMin[a]) errs.push(a + ": " + (arcCount[a] || 0) + " < minimum " + opts.archMin[a]);
    });
    (opts.custom || []).forEach(function (c) {
      var hit = players.filter(function (x) { return x.meta.custom === c; })[0];
      if (!hit) { errs.push("custom player " + c.fn + " " + c.ln + " missing"); return; }
      var p = hit.player;
      if (p.fn !== String(c.fn).trim() || p.ln !== String(c.ln).trim()) bad(p, "custom name changed");
      if (c.pot && p.pot !== c.pot) bad(p, "custom stars not applied");
      if (c.arch && hit.meta.arcs[0] !== c.arch) bad(p, "custom archetype not applied");
      if (parseNum(c.num) != null && p.num !== parseNum(c.num)) bad(p, "custom jersey not applied");
    });
    var names = {}, wearers = 0, tops = 0, posCount = new Array(9).fill(0);
    var capSorted = players.map(function (x) { return ovrOf(SKILLS.map(function (s) { return x.player.attributes[s][1]; })); })
      .sort(function (a, b) { return b - a; });
    var bestCap = capSorted[res.nBest - 1], medianCap = capSorted[Math.ceil(N / 2) - 1];
    players.forEach(function (x) {
      var p = x.player, a = p.appearance, acc = p.accessories, skin = a.skinC, m = x.meta;
      var key = p.fn + "|" + p.ln;
      if (names[key] && !m.custom) bad(p, "duplicate name");
      names[key] = 1;
      if (JSON.stringify(p).indexOf("262539") >= 0) bad(p, "uses banned color 262539");
      if (HAIR_IDS.indexOf(+a.hair) < 0) bad(p, "banned hair " + a.hair);
      if (FHAIR_BANNED.indexOf(+a.fHair) >= 0 || +a.fHair < 0 || +a.fHair > 31) bad(p, "banned facial hair " + a.fHair);
      if (a.browC !== a.fHairC) bad(p, "brow != facial hair color");
      if (a.hairC !== a.browC && HAIR_WILD.indexOf(a.hairC) < 0) bad(p, "hair color mismatch");
      if (m.dark && a.browC !== "141020") bad(p, "dark skin with non-black hair");
      if (acc.length !== 4 || acc.some(function (y) { return JSON.stringify(y) !== JSON.stringify(acc[0]); })) bad(p, "accessory sets differ");
      var g = acc[0];
      if ("headAcc2" in g) bad(p, "secondary head accessory present");
      var on = LIMB_SLOTS.filter(function (s) { return g[s] !== skin; });
      var head = g.headAcc !== "none";
      if (head && (+g.headAcc < 1 || +g.headAcc > 25 || HEAD_BANNED.indexOf(+g.headAcc) >= 0)) bad(p, "banned headwear");
      var up = on.filter(function (s) { return s.indexOf("Knee") < 0 && s.indexOf("Shin") < 0; });
      var low = on.filter(function (s) { return s.indexOf("Knee") >= 0 || s.indexOf("Shin") >= 0; });
      if (!UPPER_OK[setKey(up)]) bad(p, "illegal upper gear " + up);
      if (!LOWER_OK[setKey(low)]) bad(p, "illegal lower gear " + low);
      var colors = {}; on.forEach(function (s) { colors[g[s]] = 1; }); if (head) colors[g.headAccC] = 1;
      if (Object.keys(colors).length > 1) bad(p, "gear uses more than one color");
      if (colors["000000"]) bad(p, "pure black gear");
      var wore = on.length > 0 || head; if (wore) wearers++;
      if (wore !== m.wearer) bad(p, "wearer flag mismatch");
      var cur = SKILLS.map(function (s) { return p.attributes[s][0]; }), capv = SKILLS.map(function (s) { return p.attributes[s][1]; });
      if (wore && ovrOf(capv) < bestCap && ovrOf(capv) > medianCap) bad(p, "gear on a player outside the best / bottom half");
      if (cur.some(function (c, j) { return !(c >= 0 && c <= capv[j] && capv[j] <= 20); })) bad(p, "attribute out of range");
      var co = ovrOf(cur), ko = ovrOf(capv);
      if (POTS.indexOf(p.pot) < 0) bad(p, "stars out of range");
      if (ko !== 30 + 7 * p.pot) bad(p, "cap " + ko + " is not the pot " + p.pot + " ceiling");
      var gap = ko - co;
      if (m.top3) { tops++; if (gap < 7 || gap > 14) bad(p, "top-3 gap " + gap); } else if (m.raw ? (gap < 28 || gap > 35 || p.pot < 8) : (gap < 15 || gap > 27)) bad(p, "gap " + gap);
      if (p.age < 19 || p.age > 22) bad(p, "age");
      if (!DATA.LOCS[p.ctry] || !DATA.LOCS[p.ctry].some(function (l) { return l[0] === p.loc.x && l[1] === p.loc.y; })) bad(p, "hometown is not a city the game knows");
      if (p.home !== "") bad(p, "hometown text must be blank");
      if (!m.custom && ALLOWED_NUMS.indexOf(p.num) < 0) bad(p, "jersey number");
      if (!(p.num >= 0 && p.num <= 100)) bad(p, "jersey out of range");
      if (!fits(m.arcs[0], p.pos)) bad(p, "archetype does not play this position");
      posCount[p.pos]++;
      Object.keys(p.tendencies).forEach(function (k) {
        var v = p.tendencies[k]; if (v < -5 || v > 5) bad(p, "tendency " + k);
        var at = TENDENCY_ATTR[k];
        if (at && v > 2 && Math.max.apply(null, at.map(function (s) { return p.attributes[s][1]; })) < 12) bad(p, "tendency " + k + " too high");
      });
      if (p.skills.length > 2) bad(p, "too many badges");
    });
    if (wearers !== res.nWear) errs.push(wearers + " players wear gear, expected " + res.nWear);
    if (tops !== Math.min(3, N)) errs.push("top-3 count " + tops);
    if (!res.posBroken && (Math.min.apply(null, posCount) < Math.floor(N / 9) || Math.max.apply(null, posCount) > Math.ceil(N / 9)))
      errs.push("position split uneven " + posCount);
    return errs;
  }

  // ---------------------------------------------------------- OUTPUT ----
  function buildFile(players, saveName) {
    var meta = clone(TEMPLATE.META);
    meta.saveName = saveName;
    meta.uPID = players.length;
    meta.generatedCountries = COUNTRIES.map(function (c) { return { country: c[0], value: c[1] }; });
    var draft = JSON.stringify(players.map(function (x) { return x.player; })).replace(/"rating":0(?=[,}])/g, '"rating":0.0');
    var text = "";
    for (var t = 0; t < 3; t++) {
      text = TEMPLATE.SKELETON.split('"__META__"').join(JSON.stringify(meta)).split('"__DRAFT__"').join(draft);
      var kb = Math.round(utf8Length(text) / 1000);
      if (meta.filesize === kb) break;
      meta.filesize = kb;
    }
    return text;
  }
  function utf8Length(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length;
    return Buffer.byteLength(s, "utf8");
  }

  // Generate, validate, retry with the next seed if any rule breaks.
  function makeClass(opts, seed) {
    var bad = checkOpts(opts);
    if (bad.length) throw new Error(bad.join(" "));
    var errs = [];
    for (var t = 0; t < 20; t++) {
      var res = generate(opts, seed + t);
      errs = validate(res, opts);
      if (!errs.length) { res.seed = seed + t; return res; }
    }
    throw new Error("Validation failed: " + errs.slice(0, 5).join("; "));
  }

  var API = {
    CLASS_SIZE: CLASS_SIZE, MAX_SIZE: MAX_SIZE, SKILLS: SKILLS, BADGE_NAMES: BADGE_NAMES, ARCH: ARCH,
    classTiers: classTiers, tierSummary: tierSummary, maxN45: maxN45, defaultN45: defaultN45, countsFromAuto: countsFromAuto, expectedArch: expectedArch,
    totalOf: totalOf, checkOpts: checkOpts, parseNum: parseNum, makeRng: makeRng, POTS: POTS, generate: generate, validate: validate,
    makeClass: makeClass, buildFile: buildFile, ovrOf: ovrOf, lum: lum,
    _pools: { HAIR_IDS: HAIR_IDS, FHAIR_BANNED: FHAIR_BANNED, HAIR_LIGHT: HAIR_LIGHT, SKIN_LIGHT: SKIN_LIGHT, SKIN_DARK: SKIN_DARK }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.HDG = API;
})(this);
