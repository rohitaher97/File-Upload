const mongoose = require("mongoose");

const File = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("File", File);
