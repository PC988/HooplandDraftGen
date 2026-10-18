// UI wiring for index.html
(function () {
  "use strict";
  var G = window.HDG;
  var $ = function (id) { return document.getElementById(id); };
  var q = $("q"), h = $("h"), seedIn = $("seed"), fname = $("fname");
  var current = null, nameEdited = false, seedEdited = false, hTouched = false;

  var TIERS = [
    { pot: 10, label: "5★", color: "var(--s5)" },
    { pot: 9, label: "4.5★", color: "var(--s45)" },
    { pot: 8, label: "4★", color: "var(--s4)" },
    { pot: 7, label: "3.5★", color: "var(--s35)" }
  ];

  // 4.5-star slider range depends on the 5-star count (4.5s come out of the 4-star pool)
  function syncH() {
    var v = +q.value, mx = G.maxN45(v);
    h.max = mx;
    if (!hTouched) h.value = G.defaultN45(v);
    if (+h.value > mx) h.value = mx;
    $("hnum").textContent = h.value;
    $("hrange").textContent = "0 to " + mx;
  }

  function renderTiers() {
    syncH();
    var v = +q.value, t = G.tierSummary(v, +h.value), fourPlus = t[10] + t[9] + t[8];
    $("qnum").textContent = v;
    $("qtext").innerHTML = "<b>" + Math.round(fourPlus / G.CLASS_SIZE * 100) + "%</b> of the class is 4★ or better";
    $("tierbar").innerHTML = TIERS.map(function (x) {
      return '<span style="flex-grow:' + t[x.pot] + ';background:' + x.color + '"></span>';
    }).join("");
    $("legend").innerHTML = TIERS.map(function (x) {
      return '<span><i style="background:' + x.color + '"></i>' + x.label + " <b>" + t[x.pot] + "</b></span>";
    }).join("");
  }

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
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

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
    var ps = c.players, S = G.SKILLS;
    var capOf = function (p) { return G.ovrOf(S.map(function (s) { return p.attributes[s][1]; })); };
    var curOf = function (p) { return G.ovrOf(S.map(function (s) { return p.attributes[s][0]; })); };
    $("st-top").textContent = capOf(ps[0].player);
    $("st-gear").textContent = ps.filter(function (x) { return x.meta.wearer; }).length;
    $("st-badge").textContent = ps.filter(function (x) { return x.player.skills.length; }).length;
    var pc = new Array(9).fill(0); ps.forEach(function (x) { pc[x.player.pos]++; });
    var mx = Math.max.apply(null, pc);
    $("st-pos").innerHTML = pc.map(function (n, i) { return '<div title="pos ' + i + ": " + n + '" style="height:' + (n / mx * 100) + '%"></div>'; }).join("");
    $("st-pos-k").textContent = "Positions 0 to 8: " + pc.join(" / ");

    $("rows").innerHTML = ps.map(function (x, i) {
      var p = x.player, a = p.appearance, ht = Math.floor(p.ht / 12) + "'" + (p.ht % 12) + '"';
      var badges = p.skills.map(function (s) { return '<span class="chip">' + esc(G.BADGE_NAMES[s.id] || s.id) + "</span>"; }).join("");
      return "<tr>" +
        '<td class="rank num">' + (i + 1) + "</td>" +
        '<td><div class="who"><span class="face" style="background:#' + a.skinC + ";border-color:#" + a.hairC + '"></span>' +
        '<div><div class="name">' + esc(p.fn + " " + p.ln) + '</div><div class="sub">' + esc(p.home) + ", " + p.ctry + "</div></div></div></td>" +
        '<td class="num">' + ht + '<div class="sub">pos ' + p.pos + "</div></td>" +
        '<td class="num">' + p.age + "</td>" +
        '<td class="num ovr">' + curOf(p) + "</td>" +
        '<td class="num cap">' + capOf(p) + "</td>" +
        "<td>" + stars(p.pot) + "</td>" +
        '<td class="num">#' + (p.num === 100 ? "00" : p.num) + "</td>" +
        '<td class="arc">' + esc(p.arc) + "</td>" +
        "<td>" + gearChip(p) + badges + "</td></tr>";
    }).join("");
    $("results").classList.add("show");
  }

  function defaultName() { return "Draft Class " + current.q + "x5 " + current.h + "x4.5 #" + current.seed; }
  function cleanName(s) { return s.replace(/\.txt$/i, "").replace(/[\\/:*?"<>|]+/g, "").trim(); }

  function generate() {
    $("err").style.display = "none";
    var v = +q.value, seed = seedEdited ? parseInt(seedIn.value, 10) : NaN;
    if (!isFinite(seed)) seed = Math.floor(Math.random() * 1e6) + 1;
    try {
      var hv = +h.value, c = G.makeClass(v, seed, hv);
      current = { q: v, h: hv, seed: c.seed, players: c.players };
      seedIn.value = c.seed; seedEdited = false;
      if (!nameEdited) fname.value = defaultName();
      renderClass(current);
    } catch (e) {
      $("err").textContent = e.message; $("err").style.display = "block";
    }
  }

  function download() {
    if (!current) return;
    var name = cleanName(fname.value) || defaultName();
    fname.value = name;
    var text = G.buildFile(current.players, name);
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name + ".txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  q.addEventListener("input", renderTiers);
  h.addEventListener("input", function () { hTouched = true; renderTiers(); });
  $("go").addEventListener("click", function () { generate(); });
  seedIn.addEventListener("input", function () { seedEdited = seedIn.value.trim() !== ""; });
  $("dl").addEventListener("click", download);
  fname.addEventListener("input", function () { nameEdited = fname.value.trim() !== ""; });
  fname.addEventListener("keydown", function (e) { if (e.key === "Enter") download(); });
  renderTiers();
})();
