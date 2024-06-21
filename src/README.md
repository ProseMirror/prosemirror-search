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
