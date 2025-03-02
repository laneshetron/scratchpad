import katex from 'katex';
import { EnhancedGenerateContentResponse } from '@google/generative-ai';
import { generateResponseStream } from './llm';

export const htmlToLatex = (html: string): string => {
  // Remove common HTML tags
  let latex = html.replace(/<[^>]+>/g, '');

  // Convert special characters
  latex = latex
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return latex;
};

export const latexToHtml = (text: string): string => {
  const renderedText = text.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
    try {
      const rendered = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: true,
        strict: false,
      });
      return `<div class="latex-block">${rendered}</div>`;
    } catch (error) {
      console.error('LaTeX parsing error:', error);
      return match; // Return original text if parsing fails
    }
  });
  return renderedText;
};

export const replaceWithLLM = async (
  selection: string
): Promise<AsyncGenerator<EnhancedGenerateContentResponse, any, unknown>> => {
  return generateResponseStream('latex', selection);
};
