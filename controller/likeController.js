const Like = require("../model/likeModel");
const factory = require("../controller/handlerFactory");

exports.getAllLikes = factory.getAll(Like);
exports.getOneLike = factory.getOne(Like);
exports.createLike = factory.createOne(Like);
exports.deleteLike = factory.deleteOne(Like);
