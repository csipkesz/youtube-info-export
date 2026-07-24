import { YoutubeApiList } from './youtube-api-list.interface';

interface YoutubeApiChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: Partial<
    Record<
      'default' | 'medium' | 'high',
      {
        url: string;
        width: number;
        height: number;
      }
    >
  >;
}

interface YoutubeApiChannelContentDetails {
  relatedPlaylists: {
    uploads: string;
  };
}

export type YoutubeApiChannelList = YoutubeApiList<
  YoutubeApiChannelSnippet,
  YoutubeApiChannelContentDetails
>;
