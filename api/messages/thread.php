<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$other = (int) ($_GET['user_id'] ?? 0);
$beforeId = (int) ($_GET['before_id'] ?? 0);
$afterId = (int) ($_GET['after_id'] ?? 0);
$limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));
$markRead = ($_GET['mark_read'] ?? '1') === '1';

$me = getCurrentUserId();
if (!$other) jsonResponse(['error' => 'user_id required'], 400);
if ($other === (int) $me) jsonResponse(['error' => 'Invalid conversation'], 400);

$db = getDB();

$peer = $db->prepare("SELECT id, name, role, status, avatar, department, is_online FROM users WHERE id = ?");
$peer->execute([$other]);
$peerRow = $peer->fetch();
if (!$peerRow || $peerRow['role'] === 'guest') jsonResponse(['error' => 'User not found'], 404);

$block = $db->prepare("SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)");
$block->execute([$me, $other, $other, $me]);
$blocked = (bool) $block->fetch();

$where = "((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))";
$args = [$me, $other, $other, $me];

// Fetch one extra row so the client can tell whether an older page exists.
$fetch = $limit + 1;

if ($beforeId > 0) {
    $sql = "SELECT * FROM messages WHERE $where AND id < ? ORDER BY id DESC LIMIT ?";
    $args[] = $beforeId;
} elseif ($afterId > 0) {
    $sql = "SELECT * FROM messages WHERE $where AND id > ? ORDER BY id ASC LIMIT ?";
    $args[] = $afterId;
} else {
    $sql = "SELECT * FROM messages WHERE $where ORDER BY id DESC LIMIT ?";
}
$args[] = $fetch;

$stmt = $db->prepare($sql);
$stmt->execute($args);
$rows = $stmt->fetchAll();

$hasMore = $afterId === 0 ? count($rows) > $limit : false;
$rows = array_slice($rows, 0, $limit);
// Both the newest page and older pages come back id DESC; the client always
// renders chronologically, so flip them. Delta queries are already ASC.
if ($afterId === 0) $rows = array_reverse($rows);

$messages = [];
foreach ($rows as $r) {
    $messages[] = [
        'id' => (int) $r['id'],
        'sender_id' => (int) $r['sender_id'],
        'receiver_id' => (int) $r['receiver_id'],
        'content' => $r['content'],
        'message_type' => $r['message_type'],
        'file_name' => $r['file_name'],
        'file_size' => $r['file_size'],
        'file_mime' => $r['file_mime'],
        'reply_to' => $r['reply_to'] !== null ? (int) $r['reply_to'] : null,
        'is_read' => (int) $r['is_read'],
        'created_at' => $r['created_at'],
        'time' => date('h:i A', strtotime($r['created_at'])),
        'day' => date('Y-m-d', strtotime($r['created_at'])),
        'mine' => (int) $r['sender_id'] === (int) $me,
    ];
}

// Resolve quoted replies so the thread can show what each message replied to.
$replyIds = [];
foreach ($messages as $m) {
    if (!empty($m['reply_to'])) $replyIds[(int) $m['reply_to']] = true;
}
$replySnippets = [];
if ($replyIds) {
    $ph = implode(',', array_fill(0, count($replyIds), '?'));
    $rs = $db->prepare("SELECT id, content, file_name, message_type FROM messages WHERE id IN ($ph)");
    $rs->execute(array_keys($replyIds));
    foreach ($rs->fetchAll() as $q) {
        $replySnippets[(int) $q['id']] = $q['content'] ?: ($q['file_name'] ? 'Attachment' : '');
    }
}
foreach ($messages as &$m) {
    $m['reply_snippet'] = !empty($m['reply_to']) ? ($replySnippets[(int) $m['reply_to']] ?? null) : null;
}
unset($m);

$lastReadByPeer = 0;
$readStmt = $db->prepare(
    "SELECT MAX(mr.read_at) FROM message_reads mr
       JOIN messages m ON m.id = mr.message_id
      WHERE mr.user_id = ? AND m.sender_id = ?"
);
$readStmt->execute([$me, $other]);
$lastReadByPeer = (string) ($readStmt->fetchColumn() ?: '');

if ($markRead && !$blocked) {
    $unread = $db->prepare("SELECT id FROM messages WHERE receiver_id = ? AND sender_id = ? AND is_read = 0 ORDER BY id ASC");
    $unread->execute([$me, $other]);
    $ids = $unread->fetchAll(PDO::FETCH_COLUMN);
    if ($ids) {
        // exec() cannot bind parameters, so the IN list must go through prepare().
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $db->prepare("UPDATE messages SET is_read = 1 WHERE id IN ($ph)")->execute($ids);
        $ins = $db->prepare("INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())");
        foreach ($ids as $id) $ins->execute([$id, $me]);
        $newlyRead = array_flip(array_map('intval', $ids));
        foreach ($messages as &$m) {
            if (!$m['mine'] && isset($newlyRead[$m['id']])) $m['is_read'] = 1;
        }
        unset($m);
    }
}

jsonResponse([
    'success' => true,
    'messages' => $messages,
    'has_more' => $hasMore,
    'blocked' => $blocked,
    'peer' => $peerRow,
]);
