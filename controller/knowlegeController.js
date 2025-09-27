const Knowledge = require("../model/knowledgeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const axios = require("axios");
const factory = require("../controller/handlerFactory");

// import transformers for embeddings
const { pipeline } = require("@xenova/transformers");

// initialize embedding pipeline once
let embedder;
(async () => {
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
})();

// convert text to embedding
async function getEmbedding(text) {
  if (!embedder) throw new Error("Embedder not ready yet");
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

exports.createKnowledge = catchAsync(async (req, res, next) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return next(new AppError("Please provide both question and answer", 400));
  }

  const embedding = await getEmbedding(question);

  const knowledge = await Knowledge.create({
    question,
    answer,
    createdBy: req.user.id,
    embedding,
  });

  res.status(201).json({
    status: "success",
    data: knowledge,
  });
});

exports.updateKnowledge = catchAsync(async (req, res, next) => {
  const { question, answer } = req.body;

  const updateData = {};
  if (question) {
    updateData.question = question;
    updateData.embedding = await getEmbedding(question);
  }
  if (answer) updateData.answer = answer;

  const knowledge = await Knowledge.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!knowledge) return next(new AppError("Knowledge not found", 404));

  res.status(200).json({
    status: "success",
    data: knowledge,
  });
});

exports.deleteKnowledge = catchAsync(async (req, res, next) => {
  const knowledge = await Knowledge.findByIdAndDelete(req.params.id);
  if (!knowledge) return next(new AppError("Knowledge not found", 404));

  res.status(204).json({ status: "success", data: null });
});

exports.chat = catchAsync(async (req, res, next) => {
  const { question } = req.body;
  if (!question) return next(new AppError("Please provide a question", 400));

  const queryEmbedding = await getEmbedding(question);

  const allKnowledge = await Knowledge.find();
  let bestMatch = null;
  let bestScore = -Infinity;

  function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dot / (normA * normB);
  }

  for (const k of allKnowledge) {
    const score = cosineSimilarity(queryEmbedding, k.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = k;
    }
  }

  const THRESHOLD = 0.75;

  if (!bestMatch || bestScore < THRESHOLD) {
    return res.status(200).json({
      status: "success",
      answer: "Sorry, I don’t know the answer to that yet.",
      confidence: bestScore,
    });
  }

  //  Use Cohere Chat API to rephrase the answer
  try {
    const cohereRes = await axios.post(
      "https://api.cohere.ai/v1/chat",
      {
        model: "command-r7b-12-2024",
        message: `Question: ${question}\nAnswer: ${bestMatch.answer}\n\nRephrase the answer in a clear, natural, and human way.`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiAnswer = cohereRes.data.text || bestMatch.answer;

    return res.status(200).json({
      status: "success",
      answer: aiAnswer,
      matchedQuestion: bestMatch.question,
      confidence: bestScore,
    });
  } catch (err) {
    console.error("Cohere Error:", err.response?.data || err.message);

    // fallback to stored answer
    return res.status(200).json({
      status: "success",
      answer: bestMatch.answer,
      matchedQuestion: bestMatch.question,
      confidence: bestScore,
    });
  }
});

exports.getAllKnowledge = factory.getAll(Knowledge);
