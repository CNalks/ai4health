export async function onRequest(context) {
  var url = new URL(context.request.url);
  var upstream = new URL(url.pathname + url.search, 'http://1.13.141.254');
  var request = new Request(upstream.toString(), context.request);
  return fetch(request);
}
