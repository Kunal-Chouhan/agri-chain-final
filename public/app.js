/* AgriChain front end: no build step, no dependencies. Hash routing (#/verify/ID) so it works from any static path. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DEMO_KEY = "agri_demo_7f3a9c2e51b84d60a1e9";
const SENDERS = ["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR"];
const RECEIVERS = ["TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER"];
const STAGES = ["CREATED", "IN_TRANSIT", "IN_STORAGE", "AT_RETAILER"];
const STAGE_LABEL = { CREATED: "At the farm", IN_TRANSIT: "In transit", IN_STORAGE: "In storage", AT_RETAILER: "At retailer", SOLD: "Sold" };
const STAGE_TONE = { CREATED: "sky", IN_TRANSIT: "gold", IN_STORAGE: "leaf", AT_RETAILER: "leaf", SOLD: "" };
const ROLE_LABEL = { FARMER: "Farmer", TRANSPORTER: "Transporter", WAREHOUSE: "Warehouse", DISTRIBUTOR: "Distributor", RETAILER: "Retailer", INSPECTOR: "Inspector", ADMIN: "Admin" };
const EVENT_LABEL = { BATCH_CREATED: "Batch registered", TRANSFER_INITIATED: "Handover started", TRANSFER_CONFIRMED: "Handover confirmed", TRANSFER_REJECTED: "Handover rejected", QUALITY_CHECK: "Quality inspection", CORRECTION: "Correction" };
const EVENT_ICON = { BATCH_CREATED: "sprout", TRANSFER_INITIATED: "send", TRANSFER_CONFIRMED: "check", TRANSFER_REJECTED: "x", QUALITY_CHECK: "clip", CORRECTION: "pen" };
const EVENT_TONE = { BATCH_CREATED: "", TRANSFER_INITIATED: "sky", TRANSFER_CONFIRMED: "", TRANSFER_REJECTED: "bad", QUALITY_CHECK: "gold", CORRECTION: "gold" };
const DEMO_USERS = [["farmer1", "Farmer", "Ramesh Patil, Nashik"], ["transporter1", "Transporter", "Kisan Roadways"], ["warehouse1", "Warehouse", "Central Warehousing Hub"], ["distributor1", "Distributor", "Annapurna Distributors"], ["retailer1", "Retailer", "Daily Fresh Mart"], ["inspector1", "Inspector", "Dr. Anita Rao"]];

const ICONS = {
  sprout: '<path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clip: '<path d="M9 4h6l1 2h3v14H5V6h3zM9 13l2 2 4-4"/>', pen: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', plus: '<path d="M12 5v14M5 12h14"/>', box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
  inbox: '<path d="M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  users: '<circle cx="9" cy="9" r="3.5"/><path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6M16 5.5a3.5 3.5 0 010 7M21 20c0-2.5-1.5-4.5-4-5.3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', alert: '<path d="M12 4l9 16H3zM12 10v4M12 17v.01"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>', out: '<path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9"/>', book: '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-");
const fmtTime = (d) => (d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const num = (n) => Number(n || 0).toLocaleString("en-IN");
const short = (h) => (h && h.length > 20 ? h.slice(0, 10) + "…" + h.slice(-8) : h || "-");
const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago"; if (s < 86400) return Math.round(s / 3600) + " h ago"; return Math.round(s / 86400) + " d ago"; };

let routeSeq = 0;   // bumps on every navigation; API calls from an older navigation are dropped
let user = JSON.parse(localStorage.getItem("user") || "null");

/* ---------- plumbing ---------- */
function toast(msg, err = false) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = "toast"), 3800);
}
async function api(path, { method = "GET", body, key } = {}) {
  const seq = routeSeq;
  const token = localStorage.getItem("token");
  const res = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(key ? { "x-api-key": key } : token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (seq !== routeSeq && method === "GET") { const e = new Error("stale"); e.stale = true; throw e; }
  if (res.status === 401 && token && !key) { signOut(true); throw new Error(data.message || "Session expired"); }
  if (!res.ok) { const e = new Error(data.message || "Request failed"); e.data = data; e.status = res.status; throw e; }
  return data;
}
const copy = async (text, label = "Copied") => { try { await navigator.clipboard.writeText(text); toast(label); } catch { toast("Copy failed. Select the text and copy it manually.", true); } };
document.addEventListener("click", (e) => { const b = e.target.closest("[data-copy]"); if (b) copy(b.dataset.copy); });

function signOut(expired) {
  localStorage.removeItem("token"); localStorage.removeItem("user"); user = null;
  if (expired) toast("Your session expired. Sign in again.", true);
  location.hash = "#/login";
}
function setUser(token, u) { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(u)); user = u; }
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
const skeleton = (n = 3) => Array.from({ length: n }, () => '<div class="skel" style="margin-bottom:12px"></div>').join("");
const emptyBox = (title, text, action = "") => `<div class="empty"><b>${esc(title)}</b>${esc(text)}${action ? `<div style="margin-top:16px">${action}</div>` : ""}</div>`;

/* ---------- shared bits ---------- */
const brandMark = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--ink)"/><path d="M9 17l5 5 9-12" fill="none" stroke="#f2a900" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const brand = (href = "#/") => `<a class="brand" href="${href}">${brandMark}AgriChain</a>`;
const stageChip = (s) => `<span class="chip ${STAGE_TONE[s] || ""}">${esc(STAGE_LABEL[s] || s)}</span>`;

function sealSVG(ok = true, size = 84) {
  const mark = ok ? '<path d="M31 46l9 9 18-21" />' : '<path d="M33 33l22 22M55 33L33 55" />';
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 40 : 46; return `${(44 + Math.cos(a) * r).toFixed(1)},${(44 + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
  return `<svg class="stamp" width="${size}" height="${size}" viewBox="0 0 88 88" aria-hidden="true"><g class="pop"><polygon points="${pts}" fill="${ok ? "var(--gold)" : "var(--clay)"}"/><circle cx="44" cy="44" r="32" fill="${ok ? "var(--leaf)" : "#8f2b1b"}"/><g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -2)">${mark}</g></g></svg>`;
}

