interface YoutubeApiResult {
  kind: string;
  etag: string;
}

export interface YoutubeApiList<
  SNIPPET,
  CONTENT_DETAILS = never,
> extends YoutubeApiResult {
  nextPageToken?: string;
  pageInfo: YoutubeApiListPageInfo;
  items: YoutubeApiListItem<SNIPPET, CONTENT_DETAILS>[];
}

interface YoutubeApiListPageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface YoutubeApiListItem<
  SNIPPET,
  CONTENT_DETAILS = never,
> extends YoutubeApiResult {
  id: string;
  snippet: SNIPPET;
  contentDetails?: CONTENT_DETAILS;
}
