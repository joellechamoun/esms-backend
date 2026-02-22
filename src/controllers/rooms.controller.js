const Room = require("../models/Room");

async function createRoom(req, res) {
  try {
    const { name, capacity } = req.body;
    if (!name || !capacity) {
      return res.status(400).json({ message: "name and capacity are required" });
    }

    const room = await Room.create({
      name: name.trim(),
      capacity: Number(capacity),
    });

    return res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Room name already exists" });
    }
    return res.status(500).json({ message: err.message });
  }
}

async function getRooms(req, res) {
  const rooms = await Room.find();
  return res.json(rooms);
}

async function updateRoom(req, res) {
  try {
    const { name, capacity } = req.body;

    const update = {};
    if (name) update.name = name.trim();
    if (capacity !== undefined) update.capacity = Number(capacity);

    const room = await Room.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    return res.json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Room name already exists" });
    }
    return res.status(500).json({ message: err.message });
  }
}

async function deleteRoom(req, res) {
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  return res.json({ message: "Room deleted" });
}

module.exports = {
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
};
