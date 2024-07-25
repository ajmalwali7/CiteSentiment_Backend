const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utilities/appError");
const User = require("./../models/userModel");
const catchAsync = require("./../utilities/catchAsync");
const sendEmail = require("../utilities/email");

const jwtToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const loginToken = (user, statusCode, res) => {
  const token = jwtToken(user._id);
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  let { email } = req.body;
  if (await User.findOne({ email })) {
    return next(new AppError("Email Already Signed Up!", 400));
  }
  const newUser = await User.create({
    name: req.body.name
      .split(" ")
      .map((n) => n[0].toUpperCase() + n.substring(1))
      .join(" "),
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userID:
      req.body.name.toLowerCase().split(" ")[0] +
      `${(await User.countDocuments({})) + 100}`,
  });
  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) Check if email and password exist
  if (!email && !password)
    return next(new AppError("Please Provide EMAIL and PASSWORD!", 400));
  // 2) Check if user exist && password is correct
  const checkingVar = { email };
  const user = await User.findOne(checkingVar).select("+password");
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError("Email or Password Incorrect!", 401));
  // 3) if everything is correct, send token to client
  loginToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Check if there is Token Available
  var token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token || token === "null") {
    return next(new AppError("Please Log in to Get Access", 401));
  }
  // 2) Verification Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if User still Exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) next(new AppError("The User No Longer Exists!", 401));
  // 4) Check if user Changed Password after Logging In
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError("User recently Changed Password! Please Log In Again!", 401)
    );
  }
  // Grant Access to protected Route===>
  req.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on POSTed Email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("Email User Not Found!", 404));
  }
  // 2) Generate a Random Reset Token
  const resetToken = user.createToken("password");
  await user.save({ validateBeforeSave: false });
  // 3) Send it to User's Email
  const message = `Paste the Token below to reset your Password: ${resetToken}\nIf you did not request to change your Password, please ignore this email.`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Link (Valid For Only 10 Minutes)",
      message,
    });
    res.status(200).json({
      status: "success",
      message: "Token sent to Email!",
    });
  } catch {
    user.passwordResetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the Email! Try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get the User by Token Passed
  const pToken = crypto
    .createHash("sha256")
    .update(req.params.rT)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: pToken,
    resetTokenExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("InValid Link! Please Enter Valid Link!!!", 400));
  }
  // 2) Set the new Password, only if Token is valid and User Exists!
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  // 3) Set the passwordChangedAt property done in a pre middleware in the userModel file.
  // 4) Log in the User and send the JWT token
  loginToken(user, 200, res);
});
