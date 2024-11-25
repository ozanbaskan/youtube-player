export type YoutubePLayerEvents = 'play' | 'pause' | 'ratechange' | 'seeked' | 'ready' | 'load' | 'error' | 'sync' | 'end';

export type YoutubePLayerEventMap = Partial<Record<YoutubePLayerEvents, Function[]>>;

export interface YoutubePlayerInfo {
    playerState: -1 | 0 | 1 | 2 | 3 | 5;
    currentTime: number;
    playbackRate: number;
    videoId: string;
    timestamp: number;
}

export interface YoutubePlayerSyncOptions {
    silent?: boolean;
}

export interface YoutubePlayerOptions {
    seekedEvent?: boolean;
    sync?: boolean;
}