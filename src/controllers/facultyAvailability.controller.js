const FacultyAvailability = require("../models/FacultyAvailability");

// Faculty creates availability for themselves
async function createAvailability(req, res) {
  try {
    const facultyId = req.user.userId;
    const { dayOfWeek, startTime, endTime } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "dayOfWeek, startTime, endTime are required" });
    }

    const item = await FacultyAvailability.create({
      faculty: facultyId,
      dayOfWeek,
      startTime,
      endTime,
    });

    return res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Availability already exists" });
    }
    return res.status(500).json({ message: err.message });
  }
}

// Faculty gets their own availability
async function getMyAvailability(req, res) {
  const facultyId = req.user.userId;
  const items = await FacultyAvailability.find({ faculty: facultyId }).sort({
    dayOfWeek: 1,
    startTime: 1,
  });
  return res.json(items);
}

// Admin can view availability of any faculty (optional but useful)
async function getAvailabilityByFaculty(req, res) {
  const { facultyId } = req.params;
  const items = await FacultyAvailability.find({ faculty: facultyId }).sort({
    dayOfWeek: 1,
    startTime: 1,
  });
  return res.json(items);
}

module.exports = {
  createAvailability,
  getMyAvailability,
  getAvailabilityByFaculty,
};
