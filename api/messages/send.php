<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

/*
 * A message is either plain JSON (text only) or multipart/form-data (text and/or
 * an attachment). The file is validated and stored in the same request that
 * inserts the row, so a stored file can never exist without a message, and
 * every attachment is provably owned by the sender.
 */
$isMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
if ($isMultipart) {
    $to = (int) ($_POST['receiver_id'] ?? 0);
    $content = trim((string) ($_POST['content'] ?? ''));
    $replyTo = (int) ($_POST['reply_to'] ?? 0);
    $clientId = substr((string) ($_POST['client_id'] ?? ''), 0, 64);
    $hasFile = isset($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE;
} else {
    $data = json_decode(file_get_contents('php://input'), true);
    $data = is_array($data) ? $data : [];
    $to = (int) ($data['receiver_id'] ?? 0);
    $content = trim((string) ($data['content'] ?? ''));
    $replyTo = (int) ($data['reply_to'] ?? 0);
    $clientId = substr((string) ($data['client_id'] ?? ''), 0, 64);
    $hasFile = false;
}

$me = getCurrentUserId();
if (!$to) jsonResponse(['error' => 'Recipient required'], 400);
if ($content === '' && !$hasFile) jsonResponse(['error' => 'Message required'], 400);
if (mb_strlen($content) > 5000) jsonResponse(['error' => 'Message is too long (5000 characters max)'], 400);
if ($to === (int) $me) jsonResponse(['error' => 'You cannot message yourself'], 400);

$db = getDB();

$recipient = $db->prepare("SELECT id FROM users WHERE id = ? AND role != 'guest'");
$recipient->execute([$to]);
if (!$recipient->fetch()) jsonResponse(['error' => 'Recipient not found'], 404);

$block = $db->prepare("SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)");
$block->execute([$me, $to, $to, $me]);
if ($block->fetch()) jsonResponse(['error' => 'This conversation is blocked'], 403);

$rate = $db->prepare("SELECT COUNT(*) FROM messages WHERE sender_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
$rate->execute([$me]);
if ((int) $rate->fetchColumn() > 60) {
    jsonResponse(['error' => 'Slow down, you are sending too quickly'], 429);
}

$type = 'text';
$stored = null;
if ($hasFile) {
    $stored = storeChatAttachment('attachment');
    if (!$stored['ok']) jsonResponse(['error' => $stored['error']], 400);
    $type = $stored['kind'] === 'image' ? 'image' : 'file';
}

if ($replyTo) {
    $check = $db->prepare(
        "SELECT id FROM messages
          WHERE id = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))"
    );
    $check->execute([$replyTo, $me, $to, $to, $me]);
    if (!$check->fetch()) $replyTo = 0;
}

try {
    $insert = $db->prepare(
        "INSERT INTO messages
            (sender_id, receiver_id, content, message_type, file_path, file_mime, file_name, file_size, reply_to, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
    );
    $insert->execute([
        $me,
        $to,
        $content !== '' ? $content : null,
        $type,
        $stored['path'] ?? null,
        $stored['mime'] ?? null,
        $stored['name'] ?? null,
        $stored['size'] ?? null,
        $replyTo ?: null,
    ]);
} catch (PDOException $e) {
    // Do not leave an orphaned file behind if the row could not be written.
    if ($stored && !empty($stored['path'])) {
        $orphan = __DIR__ . '/../../' . $stored['path'];
        if (is_file($orphan)) @unlink($orphan);
    }
    error_log('send.php insert failed: ' . $e->getMessage());
    jsonResponse(['error' => 'Message could not be sent'], 500);
}

$messageId = (int) $db->lastInsertId();

$snippet = $content !== '' ? $content : 'Sent an attachment: ' . ($stored['name'] ?? 'file');
notifyActivity('message', $me, [$to], ['snippet' => $snippet]);

jsonResponse([
    'success' => true,
    'message_id' => $messageId,
    'client_id' => $clientId,
    'message' => [
        'id' => $messageId,
        'sender_id' => $me,
        'receiver_id' => $to,
        'content' => $content !== '' ? $content : null,
        'message_type' => $type,
        'file_name' => $stored['name'] ?? null,
        'file_size' => $stored['size'] ?? null,
        'file_mime' => $stored['mime'] ?? null,
        'is_read' => 1,
        'created_at' => date('Y-m-d H:i:s'),
        'time' => date('h:i A'),
        'mine' => true,
    ],
], 201);
