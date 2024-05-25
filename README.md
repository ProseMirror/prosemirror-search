Item search is missing from the doc template
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

 * **`getReplacement`**`(state: EditorState, result: SearchResult) → Slice`\
   Get a replacement slice for a given search result.


### interface SearchResult

A matched instance of a search query. `match` will be non-null
only for regular expression queries.

 * **`from`**`: number`

 * **`to`**`: number`

 * **`match`**`: RegExpMatchArray`


 * **`search`**`(options?: {initialQuery?: SearchQuery, initialRange?: {from: number, to: number}} = {}) → Plugin`\
   Returns a plugin that stores a current search query and searched
   range, and highlights matches of the query.


 * **`getSearchState`**`(state: EditorState) → {query: SearchQuery, range: {from: number, to: number}}`\
   Get the current active search query and searched range. Will
   return `undefined` is the search plugin isn't active.


 * **`setSearchState`**`(tr: Transaction, query: SearchQuery, range?: {from: number, to: number} = null) → Transaction`\
   Add metadata to a transaction that updates the active search query
   and searched range, when dispatched.


 * **`findNext`**`: Command`\
   Find the next instance of the search query after the current
   selection and move the selection to it.


 * **`findNextNoWrap`**`: Command`\
   Find the next instance of the search query and move the selection
   to it. Don't wrap around at the end of document or search range.


 * **`findPrev`**`: Command`\
   Find the previous instance of the search query and move the
   selection to it.


 * **`findPrevNoWrap`**`: Command`\
   Find the previous instance of the search query and move the
   selection to it. Don't wrap at the start of the document or search
   range.


 * **`replaceNext`**`: Command`\
   Replace the next instance of the search query.


 * **`replaceNextNoWrap`**`: Command`\
   Replace the next instance of the search query. Don't wrap around
   at the end of the document.


 * **`replaceAll`**`: Command`\
   Replace all instances of the search query.