/* ---------- router ---------- */
const PUBLIC = ["", "verify", "api", "login", "register"];
async function route() {
  const seq = ++routeSeq;
  const [, seg = "", arg] = (location.hash.slice(1) || "/").split("/");
  document.title = "AgriChain | Farm-to-shelf traceability you can verify";
  window.scrollTo(0, 0);
  const app = $("#app");
  try {
    if (seg === "app") {
      if (!user) return go("#/login");
      return await renderShell(arg || "overview");
    }
    if (!PUBLIC.includes(seg)) return go("#/");
    if ((seg === "login" || seg === "register") && user) return go("#/app/overview");
    app.innerHTML = publicHead(seg) + `<main id="view"></main>` + (seg === "login" || seg === "register" ? "" : publicFoot());
    await ({ "": pageHome, verify: pageVerify, api: pageApi, login: pageLogin, register: pageRegister }[seg])(arg ? decodeURIComponent(arg) : "");
  } catch (e) { if (e.stale || seq !== routeSeq) return; console.error(e); $("#view") ? ($("#view").innerHTML = `<div class="wrap page">${emptyBox("Something went wrong", e.message)}</div>`) : toast(e.message, true); }
}
window.addEventListener("hashchange", route);

/* ---------- public chrome ---------- */
function publicHead(seg) {
  const on = (s) => (seg === s ? "on" : "");
  return `<header class="pub-head"><div class="wrap">${brand()}
    <nav class="pub-nav" aria-label="Main">
      <a class="nl ${on("verify")}" href="#/verify">Verify<span class="lg-only"> a batch</span></a>
      <a class="nl hide-sm ${on("api")}" href="#/api">Dataset API</a>
      ${user ? `<a class="btn sm" href="#/app/overview">Open dashboard</a>` : `<a class="nl hide-sm ${on("login")}" href="#/login">Sign in</a><a class="btn sm" href="#/register">Join<span class="lg-only"> as a farmer</span></a>`}
    </nav></div></header>`;
}
const publicFoot = () => `<footer class="foot"><div class="wrap"><span>AgriChain. Tamper-evident records for agricultural produce.</span><span>Demo build: sample data only</span></div></footer>`;

