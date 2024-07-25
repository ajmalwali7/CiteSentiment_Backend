const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A paper must have a Title!"],
    },
    references: {
      type: Object,
      required: [true, "Please provide a references!"],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Paper = mongoose.model("Paper", paperSchema);

module.exports = Paper;
