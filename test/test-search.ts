import {EditorState, TextSelection, Command, Transaction} from "prosemirror-state"
import {Node} from "prosemirror-model"

import {SearchQuery, search,
        findNext, findNextNoWrap, findPrev, findPrevNoWrap,
        replaceNext, replaceNextNoWrap, replaceCurrent, replaceAll,
        SearchResult} from "prosemirror-search"

import {doc, blockquote, p, img, em, eq} from "prosemirror-test-builder"
import ist from "ist"

type Query = ConstructorParameters<typeof SearchQuery>[0] & {range?: {from: number, to: number}}

function tag(node: Node, tag: string): number | undefined {
  return (node as any).tag[tag]
}

function mkState(query: Query, doc: Node) {
  let a = tag(doc, "a"), b = tag(doc, "b")
  return EditorState.create({
    doc,
    selection: a == null ? undefined : TextSelection.create(doc, a, b),
    plugins: [search({initialQuery: new SearchQuery(query), initialRange: query.range})]
  })
}

function testSelCommand(query: Query, doc: Node, command: Command) {
  let state = mkState(query, doc)
  let result = command(state, tr => state = state.apply(tr))
  let c = tag(doc, "c"), d = tag(doc, "d")
  ist(result, c != null)
  if (c != null) ist(JSON.stringify(state.selection), JSON.stringify(TextSelection.create(doc, c, d)))
}

function testCommand(query: Query, start: Node, next: Node | null, command: Command) {
  let state = mkState(query, start)
  let result = command(state, tr => state = state.apply(tr))
  ist(result, !!next)
  if (next) {
    let expect = mkState(query, next)
    ist(state.doc, expect.doc, eq)
    ist(JSON.stringify(state.selection), JSON.stringify(expect.selection))
  }
}

