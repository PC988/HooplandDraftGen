// UI wiring for index.html
(function () {
  "use strict";
  var G = window.HDG;
  var $ = function (id) { return document.getElementById(id); };
  var STORE = "hdg-settings-v2";
  var ARCHS = Object.keys(G.ARCH);
  var TIERS = [
    { pot: 10, label: "5★", color: "var(--s5)" },
    { pot: 9, label: "4.5★", color: "var(--s45)" },
    { pot: 8, label: "4★", color: "var(--s4)" },
    { pot: 7, label: "3.5★", color: "var(--s35)" },
    { pot: 6, label: "3★", color: "#4a5160" }
  ];
  var SKILL_NAMES = { LAY: "layup", DNK: "dunk", INS: "inside", MID: "mid-range", TPT: "3PT", FTS: "free throw", DRB: "dribble", PAS: "passing", ORE: "off. rebound", DRE: "def. rebound", STL: "steal", BLK: "block" };
  var POS = ["PG", "G", "SG", "GF", "SF", "F", "PF", "FC", "C"];  // Hoopland pos 0 to 8
  var STAR_OPTS = [["", "Random ★"], ["10", "5★"], ["9", "4.5★"], ["8", "4★"], ["7", "3.5★"], ["6", "3★"]];

  // ---------------------------------------------------------- state ----
  var S = {
    mode: "auto",
    size: 60,
    ages: "draft",
    showCounts: false,
    five: { mode: "fixed", val: 3, min: 2, max: 5 },
    half: { mode: "fixed", val: null, min: 12, max: 20 },  // val null = follow the scaling default
    four: { mode: "fixed", pct: null },                     // pct null = 3.5★ count follows the scaling
    manual: G.countsFromAuto(3),
    archMin: {},
    custom: []
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && saved.five) S = Object.assign(S, saved);
    if (!S.four) S.four = { mode: "fixed", pct: null };
  } catch (e) { /* storage unavailable: defaults */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  var current = null, nameEdited = false, seedEdited = false;
  var sortBy = { key: "", dir: "" };
  function clamp(v, lo, hi) { v = parseInt(v, 10); if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function classSize() { return S.mode === "manual" ? G.totalOf(S.manual) : autoSize(); }
  function autoSize() { return clamp(S.size || G.CLASS_SIZE, 9, G.MAX_SIZE); }
  // 4★ count from the share slider, or null to let the scaling pick the 3.5★ count
  function fourN() { return S.four && S.four.pct != null ? Math.round(clamp(S.four.pct, 0, 100) / 100 * autoSize()) : null; }
  function maxHalf(q5) { return G.maxN45(q5, autoSize(), fourN() != null); }
  function halfVal(q5) { return S.half.val == null ? Math.min(G.defaultN45(q5, autoSize()), maxHalf(q5)) : clamp(S.half.val, 0, maxHalf(q5)); }

  // ------------------------------------------------------ tier panel ----
  function syncTierInputs() {
    var q5 = clamp(S.five.val, 0, 10), mx = maxHalf(q5);
    $("csize").value = autoSize(); $("sizehint").textContent = autoSize();
    $("q5").value = q5; $("q5n").value = q5;
    $("q5min").value = S.five.min; $("q5max").value = S.five.max;
    $("h5").max = mx; $("h5n").max = mx;
    var hv = halfVal(q5); $("h5").value = hv; $("h5n").value = hv;
    $("hrange").textContent = "0 to " + mx + (S.half.val == null ? " · following the scaling" : "");
    $("h5min").value = S.half.min; $("h5max").value = S.half.max;
    var f4 = fourN(), got = G.countsFromAuto(q5, hv, autoSize(), f4);
    var pct = S.four.pct != null ? clamp(S.four.pct, 0, 100) : Math.round(got[8] / autoSize() * 100);
    $("f4").value = pct; $("f4n").value = pct;
    $("frange").textContent = f4 == null ? "Following the scaling (" + got[8] + " players)." :
      pct + "% = " + got[8] + " players" + (got[8] < f4 ? ", only " + got[8] + " spots left after 5★ and 4.5★" : "") + ". 3.5★ fill the other " + got[7] + ".";
    $("fourReset").style.visibility = f4 == null ? "hidden" : "visible";
    $("hcaphint").textContent = f4 == null ? "Capped at however many spots are left after the 5★ and 3.5★ players." : "Capped at however many spots are left after the 5★ players.";
    document.querySelectorAll(".tier").forEach(function (el) {
      var t = S[el.dataset.tier];
      el.classList.toggle("is-random", t.mode === "random");
      el.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.dataset.mode === t.mode); });
    });
    document.querySelectorAll(".manualgrid input").forEach(function (inp) { inp.value = S.manual[inp.dataset.pot] || 0; });
    document.querySelectorAll("#ageseg button").forEach(function (b) { b.classList.toggle("on", b.dataset.ages === (S.ages || "draft")); b.setAttribute("aria-pressed", b.dataset.ages === (S.ages || "draft")); });
    $("agehint").textContent = { draft: "Draft prospects: 19 to 22.", fresh18: "Every freshman enters college at 18.", freshDynamic: "18 for 70%, 19 for 29%, 17 for 1%. Nobody over 19." }[S.ages || "draft"];
    $("tab-auto").setAttribute("aria-selected", S.mode === "auto");
    $("tab-manual").setAttribute("aria-selected", S.mode === "manual");
    $("pane-auto").hidden = S.mode !== "auto";
    $("pane-manual").hidden = S.mode !== "manual";
  }

  function previewCounts() {
    // what the bar shows: exact counts, or the midpoint of any random ranges
    if (S.mode === "manual") return { counts: S.manual, ranged: false };
    var q5 = S.five.mode === "random" ? Math.round((+S.five.min + +S.five.max) / 2) : clamp(S.five.val, 0, 10);
    q5 = clamp(q5, 0, 10);
    var h = S.half.mode === "random" ? Math.round((+S.half.min + +S.half.max) / 2) : halfVal(q5);
    return { counts: G.countsFromAuto(q5, clamp(h, 0, maxHalf(q5)), autoSize(), fourN()), ranged: S.five.mode === "random" || S.half.mode === "random" };
  }

  function renderTiers() {
    var p = previewCounts(), c = p.counts, N = G.totalOf(c), four = (c[10] || 0) + (c[9] || 0) + (c[8] || 0);
    $("qtext").innerHTML = N ? "<b>" + Math.round(four / N * 100) + "%</b> of the class is 4★ or better" +
      (p.ranged ? " <span class='hint'>(middle of your random range)</span>" : "") : "No players yet";
    $("tierbar").innerHTML = TIERS.map(function (x) {
      return '<span style="flex-grow:' + (c[x.pot] || 0) + ';background:' + x.color + '"></span>';
    }).join("");
    $("legend").innerHTML = TIERS.filter(function (x) { return x.pot !== 6 || c[6]; }).map(function (x) {
      return '<span><i style="background:' + x.color + '"></i>' + x.label + " <b>" + (c[x.pot] || 0) + "</b></span>";
    }).join("") + '<span>Total <b>' + N + "</b></span>";
    $("mtotal").textContent = "Class size: " + G.totalOf(S.manual) + " players (9 to " + G.MAX_SIZE + ").";
    renderArchMax();
  }

  // ------------------------------------------------- archetype panel ----
  function rarity(a) { var w = G.ARCH[a][8]; return w >= 12 ? "common" : w >= 6 ? "rare" : "rarest"; }
  function buildArchGrid() {
    $("archgrid").innerHTML = ARCHS.map(function (a, i) {
      return '<div class="arow"><div><span class="an">' + esc(a) + '</span><span class="rar ' + rarity(a) + '">' + rarity(a) + "</span>" +
        '<div class="am" id="au' + i + '"></div></div>' +
        '<input type="range" min="0" step="1" data-arch="' + esc(a) + '" aria-label="Minimum ' + esc(a) + '">' +
        '<input type="number" min="0" data-arch="' + esc(a) + '" inputmode="numeric" aria-label="Minimum ' + esc(a) + ' (number)"></div>';
    }).join("");
    $("archgrid").querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var a = inp.dataset.arch, v = clamp(inp.value, 0, classSize());
        if (v) S.archMin[a] = v; else delete S.archMin[a];
        save(); renderArchMax();
      });
    });
  }
  function renderArchMax() {
    var N = classSize(), exp = G.expectedArch(N), sum = 0;
    ARCHS.forEach(function (a, i) {
      var v = S.archMin[a] || 0; sum += v;
      $("archgrid").querySelectorAll('input[data-arch="' + a + '"]').forEach(function (inp) {
        inp.max = N; if (document.activeElement !== inp) inp.value = v;
      });
      $("au" + i).textContent = v ? "at least " + v + " · usually about " + Math.round(exp[a]) : "Default · usually about " + Math.round(exp[a]);
    });
    $("archsum").textContent = sum ? "Minimums use " + sum + " of " + N + " spots." + (sum > N ? " That is more than the class has." : "") : "";
  }

  // ---------------------------------------------------- custom panel ----
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { e.appendChild(k); });
    return e;
  }
  function renderCustom() {
    var list = $("customList"); list.innerHTML = "";
    S.custom.forEach(function (c, i) {
      var fn = el("input", { type: "text", placeholder: "First name", "aria-label": "First name" }); fn.value = c.fn || "";
      var ln = el("input", { type: "text", placeholder: "Last name", "aria-label": "Last name" }); ln.value = c.ln || "";
      var num = el("input", { type: "text", placeholder: "No.", inputmode: "numeric", "aria-label": "Jersey number", maxlength: "2" }); num.value = c.num || "";
      var st = el("select", { "aria-label": "Stars" }, STAR_OPTS.map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
      st.value = c.pot ? String(c.pot) : "";
      var ar = el("select", { "aria-label": "Archetype" }, [el("option", { value: "", text: "Random archetype" })]
        .concat(ARCHS.map(function (a) { return el("option", { value: a, text: a }); })));
      ar.value = c.arch || "";
      var rm = el("button", { type: "button", class: "rm", "aria-label": "Remove player", title: "Remove", text: "×" });
      function upd() {
        c.fn = fn.value; c.ln = ln.value; c.num = num.value.trim();
        c.pot = st.value ? +st.value : null; c.arch = ar.value || null; save();
      }
      [fn, ln, num].forEach(function (x) { x.addEventListener("input", upd); });
      [st, ar].forEach(function (x) { x.addEventListener("change", upd); });
      rm.addEventListener("click", function () { S.custom.splice(i, 1); save(); renderCustom(); });
      list.appendChild(el("div", { class: "crow" }, [fn, ln, num, st, ar, rm]));
    });
  }

  // ------------------------------------------------------- results ----
  function stars(pot) {
    var full = Math.floor(pot / 2), half = pot % 2;
    var col = pot >= 10 ? "var(--s5)" : pot === 9 ? "var(--s45)" : pot === 8 ? "var(--s4)" : "var(--s35)";
    return '<span class="stars" style="color:' + col + '">' + "★".repeat(full) + (half ? "½" : "") + "</span>";
  }
  function colorCss(c) {
    if (c === "PRI") return "linear-gradient(135deg,#ff7a1a 50%,#4ea1ff 50%)";
    if (c === "SEC") return "linear-gradient(135deg,#4ea1ff 50%,#ff7a1a 50%)";
    return "#" + c;
  }
  function gearChip(p) {
    var a = p.accessories[0], skin = p.appearance.skinC, parts = [], color = null;
    if (a.headAcc !== "none") { parts.push("head"); color = a.headAccC; }
    var up = ["L_Shoulder", "R_Shoulder", "L_Elbow", "R_Elbow", "L_Wrist", "R_Wrist"].filter(function (s) { return a[s] !== skin; });
    var low = ["L_Knee", "R_Knee", "L_Shin", "R_Shin"].filter(function (s) { return a[s] !== skin; });
    if (up.length) { parts.push("arms"); color = a[up[0]]; }
    if (low.length) { parts.push("legs"); color = a[low[0]]; }
    if (!parts.length) return "";
    var label = color === "PRI" || color === "SEC" ? color : (color === "FFFFFF" ? "white" : color === "4A4A55" ? "grey" : "#" + color);
    return '<span class="chip" title="Gear color: ' + label + '"><i style="background:' + colorCss(color) + '"></i>' + parts.join(" · ") + "</span>";
  }
  function renderClass(c) {
    var ps = c.players, SK = G.SKILLS;
    var capOf = function (p) { return G.ovrOf(SK.map(function (s) { return p.attributes[s][1]; })); };
    var curOf = function (p) { return G.ovrOf(SK.map(function (s) { return p.attributes[s][0]; })); };
    var notes = [];
    if (c.rolled && S.showCounts) notes.push(c.rolled);
    notes = notes.concat(c.notes || []);
    $("notes").innerHTML = notes.map(esc).join("<br>");
    $("notes").classList.toggle("show", notes.length > 0);
    $("st-top").textContent = capOf(ps[0].player);
    $("st-gear").textContent = ps.filter(function (x) { return x.meta.wearer; }).length;
    $("st-badge").textContent = ps.filter(function (x) { return x.player.skills.length; }).length;
    var pc = new Array(9).fill(0); ps.forEach(function (x) { pc[x.player.pos]++; });
    var mx = Math.max.apply(null, pc);
    $("st-pos").innerHTML = pc.map(function (n, i) { return '<div title="' + POS[i] + ": " + n + '" style="height:' + (n / mx * 100) + '%"></div>'; }).join("");
    $("st-pos-k").textContent = pc.map(function (n, i) { return POS[i] + " " + n; }).join(" · ");
    // display order: draft board order unless a column sort is picked (the downloaded file keeps board order)
    var rank = new Map(ps.map(function (x, i) { return [x, i + 1]; }));
    var view = ps.slice();
    if (sortBy.key) {
      var val = { age: function (p) { return p.age; }, ovr: curOf, cap: capOf }[sortBy.key];
      var dir = sortBy.dir === "asc" ? 1 : -1;
      view.sort(function (a, b) { return (val(a.player) - val(b.player)) * dir || rank.get(a) - rank.get(b); });
    }
    $("rows").innerHTML = view.map(function (x) {
      var i = rank.get(x) - 1;
      var p = x.player, a = p.appearance, ht = Math.floor(p.ht / 12) + "'" + (p.ht % 12) + '"';
      var badges = p.skills.map(function (s) { return '<span class="chip">' + esc(G.BADGE_NAMES[s.id] || s.id) + "</span>"; }).join("");
      return "<tr>" +
        '<td class="rank num">' + (i + 1) + "</td>" +
        '<td><div class="who"><span class="face" style="background:#' + a.skinC + ";border-color:#" + a.hairC + '"></span>' +
        '<div><div class="name">' + esc(p.fn + " " + p.ln) + (x.meta.custom ? ' <span class="chip custom">Custom</span>' : "") + (x.meta.raw ? ' <span class="chip raw" title="High potential, starts far below his ceiling">Diamond in the rough</span>' : "") +
        '</div><div class="sub">' + p.ctry + "</div></div></div></td>" +
        '<td class="num">' + ht + '<div class="sub">' + POS[p.pos] + "</div></td>" +
        '<td class="num">' + p.age + "</td>" +
        '<td class="num ovr">' + curOf(p) + "</td>" +
        '<td class="num cap">' + capOf(p) + "</td>" +
        "<td>" + stars(p.pot) + "</td>" +
        '<td class="num">#' + (p.num === 100 ? "00" : p.num) + "</td>" +
        '<td class="arc">' + esc(p.arc) + (x.meta.bonus || x.meta.weak ? '<div class="sub">' + (x.meta.bonus ? "+" + esc(x.meta.bonus) : "") + (x.meta.bonus && x.meta.weak ? " · " : "") + (x.meta.weak ? "weak " + (SKILL_NAMES[x.meta.weak] || x.meta.weak) : "") + "</div>" : "") + "</td>" +
        "<td>" + gearChip(p) + badges + "</td></tr>";
    }).join("");
    $("results").classList.add("show");
  }

  // ------------------------------------------------ generate / save ----
  function resolveCounts(seed) {
    if (S.mode === "manual") return { counts: Object.assign({}, S.manual), rolled: "" };
    var r = G.makeRng((seed * 2654435761) >>> 0), rolled = [];
    var q5;
    if (S.five.mode === "random") {
      var lo = clamp(Math.min(S.five.min, S.five.max), 0, 10), hi = clamp(Math.max(S.five.min, S.five.max), 0, 10);
      q5 = r.randint(lo, hi); rolled.push(q5 + " five-stars");
    } else q5 = clamp(S.five.val, 0, 10);
    var mx = maxHalf(q5), h;
    if (S.half.mode === "random") {
      var hlo = clamp(Math.min(S.half.min, S.half.max), 0, mx), hhi = clamp(Math.max(S.half.min, S.half.max), 0, mx);
      h = r.randint(hlo, hhi); rolled.push(h + " 4.5-stars");
    } else h = halfVal(q5);
    return { counts: G.countsFromAuto(q5, h, autoSize(), fourN()), rolled: rolled.length ? "Rolled " + rolled.join(" and ") + "." : "" };
  }
  function cleanCustom() {
    return S.custom.filter(function (c) { return (c.fn || "").trim() || (c.ln || "").trim(); }).map(function (c) {
      return { fn: (c.fn || "").trim(), ln: (c.ln || "").trim(), num: c.num || null, pot: c.pot || null, arch: c.arch || null };
    });
  }
  // star counts stay hidden (file name and "Rolled ..." note) unless "Show star counts" is ticked
  function defaultName() { return "Draft Class " + (S.showCounts ? current.counts[10] + "x5 " + current.counts[9] + "x4.5 " : "") + "#" + current.seed; }
  function cleanName(s) { return s.replace(/\.txt$/i, "").replace(/[\\/:*?"<>|]+/g, "").trim(); }

  function generate() {
    $("err").style.display = "none";
    var seed = seedEdited ? parseInt($("seed").value, 10) : NaN;
    if (!isFinite(seed)) seed = Math.floor(Math.random() * 1e6) + 1;
    try {
      var rc = resolveCounts(seed);
      var opts = { counts: rc.counts, archMin: Object.assign({}, S.archMin), custom: cleanCustom(), ages: S.ages || "draft" };
      var res = G.makeClass(opts, seed);
      current = { seed: res.seed, players: res.players, counts: res.counts, notes: res.notes, rolled: rc.rolled };
      $("seed").value = res.seed; seedEdited = false;
      if (!nameEdited) $("fname").value = defaultName();
      renderClass(current);
    } catch (e) {
      $("err").textContent = e.message; $("err").style.display = "block";
    }
  }
  function download() {
    if (!current) return;
    var name = cleanName($("fname").value) || defaultName();
    $("fname").value = name;
    var text = G.buildFile(current.players, name);
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name + ".txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // --------------------------------------------------------- events ----
  function changed() { save(); syncTierInputs(); renderTiers(); }
  $("tab-auto").addEventListener("click", function () { S.mode = "auto"; changed(); });
  $("tab-manual").addEventListener("click", function () {
    if (S.mode !== "manual") S.manual = previewCounts().counts;  // start from what auto shows
    S.mode = "manual"; changed();
  });
  document.querySelectorAll(".tier .seg button").forEach(function (b) {
    b.addEventListener("click", function () { S[b.closest(".tier").dataset.tier].mode = b.dataset.mode; changed(); });
  });
  ["q5", "q5n"].forEach(function (id) { $(id).addEventListener("input", function () { if ($(id).value !== "") { S.five.val = clamp($(id).value, 0, 10); changed(); } }); });
  ["h5", "h5n"].forEach(function (id) {
    $(id).addEventListener("input", function () { if ($(id).value !== "") { S.half.val = clamp($(id).value, 0, maxHalf(clamp(S.five.val, 0, 10))); changed(); } });
  });
  ["f4", "f4n"].forEach(function (id) {
    $(id).addEventListener("input", function () { if ($(id).value !== "") { S.four.pct = clamp($(id).value, 0, 100); changed(); } });
  });
  $("fourReset").addEventListener("click", function () { S.four.pct = null; changed(); });
  [["q5min", "five", "min", 10], ["q5max", "five", "max", 10], ["h5min", "half", "min", 150], ["h5max", "half", "max", 150]].forEach(function (x) {
    $(x[0]).addEventListener("input", function () { if ($(x[0]).value !== "") { S[x[1]][x[2]] = clamp($(x[0]).value, 0, x[3]); save(); renderTiers(); } });
  });
  document.querySelectorAll(".manualgrid input").forEach(function (inp) {
    inp.addEventListener("input", function () { S.manual[inp.dataset.pot] = clamp(inp.value, 0, G.MAX_SIZE); save(); renderTiers(); });
  });
  $("archReset").addEventListener("click", function () { S.archMin = {}; save(); renderArchMax(); });
  $("addCustom").addEventListener("click", function () {
    S.custom.push({ fn: "", ln: "", num: "", pot: null, arch: null }); save(); renderCustom();
    var rows = $("customList").querySelectorAll(".crow"); rows[rows.length - 1].querySelector("input").focus();
  });
  $("csize").addEventListener("change", function () { S.size = clamp($("csize").value, 9, G.MAX_SIZE); changed(); });
  document.querySelectorAll("select.sort").forEach(function (sel) {
    sel.addEventListener("change", function () {
      document.querySelectorAll("select.sort").forEach(function (o) { if (o !== sel) o.value = ""; });
      sortBy = sel.value ? { key: sel.dataset.key, dir: sel.value } : { key: "", dir: "" };
      if (current) renderClass(current);
    });
  });
  document.querySelectorAll("#ageseg button").forEach(function (b) { b.addEventListener("click", function () { S.ages = b.dataset.ages; changed(); }); });
  $("showcounts").checked = !!S.showCounts;
  $("showcounts").addEventListener("change", function () {
    S.showCounts = $("showcounts").checked; save();
    if (current) { if (!nameEdited) $("fname").value = defaultName(); renderClass(current); }
  });
  $("go").addEventListener("click", generate);
  $("seed").addEventListener("input", function () { seedEdited = $("seed").value.trim() !== ""; });
  $("dl").addEventListener("click", download);
  $("fname").addEventListener("input", function () { nameEdited = $("fname").value.trim() !== ""; });
  $("fname").addEventListener("keydown", function (e) { if (e.key === "Enter") download(); });

  buildArchGrid();
  renderCustom();
  syncTierInputs();
  renderTiers();
  if (S.custom.length || Object.keys(S.archMin).length) $("adv").open = true;
})();