/* ---------- HOME ---------- */
async function pageHome() {
  const ringText = "SEALED AT EVERY HANDOVER · HASH-LINKED · CHECK ANY BATCH · ";
  $("#view").innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <h1>Know exactly where your food has been.</h1>
      <p class="lede">Every batch of produce gets a record at each handover, from the farm gate to the shelf. Each record is locked to the one before it, so a changed number shows up the moment you check.</p>
      <div class="verify-box">
        <form id="vf" role="search"><label class="sr" for="vid">Batch ID</label>
          <input class="in" id="vid" placeholder="Paste a batch ID, e.g. BATCH-DEMO-001" autocomplete="off" required>
          <button class="btn gold">${ic("search")}Check batch</button></form>
        <div class="try"><span>Try a sample:</span>
          <button data-id="BATCH-DEMO-001">Intact record</button>
          <button class="t-bad" data-id="BATCH-DEMO-005">Edited record</button>
          <button data-id="BATCH-DEMO-028">Recalled batch</button></div>
      </div>
    </div>
    <div class="seal-wrap">
      <svg class="seal" viewBox="0 0 400 400" role="img" aria-label="A seal with a check mark">
        <defs><path id="circ" d="M200,200 m-158,0 a158,158 0 1,1 316,0 a158,158 0 1,1 -316,0"/></defs>
        <g class="spin"><text class="ring-text"><textPath href="#circ" textLength="990">${ringText}${ringText}</textPath></text></g>
        <polygon fill="var(--gold)" points="${Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 128 : 140; return `${200 + Math.cos(a) * r},${200 + Math.sin(a) * r}`; }).join(" ")}"/>
        <circle cx="200" cy="200" r="104" fill="var(--ink)"/><circle cx="200" cy="200" r="94" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="3 6"/>
        <path d="M156 204l30 30 60-72" fill="none" stroke="var(--gold)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div></section>
  <section class="stats" aria-label="Live totals"><div class="wrap" id="stats">${["Batches tracked", "Recorded handovers", "Farmers", "Tonnes of produce"].map((l) => `<div class="stat"><b>–</b><span>${l}</span></div>`).join("")}</div></section>
  <section class="sec"><div class="wrap">
    <h2>How a batch earns its seal</h2>
    <p class="sub">The same four moves happen for every batch, whether it is a quintal of wheat or a crate of mangoes.</p>
    <div class="steps">
      <div class="step"><span class="n">Step 1</span><h3>Farmer registers it</h3><p>Produce, quantity, harvest date and the village it grew in are written down once, at source.</p><div class="hx">0x3f9a…c21e</div></div>
      <div class="step"><span class="n">Step 2</span><h3>Handover is offered</h3><p>The current holder picks who gets the batch next. Only allowed routes work, so produce can't skip a stage.</p><div class="hx">0x81c4…7a0d ← 0x3f9a…</div></div>
      <div class="step"><span class="n">Step 3</span><h3>Receiver confirms</h3><p>The batch changes hands only when the receiver accepts it. They can refuse and the batch stays put.</p><div class="hx">0xb27e…44f9 ← 0x81c4…</div></div>
      <div class="step"><span class="n">Step 4</span><h3>Anyone can check</h3><p>Every record's fingerprint is recomputed on demand. If one value was altered, the chain breaks in plain view.</p><div class="hx">Chain intact · 10 of 10 records</div></div>
    </div>
  </div></section>
  <section class="sec" style="padding-top:0"><div class="wrap split">
    <div class="panel"><h3 style="margin-bottom:6px">Latest activity</h3><p class="mute" style="font-size:.9rem;margin-bottom:8px">Handovers and inspections as they are recorded.</p><ul class="feed" id="feed">${'<li class="skel" style="min-height:44px;margin-bottom:6px"></li>'.repeat(5)}</ul></div>
    <div class="panel"><h3 style="margin-bottom:6px">Open data for partners</h3><p class="mute" style="font-size:.9rem;margin-bottom:16px">Researchers, auditors and retailers can read the dataset through a read-only API. A demo key is ready to use.</p>
      <div class="code"><span class="k">curl</span> -H <span class="s">"x-api-key: ${DEMO_KEY}"</span> \\
  ${location.origin}/api/v1/batches?stage=AT_RETAILER</div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><a class="btn leaf" href="#/api">Try the API</a><button class="btn ghost" data-copy="${DEMO_KEY}">${ic("copy")}Copy demo key</button></div></div>
  </div></section>`;
  const check = (id) => go("#/verify/" + encodeURIComponent(id.trim()));
  $("#vf").onsubmit = (e) => { e.preventDefault(); check($("#vid").value); };
  $$(".try button").forEach((b) => (b.onclick = () => check(b.dataset.id)));
  try {
    const s = await api("/stats");
    if (!$("#feed")) return;
    const vals = [num(s.batches), num(s.events), num(s.farmers), (s.totalQuantityKg / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })];
    $$("#stats .stat b").forEach((b, i) => (b.textContent = vals[i]));
    $("#feed").innerHTML = s.recentEvents.length ? s.recentEvents.map((e) => `<li><span class="chip ${e.eventType === "QUALITY_CHECK" ? "gold" : e.eventType === "TRANSFER_REJECTED" ? "clay" : "leaf"}">${esc(EVENT_LABEL[e.eventType] || e.eventType)}</span><a href="#/verify/${encodeURIComponent(e.batchId)}">${esc(e.batchId)}</a><span class="mute" style="margin-left:auto;font-size:.82rem">${ago(e.at)}</span></li>`).join("") : "<li class='mute'>No activity yet.</li>";
  } catch { if ($("#feed")) $("#feed").innerHTML = "<li class='mute'>Live numbers are unavailable right now.</li>"; }
}

/* ---------- VERIFY ---------- */
function timelineHTML(tl) {
  return `<ol class="tl">${tl.map((e, i) => {
    const bad = !e.hashOk || !e.linkOk;
    const tone = bad ? "bad" : EVENT_TONE[e.eventType];
    const d = e.details || {}, parts = [];
    if (d.produceType) parts.push(["Produce", `${esc(d.produceType)}, ${num(d.quantity)} ${esc(d.unit)}`]);
    if (d.origin) parts.push(["Origin", `${esc(d.origin.village)}, ${esc(d.origin.district)}`]);
    if (d.toRole) parts.push(["Handed to", esc(ROLE_LABEL[d.toRole] || d.toRole)]);
    if (d.price !== undefined) parts.push(["Price", "₹" + num(d.price)]);
    if (d.stage) parts.push(["New stage", esc(STAGE_LABEL[d.stage] || d.stage)]);
    if (d.grade) parts.push(["Grade", `<span class="chip ${d.passed ? "leaf" : "clay"}">${esc(d.grade)}</span>`]);
    if (d.moisturePct !== undefined) parts.push(["Moisture", d.moisturePct + "%"]);
    if (d.temperatureC !== undefined) parts.push(["Temperature", d.temperatureC + " °C"]);
    if (d.reason) parts.push(["Reason", esc(d.reason)]);
    if (d.notes) parts.push(["Notes", esc(d.notes)]);
    return `<li class="ev"><div class="rail"><div class="node ${tone}">${ic(bad ? "alert" : EVENT_ICON[e.eventType] || "check")}</div><div class="link ${bad ? "bad" : ""}"></div></div>
      <div class="body ${bad ? "bad" : ""}"><h3>${esc(EVENT_LABEL[e.eventType] || e.eventType)} <span class="chip">${esc(ROLE_LABEL[e.actorRole] || e.actorRole)}</span>${bad ? '<span class="chip clay">Record does not match its fingerprint</span>' : ""}</h3>
      <div class="when">${fmtTime(e.timestamp)}</div>
      ${parts.length ? `<div class="det">${parts.map(([k, v]) => `<span class="mute">${k}: <b style="color:var(--ink)">${v}</b></span>`).join("")}</div>` : ""}
      <div class="hashes"><div class="hash"><i>hash</i><code title="${esc(e.dataHash)}">${esc(short(e.dataHash))}</code><button data-copy="${esc(e.dataHash)}" aria-label="Copy hash">${ic("copy")}</button></div>
        <div class="hash"><i>after</i><code title="${esc(e.prevHash)}">${e.prevHash === "0x0" ? "first record in the chain" : esc(short(e.prevHash))}</code></div>
        ${e.blockchain?.status === "CONFIRMED" ? `<div class="hash"><i>chain</i><code>anchored in block ${esc(e.blockchain.blockNumber)}</code></div>` : ""}</div></div></li>`;
  }).join("")}</ol>`;
}
function routeHTML(stage) {
  const idx = STAGES.indexOf(stage), labels = ["Farm", "Transit", "Storage", "Retailer"];
  return `<ol class="route" aria-label="Where the batch is now">${labels.map((l, i) => `<li class="${i <= idx ? "done" : ""} ${i === idx ? "here" : ""}">${l}</li>`).join("")}</ol>`;
}
function resultHTML(r, withLink = true) {
  const b = r.batch, ok = r.valid;
  return `<div class="banner ${ok ? "ok" : "bad"}">${sealSVG(ok)}
    <div><h1>${ok ? "Record intact" : "This record has been altered"}</h1>
      <p>${ok ? `All ${r.eventCount} records match their fingerprints and are linked in order.` : "At least one record no longer matches its fingerprint. Treat the details below with caution and contact the platform operator."}${b.onHold ? ` <b>This batch is on hold: ${esc(b.holdReason || "recall in progress")}.</b>` : ""}</p></div>
    ${withLink ? `<button class="btn ghost" data-copy="${location.origin}/verify/${esc(b.batchId)}">${ic("link")}Copy link</button>` : ""}</div>
  <div class="facts">
    <div class="fact"><small>Produce</small><b>${esc(b.produceType)}</b></div><div class="fact"><small>Quantity</small><b>${num(b.quantity)} ${esc(b.unit)}</b></div>
    <div class="fact"><small>Harvested</small><b>${fmtDate(b.harvestDate)}</b></div><div class="fact"><small>Grown in</small><b>${esc(b.origin.village)}, ${esc(b.origin.state)}</b></div>
    <div class="fact"><small>Batch ID</small><b class="mono">${esc(b.batchId)}</b></div></div>
  ${routeHTML(b.stage)}${timelineHTML(r.timeline)}`;
}
async function pageVerify(id) {
  $("#view").innerHTML = `<div class="wrap page"><div class="verify-box" style="margin-bottom:28px"><form id="vf"><label class="sr" for="vid">Batch ID</label><input class="in" id="vid" value="${esc(id)}" placeholder="BATCH-DEMO-001" required><button class="btn gold">${ic("search")}Check batch</button></form></div><div id="res"></div></div>`;
  $("#vf").onsubmit = (e) => { e.preventDefault(); go("#/verify/" + encodeURIComponent($("#vid").value.trim())); };
  if (!id) return ($("#res").innerHTML = emptyBox("Enter a batch ID", "You will find it on the package label or in the link you were sent."));
  $("#res").innerHTML = skeleton();
  try { const r = await api("/verify/" + encodeURIComponent(id)); document.title = `${r.batch.produceType} ${r.batch.batchId} | AgriChain`; $("#res").innerHTML = resultHTML(r); }
  catch (e) { $("#res").innerHTML = emptyBox(e.status === 404 ? "No batch with that ID" : "Couldn't check this batch", e.status === 404 ? "Check the spelling, or try one of the sample batches on the home page." : e.message); }
}

/* ---------- API page ---------- */
async function pageApi() {
  const eps = [["GET", "/api/v1/stats", "Totals, stage counts, top produce, recent events"], ["GET", "/api/v1/batches?limit=5", "Paged list. Filters: stage, produce, state, category, onHold"], ["GET", "/api/v1/batches/BATCH-DEMO-001", "One batch with its verified timeline"]];
  $("#view").innerHTML = `<div class="wrap page"><h1 style="font-size:clamp(2rem,4vw,3rem);max-width:18ch">Read the dataset with one header</h1>
    <p class="mute" style="max-width:60ch;margin:14px 0 28px">The API is read-only and returns the same verified records you see on the batch page. Personal IDs are never included.</p>
    <div class="split" style="margin-top:0"><div class="panel"><h3 style="margin-bottom:12px">Demo API key</h3>
      <div class="keybox"><code>${DEMO_KEY}</code><button data-copy="${DEMO_KEY}">${ic("copy")}Copy</button></div>
      <p class="hint" style="margin-top:10px">Send it as <span class="mono">x-api-key</span>. Limit: 120 requests a minute. Admins can issue their own keys from the dashboard.</p>
      <h3 style="margin:26px 0 10px">Endpoints</h3>
      ${eps.map((e, i) => `<button class="btn ghost" style="width:100%;justify-content:flex-start;margin-bottom:8px;text-align:left" data-ep="${i}"><span class="chip leaf">${e[0]}</span><span class="mono">${esc(e[1])}</span></button>`).join("")}
      <p class="hint">${eps.map((e) => esc(e[2])).join("<br>")}</p></div>
    <div class="panel console"><h3>Try it</h3><p class="hint" style="margin-bottom:10px" id="ctl">Pick an endpoint to run it with the demo key.</p>
      <div class="code" id="curl">curl -H "x-api-key: ${DEMO_KEY}" ${location.origin}/api/v1/stats</div><div class="code" id="out" style="min-height:160px;max-height:380px">// response appears here</div></div></div></div>`;
  $$("[data-ep]").forEach((b) => (b.onclick = async () => {
    const [, path] = eps[b.dataset.ep];
    $("#curl").textContent = `curl -H "x-api-key: ${DEMO_KEY}" ${location.origin}${path}`;
    $("#out").textContent = "Loading…";
    try { const r = await api(path.replace("/api", ""), { key: DEMO_KEY }); $("#out").textContent = JSON.stringify(r, null, 2).slice(0, 6000); }
    catch (e) { $("#out").textContent = `${e.status || ""} ${e.message}`; }
  }));
}

