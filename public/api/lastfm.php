<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60, stale-while-revalidate=300');

$apiKey = getenv('LASTFM_API_KEY');
$username = getenv('LASTFM_USERNAME') ?: 'edav404';

if (!$apiKey) {
    http_response_code(503);
    echo json_encode(['message' => 'La integración con Last.fm aún no está configurada.']);
    exit;
}

$url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=' . rawurlencode($username) . '&api_key=' . rawurlencode($apiKey) . '&format=json&limit=1';
$context = stream_context_create(['http' => ['timeout' => 5, 'user_agent' => 'EDAV-OS/1.0']]);
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['message' => 'No fue posible consultar Last.fm.']);
    exit;
}

$payload = json_decode($response, true);
$track = $payload['recenttracks']['track'][0] ?? null;

if (!$track) {
    http_response_code(404);
    echo json_encode(['message' => 'No hay reproducciones recientes.']);
    exit;
}

$images = $track['image'] ?? [];
$image = end($images);
echo json_encode([
    'name' => $track['name'] ?? '',
    'artist' => $track['artist']['#text'] ?? '',
    'album' => $track['album']['#text'] ?? '',
    'image' => $image['#text'] ?? '',
    'url' => $track['url'] ?? ('https://www.last.fm/user/' . rawurlencode($username)),
    'nowPlaying' => ($track['@attr']['nowplaying'] ?? 'false') === 'true',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
