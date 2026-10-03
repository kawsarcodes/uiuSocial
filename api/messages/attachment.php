<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();

$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    jsonResponse(['error' => 'Attachment not found'], 404);
}

$db = getDB();
$me = getCurrentUserId();

$stmt = $db->prepare("SELECT id, sender_id, receiver_id, file_path, file_mime, file_name, message_type FROM messages WHERE id = ?");
$stmt->execute([$id]);
$msg = $stmt->fetch();

// Same response for "does not exist" and "not yours" so the endpoint cannot be
// used to probe which attachment ids are valid.
if (!$msg || !in_array((string) $msg['message_type'], ['file', 'image'], true)) {
    jsonResponse(['error' => 'Attachment not found'], 404);
}
if ((int) $msg['sender_id'] !== (int) $me && (int) $msg['receiver_id'] !== (int) $me) {
    jsonResponse(['error' => 'Attachment not found'], 404);
}

$relative = (string) $msg['file_path'];
$root = realpath(__DIR__ . '/../../uploads/chat');
if (!$root || $relative === '' || strpos($relative, 'uploads/chat/') !== 0) {
    jsonResponse(['error' => 'Attachment not found'], 404);
}

$candidate = realpath(__DIR__ . '/../../' . $relative);
if (!$candidate || strpos($candidate, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($candidate)) {
    jsonResponse(['error' => 'Attachment not found'], 404);
}

$mime = (string) $msg['file_mime'];
$isImage = (string) $msg['message_type'] === 'image' || str_starts_with($mime, 'image/');
$downloadName = (string) $msg['file_name'];
if ($downloadName === '') $downloadName = basename($candidate);
// Strip anything that could break out of the header or forge an extension.
$downloadName = str_replace(["\r", "\n", '"', '\\', '/'], '', $downloadName);
$downloadName = trim($downloadName) ?: 'attachment';

// Re-derive a safe Content-Type: only real image types may render inline.
$contentType = 'application/octet-stream';
if ($isImage && in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
    $contentType = $mime;
}

header('Content-Type: ' . $contentType);
header('X-Content-Type-Options: nosniff');
header('Content-Security-Policy: default-src \'none\'; img-src \'self\'; sandbox');
header('Cache-Control: private, no-store, max-age=0');
header('Content-Disposition: ' . ($isImage ? 'inline' : 'attachment') . '; filename="' . $downloadName . '"');
header('Content-Length: ' . filesize($candidate));

if (ob_get_level()) ob_end_clean();
readfile($candidate);
exit;
