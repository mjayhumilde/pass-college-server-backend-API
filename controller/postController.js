const Post = require("../model/postModel");
const factory = require("../controller/handlerFactory");

exports.getAllPost = factory.getAll(Post);
exports.createPost = factory.createOne(Post);
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
exports.getPost = factory.getOne(Post);
