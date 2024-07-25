const User = require("../models/userModel");
const catchAsync = require("../utilities/catchAsync");
const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utilities/appError");
const factory = require("./handlerFactory");
const fs = require("fs").promises;
const fsa = require("fs");
const path = require("path");
const process = require("process");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("photo");
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.userID}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer, { failOn: "none" })
    .resize(500, 500)
    .toFormat("jpeg", { mozjpeg: true })
    .jpeg({ quality: 90 })
    .toFile(`./img/users/${req.file.filename}`);
  next();
});

exports.authorizeDriveToken = async (req, res, next) => {
  if (!req.file) next();
  else {
    try {
      const oauth2client = new OAuth2(
        process.env.client_id_drive,
        process.env.client_secret_drive,
        process.env.redirect_uris_drive
      );
      const token = await fs.readFile(
        path.join(__dirname, "/../tokens/driveToken.json"),
        "utf-8"
      );
      oauth2client.setCredentials(JSON.parse(token));
      const drive = google.drive({ version: "v3", auth: oauth2client });
      const filePath = `./img/users/${req.file.filename}`;
      try {
        const response = await drive.files.create({
          requestBody: {
            name: req.file.filename,
            mimeType: req.file.mimetype,
          },
          media: {
            mimeType: req.file.mimeType,
            body: fsa.createReadStream(filePath),
          },
        });
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
        req.body.photo = `https://drive.google.com/uc?id=${response.data.id}&export=view`;
      } catch (err) {
        console.log(err);
      }
      fs.rm(`./img/users/${req.file.filename}`);
      next();
    } catch (err) {
      console.log(err);
    }
  }
};

const filterObj = (obj, ...allowedOptions) => {
  const newObj = {};
  Object.keys(obj).forEach((e) => {
    if (allowedOptions.includes(e)) newObj[e] = obj[e];
  });
  return newObj;
};

exports.getUserwithUserID = async (req, res) => {
  try {
    const user = await User.findOne({ userID: req.params.userid }).select(
      "name userID photo email createdAt"
    );
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    return next(new AppError("No document found with that ID", 404));
  }
};

exports.getUserwithEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select(
      "email"
    );
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    return next(new AppError("No document found with that ID", 404));
  }
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) If chnging the password direct him to /updatePassword route
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        "Password Can't be Changed here. Please Go To /v1/users/forgotPassword to reset your password!",
        400
      )
    );
  }
  // 2) Filter out all the fields that we do not allow the user to update
  const filteredObj = filterObj(req.body, "name", "photo");
  // 3) Update User Data
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredObj, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: "success", data: null });
});

exports.getUser = factory.getOne(User);
exports.getUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