describe("search", () => {
  describe("findNext", () => {
    it("can find the next match", () => {
      testSelCommand({search: "two"}, p("one <c>two<d> two"), findNext)
    })
    it("can find the next match from selection", () => {
      testSelCommand({search: "two"}, p("one <a>two<b> <c>two<d>"), findNext)
    })
    it("wraps around at end of document", () => {
      testSelCommand({search: "two"}, p("one <c>two<d> <a>two<b>"), findNext)
    })
    it("doesn't wrap around in no-wrap mode", () => {
      testSelCommand({search: "two"}, p("one two <a>two<b>"), findNextNoWrap)
    })
    it("can search a limited range", () => {
      testSelCommand({search: "two", range: {from: 7, to: 11}}, p("one two <a>two<b>"), findNext)
    })
    it("wraps within the given range", () => {
      testSelCommand({search: "two", range: {from: 3, to: 11}}, p("two <c>two<d> <a>two<b>"), findNext)
    })
    it("can match in nested structure", () => {
      testSelCommand({search: "one"}, doc(blockquote(p("para <a>one<b>"), p("para two")), p("and <c>one<d>")), findNext)
    })
  })

  describe("findPrev", () => {
    it("can find the previous match", () => {
      testSelCommand({search: "two"}, p("one <c>two<d> <a>two<b>"), findPrev)
    })
    it("wraps around at start of document", () => {
      testSelCommand({search: "two"}, p("one <a>two<b> <c>two<d>"), findPrev)
    })
    it("doesn't wrap around in no-wrap mode", () => {
      testSelCommand({search: "two"}, p("one <a>two<b> two"), findPrevNoWrap)
    })
    it("can search a limited range", () => {
      testSelCommand({search: "two", range: {from: 7, to: 11}}, p("one two <a>two<b>"), findPrev)
    })
    it("wraps within the given range", () => {
      testSelCommand({search: "two", range: {from: 3, to: 11}}, p("two <a>two<b> <c>two<d>"), findPrev)
    })
    it("can match in nested structure", () => {
      testSelCommand({search: "one"}, doc(blockquote(p("para <c>one<d>"), p("para two")), p("and <a>one<b>")), findPrev)
    })
  })

  describe("replaceNext", () => {
    it("moves to a match when not already on one", () => {
      testCommand({search: "one", replace: "two"}, p("one one"), p("<a>one<b> one"), replaceNext)
    })
    it("can replace the current match", () => {
      testCommand({search: "one", replace: "two"}, p("<a>one<b> two"), p("<a>two<b> two"), replaceNext)
    })
    it("moves selection to the next match", () => {
      testCommand({search: "one", replace: "two"}, p("<a>one<b> one"), p("two <a>one<b>"), replaceNext)
    })
    it("wraps around the end of the document", () => {
      testCommand({search: "one", replace: "two"}, p("one <a>one<b>"), p("<a>one<b> two"), replaceNext)
    })
    it("doesn't wrap with wrapping disabled", () => {
      testCommand({search: "one", replace: "two"}, p("one <a>one<b>"), p("one <a>two<b>"), replaceNextNoWrap)
    })
    it("can replace within a limited range", () => {
      testCommand({search: "one", replace: "two", range: {from: 0, to: 7}},
                  p("one <a>one<b> one"), p("<a>one<b> two one"), replaceNext)
    })
    it("can reuse parts of the match", () => {
      testCommand({search: "\\((.*?)\\)", regexp: true, replace: "[$1]"},
                  p("<a>(hi)<b> (x)"), p("[hi] <a>(x)<b>"), replaceNext)
    })
    it("can reuse matched leaf nodes", () => {
      testCommand({search: "\\((.*?)\\)", regexp: true, replace: "[$1]"},
                  p("<a>(", img(), ")<b> (x)"), p("[", img(), "] <a>(x)<b>"), replaceNext)
    })
    it("can replace in nested structure", () => {
      testCommand({search: "one", replace: "two"},
                  doc(blockquote(p("para <a>one<b>"), p("para two")), p("and one")),
                  doc(blockquote(p("para two"), p("para two")), p("and <a>one<b>")),
                  replaceNext)
    })
    it("doesn't replace reused content", () => {
      let state = mkState({search: ".(eu).", regexp: true, replace: "p$1t"}, p("<a>deux<b> trois"))
      let tr: Transaction | undefined
      replaceNext(state, t => tr = t)
      ist(tr)
      ist(tr!.doc, p("peut trois"), eq)
      ist(tr!.mapping.map(2), 2)
    })
    it("can handle multiple references to groups", () => {
      testCommand({search: "(ab)-(cd)", regexp: true, replace: "$2$1$2"},
                  p("<a>ab-cd<b>"), p("<a>cdabcd<b>"), replaceNext)
    })
    it("replaces non-matched groups with nothing", () => {
      testCommand({search: "(ab)|(cd)", regexp: true, replace: "x$2"},
                  p("<a>ab<b>"), p("<a>x<b>"), replaceNext)
    })
    it("supports matches in string replacements", () => {
      testCommand({search: "one", replace: "$&$&"}, p("<a>one<b>"), p("<a>oneone<b>"), replaceNext)
    })
  })

  describe("replaceCurrent", () => {
    it("does nothing when not at a match", () => {
      testCommand({search: "one", replace: "two"}, p("one"), null, replaceCurrent)
    })
    it("selects the replacement", () => {
      testCommand({search: "one", replace: "two"}, p("<a>one<b>"), p("<a>two<b>"), replaceCurrent)
    })
  })

  describe("replaceAll", () => {
    it("replaces all instances", () => {
      testCommand({search: "one", replace: "two"},
                  doc(p("this one"), p("that one"), blockquote(p("another one"))),
                  doc(p("this two"), p("that two"), blockquote(p("another two"))),
                  replaceAll)
    })
    it("support using parts of the match", () => {
      testCommand({search: "(\\d+)-(\\d+)", replace: "$1:$2", regexp: true},
                  p("50-20 vs 40-15"),
                  p("50:20 vs 40:15"),
                  replaceAll)
    })
    it("works within a limited range", () => {
      testCommand({search: "one", replace: "two", range: {from: 2, to: 17}},
                  p("one one one one one"),
                  p("one two two two one"),
                  replaceAll)
    })
  })

  describe("filterResult", () => {
    it("lets you replace only emphasized texts", () => {
      const filterResult = (state: EditorState, result: SearchResult) =>
        state.doc.rangeHasMark(result.from, result.to, state.schema.marks.em.create())
      testCommand({search: "one", replace: "two", filterResult},
        doc(p("this one"), p("that ", em("one")), blockquote(p("another ", em("one")))),
        doc(p("this one"), p("that ", em("two")), blockquote(p("another ", em("two")))),
        replaceAll)
    })
  })
})
