# prosemirror-search

[ [**WEBSITE**](https://prosemirror.net) | [**ISSUES**](https://code.haverbeke.berlin/prosemirror/prosemirror/issues) | [**FORUM**](https://discuss.prosemirror.net) | [**GITTER**](https://gitter.im/ProseMirror/prosemirror) ]

This [module](https://prosemirror.net/docs/ref/#search) defines an API
for searching through ProseMirror documents, search/replace commands,
and a plugin that highlights the matches of a given search query.

When using this module, you should either load
[`style/search.css`](https://code.haverbeke.berlin/prosemirror/prosemirror-search/src/branch/main/style/search.css)
into your page, or define your own styles for the
`ProseMirror-search-match` (search match) and
`ProseMirror-active-search-match` (the active match) classes.

The [project page](https://prosemirror.net) has more information, a
number of [examples](https://prosemirror.net/examples/) and the
[documentation](https://prosemirror.net/docs/).

This code is released under an
[MIT license](https://code.haverbeke.berlin/prosemirror/prosemirror/src/branch/main/LICENSE).
There's a [forum](http://discuss.prosemirror.net) for general
discussion and support requests, and the
[bug tracker](https://code.haverbeke.berlin/prosemirror/prosemirror/issues)
is the place to report issues.

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## API

@search

@SearchQuery

@SearchResult

These functions can be used to manipulate the active search state:

@getSearchState

@setSearchState

@getMatchHighlights

### Commands

@findNext

@findPrev

@findNextNoWrap

@findPrevNoWrap

@replaceNext

@replaceNextNoWrap

@replaceCurrent

@replaceAll
