import {
  YoutubePLayerEventMap,
  YoutubePLayerEvents,
  YoutubePlayerInfo,
  YoutubePlayerOptions,
  YoutubePlayerSyncOptions,
} from "./types";
import { extractYoutubeIdFromUrl } from "./utils";

let youtubeAPI: any;

export class YoutubePlayer {
  private seekDetectionInterval: NodeJS.Timeout;

  internalPlayer: YT.Player;

  divId: string;

  started: boolean;

  constructor(private opts?: YoutubePlayerOptions) {
    this.opts = opts || { seekedEvent: false, sync: false };
  }

  syncInfo(): YoutubePlayerInfo {
    return {
      playerState: this.internalPlayer.getPlayerState(),
      currentTime: this.internalPlayer.getCurrentTime(),
      playbackRate: this.internalPlayer.getPlaybackRate(),
      videoId: extractYoutubeIdFromUrl(this.internalPlayer.getVideoUrl()),
      timestamp: new Date().getTime(),
    };
  }

  private async handleScriptTag() {
    const id = 'ozanbaskan-youtube-player';
    if (document.getElementById(id)) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.id = id;

    const promise = new Promise((resolve) => {
      script.addEventListener("load", resolve);
    });

    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag != null) {
      if (firstScriptTag.parentNode != null) {
        firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
      } else {
        (document.head || document.body).appendChild(script);
      }
    } else {
      document.body.appendChild(script);
    }

