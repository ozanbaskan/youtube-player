
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
  }