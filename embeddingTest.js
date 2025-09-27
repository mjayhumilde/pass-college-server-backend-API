const { pipeline } = require("@xenova/transformers");

async function main() {
  console.log("Loading model... this may take a while the first time ⏳");

  // Load embedding pipeline
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // Example text
  const sentence = "What is the tuition fee for BSCS?";
  const output = await embedder(sentence, { pooling: "mean", normalize: true });

  console.log("Embedding vector length:", output.data.length);
  console.log("First 10 values:", output.data.slice(0, 10));
}

main();