/* ---------- AUTH ---------- */
function authFrame(h1, body, side) {
  $("#view").innerHTML = `<div class="auth"><div class="side">${side}</div><div class="main">${body}</div></div>`;
}
async function pageLogin() {
  authFrame("Sign in", `<form id="f" novalidate><h1>Sign in</h1><div><label class="f" for="email">Email</label><input class="in" id="email" type="email" required autocomplete="username"></div>
      <div><label class="f" for="password">Password</label><input class="in" id="password" type="password" required autocomplete="current-password"></div>
      <button class="btn leaf" id="go">Sign in</button><p class="mute" style="font-size:.9rem">New farmer? <a href="#/register">Create an account</a>. Other roles are added by an admin.</p></form>`,
    `<h2>Pick a role to look around</h2><p>One click fills the sign-in form with a demo account. The password for every demo user is <b class="mono" style="color:#ffd36b">Demo@1234</b>.</p>
     <div class="demo-acc">${DEMO_USERS.map(([u, r, n]) => `<button type="button" data-u="${u}"><span class="chip gold">${r}</span><span>${n}<small>${u}@agrichain.local</small></span></button>`).join("")}
       <button type="button" data-u="admin" data-p="ChangeMe@123"><span class="chip gold">Admin</span><span>Platform Admin<small>admin@agrichain.local</small></span></button></div>`);
  $$(".demo-acc button").forEach((b) => (b.onclick = () => { $("#email").value = b.dataset.u + "@agrichain.local"; $("#password").value = b.dataset.p || "Demo@1234"; $("#go").focus(); }));
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); const btn = $("#go"); btn.disabled = true;
    try { const d = await api("/auth/login", { method: "POST", body: { email: $("#email").value, password: $("#password").value } }); setUser(d.token, d.user); go("#/app/overview"); }
    catch (err) { toast(err.message, true); btn.disabled = false; }
  };
}
async function pageRegister() {
  authFrame("Join", `<form id="f"><h1>Create a farmer account</h1><div><label class="f" for="name">Full name</label><input class="in" id="name" required></div>
    <div><label class="f" for="email">Email</label><input class="in" id="email" type="email" required></div>
    <div><label class="f" for="password">Password</label><input class="in" id="password" type="password" minlength="8" required><p class="hint">At least 8 characters.</p></div>
    <button class="btn leaf" id="go">Create account</button><p class="mute" style="font-size:.9rem">Already registered? <a href="#/login">Sign in</a></p></form>`,
    `<h2>Register your harvest once. It stays verifiable.</h2><p>Farmers sign up here. Transporters, warehouses, distributors, retailers and inspectors are added by the platform admin.</p>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); $("#go").disabled = true;
    try { await api("/auth/register", { method: "POST", body: { name: $("#name").value, email: $("#email").value, password: $("#password").value } }); toast("Account created. Sign in to continue."); go("#/login"); }
    catch (err) { toast(err.message, true); $("#go").disabled = false; }
  };
}

/* ---------- APP SHELL ---------- */
const NAV = {
  FARMER: [["overview", "Overview", "home"], ["create", "New batch", "plus"], ["mine", "My batches", "box"], ["track", "Check a batch", "search"]],
  TRANSPORTER: [["overview", "Overview", "home"], ["incoming", "Incoming", "inbox"], ["mine", "My batches", "box"], ["track", "Check a batch", "search"]],
  WAREHOUSE: [["overview", "Overview", "home"], ["incoming", "Incoming", "inbox"], ["mine", "My batches", "box"], ["track", "Check a batch", "search"]],
  DISTRIBUTOR: [["overview", "Overview", "home"], ["incoming", "Incoming", "inbox"], ["mine", "My batches", "box"], ["track", "Check a batch", "search"]],
  RETAILER: [["overview", "Overview", "home"], ["incoming", "Incoming", "inbox"], ["mine", "My batches", "box"], ["track", "Check a batch", "search"]],
  INSPECTOR: [["overview", "Overview", "home"], ["batches", "All batches", "box"], ["track", "Check a batch", "search"]],
  ADMIN: [["overview", "Overview", "home"], ["batches", "Batches & recalls", "box"], ["users", "Users", "users"], ["apikeys", "API keys", "key"], ["track", "Check a batch", "search"]],
};
async function renderShell(tab) {
  const nav = NAV[user.role];
  if (!nav.some((n) => n[0] === tab)) return go("#/app/overview");
  if (!$("#workspace")) {
    $("#app").innerHTML = `<div class="shell"><nav class="side-nav" aria-label="Dashboard">${brand("#/")}
      ${nav.map(([id, l, i]) => `<a class="ni" data-nav="${id}" href="#/app/${id}">${ic(i)}<span>${l}</span></a>`).join("")}<div class="grow"></div>
      <div class="me"><div><b>${esc(user.name)}</b><small>${esc(ROLE_LABEL[user.role])}</small></div><button class="btn ghost sm" id="so">${ic("out")}Sign out</button></div></nav>
      <div><div class="mobbar">${brand("#/")}<button class="btn gold sm" id="so2">Sign out</button></div><main class="workspace" id="workspace"></main></div></div>`;
    $("#so").onclick = () => signOut(); $("#so2").onclick = () => signOut();
  }
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === tab));
  const ws = $("#workspace"); ws.innerHTML = skeleton();
  document.title = `${nav.find((n) => n[0] === tab)[1]} | AgriChain`;
  await TABS[tab](ws);
}
const head = (title, sub = "", right = "") => `<div class="ws-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${right}</div>`;
const bars = (rows) => rows.length ? `<div class="bars">${rows.map(([l, v]) => `<div class="bar"><span>${esc(l)}</span><div class="track"><div class="fill" style="width:${Math.max(...rows.map((r) => r[1])) ? Math.max(3, (v / Math.max(...rows.map((r) => r[1]))) * 100) : 0}%"></div></div><b>${v}</b></div>`).join("")}</div>` : emptyBox("Nothing to chart yet", "Numbers appear once batches are recorded.");

function batchCard(b) {
  const pending = b.pendingTransfer && b.pendingTransfer.to, mine = b.currentCustodian === user.id;
  return `<button class="bcard" data-open="${esc(b.batchId)}"><h3>${esc(b.produceType)} ${stageChip(b.stage)}</h3>
    <div class="meta">${num(b.quantity)} ${esc(b.unit)} · ${esc(b.category)}<br>${esc(b.origin.village)}, ${esc(b.origin.district)}, ${esc(b.origin.state)}</div>
    <div class="chips">${b.onHold ? '<span class="chip clay">On hold</span>' : ""}${pending ? '<span class="chip gold">Handover pending</span>' : ""}${mine && !pending && !b.onHold ? '<span class="chip leaf">You hold this</span>' : ""}</div>
    <div class="id">${esc(b.batchId)}</div></button>`;
}
function wireOpen(root) { $$("[data-open]", root).forEach((b) => (b.onclick = () => openBatch(b.dataset.open))); }

const TABS = {
  async overview(ws) {
    if (user.role === "ADMIN" || user.role === "INSPECTOR") {
      const s = user.role === "ADMIN" ? (await api("/admin/overview")) : { stats: await api("/stats") };
      const st = s.stats;
      ws.innerHTML = head(user.role === "ADMIN" ? "Platform overview" : "Inspection overview", `Live from the record chain. Updated ${new Date().toLocaleTimeString()}.`) + `
      <div class="kpis"><div class="kpi"><small>Batches</small><b>${num(st.batches)}</b></div><div class="kpi"><small>Recorded events</small><b>${num(st.events)}</b></div>
        <div class="kpi"><small>Farmers</small><b>${num(st.farmers)}</b></div><div class="kpi ${st.onHold ? "alert" : ""}"><small>On hold</small><b>${st.onHold}</b></div></div>
      <div class="cols"><div class="card"><h2>Batches by stage</h2>${bars(STAGES.map((k) => [STAGE_LABEL[k], st.stages[k] || 0]), st.batches)}</div>
        <div class="card"><h2>Recent activity</h2><ul class="feed">${st.recentEvents.map((e) => `<li><span class="chip">${esc(EVENT_LABEL[e.eventType])}</span><a href="#" data-open="${esc(e.batchId)}">${esc(e.batchId)}</a><span class="mute" style="margin-left:auto;font-size:.8rem">${ago(e.at)}</span></li>`).join("")}</ul></div></div>
      <div class="cols" style="margin-top:18px"><div class="card"><h2>Top produce</h2>${bars(st.topProduce.slice(0, 6).map((p) => [p.produceType, p.batches]), st.topProduce[0]?.batches || 1)}</div>
        <div class="card"><h2>Origin states</h2>${bars(st.states.slice(0, 6).map((p) => [p.state, p.batches]), st.states[0]?.batches || 1)}</div></div>
      ${s.held?.length ? `<div class="card" style="margin-top:18px;border-color:var(--clay)"><h2>Batches on hold</h2>${s.held.map((h) => `<p style="margin-bottom:6px"><a href="#" data-open="${esc(h.batchId)}" class="mono">${esc(h.batchId)}</a> ${esc(h.produceType)}: ${esc(h.holdReason || "no reason given")}</p>`).join("")}</div>` : ""}`;
      $$("a[data-open]", ws).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openBatch(a.dataset.open); }));
      return;
    }
    const [{ batches }, { batches: inc }] = await Promise.all([api("/batches/mine"), api("/batches/incoming")]);
    const by = (s) => batches.filter((b) => b.stage === s).length, pending = batches.filter((b) => b.pendingTransfer?.to).length;
    ws.innerHTML = head(`Hello, ${user.name.split(" ")[0]}`, `${ROLE_LABEL[user.role]} dashboard`, user.role === "FARMER" ? `<a class="btn leaf" href="#/app/create">${ic("plus")}New batch</a>` : "") + `
    <div class="kpis"><div class="kpi"><small>Batches you hold</small><b>${batches.length}</b></div>
      ${user.role !== "FARMER" ? `<div class="kpi ${inc.length ? "alert" : ""}"><small>Waiting for you to confirm</small><b>${inc.length}</b></div>` : ""}
      <div class="kpi"><small>Handovers pending</small><b>${pending}</b></div><div class="kpi"><small>Total quantity</small><b>${num(batches.reduce((a, b) => a + b.quantity, 0))}</b></div></div>
    <div class="cols"><div class="card"><h2>Your batches by stage</h2>${bars(STAGES.map((k) => [STAGE_LABEL[k], by(k)]), batches.length)}</div>
      <div class="card"><h2>${inc.length ? "Waiting for your confirmation" : "Recently updated"}</h2>${(inc.length ? inc : batches).slice(0, 4).map((b) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><a href="#" data-open="${esc(b.batchId)}"><b>${esc(b.produceType)}</b></a> <span class="mute">${num(b.quantity)} ${esc(b.unit)}</span> ${stageChip(b.stage)}</div>`).join("") || emptyBox("No batches yet", user.role === "FARMER" ? "Register your first harvest to get started." : "Batches show up here once someone hands one to you.")}</div></div>`;
    $$("a[data-open]", ws).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openBatch(a.dataset.open); }));
  },

  async create(ws) {
    ws.innerHTML = head("Register a new batch", "Fill this in once at harvest. These details are locked into the first record.") + `<div class="card formcard"><form id="f">
      <fieldset class="fs"><legend>The produce</legend><div class="grid2"><div><label class="f" for="produceType">What is it?</label><input class="in" id="produceType" placeholder="Wheat, Tomato, Alphonso Mango" required></div>
        <div><label class="f" for="category">Category</label><select class="in" id="category">${["Grain", "Vegetable", "Fruit", "Pulse", "Spice", "Other"].map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div><label class="f" for="quantity">Quantity</label><input class="in" id="quantity" type="number" min="0.01" step="any" required></div>
        <div><label class="f" for="unit">Unit</label><select class="in" id="unit"><option>kg</option><option>quintal</option><option>ton</option></select></div>
        <div><label class="f" for="harvestDate">Harvest date</label><input class="in" id="harvestDate" type="date" max="${new Date().toISOString().slice(0, 10)}" required></div></div></fieldset>
      <fieldset class="fs"><legend>Where it grew</legend><div class="grid2"><div><label class="f" for="village">Village</label><input class="in" id="village" required></div><div><label class="f" for="district">District</label><input class="in" id="district" required></div>
        <div><label class="f" for="state">State</label><input class="in" id="state" required></div></div>
        <div class="grid2"><div><label class="f" for="lat">Latitude (optional)</label><input class="in" id="lat" type="number" step="any"></div><div><label class="f" for="lng">Longitude (optional)</label><input class="in" id="lng" type="number" step="any"></div></div></fieldset>
      <div><button class="btn leaf" id="go">Register batch</button></div></form></div>`;
    $("#f").onsubmit = async (e) => {
      e.preventDefault(); $("#go").disabled = true;
      const origin = { village: $("#village").value, district: $("#district").value, state: $("#state").value };
      if ($("#lat").value) origin.lat = +$("#lat").value; if ($("#lng").value) origin.lng = +$("#lng").value;
      try { const d = await api("/batches", { method: "POST", body: { produceType: $("#produceType").value, category: $("#category").value, quantity: $("#quantity").value, unit: $("#unit").value, harvestDate: $("#harvestDate").value, origin } }); toast("Batch registered: " + d.batch.batchId); go("#/app/mine"); setTimeout(() => openBatch(d.batch.batchId), 300); }
      catch (err) { toast(err.message, true); $("#go").disabled = false; }
    };
  },

  async mine(ws) {
    const { batches } = await api("/batches/mine");
    let stage = "ALL", q = "";
    const draw = () => {
      const list = batches.filter((b) => (stage === "ALL" || b.stage === stage) && (!q || (b.produceType + b.batchId + b.origin.district).toLowerCase().includes(q)));
      $("#list").innerHTML = list.length ? list.map(batchCard).join("") : emptyBox("No batches match", batches.length ? "Clear the filter to see everything." : "Batches you create or receive appear here.");
      wireOpen($("#list"));
    };
    ws.innerHTML = head("My batches", `${batches.length} in your custody or created by you`) + `<div class="toolbar"><div class="seg" role="group" aria-label="Filter by stage">${[["ALL", "All"], ...STAGES.map((s) => [s, STAGE_LABEL[s]])].map(([k, l]) => `<button data-s="${k}" class="${k === "ALL" ? "on" : ""}">${l}</button>`).join("")}</div>
      <input class="in" id="q" placeholder="Search produce, ID or district" aria-label="Search batches"></div><div class="batches" id="list"></div>`;
    $$(".seg button", ws).forEach((b) => (b.onclick = () => { stage = b.dataset.s; $$(".seg button", ws).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
    $("#q").oninput = (e) => { q = e.target.value.trim().toLowerCase(); draw(); };
    draw();
  },

  async incoming(ws) {
    const { batches } = await api("/batches/incoming");
    ws.innerHTML = head("Incoming handovers", "Confirm only after the produce has physically reached you.") + (batches.length ? `<div class="batches">${batches.map((b) => `<div class="bcard" style="cursor:default"><h3>${esc(b.produceType)} ${stageChip(b.stage)}</h3><div class="meta">${num(b.quantity)} ${esc(b.unit)} · from ${esc(b.origin.village)}, ${esc(b.origin.state)}</div><div class="id">${esc(b.batchId)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn leaf sm" data-act="confirm" data-id="${esc(b.batchId)}">${ic("check")}Confirm receipt</button><button class="btn ghost sm" data-act="reject" data-id="${esc(b.batchId)}">Reject</button><button class="btn ghost sm" data-open="${esc(b.batchId)}">Details</button></div></div>`).join("")}</div>` : emptyBox("Nothing waiting for you", "When someone hands a batch to you, it shows up here."));
    wireOpen(ws); wireDecisions(ws, () => TABS.incoming(ws));
  },

  async batches(ws) {
    let q = "";
    const draw = async () => {
      const { batches } = await api("/admin/batches" + (q ? "?q=" + encodeURIComponent(q) : "")).catch(() => ({ batches: [] }));
      $("#bt").innerHTML = batches.length ? `<table class="tbl"><thead><tr><th>Batch</th><th>Produce</th><th>Stage</th><th>Origin</th><th>Updated</th><th></th></tr></thead><tbody>${batches.map((b) => `<tr><td class="mono">${esc(b.batchId)}</td><td>${esc(b.produceType)}<div class="mute" style="font-size:.8rem">${num(b.quantity)} ${esc(b.unit)}</div></td><td>${stageChip(b.stage)} ${b.onHold ? '<span class="chip clay">On hold</span>' : ""}</td><td>${esc(b.origin.district)}, ${esc(b.origin.state)}</td><td class="mute">${ago(b.updatedAt)}</td>
        <td><div class="acts"><button class="btn ghost sm" data-open="${esc(b.batchId)}">Open</button>${user.role === "ADMIN" ? `<button class="btn ${b.onHold ? "leaf" : "danger"} sm" data-hold="${esc(b.batchId)}" data-to="${!b.onHold}">${b.onHold ? "Release" : "Hold"}</button>` : ""}</div></td></tr>`).join("")}</tbody></table>` : emptyBox("No batches found", "Try a different search.");
      wireOpen($("#bt"));
      $$("[data-hold]", $("#bt")).forEach((b) => (b.onclick = async () => {
        const hold = b.dataset.to === "true"; let reason = "";
        if (hold) { reason = prompt("Why is this batch being held? Everyone who checks it will see this.", "Pending lab report"); if (reason === null) return; }
        try { const d = await api(`/admin/batches/${b.dataset.hold}/hold`, { method: "PATCH", body: { onHold: hold, reason } }); toast(d.message); draw(); } catch (e) { toast(e.message, true); }
      }));
    };
    ws.innerHTML = head(user.role === "ADMIN" ? "Batches & recalls" : "All batches", user.role === "ADMIN" ? "Place a batch on hold to stop further handovers and warn anyone who checks it." : "Open a batch to add a quality inspection.") + `<div class="toolbar"><input class="in" id="q" placeholder="Search by produce or batch ID" aria-label="Search batches"></div><div class="tbl-wrap" id="bt">${skeleton(2)}</div>`;
    let t; $("#q").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim(); draw(); }, 250); };
    if (user.role === "INSPECTOR") { // inspectors have no admin list: use the public dataset through the demo-safe stats feed
      const s = await api("/stats"); const ids = [...new Set(s.recentEvents.map((e) => e.batchId))];
      $("#bt").innerHTML = `<div style="padding:18px"><p class="mute" style="margin-bottom:12px">Recently active batches</p>${ids.map((id) => `<button class="btn ghost sm" style="margin:0 8px 8px 0" data-open="${id}">${id}</button>`).join("")}<p class="hint" style="margin-top:8px">Or use <a href="#/app/track">Check a batch</a> with any ID.</p></div>`;
      $(".toolbar", ws).remove(); wireOpen(ws); return;
    }
    draw();
  },

  async track(ws) {
    ws.innerHTML = head("Check a batch", "Recomputes every fingerprint in the chain.") + `<div class="verify-box" style="margin-bottom:24px;max-width:720px"><form id="vf"><input class="in" id="vid" placeholder="BATCH-DEMO-001" required aria-label="Batch ID"><button class="btn gold">${ic("search")}Check</button></form></div><div id="res"></div>`;
    $("#vf").onsubmit = async (e) => {
      e.preventDefault(); $("#res").innerHTML = skeleton();
      try { $("#res").innerHTML = resultHTML(await api("/verify/" + encodeURIComponent($("#vid").value.trim())), false) + (user.role === "INSPECTOR" ? `<p style="margin-top:20px"><button class="btn leaf" data-open="${esc($("#vid").value.trim())}">${ic("clip")}Add inspection</button></p>` : ""); wireOpen($("#res")); }
      catch (err) { $("#res").innerHTML = emptyBox(err.status === 404 ? "No batch with that ID" : "Couldn't check this batch", err.message); }
    };
  },

  async users(ws) {
    const { users } = await api("/admin/users");
    ws.innerHTML = head("Users", `${users.length} accounts`, `<button class="btn leaf" id="nu">${ic("plus")}Add user</button>`) + `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Status</th><th></th></tr></thead><tbody>${users.map((u) => `<tr><td><b>${esc(u.name)}</b><div class="mute" style="font-size:.82rem">${esc(u.email)}</div></td><td><span class="chip">${esc(ROLE_LABEL[u.role])}</span></td><td>${esc(u.organization || "-")}</td><td>${u.status === "ACTIVE" ? '<span class="chip leaf"><span class="dot"></span>Active</span>' : '<span class="chip clay"><span class="dot"></span>Suspended</span>'}</td>
      <td><div class="acts">${u._id === user.id ? "" : `<button class="btn ghost sm" data-st="${esc(u._id)}" data-to="${u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}">${u.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button>`}</div></td></tr>`).join("")}</tbody></table></div>`;
    $$("[data-st]", ws).forEach((b) => (b.onclick = async () => { try { const d = await api(`/admin/users/${b.dataset.st}/status`, { method: "PATCH", body: { status: b.dataset.to } }); toast(d.message); TABS.users(ws); } catch (e) { toast(e.message, true); } }));
    $("#nu").onclick = () => drawer("Add a user", `<form class="actionbox" id="uf"><div><label class="f" for="name">Name</label><input class="in" id="name" required></div><div><label class="f" for="email">Email</label><input class="in" id="email" type="email" required></div>
      <div class="grid2"><div><label class="f" for="password">Temporary password</label><input class="in" id="password" minlength="8" required></div><div><label class="f" for="role">Role</label><select class="in" id="role">${["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER", "INSPECTOR"].map((r) => `<option value="${r}">${ROLE_LABEL[r]}</option>`).join("")}</select></div>
      <div><label class="f" for="organization">Organisation</label><input class="in" id="organization"></div><div><label class="f" for="phone">Phone</label><input class="in" id="phone"></div></div><button class="btn leaf">Create user</button></form>`, (root) => {
      $("#uf", root).onsubmit = async (e) => { e.preventDefault(); try { await api("/admin/users", { method: "POST", body: Object.fromEntries(["name", "email", "password", "role", "organization", "phone"].map((k) => [k, $("#" + k, root).value])) }); toast("User created"); closeDrawer(); TABS.users(ws); } catch (err) { toast(err.message, true); } };
    });
  },

  async apikeys(ws) {
    const { keys } = await api("/admin/apikeys");
    ws.innerHTML = head("API keys", "Read-only access to the dataset API for partners and demos.", `<button class="btn leaf" id="nk">${ic("plus")}New key</button>`) +
      `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Key</th><th>Requests</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>${keys.map((k) => `<tr><td><b>${esc(k.name)}</b>${k.isDemo ? ' <span class="chip gold">Demo</span>' : ""}</td><td class="mono">${esc(k.prefix)}…</td><td>${num(k.requestCount)}</td><td class="mute">${k.lastUsedAt ? ago(k.lastUsedAt) : "never"}</td><td>${k.active ? '<span class="chip leaf">Active</span>' : '<span class="chip clay">Revoked</span>'}</td>
      <td><div class="acts"><button class="btn ghost sm" data-k="${esc(k._id)}" data-to="${!k.active}">${k.active ? "Revoke" : "Enable"}</button></div></td></tr>`).join("")}</tbody></table></div>
      <div class="card" style="margin-top:18px"><h2>Demo key</h2><div class="keybox"><code>${DEMO_KEY}</code><button data-copy="${DEMO_KEY}">${ic("copy")}Copy</button></div><p class="hint" style="margin-top:8px">Also shown on the public <a href="#/api">API page</a>. Revoke it before going to production.</p></div>`;
    $$("[data-k]", ws).forEach((b) => (b.onclick = async () => { try { const d = await api("/admin/apikeys/" + b.dataset.k, { method: "PATCH", body: { active: b.dataset.to === "true" } }); toast(d.message); TABS.apikeys(ws); } catch (e) { toast(e.message, true); } }));
    $("#nk").onclick = async () => {
      const name = prompt("What is this key for?", "Partner name"); if (!name) return;
      try { const d = await api("/admin/apikeys", { method: "POST", body: { name } }); drawer("New API key", `<div class="actionbox"><p>Copy this key now. It is stored hashed and can't be shown again.</p><div class="keybox"><code>${esc(d.key)}</code><button data-copy="${esc(d.key)}">${ic("copy")}Copy</button></div></div>`); TABS.apikeys(ws); } catch (e) { toast(e.message, true); }
    };
  },
};

