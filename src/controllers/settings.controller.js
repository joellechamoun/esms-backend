const Setting = require("../models/Setting");

// GET current term (public for admin usage, but we'll still protect with auth in routes)
async function getCurrentTerm(req, res) {
  const item = await Setting.findOne({ key: "currentTerm" });
  return res.json({ term: item ? item.value : null });
}

// SET current term (admin)
async function setCurrentTerm(req, res) {
  const { term } = req.body;
  if (!term) return res.status(400).json({ message: "term is required" });

  const item = await Setting.findOneAndUpdate(
    { key: "currentTerm" },
    { value: term.trim() },
    { upsert: true, new: true }
  );

  return res.json({ term: item.value });
}

module.exports = { getCurrentTerm, setCurrentTerm };
