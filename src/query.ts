import {EditorState} from "prosemirror-state"
import {Node} from "prosemirror-model"

export class SearchQuery {
  /// The search string (or regular expression).
  readonly search: string
  /// Indicates whether the search is case-sensitive.
  readonly caseSensitive: boolean
  /// By default, string search will replace `\n`, `\r`, and `\t` in
  /// the query with newline, return, and tab characters. When this
  /// is set to true, that behavior is disabled.
  readonly literal: boolean
  /// When true, the search string is interpreted as a regular
  /// expression.
  readonly regexp: boolean
  /// The replace text, or the empty string if no replace text has
  /// been given.
  readonly replace: string
  /// Whether this query is non-empty and, in case of a regular
  /// expression search, syntactically valid.
  readonly valid: boolean
  /// When true, matches that contain words are ignored when there are
  /// further word characters around them.
  readonly wholeWord: boolean

  /// @internal
  impl: QueryImpl

  /// Create a query object.
  constructor(config: {
    /// The search string.
    search: string,
    /// Controls whether the search should be case-sensitive.
    caseSensitive?: boolean,
    /// By default, string search will replace `\n`, `\r`, and `\t` in
    /// the query with newline, return, and tab characters. When this
    /// is set to true, that behavior is disabled.
    literal?: boolean,
    /// When true, interpret the search string as a regular expression.
    regexp?: boolean,
    /// The replace text.
    replace?: string,
    /// Enable whole-word matching.
    wholeWord?: boolean,
  }) {
    this.search = config.search
    this.caseSensitive = !!config.caseSensitive
    this.literal = !!config.literal
    this.regexp = !!config.regexp
    this.replace = config.replace || ""
    this.valid = !!this.search && !(this.regexp && !validRegExp(this.search))
    this.wholeWord = !!config.wholeWord
    this.impl = !this.valid ? nullQuery : this.regexp ? new RegExpQuery(this) : new StringQuery(this)
  }

  /// Compare this query to another query.
  eq(other: SearchQuery) {
    return this.search == other.search && this.replace == other.replace &&
      this.caseSensitive == other.caseSensitive && this.regexp == other.regexp &&
      this.wholeWord == other.wholeWord
  }

  findNext(state: EditorState, from: number = 0, to: number = state.doc.content.size) {
    for (;;) {
      if (from >= to) return null
      let result = this.impl.findNext(state, from, to)
      if (!result || this.checkResult(state, result)) return result
      from = result.from + 1
    }
  }

  findPrev(state: EditorState, from: number = state.doc.content.size, to: number = 0) {
    for (;;) {
      if (from <= to) return null
      let result = this.impl.findPrev(state, from, to)
      if (!result || this.checkResult(state, result)) return result
      from = result.to - 1
    }
  }

  /// @internal
  checkResult(state: EditorState, result: SearchResult) {
    return this.wholeWord ? checkWordBoundary(state, result.from) && checkWordBoundary(state, result.to) : true
  }
}

interface SearchResult {
  from: number,
  to: number,
  match: RegExpMatchArray | null
}

interface QueryImpl {
  findNext(state: EditorState, from: number, to: number): SearchResult | null
  findPrev(state: EditorState, from: number, to: number): SearchResult | null
}

const nullQuery = new class implements QueryImpl {
  findNext() { return null }
  findPrev() { return null }
}

class StringQuery implements QueryImpl {
  string: string

  constructor(readonly query: SearchQuery) {
    let string = query.search
    if (!query.literal)
      string = string.replace(/\\([nrt\\])/g, (_, ch) => ch == "n" ? "\n" : ch == "r" ? "\r" : ch == "t" ? "\t" : "\\")
    if (!query.caseSensitive)
      string = string.toLowerCase()
    this.string = string
  }

  findNext(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let off = Math.max(from, start)
      let content = textContent(node, off - start, Math.min(node.content.size, to - start))
      let index = (this.query.caseSensitive ? content : content.toLowerCase()).indexOf(this.string)
      return index < 0 ? null : {from: off + index, to: off + index + this.string.length, match: null}
    })
  }

  findPrev(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let off = Math.max(to, start)
      let content = textContent(node, off - start, Math.min(node.content.size, from - start))
      let index = (this.query.caseSensitive ? content : content.toLowerCase()).lastIndexOf(this.string)
      return index < 0 ? null : {from: off + index, to: off + index + this.string.length, match: null}
    })
  }
}

const baseFlags = "g" + (/x/.unicode == null ? "" : "u")

class RegExpQuery implements QueryImpl {
  regexp: RegExp

  constructor(readonly query: SearchQuery) {
    this.regexp = new RegExp(query.search, baseFlags + (query.caseSensitive ? "" : "i"))
  }

  findNext(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let content = textContent(node, 0, Math.min(node.content.size, to - start))
      this.regexp.lastIndex = from - start
      let match = this.regexp.exec(content)
      return match ? {from: start + match.index, to: start + match.index + match[0].length, match} : null
    })
  }

  findPrev(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let content = textContent(node, 0, Math.min(node.content.size, from - start))
      let match
      for (let off = 0;;) {
        this.regexp.lastIndex = off
        let next = this.regexp.exec(content)
        if (!next) break
        match = next
        off = next.index + 1
      }
      return match ? {from: start + match.index, to: start + match.index + match[0].length, match} : null
    })
  }
}

export function validRegExp(source: string) {
  try { new RegExp(source, baseFlags); return true }
  catch { return false }
}

function textContent(node: Node, from: number, to: number) {
  let content = ""
  for (let i = 0, pos = 0; i < node.childCount && pos < to; i++) {
    let child = node.child(i), start = pos, end = pos + child.nodeSize
    pos = end
    if (end <= from) continue
    if (child.isText) {
      let text = child.text!
      if (to < end) text = text.slice(0, to - pos)
      if (pos > from) text = text.slice(from - pos)
      content += text
    } else if (child.isLeaf) {
      content += "\ufffc"
    } else {
      if (start >= from) content += " "
      content += textContent(child, Math.max(0, from - start + 1), Math.min(child.content.size, to - start - 1))
      if (end <= to) content += " "
    }
  }
  return content
}

function scanTextblocks<T>(node: Node, from: number, to: number,
                           f: (node: Node, startPos: number) => T | null,
                           nodeStart: number = 0): T | null {
  if (node.inlineContent) {
    return f(node, nodeStart)
  } else if (!node.isLeaf) {
    if (from > to) {
      for (let i = node.childCount - 1, pos = nodeStart + node.content.size; i >= 0 && pos > to; i--) {
        let child = node.child(i)
        pos -= child.nodeSize
        if (pos < from) {
          let result = scanTextblocks(child, from, to, f, pos + 1)
          if (result != null) return result
        }
      }
    } else {
      for (let i = 0, pos = nodeStart; i < node.childCount && pos < to; i++) {
        let child = node.child(i), start = pos
        pos += child.nodeSize
        if (pos > from) {
          let result = scanTextblocks(child, from, to, f, start + 1)
          if (result != null) return result
        }
      }
    }
  }
  return null
}

function checkWordBoundary(state: EditorState, pos: number) {
  let $pos = state.doc.resolve(pos)
  let before = $pos.nodeBefore, after = $pos.nodeAfter
  if (!before || !after || !before.isText || !after.isText) return true
  return !/\p{L}$/u.test(before.text!) || !/^\p{L}/u.test(after.text!)
}
