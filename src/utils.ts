export const extractYoutubeSecondsFromParam = (tParam: string | number) => {
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
};

export const extractYoutubeIdFromUrl = (youtubeUrl: string) => {
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
    if (url.host === "youtu.be" && !videoId) {
      videoId = url.pathname.replace(/\//g, "");
    }
    if (!videoId) throw new Error("Not a valid youtube url");

    return videoId;
  }
  throw new Error("Not a youtube URL");
};
