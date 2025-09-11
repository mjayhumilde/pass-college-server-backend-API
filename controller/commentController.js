const Comment = require("../model/commentModel");
const factory = require("../controller/handlerFactory");

exports.getAllComments = factory.getAll(Comment);
exports.getOneComment = factory.getOne(Comment);
exports.createComment = factory.createOne(Comment);
exports.updateComment = factory.updateOne(Comment);
exports.deleteComment = factory.deleteOne(Comment);
