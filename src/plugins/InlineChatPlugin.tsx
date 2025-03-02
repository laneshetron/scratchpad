import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $getSelection,
  $createParagraphNode,
  $createTextNode,
  BaseSelection,
  ParagraphNode,
  $isRangeSelection,
  $isElementNode,
  TextNode,
} from 'lexical';
import { useCallback, useState, useEffect } from 'react';
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND } from 'lexical';
import { LexicalCommand, createCommand } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import { $findMatchingParent } from '@lexical/utils';
import { generateResponseStream } from '../utils/llm';
import { $createAnnotationNode } from '../nodes/AnnotationNode';
import { $createSuggestionNode } from '../nodes/SuggestionNode';
import { recursivelyConvertToLaTeX } from './LaTeXPlugin';

export const OPEN_INLINE_CHAT: LexicalCommand<void> = createCommand();

export const InlineChatPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [prompt, setPrompt] = useState('');
  const [storedSelection, setStoredSelection] = useState<BaseSelection | null>(null);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_INLINE_CHAT,
      () => {
        const selection = $getSelection();
        if (selection) {
          setStoredSelection(selection);
          const anchorNode = $isRangeSelection(selection)
            ? selection.anchor.getNode()
            : selection.getNodes()[0];
          const anchorElement = editor.getRootElement();
          const domElement = anchorNode ? editor.getElementByKey(anchorNode.getKey()) : null;
          const rect =
            domElement?.getBoundingClientRect() || anchorElement?.getBoundingClientRect();

          if (rect) {
            setPosition({
              top: rect.top + window.scrollY - 30,
              left: rect.left + window.scrollX + 20,
            });
          }
        }
        setVisible(true);
        // Focus on the textarea after it becomes visible
        setTimeout(() => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.focus();
          }
        }, 0);
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor]);

  const handleSubmit = async () => {
    let paragraphKey: string;
    let html = '';
    editor.update(() => {
      const selection = storedSelection || $getSelection();
      if (selection) {
        const annotationNode = $createAnnotationNode();
        selection?.insertNodes([annotationNode]);
        paragraphKey = annotationNode.getKey();
        const markerNode = $createSuggestionNode();
        annotationNode.append(markerNode);

        html = $generateHtmlFromNodes(editor);
      }
    });

    const completion = await generateResponseStream('inline', html + '\n\n' + prompt);
    setVisible(false);
    setPrompt('');

    let accumulatedText = '';
    for await (const chunk of completion) {
      console.log(chunk.text());
      accumulatedText += chunk.text();
      editor.update(
        () => {
          const paragraph = $getNodeByKey(paragraphKey) as ParagraphNode;
          const cleanedMatch = accumulatedText
            .replace(/<suggestion>(.*?)/g, '$1')
            .replace(/(.*?)<\/suggestion>/g, '$1');
          paragraph.clear();
          const node = $createTextNode(cleanedMatch);
          //paragraph.append(node);
          recursivelyConvertToLaTeX(paragraph, [node]);
        },
        { tag: 'history-merge' }
      );
    }
  };

  return (
    <>
      {visible && (
        <div
          className="chat-dialog"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 1000,
            background: 'white',
            padding: '1rem',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            style={{ width: '300px', height: '100px', marginBottom: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleSubmit} style={{ padding: '0.25rem 0.5rem' }}>
              Submit
            </button>
            <button onClick={() => setVisible(false)} style={{ padding: '0.25rem 0.5rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
