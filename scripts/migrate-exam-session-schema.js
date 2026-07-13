// One-off migration for the ExamSession schema redesign
// (season/examType -> sessionOrder/semesterScope/examType).
//
// What it does, in order:
//   1. Reports current state (document counts, existing indexes).
//   2. Drops the old unique index on { season, academicYear, examType } if
//      present. Mongo doesn't drop obsolete indexes automatically when a
//      schema changes, and since every new document has season=undefined,
//      the stale index treats them as colliding and every insert 409s.
//   3. Deletes all existing ExamSession and TimeSlot documents. They don't
//      have the new required fields (sessionOrder, semesterScope), so they
//      can't be migrated in place - only safe to run this if that data is
//      disposable (confirmed test data, not real bookings).
//   4. Syncs indexes so the new unique index on
//      { sessionOrder, semesterScope, examType, academicYear } exists.
//
// Usage: run with MONGO_URI pointing at whichever database you want to
// migrate (edit .env, or prefix the command with MONGO_URI=...).
//   node scripts/migrate-exam-session-schema.js

require("dotenv").config();
const mongoose = require("mongoose");
const ExamSession = require("../src/models/ExamSession");
const TimeSlot = require("../src/models/TimeSlot");

const OLD_INDEX_NAME = "season_1_academicYear_1_examType_1";

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing - point it at the database you want to migrate");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const sessionCountBefore = await ExamSession.countDocuments();
  const slotCountBefore = await TimeSlot.countDocuments();
  const existingIndexes = await mongoose.connection
    .collection("examsessions")
    .indexes();

  console.log(`ExamSession documents: ${sessionCountBefore}`);
  console.log(`TimeSlot documents: ${slotCountBefore}`);
  console.log(`Existing indexes: ${existingIndexes.map((i) => i.name).join(", ")}`);

  const hasOldIndex = existingIndexes.some((i) => i.name === OLD_INDEX_NAME);

  if (hasOldIndex) {
    await mongoose.connection.collection("examsessions").dropIndex(OLD_INDEX_NAME);
    console.log(`Dropped old index: ${OLD_INDEX_NAME}`);
  } else {
    console.log("Old index not present, nothing to drop");
  }

  const slotResult = await TimeSlot.deleteMany({});
  const sessionResult = await ExamSession.deleteMany({});
  console.log(`Deleted ${slotResult.deletedCount} time slot(s)`);
  console.log(`Deleted ${sessionResult.deletedCount} exam session(s)`);

  await ExamSession.syncIndexes();
  const finalIndexes = await mongoose.connection.collection("examsessions").indexes();
  console.log(`Final indexes: ${finalIndexes.map((i) => i.name).join(", ")}`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
