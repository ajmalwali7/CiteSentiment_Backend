const catchAsync = require("../utilities/catchAsync");
const AppError = require("../utilities/appError");
const APIFeatures = require("../utilities/APIFeatures");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (
      req.user.role != "admin" &&
      (doc.teacher
        ? `${req.user._id}` != `${doc.teacher._id}`
        : `${req.user._id}` != `${doc.author._id}`)
    ) {
      return next(new AppError("You can not perform this action.", 403));
    }
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    await Model.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let doc = await Model.findById(req.params.id);
    if (
      req.user.role != "admin" &&
      (doc.teacher
        ? `${req.user._id}` != `${doc.teacher._id}`
        : `${req.user._id}` != `${doc.author._id}`)
    ) {
      return next(new AppError("You can not perform this action.", 403));
    }
    req.body.updated = Date.now();
    doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    // let filter = {};
    // if (req.params.tourId) filter = { course: req.params.tourId };

    const features = new APIFeatures(Model.find(req.query), req.query)
      .filter()
      .sort()
      .fields()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
