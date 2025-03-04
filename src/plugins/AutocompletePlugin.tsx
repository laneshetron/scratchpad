/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { BaseSelection, NodeKey, TextNode } from 'lexical';

import { generateResponse } from '../utils/llm';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';
import { $isAtNodeEnd } from '@lexical/selection';
import { $getDepth, $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $addUpdateTag,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  KEY_TAB_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';

import { $createAutocompleteNode, AutocompleteNode } from '../nodes/AutocompleteNode';
import { $createAcceptedNode } from '../nodes/AcceptedNode';
import { $createSpinnerNode } from '../nodes/SpinnerNode';
import { $createSuggestionNode } from '../nodes/SuggestionNode';
import { recursivelyConvertToLaTeX } from './LaTeXPlugin';
import type { JSX } from 'react';
import { RateLimitDialog } from '../components/RateLimitDialog';

const SPECULATIVE_AUTOCOMPLETE = false;
const HISTORY_MERGE = { tag: 'history-merge' };

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}

type SearchPromise = {
  dismiss: () => void;
  promise: Promise<null | string>;
};

export const uuid = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 5);

// TODO lookup should be custom
function $search(selection: null | BaseSelection): [boolean, string] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, ''];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  // Check siblings?
  if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
    return [false, ''];
  }
  const word = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== ' ') {
    word.push(c);
  }
  if (word.length === 0) {
    return [false, ''];
  }
  return [true, word.reverse().join('')];
}

class AutocompleteServer {
  constructor(private setShowRateLimit: (show: boolean) => void) {}

  query = (context: string, searchText: string): SearchPromise => {
    let isDismissed = false;

    const dismiss = () => {
      isDismissed = true;
    };
    const promise: Promise<null | string> = (async () => {
      return new Promise<null | string>(async (resolve, reject) => {
        try {
          if (isDismissed) {
            return reject('Dismissed');
          }
          const matchCapitalized = await generateResponse('autocomplete', context);

          const cleanedMatch = matchCapitalized
            .replace(/<suggestion>(.*?)/g, '$1')
            .replace(/(.*?)<\/suggestion>/g, '$1');

          if (cleanedMatch === '') {
            return resolve(null);
          }
          return resolve(cleanedMatch);
        } catch (error) {
          if (error instanceof Error && error.message === 'rate_limit') {
            this.setShowRateLimit(true);
            return reject('Dismissed');
          }
          return reject(error);
        }
      });
    })();

    return {
      dismiss,
      promise,
    };
  };
}

function formatSuggestionText(suggestion: string): string {
  const userAgentData = window.navigator.userAgentData;
  const isMobile =
    userAgentData !== undefined
      ? userAgentData.mobile
      : window.innerWidth <= 800 && window.innerHeight <= 600;

  return `${suggestion} ${isMobile ? '(SWIPE \u2B95)' : '(TAB)'}`;
}

