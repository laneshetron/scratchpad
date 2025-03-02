import {
  $createParagraphNode,
  RangeSelection,
  EditorConfig,
  ElementNode,
  LexicalNode,
  SerializedElementNode,
  $parseSerializedNode,
} from 'lexical';
import './AnnotationNode.css';

export class AnnotationNode extends ElementNode {
  static getType(): string {
    return 'annotation';
  }

  static clone(node: AnnotationNode): AnnotationNode {
    return new AnnotationNode(node.__key);
  }

  static importJSON(serializedNode: SerializedElementNode): AnnotationNode {
    const node = $createAnnotationNode();
    return node;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'annotation',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('blockquote');
    dom.classList.add('annotation', 'annotation-header');
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // Returning false tells Lexical that this node does not need its
    // DOM element replacing with a new copy from createDOM.
    return false;
  }

  insertNewAfter(selection: RangeSelection, restoreSelection = true): LexicalNode {
    const newElement = $createParagraphNode();
    this.insertAfter(newElement, restoreSelection);

    if (restoreSelection) {
      selection.focus.set(newElement.getKey(), 0, 'element');
    }

    return newElement;
  }
}

export function $createAnnotationNode(): AnnotationNode {
  return new AnnotationNode();
}

export function $isAnnotationNode(node: LexicalNode | null | undefined): node is AnnotationNode {
  return node instanceof AnnotationNode;
}
