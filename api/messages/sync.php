<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$me = (int) getCurrentUserId();
$db = getDB();

/*
 * One row per conversation partner. Two derived tables do the grouping:
 *   a  -> the newest message id in each conversation the user started
 *   un -> how many unread messages each peer has sent them
 * The newest message row itself is then joined back in to get its preview text.
 */
$sql = "
    SELECT
        u.id,
        u.name,
        u.avatar,
        u.department,
        u.role,
        u.is_online,
        a.last_id            AS last_id,
        lm.created_at        AS last_time,
        lm.message_type      AS last_type,
        lm.content           AS last_content,
        lm.sender_id         AS last_sender,
        COALESCE(un.cnt, 0)  AS unread
    FROM users u
    LEFT JOIN (
        SELECT receiver_id AS peer, MAX(id) AS last_id
          FROM messages
         WHERE sender_id = ?
         GROUP BY receiver_id
    ) a ON a.peer = u.id
    LEFT JOIN messages lm ON lm.id = a.last_id
    LEFT JOIN (
        SELECT sender_id AS peer, COUNT(*) AS cnt
          FROM messages
         WHERE receiver_id = ? AND is_read = 0
         GROUP BY sender_id
    ) un ON un.peer = u.id
    WHERE u.id != ?
      AND u.role != 'guest'
      AND u.status = 'approved'
    ORDER BY (a.last_id IS NULL) ASC, lm.created_at DESC, u.name ASC
";

$stmt = $db->prepare($sql);
$stmt->execute([$me, $me, $me]);
$rows = $stmt->fetchAll();

$blockedStmt = $db->prepare("SELECT blocked_id FROM blocked_users WHERE blocker_id = ?");
$blockedStmt->execute([$me]);
$blockedSet = array_flip(array_map('intval', $blockedStmt->fetchAll(PDO::FETCH_COLUMN)));

$conversations = [];
foreach ($rows as $r) {
    $lastId = $r['last_id'] !== null ? (int) $r['last_id'] : 0;
    $lastSender = $r['last_sender'] !== null ? (int) $r['last_sender'] : 0;
    $type = (string) ($r['last_type'] ?? '');
    $mine = $lastSender === $me;

    if (!$lastId) {
        $preview = 'No messages yet';
    } elseif ($type === 'image') {
        $preview = $mine ? 'You sent an image' : 'Sent an image';
    } elseif ($type === 'file') {
        $preview = $mine ? 'You sent a file' : 'Sent a file';
    } else {
        $text = (string) ($r['last_content'] ?? '');
        $preview = $mine ? 'You: ' . $text : $text;
    }
    if (mb_strlen($preview) > 60) $preview = mb_substr($preview, 0, 60) . '…';

    $conversations[] = [
        'id' => (int) $r['id'],
        'name' => $r['name'],
        'avatar' => $r['avatar'],
        'department' => $r['department'],
        'role' => $r['role'],
        'is_online' => (int) $r['is_online'] === 1,
        'last_id' => $lastId,
        'last_time' => $r['last_time'] ? date('h:i A', strtotime($r['last_time'])) : '',
        'last_mine' => $lastId ? $mine : false,
        'preview' => $preview,
        'unread' => (int) $r['unread'],
        'blocked' => isset($blockedSet[(int) $r['id']]),
    ];
}

jsonResponse([
    'success' => true,
    'conversations' => $conversations,
    'total_unread' => array_sum(array_column($conversations, 'unread')),
]);
