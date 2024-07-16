import {EditorState} from "prosemirror-state"
import {Node, Slice, Fragment} from "prosemirror-model"

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
  /// An optional filter that causes some results to be ignored.
  readonly filter: ((state: EditorState, result: SearchResult) => boolean) | null

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
    /// Providing a filter causes results for which the filter returns
    /// false to be ignored.
    filter?: (state: EditorState, result: SearchResult) => boolean
  }) {
    this.search = config.search
    this.caseSensitive = !!config.caseSensitive
    this.literal = !!config.literal
    this.regexp = !!config.regexp
    this.replace = config.replace || ""
    this.valid = !!this.search && !(this.regexp && !validRegExp(this.search))
    this.wholeWord = !!config.wholeWord
    this.filter = config.filter || null
    this.impl = !this.valid ? nullQuery : this.regexp ? new RegExpQuery(this) : new StringQuery(this)
  }

  /// Compare this query to another query.
  eq(other: SearchQuery) {
    return this.search == other.search && this.replace == other.replace &&
      this.caseSensitive == other.caseSensitive && this.regexp == other.regexp &&
      this.wholeWord == other.wholeWord
  }

  /// Find the next occurrence of this query in the given range.
  findNext(state: EditorState, from: number = 0, to: number = state.doc.content.size) {
    for (;;) {
      if (from >= to) return null
      let result = this.impl.findNext(state, from, to)
      if (!result || this.checkResult(state, result)) return result
      from = result.from + 1
    }
  }

  /// Find the previous occurrence of this query in the given range.
  /// Note that, if `to` is given, it should be _less_ than `from`.
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
    return (!this.wholeWord || checkWordBoundary(state, result.from) && checkWordBoundary(state, result.to)) &&
      (!this.filter || this.filter(state, result))
  }

  /// @internal
  unquote(string: string) {
    return this.literal ? string
      : string.replace(/\\([nrt\\])/g, (_, ch) => ch == "n" ? "\n" : ch == "r" ? "\r" : ch == "t" ? "\t" : "\\")
  }

  /// Get the ranges that should be replaced for this result. This can
  /// return multiple ranges when `this.replace` contains
  /// `$1`/`$&`-style placeholders, in which case the preserved
  /// content is skipped by the replacements.
  ///
  /// Ranges are sorted by position, and `from`/`to` positions all
  /// refer to positions in `state.doc`. When applying these, you'll
  /// want to either apply them from back to front, or map these
  /// positions through your transaction's current mapping.
  getReplacements(state: EditorState, result: SearchResult): {from: number, to: number, insert: Slice}[] {
    let $from = state.doc.resolve(result.from)
    let marks = $from.marksAcross(state.doc.resolve(result.to))
    let ranges: {from: number, to: number, insert: Slice}[] = []

    let frag = Fragment.empty, pos = result.from, {match} = result
    let groups = match ? getGroupIndices(match) : [[0, result.to - result.from]]
    let replParts = parseReplacement(this.unquote(this.replace)), groupSpan
    for (let part of replParts) {
      if (typeof part == "string") { // Replacement text
        frag = frag.addToEnd(state.schema.text(part, marks))
      } else if (groupSpan = groups[part.group]) {
        let from = result.matchStart + groupSpan[0], to = result.matchStart + groupSpan[1]
        if (part.copy) { // Copied content
          frag = frag.append(state.doc.slice(from, to).content)
        } else { // Skipped content
          if (frag != Fragment.empty || from > pos) {
            ranges.push({from: pos, to: from, insert: new Slice(frag, 0, 0)})
            frag = Fragment.empty
          }
          pos = to
        }
      }
    }
    if (frag != Fragment.empty || pos < result.to)
      ranges.push({from: pos, to: result.to, insert: new Slice(frag, 0, 0)})
    return ranges
  }
}

