import {SearchQuery} from "prosemirror-search"
import {Node} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {doc, p, em} from "prosemirror-test-builder"
import ist from "ist"

function test(conf: ConstructorParameters<typeof SearchQuery>[0], doc: Node) {
  let matches = []
  for (let i = 1;; i++) {
    let s = (doc as any).tag["s" + i], e = (doc as any).tag["e" + i]
    if (s == null || e == null) break
    matches.push({from: s, to: e})
  }
  let state = EditorState.create({doc})
  let query = new SearchQuery(conf)

  let forward = []
  for (let pos = 0;;) {
    let next = query.findNext(state, pos)
    if (!next) break
    forward.push({from: next.from, to: next.to})
    pos = next.to
  }
  ist(JSON.stringify(forward), JSON.stringify(matches))

  let backward = []
  for (let pos = doc.content.size;;) {
    let next = query.findPrev(state, pos)
    if (!next) break
    backward.push({from: next.from, to: next.to})
    pos = next.from
  }
  ist(JSON.stringify(backward), JSON.stringify(matches.slice().reverse()))
}

describe("SearchQuery", () => {
  it("can match plain strings", () => {
    test({search: "abc"}, p("<s1>abc<e1> flakdj a<s2>abc<e2> aabbcc"))
  })

  it("skips overlapping matches", () => {
    test({search: "aba"}, p("<s1>aba<e1>b<s2>aba<e2>."))
  })

  it("goes through multiple textblocks", () => {
    test({search: "12"}, doc(p("a<s1>12<e1>b"), p("..."), p("and <s2>12<e2>")))
  })

  it("matches across mark boundaries", () => {
    test({search: "two"}, p("ab<s1>t", em("w"), "o<e1>oo"))
  })

  it("can match case-insensitive strings", () => {
    test({search: "abC", caseSensitive: false}, p("<s1>aBc<e1> flakdj a<s2>ABC<e2>"))
  })

  it("can match literally", () => {
    test({search: "a\\nb", literal: true}, p("a\nb <s1>a\\nb<e1>"))
  })

  it("can match by word", () => {
    test({search: "hello", wholeWord: true}, p("<s1>hello<e1> hellothere <s2>hello<e2>\nello ahello ohellop"))
  })

  it("doesn't match non-words by word", () => {
    test({search: "^_^", wholeWord: true}, p("x<s1>^_^<e1>y <s2>^_^<e2>"))
  })

  it("can match regular expressions", () => {
    test({search: "a..b", regexp: true}, p("<s1>appb<e1> apb"))
  })

  it("can match case-insensitive regular expressions", () => {
    test({search: "a..b", regexp: true, caseSensitive: false}, p("<s1>Appb<e1> Apb"))
  })

  it("can match regular expressions through multiple textblocks", () => {
    test({search: "12", regexp: true}, doc(p("a<s1>12<e1>b"), p("..."), p("and <s2>12<e2>")))
  })

  it("can match regular expressions by word", () => {
    test({search: "a..", regexp: true, wholeWord: true}, p("<s1>aap<e1> baap aapje <s2>a--<e2>w"))
  })
})
