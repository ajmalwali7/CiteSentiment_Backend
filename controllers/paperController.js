const Paper = require("../models/paperModel");
const User = require("../models/userModel");
const catchAsync = require("../utilities/catchAsync");
const multer = require("multer");
const AppError = require("../utilities/appError");
const process = require("process");
const axios = require("axios");
const FormData = require("form-data");
const stream = require("stream");
const ObjectId = require("mongodb").ObjectId;

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.includes("pdf")) {
    cb(null, true);
  } else {
    cb(new AppError("Not a PDF! Please upload only PDFs.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadPaper = upload.single("paper");
exports.savePaper = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  // creating the file buffer stream
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);
  // creating the form-data
  const paper = new FormData();
  paper.append("file", bufferStream, {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
  });
  // options for the chatpdf api
  const options = {
    headers: {
      "x-api-key": process.env.CHATPDF_API_KEY,
      ...paper.getHeaders(),
    },
  };
  // calling the chatpdf api
  const response = await axios.post(
    "https://api.chatpdf.com/v1/sources/add-file",
    paper,
    options
  );
  const config = {
    headers: {
      "x-api-key": process.env.CHATPDF_API_KEY,
      "Content-Type": "application/json",
    },
  };
  const question = {
    sourceId: response.data.sourceId,
    messages: [
      {
        role: "user",
        content: `Please write in the form of a JSON as follows: {"title":"PDF Title", "references":[{"reference full title" : {"sentiment" : "[positive, neutral, negative]", "sentence" : "sentiment sentence"}}, {"reference 2 full title" : {"sentiment" : "[positive, neutral, negative]", "sentence" : "sentiment sentence"}}, ... all the references from the "References" part of this paper]} in JSON format do not include backticks in your response`,
      },
    ],
  };
  const answer = await axios.post(
    "https://api.chatpdf.com/v1/chats/message",
    question,
    config
  );
  const JSONans = JSON.parse(answer.data.content);

  const doc = await Paper.create(JSONans);
  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $push: { papers: doc._id } },
    { new: true, useFindAndModify: false }
  );
  res.status(200).json({
    status: "success",
    doc,
    user,
  });
});

exports.getPaperById = catchAsync(async (req, res, next) => {
  const id = new ObjectId(req.params.id);
  const paper = await Paper.findOne({ _id: id });
  res.status(200).json({ status: "success", data: { paper } });
});
//   const doc = pdfjs(req.file.buffer).then((data) => {
//     console.log(data.numpages);
//     fsa.writeFileSync("paper.txt", data.text);
//     fsa.writeFileSync(
//       "references.txt",
//       data.text
//         .split("References")[1]
//         .split(/\n\n/)[0]
//         .split(/\n\d\./)
//         .join("!@#/\n/")
//     );
//   });
