const Course = require("../models/Course");

// CREATE
async function createCourse(req, res) {
  try {
    const { code, name, year, semester, term, faculty } = req.body;

    if (!code || !name || year === undefined || !semester || !term) {
      return res
        .status(400)
        .json({ message: "code, name, year, semester, term are required" });
    }

    const course = await Course.create({
      code: code.trim(),
      name: name.trim(),
      year: Number(year),
      semester, // "S1"..."S6"
      term: term.trim(), // e.g. "Spring 2026"
      faculty: faculty || null,
    });

    return res.status(201).json(course);
  } catch (err) {
    // Duplicate (code + term) unique index
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Course code already exists for this term" });
    }
    return res.status(500).json({ message: err.message });
  }
}

// READ ALL (supports optional filtering by term/year/semester)
async function getCourses(req, res) {
  try {
    const { term, year, semester } = req.query;

    const filter = {};
    if (term) filter.term = term; // later we’ll support term=current via Settings
    if (year !== undefined) filter.year = Number(year);
    if (semester) filter.semester = semester;

    const courses = await Course.find(filter).populate("faculty", "name email role");
    return res.json(courses);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// READ ONE
async function getCourseById(req, res) {
  try {
    const course = await Course.findById(req.params.id).populate(
      "faculty",
      "name email role"
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    return res.json(course);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// UPDATE
async function updateCourse(req, res) {
  try {
    const { code, name, year, semester, term, faculty } = req.body;

    const update = {};
    if (code) update.code = code.trim();
    if (name) update.name = name.trim();
    if (year !== undefined) update.year = Number(year);
    if (semester) update.semester = semester;
    if (term) update.term = term.trim();
    if (faculty !== undefined) update.faculty = faculty || null;

    const course = await Course.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("faculty", "name email role");

    if (!course) return res.status(404).json({ message: "Course not found" });

    return res.json(course);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Course code already exists for this term" });
    }
    return res.status(500).json({ message: err.message });
  }
}

// DELETE
async function deleteCourse(req, res) {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    return res.json({ message: "Course deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
