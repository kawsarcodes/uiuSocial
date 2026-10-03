<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();

$blocked = $db->prepare("SELECT blocked_id FROM blocked_users WHERE blocker_id = ? UNION SELECT blocker_id FROM blocked_users WHERE blocked_id = ?");
    $blocked->execute([$me, $me]);
    $blockedIds = array_column($blocked->fetchAll(), 'blocked_id');

    $users = $db->prepare("SELECT id, name, email, role, avatar, department, is_online FROM users WHERE id != ? AND role != 'guest' AND status = 'approved' ORDER BY name");
    $users->execute([$me]);
    $list = $users->fetchAll();

    foreach ($list as &$u) {
        $u['blocked'] = in_array((int)$u['id'], array_map('intval', $blockedIds), true);
    $last = $db->prepare("SELECT content, created_at, sender_id FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC LIMIT 1");
    $last->execute([$me, $u['id'], $u['id'], $me]);
    $m = $last->fetch();
    $u['last_message'] = $m['content'] ?? '';
    $u['last_time'] = $m ? timeAgo($m['created_at']) : '';
}
unset($u);

jsonResponse(['success' => true, 'users' => $list]);
