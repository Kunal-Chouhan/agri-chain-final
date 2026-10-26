// Demo dataset: users for every role, ~28 batches across the whole lifecycle, a rejected transfer,
// a recalled batch, a deliberately tampered batch, and a fixed read-only demo API key.
//   npm run seed:demo          (safe to re-run: it replaces earlier demo data)
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Batch = require("../models/Batch");
const Event = require("../models/Event");
const ApiKey = require("../models/ApiKey");
const { recordEvent } = require("../services/eventService");
const { STAGE_AFTER_RECEIVE } = require("../services/policy");
const { sha256 } = require("../middleware/apiKeyMiddleware");

const DEMO_PASSWORD = "Demo@1234";
const DEMO_API_KEY = "agri_demo_7f3a9c2e51b84d60a1e9";
const DOMAIN = "@agrichain.local";

// small deterministic RNG so every run produces the same dataset
let seed = 20261026;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const HOUR = 3600e3;

const PEOPLE = {
  FARMER: [
    ["Ramesh Patil", "Patil Agro Farm", "Nashik", "Maharashtra"],
    ["Gurpreet Singh", "Singh Kheti", "Ludhiana", "Punjab"],
    ["Lakshmi Reddy", "Reddy Orchards", "Guntur", "Andhra Pradesh"],
    ["Sunita Devi", "Devi Organic Fields", "Karnal", "Haryana"],
    ["Mohan Lal Meena", "Meena Farms", "Kota", "Rajasthan"],
  ],
  TRANSPORTER: [["Kisan Roadways", "Kisan Roadways Pvt Ltd"], ["GreenLine Logistics", "GreenLine Cold Chain"]],
  WAREHOUSE: [["Central Warehousing Hub", "CWH Nagpur"], ["Cold Store Pune", "Himalaya Cold Storage"]],
  DISTRIBUTOR: [["Annapurna Distributors", "Annapurna Foods"], ["FreshLink Wholesale", "FreshLink India"]],
  RETAILER: [["Daily Fresh Mart", "Daily Fresh Retail"], ["Bharat Bazaar", "Bharat Bazaar Stores"], ["Green Basket", "Green Basket Organics"]],
  INSPECTOR: [["Dr. Anita Rao", "State Agri Quality Board"]],
};

