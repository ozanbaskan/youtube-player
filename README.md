# Youtube Player

### This is a wrapper around the youtube iframe API that allows you to put youtube videos on your webpage

### This library makes it easier for you to syncronize videos

For example:

```html
<div id="my-div"></div>
<div id="my-div2"></div>
```

```javascript
const video = new YoutubePlayer({ sync: true, seekedEvent: true });
await video.start("my-div", "https://www.youtube.com/watch?v=YbJOTdZBX1g");

const video2 = new YoutubePlayer({ sync: true, seekedEvent: true });
await video2.start("my-div2", "https://www.youtube.com/watch?v=YbJOTdZBX1g");

video.on("sync", (data) => video2.sync(data, { silent: true }));
video2.on("sync", (data) => video.sync(data, { silent: true }));
```

Also exposing the underlying youtube API so you can use all of the functionalities of it.

```javascript
setTimeout(() => {
  video.internalPlayer.pauseVideo();
}, 3000);
```

When a video is changed, other videos will be synced as well

```javascript
setTimeout(() => {
  video2.changeVideo("https://www.youtube.com/watch?v=2lAe1cqCOXo");
}, 5000);
```

You can create a peer to peer connection betweeen clients and sync videos using the connection

Here is an example using peerjs:

```javascript
import Peer from "peerjs";

const video = new YoutubePlayer({ sync: true, seekedEvent: true });
await video.start("my-div", "https://www.youtube.com/watch?v=2lAe1cqCOXo");

const peer = new Peer();

peer.on("connection", (dataConnection) => {
    dataConnection.on("data", (data) => video.sync(data, { silent: true }));
})

const dataConnection = peer.connect("other-client-peer-id");
video.on("sync", (data) => dataConnection.send(data));

```

It also has the seeked event which youtube API does not expose.
It is done by polling so you have the option to disable it if you are worrying about performance.

```javascript
    const video = new YoutubePlayer({ sync: false, seekedEvent: true });

    video.on('seeked', (data) => {
        console.log('Seek detected, current video time:', video.syncInfo().currentTime);
    });
```

You can stop and remove the video from DOM using end method

```javascript
    video.end()
```