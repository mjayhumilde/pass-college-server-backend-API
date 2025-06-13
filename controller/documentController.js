const Document = require("../model/documentModel");
const factory = require("../controller/handlerFactory");

exports.getAllDocuments = factory.getAll(Document);
exports.getOneDocument = factory.getOne(Document);
exports.createDocument = factory.createOne(Document);
exports.updateDocument = factory.updateOne(Document);
exports.deleteDocument = factory.deleteOne(Document);
