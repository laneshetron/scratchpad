import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import {
  $getSelection,
  $getNodeByKey,
  ParagraphNode,
  $createTextNode,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import {
  $createParagraphNode,
  createCommand,
  ElementNode,
  LexicalCommand,
  LexicalNode,
  COMMAND_PRIORITY_NORMAL,
} from 'lexical';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { replaceWithLLM } from '../utils/latex';
import { $createEquationNode } from '../nodes/EquationNode';

export const CONVERT_TO_LATEX: LexicalCommand<void> = createCommand();

export const recursivelyConvertToLaTeX = (root: ElementNode, nodes: LexicalNode[]) => {
  for (const node of nodes) {
    if ($isElementNode(node)) {
      recursivelyConvertToLaTeX(node, node.getChildren());
      root.append(node);
    } else {
      if ($isTextNode(node)) {
        const parts = node.getTextContent().split(/(\$\$?[^\$\n]+?\$\$?)/);
        root.clear(); // clear the parent so we can re-append everything
        for (const part of parts) {
          const matches = part.match(/\$([^\$\n]+?)\$/);
          if (matches && matches.length > 1) {
            try {
              const equationNode = $createEquationNode(matches[1], true);
              root.append(equationNode);
            } catch (error) {
              console.error('LaTeX parsing error:', error);
            }
          } else {
            const textNode = $createTextNode(part);
            root.append(textNode);
          }
        }
      } else {
        root.append(node);
      }
    }
  }
};

export function LaTeXPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeLatexListener = editor.registerCommand(
      CONVERT_TO_LATEX,
      () => {
        editor.update(async () => {
          const selection = $getSelection();
          if (!selection) return false;

          const nodes = selection.extract();
          const html = $generateHtmlFromNodes(editor, selection);

          // Remove the selected nodes
          nodes.forEach((node) => node.remove());

          // Convert the text to LaTeX using LLM
          console.log(html);
          const completion = await replaceWithLLM(html);
          let accumulatedText = '';

          let paragraphKey: string;
          editor.update(
            () => {
              const paragraphNode = $createParagraphNode();
              paragraphKey = paragraphNode.getKey();
              selection.insertNodes([paragraphNode]);
            },
            { tag: 'history-merge' }
          );

          for await (const chunk of completion) {
            accumulatedText += chunk.text();
            console.log(accumulatedText);

            editor.update(
              () => {
                const paragraphNode = $getNodeByKey(paragraphKey) as ParagraphNode;
                if (!paragraphNode) return;

                // Clear existing paragraph content
                paragraphNode.clear();

                const parser = new DOMParser();
                const dom = parser.parseFromString(accumulatedText, 'text/html');
                const nodes = $generateNodesFromDOM(editor, dom);

                recursivelyConvertToLaTeX(paragraphNode, nodes);
              },
              { tag: 'history-merge' }
            );
          }
        });
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );

    return () => {
      removeLatexListener();
    };
  }, [editor]);

  return null;
}
