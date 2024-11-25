import {
  YoutubePLayerEventMap,
  YoutubePLayerEvents,
  YoutubePlayerInfo,
  YoutubePlayerOptions,
  YoutubePlayerSyncOptions,
} from "./types";

let youtubeAPI: any;

export class YoutubePlayer {
  private seekDetectionInterval: NodeJS.Timeout;

  internalPlayer: YT.Player;

  videoId: string;
  divId: string;

  constructor(private opts?: YoutubePlayerOptions) {
    this.opts = opts || { seekedEvent: false, sync: false };
  }

  syncInfo(): YoutubePlayerInfo {
    return {
      playerState: this.internalPlayer.getPlayerState(),
      currentTime: this.internalPlayer.getCurrentTime(),
      playbackRate: this.internalPlayer.getPlaybackRate(),
      videoId: this.videoId,
      timestamp: new Date().getTime(),
    };
  }

  private async handleScriptTag() {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";

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

  changeVideo(videoIdOrUrl: string, tParam?: string | number) {
    let originalTParam = tParam;
    if (this.isUrl(videoIdOrUrl)) {
        ({ videoId: videoIdOrUrl, tParam } = this.parseVideoUrl(videoIdOrUrl))
    }

    if (originalTParam) {
        tParam = originalTParam;
    }

    const seconds = this.extractYoutubeSecondFromParam(tParam);


    if (this.videoId !== videoIdOrUrl) {
      this.internalPlayer.loadVideoById(videoIdOrUrl, seconds);
      this.videoId = videoIdOrUrl;
      this.silenceload = false;
    }
  }

  /**
   * @param {string} youtubeUrl
   * @returns {{ videoId: string, tParam: string }}
   */
  private parseVideoUrl(youtubeUrl: string): {
    videoId: string;
    tParam: string;
  } {
    let url: URL;

    try {
      url = new URL(youtubeUrl);
    } catch (_error) {
      throw new Error("Not a valid URL");
    }

    if (
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
        url.host
      )
    ) {
      const params = new URLSearchParams(url.toString().split("?")[1]);
      let videoId = params.get("v");
      const tParam = params.get("t");
      if (url.host === "youtu.be" && !videoId) {
        videoId = url.pathname.replace(/\//g, "");
      }
      if (!videoId) throw new Error("Not a valid youtube url");

      return { videoId, tParam };
    }
    throw new Error("Not a youtube URL");
  }

  private isUrl(url: string) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   *
   * @param {string} divId Id of the div you want to put video in
   * @param {string} videoIdOrYoutubeUrl Id of the youtube video (v param in the youtube url)
   * @param {string | number} tParam Time of the video you want to start (t param in the youtube url)
   * @returns {Promise<void>}
   *
   * @param {string} divId Id of the div you want to put video in
   * @param {string} videoIdOrYoutubeUrl Url of the video
   * @returns {Promise<void>}
   */
  async start(
    divId: string,
    videoIdOrYoutubeUrl: string,
    tParam?: string | number
  ): Promise<void> {
    await this.handleScriptTag();
    youtubeAPI = YT;

    while (!youtubeAPI.loaded) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.divId = divId;

    let originalTParam = tParam;
    if (this.isUrl(videoIdOrYoutubeUrl) || tParam === undefined) {
      ({ videoId: videoIdOrYoutubeUrl, tParam } =
        this.parseVideoUrl(videoIdOrYoutubeUrl));
    }

    if (originalTParam) {
      tParam = originalTParam;
    }

    const seconds = this.extractYoutubeSecondFromParam(tParam);

    const onError = (_event) => {
      this.emit("error", _event);
    };

    const onReady = (_event) => {
      this.emit("ready");
      player.loadVideoById(videoIdOrYoutubeUrl, seconds);
      if (this.opts.seekedEvent) startSeekDetection();
      if (this.opts.sync) this.startSyncListener();
    };

    const onAutoplayBlocked = (_event) => {
      player.mute();
      player.playVideo();
    };

    const onStateChange = (event) => {
      const state = event.data;

      if (state === youtubeAPI.PlayerState.UNSTARTED) {
        this.emit("load");
      } else if (state === youtubeAPI.PlayerState.PLAYING) {
        this.emit("play");
      } else if (state === youtubeAPI.PlayerState.PAUSED) {
        this.emit("pause");
      }
    };

    const onPlaybackRateChange = (_event) => {
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

    const player = new youtubeAPI.Player(divId, {
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
    this.videoId = videoIdOrYoutubeUrl;
  }

  private extractYoutubeSecondFromParam(tParam: string | number) {
    if (!tParam) return 0;
    if (typeof tParam === "number") return parseInt(tParam.toFixed(0));

    const regex = /(?:(\d+)m)?(?:(\d+)s)?/;
    const match = regex.exec(tParam);

    if (/^\d+$/.test(tParam)) {
      return parseInt(tParam);
    }

    if (match) {
      const minutes = parseInt(match[1] || "0");
      const seconds = parseInt(match[2] || "0");
      return minutes * 60 + seconds;
    }

    return 0;
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
  }

  private silenceplay: boolean;
  private silencepause: boolean;
  private silenceseeked: boolean;
  private silenceload: boolean;

  /**
   *
   * @param {YoutubePlayerInfo} playerInfo
   * @param {YoutubePlayerSyncOptions} opts
   * @returns {void}
   */
  async sync(playerInfo: YoutubePlayerInfo, opts?: YoutubePlayerSyncOptions) {
    const silence = opts?.silent || true;

    if (this.videoId !== playerInfo.videoId) {
      if (silence) this.silenceload = true;
      this.changeVideo(playerInfo.videoId, playerInfo.currentTime);
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
