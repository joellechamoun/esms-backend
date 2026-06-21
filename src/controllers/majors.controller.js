const Major = require("../models/Major");
const Course = require("../models/Course");

async function createMajor(req, res) {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: "code and name are required" });
    }

    const major = await Major.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || "",
    });

    return res.status(201).json(major);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Major code or name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function getMajors(req, res) {
  try {
    const majors = await Major.find().sort({ name: 1 });
    return res.json(majors);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getMajorById(req, res) {
  try {
    const major = await Major.findById(req.params.id);

    if (!major) {
      return res.status(404).json({ message: "Major not found" });
    }

    return res.json(major);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateMajor(req, res) {
  try {
    const { code, name, description } = req.body;

    const update = {};

    if (code) update.code = code.trim().toUpperCase();
    if (name) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();

    const major = await Major.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!major) {
      return res.status(404).json({ message: "Major not found" });
    }

    return res.json(major);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Major code or name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function deleteMajor(req, res) {
  try {
    const usedByCourse = await Course.findOne({ major: req.params.id });

    if (usedByCourse) {
      return res.status(400).json({
        message: "Cannot delete this major because it is assigned to courses",
      });
    }

    const major = await Major.findByIdAndDelete(req.params.id);

    if (!major) {
      return res.status(404).json({ message: "Major not found" });
    }

    return res.json({ message: "Major deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createMajor,
  getMajors,
  getMajorById,
  updateMajor,
  deleteMajor,
};