import { YoutubeApiList } from './youtube-api-list.interface';

interface YoutubeApiPlaylistVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: Partial<
    Record<
      'default' | 'medium' | 'high' | 'standard' | 'maxres',
      {
        url: string;
        width: number;
        height: number;
      }
    >
  >;
  channelTitle: string;
  playlistId: string;
  position: number;
  resourceId: {
    kind: string;
    videoId: string;
  };
  videoOwnerChannelTitle: string;
  videoOwnerChannelId: string;
}

export type YoutubeApiPlaylistVideoList =
  YoutubeApiList<YoutubeApiPlaylistVideoSnippet>;