export default function AutocompletePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [showRateLimit, setShowRateLimit] = useState(false);
  const query = useQuery();

  let tabHoldTimeout: NodeJS.Timeout | null = null;
  let tabHoldTimeoutFired = false;
  let activeKey: string | null = null;
  let tabKeyUp = false;
  let spinnerNodeKey: null | NodeKey = null;

  useEffect(() => {
    let autocompleteNodeKey: null | NodeKey = null;
    let lastMatch: null | string = null;
    let lastSuggestion: null | string = null;
    let searchPromise: null | SearchPromise = null;
    let prevNodeFormat = 0;
    function $clearSuggestion() {
      const autocompleteNode =
        autocompleteNodeKey !== null ? $getNodeByKey(autocompleteNodeKey) : null;
      if (autocompleteNode !== null && autocompleteNode.isAttached()) {
        autocompleteNode.remove();
        autocompleteNodeKey = null;
      }
      if (searchPromise !== null) {
        searchPromise.dismiss();
        searchPromise = null;
      }
      lastMatch = null;
      lastSuggestion = null;
      prevNodeFormat = 0;
    }
    function updateAsyncSuggestion(refSearchPromise: SearchPromise, newSuggestion: null | string) {
      if (searchPromise !== refSearchPromise || newSuggestion === null) {
        // Outdated or no suggestion
        return;
      }

      editor.update(() => {
        const selection = $getSelection();
        const [hasMatch, match] = $search(selection);
        if (!hasMatch || match !== lastMatch || !$isRangeSelection(selection)) {
          // Outdated
          return;
        }
        const selectionCopy = selection.clone();
        const prevNode = selection.getNodes()[0] as TextNode;
        prevNodeFormat = prevNode.getFormat();
        const node = $createAutocompleteNode(formatSuggestionText(newSuggestion), uuid).setFormat(
          prevNodeFormat
        );

        const parentBlock =
          $findMatchingParent(prevNode, $isElementNode) || prevNode.getParentOrThrow();
        const container = $createSuggestionNode();
        autocompleteNodeKey = container.getKey();

        parentBlock.append(container);
        $setSelection(selectionCopy);
        // convert any LaTeX
        recursivelyConvertToLaTeX(container, [node]);

        lastSuggestion = newSuggestion;
      }, HISTORY_MERGE);
    }

    function $handleAutocompleteNodeTransform(node: AutocompleteNode) {
      const key = node.getKey();
      if (node.__uuid === uuid && key !== autocompleteNodeKey) {
        // Max one Autocomplete node per session
        $clearSuggestion();
      }
    }
    function handleUpdate() {
      editor.update(() => {
        const selection = $getSelection();
        const [hasMatch, match] = $search(selection);
        if (!hasMatch) {
          $clearSuggestion();
          return;
        }
        if (match === lastMatch) {
          return;
        }
        $clearSuggestion();
        lastMatch = match;
      }, HISTORY_MERGE);
    }

    function handleTextUpdate() {
      /*if (!SPECULATIVE_AUTOCOMPLETE) {
        return;
      }*/
      console.log('handleTextUpdate called');
      editor.update(() => {
        const selection = $getSelection();
        if (!selection) {
          return;
        }

        const [hasMatch, match] = $search(selection);
        // If input has not changed or the user backspaced, return
        /*if (match === lastMatch || lastMatch?.startsWith(match)) {
          return;
        }*/
        $clearSuggestion();
        //
        const prevNode = selection.getNodes()[0] as TextNode;
        const parentBlock =
          $findMatchingParent(prevNode, $isElementNode) || prevNode.getParentOrThrow();
        console.log('match changed');
        const markerNode = $createSuggestionNode();
        parentBlock.append(markerNode);

        const html = $generateHtmlFromNodes(editor);

        //markerNode.remove();
        //
        const spinner = $createSpinnerNode();
        markerNode.append(spinner);
        spinnerNodeKey = markerNode.getKey();
        searchPromise = query(html, match);
        searchPromise.promise
          .then((newSuggestion) => {
            if (searchPromise !== null) {
              updateAsyncSuggestion(searchPromise, newSuggestion);
            }
          })
          .catch((e) => {
            if (e !== 'Dismissed') {
              console.error(e);
            }
          })
          .finally(() => {
            editor.update(() => {
              if (spinnerNodeKey) {
                const spinner = $getNodeByKey(spinnerNodeKey);
                if (spinner) {
                  spinner.remove();
                  spinnerNodeKey = null;
                }
              }
            }, HISTORY_MERGE);
          });
        lastMatch = match;
      }, HISTORY_MERGE);
    }
    function $handleAutocompleteIntent(): boolean {
      if (lastSuggestion === null || autocompleteNodeKey === null) {
        return false;
      }
      const autocompleteNode = $getNodeByKey(autocompleteNodeKey);
      if (autocompleteNode === null) {
        return false;
      }
      const acceptedNode = $createAcceptedNode();
      const textNode = $createTextNode(lastSuggestion);
      //  .setFormat(prevNodeFormat)
      autocompleteNode.replace(acceptedNode);
      recursivelyConvertToLaTeX(acceptedNode, [textNode]);
      acceptedNode.selectNext();
      $clearSuggestion();
      return true;
    }

    function $handleKeypressCommand(e: KeyboardEvent) {
      // check for an autocompletion to accept
      if ($handleAutocompleteIntent()) {
        e.preventDefault();
        return true;
      }
      // check if the key has just been released & re-dispatched
      if (tabKeyUp) {
        tabKeyUp = false;
        return false;
      }
      // if none, check if the key has been held down before allowing the tab to proceed
      if (tabHoldTimeout === null) {
        activeKey = e.key; // Track the currently pressed key
        tabHoldTimeout = setTimeout(() => {
          // generate autocompletion
          tabHoldTimeoutFired = true;
          handleTextUpdate();
        }, 800);
      }
      e.preventDefault();
      return true;
    }

    const $handleKeyUp = (e: KeyboardEvent) => {
      if (tabHoldTimeout !== null && e.key === activeKey) {
        clearTimeout(tabHoldTimeout);
        tabHoldTimeout = null;
        activeKey = null; // Reset the active key

        if (!tabHoldTimeoutFired) {
          editor.update(() => {
            tabKeyUp = true;
            editor.dispatchCommand(KEY_TAB_COMMAND, e);
          }, HISTORY_MERGE);
        }
        tabHoldTimeoutFired = false;
      }
    };

    function handleSwipeRight(_force: number, e: TouchEvent) {
      editor.update(() => {
        if ($handleAutocompleteIntent()) {
          e.preventDefault();
        } else {
          $addUpdateTag(HISTORY_MERGE.tag);
        }
      });
    }
    function unmountSuggestion() {
      editor.update(() => {
        $clearSuggestion();
      }, HISTORY_MERGE);
    }

    const rootElem = editor.getRootElement();

    return mergeRegister(
      editor.registerNodeTransform(AutocompleteNode, $handleAutocompleteNodeTransform),
      editor.registerUpdateListener(handleUpdate),
      //editor.registerTextContentListener(handleTextUpdate),
      editor.registerCommand(KEY_TAB_COMMAND, $handleKeypressCommand, COMMAND_PRIORITY_LOW),
      editor.registerRootListener(
        (rootElement: HTMLElement | null, prevRootElement: HTMLElement | null) => {
          if (prevRootElement !== null) {
            prevRootElement.removeEventListener('keyup', $handleKeyUp);
          }
          if (rootElement !== null) {
            rootElement.addEventListener('keyup', $handleKeyUp);
          }
        }
      ),
      unmountSuggestion
    );
  }, [editor]);

  function useQuery(): (context: string, searchText: string) => SearchPromise {
    return useCallback((context: string, searchText: string) => {
      const server = new AutocompleteServer(setShowRateLimit);
      return server.query(context, searchText);
    }, []);
  }

  return (
    <>
      <RateLimitDialog open={showRateLimit} onOpenChange={setShowRateLimit} />
    </>
  );
}
