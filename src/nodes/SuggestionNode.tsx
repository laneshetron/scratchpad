import { EditorConfig, ElementNode, LexicalNode } from 'lexical';
import './SuggestionNode.css';

export class SuggestionNode extends ElementNode {
  static getType(): string {
    return 'suggestion';
  }

  static clone(node: SuggestionNode): SuggestionNode {
    return new SuggestionNode(node.__key);
  }

  static importJSON(): SuggestionNode {
    return $createSuggestionNode();
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'suggestion',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('suggestion');
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // Returning false tells Lexical that this node does not need its
    // DOM element replacing with a new copy from createDOM.
    return false;
  }
}

export function $createSuggestionNode(): SuggestionNode {
  return new SuggestionNode();
}

export function $isSuggestionNode(node: LexicalNode | null | undefined): node is SuggestionNode {
  return node instanceof SuggestionNode;
}
