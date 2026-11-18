const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    address: { type: String },
    email: { type: String },
    phone: { type: String, required: true },
    message: { type: String },
    followUp1: { type: Date },
    followUp2: { type: Date },
    
   category: {
  type: String,
  trim: true,
  default: "",
},

website: {
  type: String,
  trim: true,
  default: "",
},

followUpMessage: {
  type: String,
  trim: true,
  default: "",
},
    nextFollowUp: { type: Date, required: true },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested", "Negotiation", "Won", "Lost"],
      default: "New",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lead", leadSchema);
