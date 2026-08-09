# YouTube Info Export

A local-first sync and parser tool for YouTube channels. Automatically fetch video metadata from YouTube API and parse
video transcripts, titles, and descriptions. Built with NestJS and TypeScript.

> **Note**: This is not a traditional API. It's designed as a standalone CLI/background service that syncs data locally
> and exports results to JSON.

## Features

- **YouTube Channel Sync** - Sync all videos from a YouTube channel using the official YouTube API
- **Metadata Parsing** - Extract and parse video titles, descriptions, and content
- **Content Type Recognition** - Intelligently categorize different types of video content (audio commentary, podcast,
  express, etc.)
- **Media Database Integration** - Sync with TMDb (The Movie Database) for enriched metadata
- **JSON Export** - Export all parsed data to JSON files for further processing
- **Local-First** - All data stored locally in MySQL database
- **Type-Safe** - Built with TypeScript and Zod validation

## Quick Start

### Prerequisites

- **Node.js** 18+
- **npm**
- **MySQL** 8.0+
- **YouTube Data API key** (from [Google Cloud Console](https://console.cloud.google.com/))
- *(Optional)* **TMDb API key** (from [TMDb](https://www.themoviedb.org/settings/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/youtube-info-export.git
cd youtube-info-export

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
# Application
APP_PORT=3000

# MySQL Database
SQL_HOST=localhost
SQL_PORT=3306
SQL_USER=root
SQL_PWD=your_password
SQL_DB=youtube_export

# API Keys
YOUTUBE_API_KEY=your_youtube_api_key
TMDB_API_KEY=your_tmdb_api_key (optional)
```

## Usage

### Start the Service

```bash
# Development mode (with hot reload)
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

The service will start on `http://localhost:3000` by default.

### API Endpoints

Access the interactive Swagger UI at `http://localhost:3000/api`

#### Filmbaratok Module

**POST** `/filmbaratok/sync-youtube-channel`

- Sync all videos from the YouTube channel
- Query param: `doParse=true/false` - Optionally parse videos immediately after sync
- *Syncs only new videos on subsequent runs*

**POST** `/filmbaratok/parse-videos`

- Parse all videos currently in the database
- Extracts metadata and categorizes content

**POST** `/filmbaratok/sync-tmdb`

- Sync media metadata with TMDb database
- Query param: `onlyKnownMedia=true/false` - Only sync media that exists in TMDb

**POST** `/filmbaratok/export-json`

- Export all data from database to JSON files
- Results saved to the `data` directory