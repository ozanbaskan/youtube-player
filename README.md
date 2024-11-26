# Youtube Player

### This is a wrapper around the youtube iframe API that allows you to put youtube videos on your webpage

### This library makes it easier for you to syncronize videos

[![NPM version](https://badge.fury.io/js/%40ozanbaskan%2Fyoutube-player.svg)](https://www.npmjs.com/package/@ozanbaskan/youtube-player)

```bash
npm install --save-dev @ozanbaskan/youtube-player
```

For example:

```html
<div id="my-div"></div>
<div id="my-div2"></div>
```

```javascript
const player = new YoutubePlayer({ sync: true, seekedEvent: true });
await player.start("my-div", { videoId: "YbJOTdZBX1g" });

const player2 = new YoutubePlayer({ sync: true, seekedEvent: true });
await player2.start("my-div2", { videoId: "YbJOTdZBX1g" });

player.on("sync", (data) => player2.sync(data, { silent: true }));
player2.on("sync", (data) => player.sync(data, { silent: true }));
```

Also exposing the underlying youtube API so you can use all of the functionalities of it.

```javascript
setTimeout(() => {
  player.internalPlayer.pauseVideo();
}, 3000);
```

When a video is changed, other videos will be synced as well

```javascript
setTimeout(() => {
  player2.internalPlayer.loadVideoById({ videoId: "2lAe1cqCOXo" });
}, 5000);
```

You can create a peer to peer connection betweeen clients and sync videos using the connection

Here is an example using peerjs:

```javascript
import Peer from "peerjs";

const player = new YoutubePlayer({ sync: true, seekedEvent: true });
await player.start("my-div", { videoId: "2lAe1cqCOXo" });

const peer = new Peer();

peer.on("connection", (dataConnection) => {
  dataConnection.on("data", (data) => player.sync(data, { silent: true }));
});

const dataConnection = peer.connect("other-client-peer-id");
player.on("sync", (data) => dataConnection.send(data));
```

It also has the seeked event which youtube API does not expose.
It is done by polling so you have the option to disable it if you are worrying about performance.

```javascript
const player = new YoutubePlayer({ sync: false, seekedEvent: true });

player.on("seeked", (data) => {
  console.log(
    "Seek detected, current video time:",
    player.syncInfo().currentTime
  );
});
```

You can stop and remove the video from DOM using end method

```javascript
video.end();
```
