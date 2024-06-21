# prosemirror-search

[ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://github.com/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**GITTER**](https://gitter.im/ProseMirror/prosemirror) ]

This [module](https://prosemirror.net/docs/ref/#search) defines an API
for searching through ProseMirror documents, search/replace commands,
and a plugin that highlights the matches of a given search query.

When using this module, you should either load
[`style/search.css`](https://github.com/ProseMirror/prosemirror-search/blob/master/style/search.css)
into your page, or define your own styles for the
`ProseMirror-search-match` (search match) and
`ProseMirror-active-search-match` (the active match) classes.

The [project page](https://prosemirror.net) has more information, a
number of [examples](https://prosemirror.net/examples/) and the
[documentation](https://prosemirror.net/docs/).

This code is released under an
[MIT license](https://github.com/prosemirror/prosemirror/tree/master/LICENSE).
There's a [forum](http://discuss.prosemirror.net) for general
discussion and support requests, and the
[Github bug tracker](https://github.com/prosemirror/prosemirror/issues)
is the place to report issues.

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## API

 * **`search`**`(options?: {initialQuery?: SearchQuery, initialRange?: {from: number, to: number}} = {}) → Plugin`\
   Returns a plugin that stores a current search query and searched
   range, and highlights matches of the query.


### class SearchQuery

 * `new `**`SearchQuery`**`(config: Object)`\
   Create a query object.

    * **`config`**`: Object`

       * **`search`**`: string`\
         The search string.

       * **`caseSensitive`**`?: boolean`\
         Controls whether the search should be case-sensitive.

       * **`literal`**`?: boolean`\
         By default, string search will replace `\n`, `\r`, and `\t` in
         the query with newline, return, and tab characters. When this
         is set to true, that behavior is disabled.

       * **`regexp`**`?: boolean`\
         When true, interpret the search string as a regular expression.

       * **`replace`**`?: string`\
         The replace text.

       * **`wholeWord`**`?: boolean`\
         Enable whole-word matching.

 * **`search`**`: string`\
   The search string (or regular expression).

 * **`caseSensitive`**`: boolean`\
   Indicates whether the search is case-sensitive.

 * **`literal`**`: boolean`\
   By default, string search will replace `\n`, `\r`, and `\t` in
   the query with newline, return, and tab characters. When this
   is set to true, that behavior is disabled.

 * **`regexp`**`: boolean`\
   When true, the search string is interpreted as a regular
   expression.

 * **`replace`**`: string`\
   The replace text, or the empty string if no replace text has
   been given.

 * **`valid`**`: boolean`\
   Whether this query is non-empty and, in case of a regular
   expression search, syntactically valid.

 * **`wholeWord`**`: boolean`\
   When true, matches that contain words are ignored when there are
   further word characters around them.

 * **`eq`**`(other: SearchQuery) → boolean`\
   Compare this query to another query.

 * **`findNext`**`(state: EditorState, from?: number = 0, to?: number = state.doc.content.size) → SearchResult`\
   Find the next occurrence of this query in the given range.

 * **`findPrev`**`(state: EditorState, from?: number = state.doc.content.size, to?: number = 0) → SearchResult`\
   Find the previous occurrence of this query in the given range.
   Note that, if `to` is given, it should be _less_ than `from`.

 * **`getReplacements`**`(state: EditorState, result: SearchResult) → {from: number, to: number, insert: Slice}[]`\
   Get the ranges that should be replaced for this result. This can
   return multiple ranges when `this.replace` contains
   `$1`/`$&`-style placeholders, in which case the preserved
   content is skipped by the replacements.

   Ranges are sorted by position, and `from`/`to` positions all
   refer to positions in `state.doc`. When applying these, you'll
   want to either apply them from back to front, or map these
   positions through your transaction's current mapping.


### interface SearchResult

A matched instance of a search query. `match` will be non-null
only for regular expression queries.

 * **`from`**`: number`

 * **`to`**`: number`

 * **`match`**`: RegExpMatchArray`


These functions can be used to manipulate the active search state:

 * **`getSearchState`**`(state: EditorState) → {query: SearchQuery, range: {from: number, to: number}}`\
   Get the current active search query and searched range. Will
   return `undefined` is the search plugin isn't active.


 * **`setSearchState`**`(tr: Transaction, query: SearchQuery, range?: {from: number, to: number} = null) → Transaction`\
   Add metadata to a transaction that updates the active search query
   and searched range, when dispatched.


 * **`getMatchHighlights`**`(state: EditorState) → DecorationSet`\
   Access the decoration set holding the currently highlighted search
   matches in the document.


### Commands

 * **`findNext`**`: Command`\
   Find the next instance of the search query after the current
   selection and move the selection to it.


 * **`findPrev`**`: Command`\
   Find the previous instance of the search query and move the
   selection to it.


 * **`findNextNoWrap`**`: Command`\
   Find the next instance of the search query and move the selection
   to it. Don't wrap around at the end of document or search range.


 * **`findPrevNoWrap`**`: Command`\
   Find the previous instance of the search query and move the
   selection to it. Don't wrap at the start of the document or search
   range.


 * **`replaceNext`**`: Command`\
   Replace the currently selected instance of the search query, and
   move to the next one. Or select the next match, if none is already
   selected.


 * **`replaceNextNoWrap`**`: Command`\
   Replace the next instance of the search query. Don't wrap around
   at the end of the document.


 * **`replaceCurrent`**`: Command`\
   Replace the currently selected instance of the search query, if
   any, and keep it selected.


 * **`replaceAll`**`: Command`\
   Replace all instances of the search query.


