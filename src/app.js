const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(
  helmet({
    // This API is deliberately called cross-origin by a separate frontend
    // deployment, so the default same-origin resource policy would block it.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = [
  "https://examflow-35jn.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser requests (curl, server-to-server, mobile apps) send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const err = new Error("Not allowed by CORS");
      err.status = 403;
      return callback(err);
    },
  })
);
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

const departmentsRoutes = require("./routes/departments.routes");
app.use("/api/departments", departmentsRoutes);

const usersRoutes = require("./routes/users.routes");
app.use("/api/users", usersRoutes);

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

const examSchedulesRoutes = require("./routes/examSchedules.routes");
app.use("/api/exam-schedules", examSchedulesRoutes);

const dashboardRoutes = require("./routes/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);

// 404 handler (no route matched)
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Global error handler (safety net for errors not caught in controllers)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: "Internal server error" });
});

module.exports = app;
