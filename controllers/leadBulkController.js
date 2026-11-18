const Lead = require("../models/Lead");

const STATUSES = ["New", "Contacted", "Interested", "Negotiation", "Won", "Lost"];

// POST /api/leads/bulk   body: { leads: [ { name, phone, email, ... } ] }
// Saves EVERY row (duplicates and missing values included) in one database call.
exports.bulkCreateLeads = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.leads) ? req.body.leads : [];
    if (!rows.length) return res.status(400).json({ message: "No leads to import" });
    if (rows.length > 5000) return res.status(400).json({ message: "Import up to 5000 leads at a time" });

    const userId = req.user._id || req.user.id;

    const docs = rows.map((r) => ({
      name: String(r.name || "").trim() || "Unnamed Lead",
      phone: String(r.phone || "").trim() || "N/A",
      email: String(r.email || "").trim().toLowerCase(),
      address: String(r.address || "").trim(),
      message: String(r.message || "").trim(),
      category: String(r.category || "").trim(),
      website: String(r.website || "").trim(),
      followUpMessage: String(r.followUpMessage || "").trim(),
      followUp1: r.followUp1 || null,
      followUp2: r.followUp2 || null,
      nextFollowUp: r.nextFollowUp || new Date(),
      status: STATUSES.includes(r.status) ? r.status : "New",
      user: userId,
    }));

    // ordered:false -> one rejected row never blocks the others
    const inserted = await Lead.insertMany(docs, { ordered: false });

    res.status(201).json({ inserted: inserted.length, skipped: rows.length - inserted.length });
  } catch (err) {
    const count = err.result?.insertedCount ?? err.insertedDocs?.length;
    if (count !== undefined) {
      return res.status(201).json({ inserted: count, skipped: (req.body.leads || []).length - count });
    }
    console.error("bulkCreateLeads error:", err);
    res.status(500).json({ message: err.message || "Could not import leads" });
  }
};