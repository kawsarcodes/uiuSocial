<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $data = is_array($data) ? $data : [];

    if (!empty($data['all'])) {
        $db->prepare("DELETE FROM notifications WHERE user_id = ?")->execute([$me]);
        jsonResponse(['success' => true, 'cleared' => true]);
    }

    if (!empty($data['id'])) {
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")->execute([(int) $data['id'], $me]);
    } else {
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")->execute([$me]);
    }
    jsonResponse(['success' => true]);
}

$limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 30;
$onlyUnread = isset($_GET['unread']) && $_GET['unread'] === '1';

$sql = "SELECT n.*, u.name AS actor_name, u.avatar AS actor_avatar, u.role AS actor_role
        FROM notifications n
        LEFT JOIN users u ON u.id = n.actor_id
        WHERE n.user_id = ?";
if ($onlyUnread) $sql .= " AND n.is_read = 0";
$sql .= " ORDER BY n.created_at DESC, n.id DESC LIMIT $limit";

$stmt = $db->prepare($sql);
$stmt->execute([$me]);
$rows = $stmt->fetchAll();

foreach ($rows as &$n) {
    $n['time'] = timeAgo($n['created_at']);
    $n['is_read'] = (int) $n['is_read'];
    $n['id'] = (int) $n['id'];
    $n['actor_id'] = $n['actor_id'] !== null ? (int) $n['actor_id'] : null;
    $n['icon'] = notificationIconClass($n['type']);
    $n['color'] = notificationIconColor($n['type']);
}
unset($n);

$unread = $db->prepare("SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0");
$unread->execute([$me]);
$unreadCount = (int) $unread->fetch()['c'];

jsonResponse(['success' => true, 'notifications' => $rows, 'unread' => $unreadCount]);
