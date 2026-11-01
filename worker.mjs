// Keep the live backend and approved large media on their existing host.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/music/band-with" || url.pathname.startsWith("/music/band-with/") || url.pathname.startsWith("/music/media/")) {
      url.protocol = "https:";
      url.host = "jiyiji.cn";
      url.pathname = "/webqing" + url.pathname;
      if (url.pathname === "/webqing/music/band-with") url.pathname += "/";
      return Response.redirect(url.toString(), 302);
    }
    return env.ASSETS.fetch(request);
  }
};
