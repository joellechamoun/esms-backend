const ExamSession = require("../models/ExamSession");

async function createExamSession(req, res) {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        message: "name, startDate and endDate are required"
      });
    }

    const session = await ExamSession.create({
      name: name.trim(),
      startDate,
      endDate
    });

    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getExamSessions(req, res) {
  const sessions = await ExamSession.find();
  return res.json(sessions);
}

async function updateExamSession(req, res) {
  try {
    const { name, startDate, endDate, status } = req.body;

    const update = {};
    if (name) update.name = name.trim();
    if (startDate) update.startDate = startDate;
    if (endDate) update.endDate = endDate;
    if (status) update.status = status;

    const session = await ExamSession.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!session)
      return res.status(404).json({ message: "Exam session not found" });

    return res.json(session);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function deleteExamSession(req, res) {
  const session = await ExamSession.findByIdAndDelete(req.params.id);
  if (!session)
    return res.status(404).json({ message: "Exam session not found" });

  return res.json({ message: "Exam session deleted" });
}

module.exports = {
  createExamSession,
  getExamSessions,
  updateExamSession,
  deleteExamSession
};
