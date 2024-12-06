const mongoose = require("mongoose");

let courseschema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, required: true },
  videoS3Identifyer: { type: String, required: true },
  comments: { type: Object },
});

module.exports = mongoose.model("courseSchema", courseschema);
