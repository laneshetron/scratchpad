import {
  $createParagraphNode,
  EditorConfig,
  ElementNode,
  LexicalNode,
  ParagraphNode,
  RangeSelection,
} from 'lexical';

export class AcceptedNode extends ElementNode {
  static getType(): string {
    return 'accepted';
  }

  static clone(node: AcceptedNode): AcceptedNode {
    return new AcceptedNode(node.__key);
  }

  static importJSON(): AcceptedNode {
    return $createAcceptedNode();
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'accepted',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'editor-accepted';
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // Returning false tells Lexical that this node does not need its
    // DOM element replacing with a new copy from createDOM.
    return false;
  }

  insertNewAfter(selection: RangeSelection, restoreSelection = true): LexicalNode {
    const parent = this.getParent();
    return parent?.insertNewAfter(selection, restoreSelection) || $createParagraphNode();
  }
}

export function $createAcceptedNode(): AcceptedNode {
  return new AcceptedNode();
}

export function $isAcceptedNode(node: LexicalNode | null | undefined): node is AcceptedNode {
  return node instanceof AcceptedNode;
}
