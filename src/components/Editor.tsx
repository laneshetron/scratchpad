import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { EditorProps } from '../types';
import AutocompletePlugin from '../plugins/AutocompletePlugin';
import EquationsPlugin from '../plugins/EquationsPlugin';
import { LaTeXPlugin } from '../plugins/LaTeXPlugin';
import Tooltip from './Tooltip';
import './Editor.css';
import { KeyboardShortcutPlugin } from '../plugins/KeyboardShortcutPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { AutoLinkNode } from '@lexical/link';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { AcceptedNode } from '../nodes/AcceptedNode';
import { AnnotationNode } from '../nodes/AnnotationNode';
import { AutocompleteNode } from '../nodes/AutocompleteNode';
import { EquationNode } from '../nodes/EquationNode';
import { SpinnerNode } from '../nodes/SpinnerNode';
import { SuggestionNode } from '../nodes/SuggestionNode';
import { EditorState } from 'lexical';
import { useFiles } from '../contexts/FileContext';
import { InlineChatPlugin } from '../plugins/InlineChatPlugin';

const placeholder = 'Start a new note...';

export const Editor: React.FC<EditorProps> = () => {
  const { currentFile, saveNote } = useFiles();

  // send editor state to FileContext
  const onEditorChange = (editorState: EditorState) => {
    saveNote(JSON.stringify(editorState), currentFile.name, currentFile.filePath);
  };

  const editorConfig = {
    namespace: 'Scratchpad',
    editorState: currentFile.content || undefined,
    onError: (error: Error) => {
      console.error('Editor error:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      EquationNode,
      AcceptedNode,
      AnnotationNode,
      AutocompleteNode,
      AutoLinkNode,
      LinkNode,
      SpinnerNode,
      SuggestionNode,
    ],
  };

  const URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

  const MATCHERS = [
    (text: string) => {
      const match = URL_MATCHER.exec(text);
      if (match === null) {
        return null;
      }
      const fullMatch = match[0];
      return {
        index: match.index,
        length: fullMatch.length,
        text: fullMatch,
        url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
        // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
      };
    },
  ];

  return (
    <LexicalComposer key={currentFile?.name} initialConfig={editorConfig}>
      <div className="editor-container">
        <div className="editor-time">
          {new Date(currentFile.modified)
            .toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
            })
            .replace(',', ' at')}
        </div>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-placeholder={placeholder}
              className="editor"
              placeholder={<div className="placeholder">{placeholder}</div>}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin ignoreSelectionChange={true} onChange={onEditorChange} />
        <HistoryPlugin />
        <AutocompletePlugin />
        <LaTeXPlugin />
        <EquationsPlugin />
        <InlineChatPlugin />
        <KeyboardShortcutPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <AutoLinkPlugin matchers={MATCHERS} />
        <ClickableLinkPlugin />
        <ListPlugin />
        <SelectionAlwaysOnDisplay />
        <TabIndentationPlugin />
        <Tooltip
          x={0}
          y={0}
          visible={false}
          content="Ctrl+R: Render markdown<br>Cmd+L: Convert to LaTeX"
        />
      </div>
    </LexicalComposer>
  );
};
