<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$data = is_array($data) ? $data : [];
$messageId = (int) ($data['message_id'] ?? 0);
$peerId = (int) ($data['user_id'] ?? 0);

$me = getCurrentUserId();
$db = getDB();

if ($messageId) {
    // Only the recipient may mark a given message read.
    $stmt = $db->prepare("SELECT id FROM messages WHERE id = ? AND receiver_id = ?");
    $stmt->execute([$messageId, $me]);
    if (!$stmt->fetch()) jsonResponse(['error' => 'Message not found'], 404);
    $db->prepare("INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())")->execute([$messageId, $me]);
    $db->prepare("UPDATE messages SET is_read = 1 WHERE id = ?")->execute([$messageId]);
    jsonResponse(['success' => true, 'message_id' => $messageId]);
}

if ($peerId) {
    // Mark a single conversation read, so the sender's read receipts fire.
    if ($peerId === (int) $me) jsonResponse(['error' => 'Invalid conversation'], 400);
    $stmt = $db->prepare("SELECT id FROM messages WHERE receiver_id = ? AND sender_id = ? AND is_read = 0 ORDER BY id ASC");
    $stmt->execute([$me, $peerId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
} else {
    $stmt = $db->prepare("SELECT id FROM messages WHERE receiver_id = ? AND is_read = 0");
    $stmt->execute([$me]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
}

if ($ids) {
    // exec() cannot bind parameters, so the IN list must go through prepare().
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $db->prepare("UPDATE messages SET is_read = 1 WHERE id IN ($ph)")->execute($ids);
    $ins = $db->prepare("INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())");
    foreach ($ids as $id) $ins->execute([$id, $me]);
}

jsonResponse(['success' => true, 'count' => count($ids)]);
