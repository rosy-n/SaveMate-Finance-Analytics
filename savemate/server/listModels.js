require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

(async () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const { models } = await genAI.listModels();
  for (const m of models) {
    console.log(`${m.name}  |  methods: ${m.supportedGenerationMethods?.join(',')}`);
  }
})();
