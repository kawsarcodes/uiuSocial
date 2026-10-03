<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$messageId = (int) ($data['message_id'] ?? 0);
$me = getCurrentUserId();
if (!$messageId) jsonResponse(['error' => 'Message ID required'], 400);

$db = getDB();
$stmt = $db->prepare("SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)");
$stmt->execute([$messageId, $me, $me]);
$msg = $stmt->fetch();
if (!$msg) jsonResponse(['error' => 'Message not found'], 404);

// Deleting for everyone is the norm in chat, so both participants may remove a
// message and the thread stays consistent on both sides.
$db->prepare("DELETE FROM messages WHERE id = ?")->execute([$messageId]);

// Remove the stored file too, otherwise attachments accumulate forever.
if (!empty($msg['file_path'])) {
    $root = realpath(__DIR__ . '/../../uploads/chat');
    $candidate = realpath(__DIR__ . '/../../' . $msg['file_path']);
    if ($root && $candidate && strpos($candidate, $root . DIRECTORY_SEPARATOR) === 0 && is_file($candidate)) {
        @unlink($candidate);
    }
}

jsonResponse(['success' => true, 'message' => 'Message deleted']);