/* ---------- decisions (confirm / reject) ---------- */
function wireDecisions(root, after) {
  $$("[data-act]", root).forEach((b) => (b.onclick = async () => {
    const id = b.dataset.id;
    try {
      if (b.dataset.act === "confirm") { const d = await api(`/batches/${id}/confirm`, { method: "POST" }); toast(d.message); }
      else { const reason = prompt("Why are you rejecting this handover? The sender will see it.", ""); if (reason === null) return; const d = await api(`/batches/${id}/reject`, { method: "POST", body: { reason } }); toast(d.message); }
      after();
    } catch (e) { toast(e.message, true); }
  }));
}

/* ---------- drawer ---------- */
function drawer(title, html, wire) {
  closeDrawer();
  const d = document.createElement("div");
  d.id = "dr"; d.innerHTML = `<div class="scrim"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2 style="font-size:1.25rem">${esc(title)}</h2><button class="xbtn" aria-label="Close">${ic("x")}</button></header><div class="inner">${html}</div></aside>`;
  document.body.appendChild(d);
  $(".scrim", d).onclick = closeDrawer; $(".xbtn", d).onclick = closeDrawer; $(".xbtn", d).focus();
  if (wire) wire(d);
  return d;
}
function closeDrawer() { $("#dr")?.remove(); }
document.addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());

