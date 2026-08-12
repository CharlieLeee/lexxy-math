import { Extension, Lexical } from "@37signals/lexxy"

// Lexxy exposes the exact Lexical instance used by both its npm and gem builds.
// Always consume that namespace so extensions do not load a second, incompatible
// copy of Lexical when they run through importmap-rails.
const {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  DecoratorNode,
  FORMAT_TEXT_COMMAND,
  isDOMNode,
  KEY_ENTER_COMMAND,
  TextNode,
  createCommand
} = Lexical

export {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  DecoratorNode,
  Extension,
  FORMAT_TEXT_COMMAND,
  isDOMNode,
  KEY_ENTER_COMMAND,
  TextNode,
  createCommand
}

export function mergeRegistrations(...registrations) {
  return () => {
    for (const unregister of registrations) unregister()
  }
}
