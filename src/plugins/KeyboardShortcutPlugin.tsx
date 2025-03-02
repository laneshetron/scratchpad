import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND } from 'lexical';
import { CONVERT_TO_LATEX } from './LaTeXPlugin';
import { OPEN_INLINE_CHAT } from './InlineChatPlugin';

export function KeyboardShortcutPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeKeyboardListener = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey) {
          switch (event.key) {
            case 'l':
              event.preventDefault();
              editor.dispatchCommand(CONVERT_TO_LATEX, undefined);
              return true;
            case 'k':
              event.preventDefault();
              editor.dispatchCommand(OPEN_INLINE_CHAT, undefined);
              return true;
            /*case 'r':
              event.preventDefault();
              editor.dispatchCommand(RENDER_LATEX, undefined);
              return true;*/
          }
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );

    return () => {
      removeKeyboardListener();
    };
  }, [editor]);

  return null;
}