    return promise;
  }

  /**
   *
   * @overload
   * @param {string} divId
   * @param {YT.VideoByIdSettings} videoSettings Id of the youtube video (v param in the youtube url)
   * @returns {Promise<void>}
   *
   */

   /**
   * @overload
   * @param {string} divId
   * @param {YT.VideoByMediaContentUrlSettings} videoSettings Url of the video
   * @returns {Promise<void>}
   */
  async start(
    divId: string,
    videoSettings: Partial<YT.VideoByIdSettings & YT.VideoByMediaContentUrlSettings>
  ): Promise<void> {
    if (this.started) {
      this.emit('error', new Error('Already started youtube player'));
      return;
    }
    this.started = true;

    this.divId = divId;

    await this.handleScriptTag();
    youtubeAPI = YT || youtubeAPI;

    while (!youtubeAPI.loaded) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const onError = (event: YT.OnErrorEvent) => {
      this.emit("error", new Error(`Internal player error, error state: ${event.data}`));
    };

    const onReady = (_event) => {
      this.emit("ready");
      if (videoSettings.mediaContentUrl) player.loadVideoByUrl(videoSettings as any);
      else if (videoSettings.videoId) player.loadVideoById(videoSettings as any);
      if (this.opts.seekedEvent) startSeekDetection();
      if (this.opts.sync) this.startSyncListener();
    };

    const onAutoplayBlocked = (_event) => {
      player.mute();
      player.playVideo();
    };

    const onStateChange = (event: YT.OnStateChangeEvent) => {
      const state = event.data;

      if (state === youtubeAPI.PlayerState.UNSTARTED) {
        this.emit("load");
      } else if (state === youtubeAPI.PlayerState.PLAYING) {
        this.emit("play");
      } else if (state === youtubeAPI.PlayerState.PAUSED) {
        this.emit("pause");
      }
    };

    const onPlaybackRateChange = (_event: YT.OnPlaybackRateChangeEvent) => {
      this.emit("ratechange");
    };

    const checkLastTime = (lastTime: number, divider: number) => {
      const currentTime = player.getCurrentTime();
      const diff = Math.abs(currentTime - lastTime);
      if (diff > 2) {
        this.emit("seeked");
      }
      lastTime = currentTime;
      this.seekDetectionInterval = setTimeout(() => {
        checkLastTime(lastTime, this.internalPlayer.getPlaybackRate());
      }, 500 / divider);
    };

    const startSeekDetection = () => {
      const divider = this.internalPlayer.getPlaybackRate();
      checkLastTime(0, divider);
    };

    const player: YT.Player = new youtubeAPI.Player(divId, {
      playerVars: {
        playsinline: 1,
      },
      events: {
        onReady,
        onStateChange,
        onPlaybackRateChange,
        onError,
        onAutoplayBlocked,
      },
    });

    this.internalPlayer = player;
  }

  /** @type {YoutubePLayerEventMap} */
  handlers: YoutubePLayerEventMap = {};

  /**
   * Adds an event handler for a given event.
   * @param {YoutubePlayerEvents} eventName
   * @param {YoutubePlayerEventHandler} handler
   */
  on(eventName: YoutubePLayerEvents, handler: any) {
    if (!this.handlers[eventName]) this.handlers[eventName] = [];

    this.handlers[eventName].push(handler);
  }

  off(eventName: YoutubePLayerEvents, handler: any) {
    if (!this.handlers[eventName]) return -1;

    const handlers = this.handlers[eventName];
    const length = handlers.length;

    this.handlers[eventName] = handlers.filter(
      (_handler) => _handler !== handler
    );

    return this.handlers[eventName].length - length;
  }

  startSyncListener() {
    const syncEvents: YoutubePLayerEvents[] = [
      "play",
      "pause",
      "seeked",
      "ratechange",
      "load",
    ];

    let rateLimit: NodeJS.Timeout;
    const syncEmitter = (data: YoutubePlayerInfo, event: string) => {
      if (["play", "pause", "seeked"].includes(event)) {
        clearTimeout(rateLimit);
        rateLimit = setTimeout(() => {
          this.emit("sync", data);
        }, 1000);
      } else {
        this.emit("sync", data);
      }
    };

    for (const event of syncEvents) {
      this.on(event, syncEmitter);
    }
  }

  async waitLoad() {
    return new Promise((resolve) => {
      this.on("load", resolve);
    });
  }

  emit(eventName: YoutubePLayerEvents, data?: any) {
    if (this[`silence${eventName}`]) {
      this[`silence${eventName}`] = false;
      return;
    }

    const handlers = this.handlers[eventName];
    if (handlers) {
      for (const handler of handlers)
        handler(data || this.syncInfo(), eventName);
    }
  }

  end() {
    clearTimeout(this.seekDetectionInterval);
    this.handlers = {};
    const div = document.getElementById(this.divId);
    if (div) document.getElementById(this.divId).remove();
    this.emit('end');
  }

  private silenceplay: boolean;
  private silencepause: boolean;
  private silenceseeked: boolean;
  private silenceload: boolean;

  /**
   *
   * @param {YoutubePlayerInfo} playerInfo
   * @param {YoutubePlayerSyncOptions} opts
   * @returns {Promise<void>}
   */
  async sync(playerInfo: YoutubePlayerInfo, opts?: YoutubePlayerSyncOptions): Promise<void> {
    const silence = opts?.silent || true;

    if (extractYoutubeIdFromUrl(this.internalPlayer.getVideoUrl()) !== playerInfo.videoId) {
      if (silence) this.silenceload = true;
      this.internalPlayer.loadVideoById(playerInfo.videoId, playerInfo.currentTime);
      await this.waitLoad();
    }

    const currentTimestamp = new Date().getTime();
    const timeDiff = (currentTimestamp - playerInfo.timestamp) / 1000;
    const currentTime = this.internalPlayer.getCurrentTime();
    const diff = Math.abs(playerInfo.currentTime - currentTime) - timeDiff;
    if (diff > 2) {
      if (silence) {
        this.silenceseeked = true;
        this.silenceplay = true;
        this.silencepause = true;
        setTimeout(() => {
          this.silencepause = false;
          this.silenceplay = false;
        }, 1000);
      }
      this.internalPlayer.seekTo(playerInfo.currentTime, true);
    }

    this.internalPlayer.setPlaybackRate(playerInfo.playbackRate);

    const state = playerInfo.playerState;
    if (this.internalPlayer.getPlayerState() === state) return;
    if (state === youtubeAPI.PlayerState.PLAYING) {
      if (silence) this.silenceplay = true;
      this.internalPlayer.playVideo();
    } else if (state === youtubeAPI.PlayerState.PAUSED) {
      if (silence) this.silencepause = true;
      this.internalPlayer.pauseVideo();
    }
  }
}

//@ts-ignore
if (window) window.YoutubePlayer = YoutubePlayer;
