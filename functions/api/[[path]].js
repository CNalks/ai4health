export async function onRequest(context) {
  var url = new URL(context.request.url);
  var upstream = new URL(url.pathname + url.search, "http://129.211.228.122");
  var request = new Request(upstream.toString(), context.request);
  return fetch(request);
}