/// A matched instance of a search query. `match` will be non-null
/// only for regular expression queries.
export interface SearchResult {
  from: number
  to: number
  match: RegExpMatchArray | null
  matchStart: number
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
    let string = query.unquote(query.search)
    if (!query.caseSensitive) string = string.toLowerCase()
    this.string = string
  }

  findNext(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let off = Math.max(from, start)
      let content = textContent(node).slice(off - start, Math.min(node.content.size, to - start))
      let index = (this.query.caseSensitive ? content : content.toLowerCase()).indexOf(this.string)
      return index < 0 ? null : {from: off + index, to: off + index + this.string.length, match: null, matchStart: start}
    })
  }

  findPrev(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let off = Math.max(start, to)
      let content = textContent(node).slice(off - start, Math.min(node.content.size, from - start))
      if (!this.query.caseSensitive) content = content.toLowerCase()
      let index = content.lastIndexOf(this.string)
      return index < 0 ? null : {from: off + index, to: off + index + this.string.length, match: null, matchStart: start}
    })
  }
}

const baseFlags = "g" + (/x/.unicode == null ? "" : "u") + ((/x/ as any).hasIndices == null ? "" : "d")

class RegExpQuery implements QueryImpl {
  regexp: RegExp

  constructor(readonly query: SearchQuery) {
    this.regexp = new RegExp(query.search, baseFlags + (query.caseSensitive ? "" : "i"))
  }

  findNext(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let content = textContent(node).slice(0, Math.min(node.content.size, to - start))
      this.regexp.lastIndex = from - start
      let match = this.regexp.exec(content)
      return match ? {from: start + match.index, to: start + match.index + match[0].length, match, matchStart: start} : null
    })
  }

  findPrev(state: EditorState, from: number, to: number) {
    return scanTextblocks(state.doc, from, to, (node, start) => {
      let content = textContent(node).slice(0, Math.min(node.content.size, from - start))
      let match
      for (let off = 0;;) {
        this.regexp.lastIndex = off
        let next = this.regexp.exec(content)
        if (!next) break
        match = next
        off = next.index + 1
      }
      return match ? {from: start + match.index, to: start + match.index + match[0].length, match, matchStart: start} : null
    })
  }
}

function getGroupIndices(match: RegExpMatchArray): ([number, number] | undefined)[] {
  if ((match as any).indices) return (match as any).indices
  let result: ([number, number] | undefined)[] = [[0, match[0].length]]
  for (let i = 1, pos = 0; i < match.length; i++) {
    let found = match[i] ? match[0].indexOf(match[i], pos) : -1
    result.push(found < 0 ? undefined : [found, pos = found + match[i].length])
  }
  return result
}

function parseReplacement(text: string): (string | {group: number, copy: boolean})[] {
  let result: (string | {group: number, copy: boolean})[] = [], highestSeen = -1
  function add(text: string) {
    let last = result.length - 1
    if (last > -1 && typeof result[last] == "string") result[last] += text
    else result.push(text)
  }
  while (text.length) {
    let m = /\$([$&\d+])/.exec(text)
    if (!m) {
      add(text)
      return result
    }
    if (m.index > 0) add(text.slice(0, m.index + (m[1] == "$" ? 1 : 0)))
    if (m[1] != "$") {
      let n = m[1] == "&" ? 0 : +m[1]
      if (highestSeen >= n) {
        result.push({group: n, copy: true})
      } else {
        highestSeen = n || 1000
        result.push({group: n, copy: false})
      }
    }
    text = text.slice(m.index + m[0].length)
  }
  return result
}

export function validRegExp(source: string) {
  try { new RegExp(source, baseFlags); return true }
  catch { return false }
}

const TextContentCache = new WeakMap<Node, string>()

function textContent(node: Node) {
  let cached = TextContentCache.get(node)
  if (cached) return cached

  let content = ""
  for (let i = 0; i < node.childCount; i++) {
    let child = node.child(i)
    if (child.isText) content += child.text!
    else if (child.isLeaf) content += "\ufffc"
    else content += " " + textContent(child) + " "
  }
  TextContentCache.set(node, content)
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
