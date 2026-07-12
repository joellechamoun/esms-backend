const Course = require("../models/Course");
const Major = require("../models/Major");
const Registration = require("../models/Registration");
const Exam = require("../models/Exam");
const TimeSlot = require("../models/TimeSlot");

const semestersByYear = {
  1: ["S1", "S2"],
  2: ["S3", "S4"],
  3: ["S5", "S6"],
  4: ["S7", "S8"],
  5: ["S9", "S10"],
};

function validateYearAndSemester(year, semester) {
  const numericYear = Number(year);

  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 5) {
    return {
      valid: false,
      message: "Year must be between 1 and 5",
    };
  }

  if (!semestersByYear[numericYear].includes(semester)) {
    return {
      valid: false,
      message: `Invalid semester for Year ${numericYear}`,
    };
  }

  return {
    valid: true,
    numericYear,
  };
}

async function validateCourseYearChange(courseId, newYear) {
  const courseExams = await Exam.find({ course: courseId }).populate(
    "timeSlot",
    "date"
  );

  for (const courseExam of courseExams) {
    if (!courseExam.timeSlot?.date) continue;

    const sameDayTimeSlots = await TimeSlot.find({
      date: courseExam.timeSlot.date,
    });

    const sameDayTimeSlotIds = sameDayTimeSlots.map((slot) => slot._id);

    const sameDayOtherExams = await Exam.find({
      _id: { $ne: courseExam._id },
      timeSlot: { $in: sameDayTimeSlotIds },
    }).populate("course", "year code name");

    for (const otherExam of sameDayOtherExams) {
      if (!otherExam.course) continue;

      if (otherExam.course.year !== newYear) {
        return {
          valid: false,
          message:
            "Cannot update course year because this course already has an exam on a day with another academic year",
        };
      }
    }
  }

  return { valid: true };
}

// CREATE
async function createCourse(req, res) {
  try {
    const { code, name, year, semester, faculty, major } = req.body;

    if (!code || !name || year === undefined || !semester || !major) {
      return res.status(400).json({
        message: "code, name, year, semester, and major are required",
      });
    }

    const validation = validateYearAndSemester(year, semester);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const majorExists = await Major.findById(major);

    if (!majorExists) {
      return res.status(404).json({ message: "Major not found" });
    }

    const course = await Course.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      year: validation.numericYear,
      semester,
      faculty: faculty || null,
      major,
    });

    const populatedCourse = await Course.findById(course._id)
      .populate("faculty", "name email role")
      .populate("major", "code name description")
      .lean();

    return res.status(201).json({
      ...populatedCourse,
      registeredCount: 0,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Course code already exists",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

// READ ALL
async function getCourses(req, res) {
  try {
    const { year, semester, major } = req.query;

    const filter = {};

    if (year !== undefined) filter.year = Number(year);
    if (semester) filter.semester = semester;
    if (major) filter.major = major;

    const courses = await Course.find(filter)
      .populate("faculty", "name email role")
      .populate("major", "code name description")
      .lean();

    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const registeredCount = await Registration.countDocuments({
          course: course._id,
        });

        return {
          ...course,
          registeredCount,
        };
      })
    );

    return res.json(coursesWithCounts);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// READ ONE
async function getCourseById(req, res) {
  try {
    const course = await Course.findById(req.params.id)
      .populate("faculty", "name email role")
      .populate("major", "code name description")
      .lean();

    if (!course) return res.status(404).json({ message: "Course not found" });

    const registeredCount = await Registration.countDocuments({
      course: course._id,
    });

    return res.json({
      ...course,
      registeredCount,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// UPDATE
async function updateCourse(req, res) {
  try {
    const { code, name, year, semester, faculty, major } = req.body;

    const update = {};

    const existingCourse = await Course.findById(req.params.id);

    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    const finalYear = year !== undefined ? Number(year) : existingCourse.year;
    const finalSemester =
      semester !== undefined ? semester : existingCourse.semester;

    const validation = validateYearAndSemester(finalYear, finalSemester);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (finalYear !== existingCourse.year) {
      const yearChangeValidation = await validateCourseYearChange(
        existingCourse._id,
        validation.numericYear
      );

      if (!yearChangeValidation.valid) {
        return res.status(409).json({
          message: yearChangeValidation.message,
        });
      }
    }

    if (code) update.code = code.trim().toUpperCase();
    if (name) update.name = name.trim();
    if (year !== undefined) update.year = validation.numericYear;
    if (semester) update.semester = semester;
    if (faculty !== undefined) update.faculty = faculty || null;

    if (major !== undefined) {
      if (!major) {
        return res.status(400).json({ message: "Major is required" });
      }

      const majorExists = await Major.findById(major);

      if (!majorExists) {
        return res.status(404).json({ message: "Major not found" });
      }

      update.major = major;
    }

    const course = await Course.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate("faculty", "name email role")
      .populate("major", "code name description")
      .lean();

    const registeredCount = await Registration.countDocuments({
      course: course._id,
    });

    return res.json({
      ...course,
      registeredCount,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Course code already exists",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

// DELETE
async function deleteCourse(req, res) {
  try {
    const linkedExam = await Exam.findOne({ course: req.params.id });

    if (linkedExam) {
      return res.status(400).json({
        message: "Cannot delete this course because it has scheduled exams",
      });
    }

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