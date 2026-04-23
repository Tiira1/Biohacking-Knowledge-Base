// 1. 导入 OpenAI 官方库
import OpenAI from "openai";
import { DocumentMetadata } from "../types";

// 2. 初始化 DeepSeek 客户端
// baseURL: 告诉程序去 DeepSeek 的服务器地址
// apiKey: 从环境变量中读取在 Vercel 的“钥匙”
const ai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT = `
You are the Biohacking Lab Research Assistant for middle/high school students.
Your core mission is to provide accurate, grounded information about biological science based ONLY on a repository of uploaded PDFs.

CRITICAL RULES:
1. NO HALLUCINATION: You MUST ONLY use the provided text segments to answer. 
2. If the answer is not contained within the provided documents, you MUST say: "I'm sorry, but the provided literature does not mention this information."
3. STRICT SOURCING: Every sentence or fact must be cited. Use the format: [Document Name, Page X].
4. FORMAT: Use a clear, encouraging tone for students. Use Markdown for formatting (bold, lists).

PROVIDED KNOWLEDGE BASE:
{{DOCS}}

STUDENT QUESTION:
{{QUESTION}}

RESPONSE (IN ENGLISH, WITH CITATIONS):
`;

export async function askQuestion(question: string, docs: DocumentMetadata[]) {
  // 文档处理逻辑：将所有 PDF 文本拼接在一起
  const docsText = docs.map(d => `--- DOCUMENT: ${d.name} ---\n${d.text}`).join('\n\n');
  
  // Prompt 逻辑
  const prompt = SYSTEM_PROMPT.replace('{{DOCS}}', docsText).replace('{{QUESTION}}', question);

  try {
    // 3.  DeepSeek 的对话方式
    const response = await ai.chat.completions.create({
      model: "deepseek-chat", // 使用 DeepSeek 的通用对话模型
      messages: [
        { role: 'user', content: prompt } // 将拼接好的 Prompt 发送过去
      ],
      temperature: 0.1, // 依然保持 0.1 的低随机性，确保回答严谨不胡说
    });

    // 4. 返回 DeepSeek 生成的文本内容
    // choices[0] 表示取模型给出的第一个（通常也是唯一的）回答
    return response.choices[0].message.content;

  } catch (error) {
    // 报错
    console.error("DeepSeek Error:", error);
    throw new Error("Failed to generate response from biological knowledge base.");
  }
}