async function openBatch(id) {
  const d = drawer(id, skeleton());
  try {
    const [r, mine] = await Promise.all([api("/verify/" + encodeURIComponent(id)), user ? api("/batches/mine").catch(() => ({ batches: [] })) : { batches: [] }]);
    let full = mine.batches.find((b) => b.batchId === id);
    if (!full && ["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER"].includes(user.role)) { const inc = await api("/batches/incoming").catch(() => ({ batches: [] })); full = inc.batches.find((b) => b.batchId === id); }
    const b = r.batch, iAmHolder = full && full.currentCustodian === user.id, pending = full?.pendingTransfer?.to, incomingForMe = full && pending === user.id;
    let actions = "";
    if (b.onHold) actions += `<div class="actionbox" style="border-color:var(--clay)"><h3>On hold</h3><p>${esc(b.holdReason || "This batch is on hold.")} Handovers are paused until an admin releases it.</p></div>`;
    else {
      if (iAmHolder && SENDERS.includes(user.role) && !pending) actions += `<div class="actionbox"><h3>Hand this batch to the next stop</h3><form id="tf" style="display:grid;gap:12px"><div><label class="f" for="to">Send to</label><select class="in" id="to"><option>Loading…</option></select></div><div><label class="f" for="price">Price in ₹ (optional)</label><input class="in" id="price" type="number" min="0" step="any"></div><div><button class="btn leaf">${ic("send")}Start handover</button></div></form></div>`;
      if (iAmHolder && pending) actions += `<div class="actionbox"><h3>Handover pending</h3><p class="mute">Waiting for the receiver to confirm.</p></div>`;
      if (incomingForMe) actions += `<div class="actionbox"><h3>This batch is coming to you</h3><div style="display:flex;gap:8px"><button class="btn leaf" data-act="confirm" data-id="${esc(id)}">${ic("check")}Confirm receipt</button><button class="btn ghost" data-act="reject" data-id="${esc(id)}">Reject</button></div></div>`;
      if (user.role === "INSPECTOR") actions += `<div class="actionbox"><h3>Record a quality inspection</h3><form id="qf" style="display:grid;gap:12px"><div class="grid2"><div><label class="f" for="grade">Grade</label><select class="in" id="grade"><option>A</option><option>B</option><option>C</option><option value="REJECT">Reject</option></select></div><div><label class="f" for="moist">Moisture %</label><input class="in" id="moist" type="number" min="0" max="100" step="any"></div><div><label class="f" for="temp">Temperature °C</label><input class="in" id="temp" type="number" min="-40" max="80" step="any"></div></div><div><label class="f" for="notes">Notes</label><textarea class="in" id="notes" rows="2" maxlength="300"></textarea></div><div><button class="btn leaf">${ic("clip")}Save inspection</button></div></form></div>`;
    }
    const inner = $(".inner", d); inner.innerHTML = actions + resultHTML(r);
    wireDecisions(inner, () => { closeDrawer(); route(); });
    if ($("#tf", inner)) {
      api("/users/receivers").then(({ receivers }) => { if (!$("#to", inner)) return; $("#to", inner).innerHTML = receivers.length ? receivers.map((x) => `<option value="${esc(x._id)}">${esc(x.name)} (${esc(ROLE_LABEL[x.role])}${x.organization ? ", " + esc(x.organization) : ""})</option>`).join("") : '<option value="">No eligible receivers</option>'; }).catch(() => {});
      $("#tf", inner).onsubmit = async (e) => { e.preventDefault(); const price = $("#price", inner).value; try { const res = await api(`/batches/${id}/transfer`, { method: "POST", body: { receiverId: $("#to", inner).value, ...(price !== "" && { price }) } }); toast(res.message); closeDrawer(); route(); } catch (err) { toast(err.message, true); } };
    }
    if ($("#qf", inner)) $("#qf", inner).onsubmit = async (e) => { e.preventDefault(); try { await api(`/batches/${id}/quality`, { method: "POST", body: { grade: $("#grade", inner).value, moisturePct: $("#moist", inner).value, temperatureC: $("#temp", inner).value, notes: $("#notes", inner).value } }); toast("Inspection saved"); openBatch(id); } catch (err) { toast(err.message, true); } };
  } catch (e) { if (!e.stale) $(".inner", d).innerHTML = emptyBox("Couldn't open this batch", e.message); }
}

/* ---------- boot ---------- */
(function boot() {
  const m = location.pathname.match(/^\/verify\/([^/]+)/);   // QR / shared links: /verify/BATCH-ID
  if (m) history.replaceState(null, "", "/#/verify/" + m[1]);
  route();
})();