const PRODUCE = [
  ["Wheat", "Grain", "quintal", 20, 120, 2400],
  ["Basmati Rice", "Grain", "quintal", 15, 90, 5200],
  ["Tomato", "Vegetable", "kg", 400, 2500, 28],
  ["Onion", "Vegetable", "quintal", 10, 60, 2100],
  ["Alphonso Mango", "Fruit", "kg", 200, 1500, 380],
  ["Pomegranate", "Fruit", "kg", 300, 1200, 140],
  ["Toor Dal", "Pulse", "quintal", 8, 40, 8400],
  ["Turmeric", "Spice", "quintal", 5, 25, 12500],
  ["Potato", "Vegetable", "ton", 2, 12, 18000],
  ["Chickpea", "Pulse", "quintal", 10, 50, 6200],
];
const VILLAGES = { Maharashtra: ["Niphad", "Sinnar", "Dindori"], Punjab: ["Jagraon", "Khanna", "Samrala"], "Andhra Pradesh": ["Tenali", "Repalle", "Mangalagiri"], Haryana: ["Assandh", "Gharaunda", "Nilokheri"], Rajasthan: ["Ladpura", "Itawa", "Sangod"] };
const COORDS = { Nashik: [20.0, 73.79], Ludhiana: [30.9, 75.85], Guntur: [16.31, 80.44], Karnal: [29.69, 76.99], Kota: [25.21, 75.86] };

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // ---- clean previous demo data
  const old = await User.find({ email: new RegExp(`${DOMAIN.replace(".", "\\.")}$`), role: { $ne: "ADMIN" } }).select("_id");
  const oldIds = old.map((u) => u._id);
  const oldBatches = await Batch.find({ farmer: { $in: oldIds } }).select("batchId");
  await Event.deleteMany({ batchId: { $in: oldBatches.map((b) => b.batchId) } });
  await Batch.deleteMany({ farmer: { $in: oldIds } });
  await User.deleteMany({ _id: { $in: oldIds } });
  await ApiKey.deleteMany({ isDemo: true });

  // ---- admin (kept if it exists)
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@agrichain.local").toLowerCase();
  if (!(await User.findOne({ email: adminEmail })))
    await User.create({ name: process.env.ADMIN_NAME || "Platform Admin", email: adminEmail, password: process.env.ADMIN_PASSWORD || "ChangeMe@123", role: "ADMIN" });

  // ---- users
  const users = {};
  for (const [role, list] of Object.entries(PEOPLE)) {
    users[role] = [];
    for (const [i, p] of list.entries()) {
      const u = await User.create({
        name: p[0], organization: p[1], phone: "+91 9" + String(800000000 + Math.floor(rnd() * 99999999)),
        email: `${role.toLowerCase()}${i + 1}${DOMAIN}`, password: DEMO_PASSWORD, role,
      });
      u.home = role === "FARMER" ? { district: p[2], state: p[3] } : null;
      users[role].push(u);
    }
  }
  const act = (u) => ({ id: String(u._id), role: u.role });
  const inspector = users.INSPECTOR[0];

  // ---- batches
  const NOW = Date.now();
  const FLOW = ["TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER"];
  // how far each batch travels: 0 = just created ... 4 = at retailer
  const PLAN = [4,4,4,4,4,4,4,3,3,3,3,2,2,2,2,1,1,1,0,0,0,0,"pending","pending","pending","reject","reject","hold"];
  let n = 0;
  const made = [];

  for (const plan of PLAN) {
    n++;
    const farmer = users.FARMER[n % users.FARMER.length];
    const [produceType, category, unit, qMin, qMax, rate] = PRODUCE[(n * 3 + Math.floor(rnd() * 3)) % PRODUCE.length];
    const quantity = Math.round(qMin + rnd() * (qMax - qMin));
    const state = farmer.home.state;
    const [lat0, lng0] = COORDS[farmer.home.district];
    const harvest = NOW - (45 - n) * 24 * HOUR - 2 * 24 * HOUR;
    let t = harvest + 18 * HOUR;
    const batch = await Batch.create({
      batchId: `BATCH-DEMO-${String(n).padStart(3, "0")}`, produceType, category, quantity, unit,
      harvestDate: new Date(harvest),
      origin: { village: pick(VILLAGES[state]), district: farmer.home.district, state, lat: +(lat0 + rnd() * 0.1).toFixed(4), lng: +(lng0 + rnd() * 0.1).toFixed(4) },
      farmer: farmer._id, currentCustodian: farmer._id, stage: "CREATED",
      createdAt: new Date(t), updatedAt: new Date(t),
    });
    await recordEvent({ batch, eventType: "BATCH_CREATED", actor: act(farmer), at: t, details: {
      produceType, category, quantity, unit, harvestDate: batch.harvestDate.toISOString(),
      origin: { village: batch.origin.village, district: batch.origin.district, state, lat: batch.origin.lat, lng: batch.origin.lng } } });

    const steps = typeof plan === "number" ? plan : plan === "pending" ? 1 : plan === "reject" ? 1 : 2;
    // the warehouse leg is optional: some batches go transporter -> distributor directly
    const route = n % 3 === 0 ? ["TRANSPORTER", "DISTRIBUTOR", "RETAILER"] : FLOW;
    let holder = farmer;
    let price = rate;
    for (let s = 0; s < steps + (plan === "pending" || plan === "reject" ? 1 : 0); s++) {
      const role = route[s];
      if (!role) break;
      const receiver = pick(users[role]);
      price = Math.round(price * (1.04 + rnd() * 0.08));
      t += (3 + Math.floor(rnd() * 20)) * HOUR;
      const lastStep = s === steps && (plan === "pending" || plan === "reject");

      await Batch.updateOne({ _id: batch._id }, { $set: { pendingTransfer: { to: receiver._id, initiatedAt: new Date(t) } } });
      await recordEvent({ batch, eventType: "TRANSFER_INITIATED", actor: act(holder), at: t, details: {
        fromId: String(holder._id), toId: String(receiver._id), toRole: receiver.role, quantity, unit, price, currency: "INR" } });

      if (lastStep && plan === "pending") break;
      t += (1 + Math.floor(rnd() * 8)) * HOUR;
      if (lastStep && plan === "reject") {
        await Batch.updateOne({ _id: batch._id }, { $unset: { pendingTransfer: "" } });
        await recordEvent({ batch, eventType: "TRANSFER_REJECTED", actor: act(receiver), at: t, details: {
          rejectedBy: String(receiver._id), custodianStays: String(holder._id), reason: "Moisture level above agreed limit on arrival" } });
        break;
      }
      await Batch.updateOne({ _id: batch._id }, { $set: { currentCustodian: receiver._id, stage: STAGE_AFTER_RECEIVE[role] }, $unset: { pendingTransfer: "" } });
      await recordEvent({ batch, eventType: "TRANSFER_CONFIRMED", actor: act(receiver), at: t, details: {
        fromId: String(holder._id), toId: String(receiver._id), stage: STAGE_AFTER_RECEIVE[role] } });
      holder = receiver;

      // inspector samples roughly every other batch at storage points
      if ((role === "WAREHOUSE" || role === "DISTRIBUTOR") && rnd() < 0.7) {
        t += 2 * HOUR;
        const grade = rnd() < 0.55 ? "A" : rnd() < 0.85 ? "B" : "C";
        await recordEvent({ batch, eventType: "QUALITY_CHECK", actor: act(inspector), at: t, details: {
          grade, passed: true, moisturePct: +(8 + rnd() * 6).toFixed(1), temperatureC: +(14 + rnd() * 10).toFixed(1),
          notes: grade === "A" ? "Uniform size, no visible defects" : "Minor surface blemishes within tolerance" } });
      }
    }
    made.push(batch.batchId);
  }

  // recalled batch
  await Batch.updateOne({ batchId: "BATCH-DEMO-028" }, { $set: { onHold: true, holdReason: "Pesticide residue above limit - recalled pending lab report" } });
  await recordEvent({ batch: await Batch.findOne({ batchId: "BATCH-DEMO-028" }), eventType: "QUALITY_CHECK", actor: act(inspector), at: NOW - 6 * HOUR, details: {
    grade: "REJECT", passed: false, moisturePct: 15.8, notes: "Residue test failed; batch quarantined" } });

  // tampered batch: someone edits the stored quantity directly in MongoDB -> verification must fail
  await Event.updateOne({ batchId: "BATCH-DEMO-005", eventType: "BATCH_CREATED" }, { $set: { "payload.quantity": 99999 } });

  // ---- demo API key
  await ApiKey.create({ name: "Public demo key", keyHash: sha256(DEMO_API_KEY), prefix: DEMO_API_KEY.slice(0, 10), isDemo: true });

  const [bc, ec] = [await Batch.countDocuments(), await Event.countDocuments()];
  console.log(`\nDemo data ready: ${Object.values(users).flat().length} users, ${bc} batches, ${ec} events`);
  console.log(`\nLogin (password for all demo users: ${DEMO_PASSWORD})`);
  console.log(`  admin        ${adminEmail} / ${process.env.ADMIN_PASSWORD || "ChangeMe@123"}`);
  Object.keys(PEOPLE).forEach((r) => console.log(`  ${r.toLowerCase().padEnd(12)} ${r.toLowerCase()}1${DOMAIN}`));
  console.log(`\nDemo API key:  ${DEMO_API_KEY}`);
  console.log(`  curl -H "x-api-key: ${DEMO_API_KEY}" http://localhost:${process.env.PORT || 5000}/api/v1/batches`);
  console.log(`Tampered batch to try in Verify: BATCH-DEMO-005   Recalled: BATCH-DEMO-028\n`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
