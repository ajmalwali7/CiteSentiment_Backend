const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is Required"],
  },
  userID: {
    type: String,
    unique: true,
  },
  photo: String,
  email: {
    type: String,
    required: [true, "Please Provide an Email!!!"],
    unique: true,
    validate: [validator.isEmail, "Please Provide a Valid Email!!!"],
  },
  password: {
    type: String,
    required: [true, "Please Provide a Password!!!"],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, "Please Confirm your Password!!!"],
    validate: {
      validator: function (el) {
        return this.password === el;
      },
      message: "Password and Confirm Password are not same!!!",
    },
  },
  papers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  verificationToken: String,
  resetTokenExpires: Date,
  verifTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, async function (next) {
  this.find({ active: { $ne: false } });
  this.populate({
    path: "papers",
  });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.passwordChangedAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1500,
      10
    );
    return changedTimeStamp > JWTTimeStamp; // 200>100
  }
  // return false means no change
  return false;
};

userSchema.methods.createToken = function (el) {
  const resetToken = crypto.randomBytes(32).toString("hex");
  if (el === "password") {
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetTokenExpires = Date.now() + 10 * 60 * 1000;
  } else if (el === "verification") {
    this.verificationToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.verifTokenExpires = Date.now() + 10 * 60 * 1000;
  }
  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
