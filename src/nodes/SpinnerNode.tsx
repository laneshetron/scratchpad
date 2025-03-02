import { DecoratorNode } from 'lexical';
import React from 'react';
import './SpinnerNode.css';

export class SpinnerNode extends DecoratorNode<React.JSX.Element> {
  static getType() {
    return 'spinner';
  }

  static clone(node: SpinnerNode) {
    return new SpinnerNode(node.__key);
  }

  static importJSON(): SpinnerNode {
    return $createSpinnerNode();
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'spinner',
      version: 1,
    };
  }

  createDOM() {
    const dom = document.createElement('span');
    dom.className = 'spinner-node';
    return dom;
  }

  updateDOM() {
    return false; // No need to update the DOM in this example
  }

  decorate() {
    return (
      <div className="spinner">
        <div className="loading-circle"></div>
      </div>
    );
  }
}

export function $createSpinnerNode() {
  return new SpinnerNode();
}

export function $isSpinnerNode(node: SpinnerNode) {
  return node instanceof SpinnerNode;
}
