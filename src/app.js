const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "esms-backend" });
});

const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

const coursesRoutes = require("./routes/courses.routes");
app.use("/api/courses", coursesRoutes);

const majorsRoutes = require("./routes/majors.routes");
app.use("/api/majors", majorsRoutes);

const roomsRoutes = require("./routes/rooms.routes");
app.use("/api/rooms", roomsRoutes);

const examSessionsRoutes = require("./routes/examSessions.routes");
app.use("/api/exam-sessions", examSessionsRoutes);

const timeSlotsRoutes = require("./routes/timeSlots.routes");
app.use("/api", timeSlotsRoutes);

const registrationsRoutes = require("./routes/registrations.routes");
app.use("/api/registrations", registrationsRoutes);

const facultyAvailabilityRoutes = require("./routes/facultyAvailability.routes");
app.use("/api/faculty-availability", facultyAvailabilityRoutes);

const settingsRoutes = require("./routes/settings.routes");
app.use("/api/settings", settingsRoutes);

const examsRoutes = require("./routes/exams.routes");
app.use("/api/exams", examsRoutes);

module.exports = app;
