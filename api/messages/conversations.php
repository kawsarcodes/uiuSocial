<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$me = getCurrentUserId();
$db = getDB();
$connStmt = $db->prepare("SELECT connected_user_id, status FROM connections WHERE user_id = ? UNION SELECT user_id, status FROM connections WHERE connected_user_id = ?");
$connStmt->execute([$me, $me]);
$connections = [];
foreach ($connStmt->fetchAll() as $row) {
    if ($row['status'] === 'accepted') $connections[] = (int)$row['connected_user_id'];
}
$placeholders = implode(',', array_fill(0, count($connections), '?'));
$sql = "SELECT id, name, email, department, role, avatar, is_online, (SELECT COUNT(*) FROM messages WHERE (sender_id = ? AND receiver_id = id) OR (sender_id = id AND receiver_id = ?)) as msg_count FROM users WHERE id != ? AND role != 'guest' AND status = 'approved'";
if (count($connections)) {
    $sql .= " ORDER BY CASE WHEN id IN ($placeholders) THEN 0 ELSE 1 END, name ASC";
    $params = array_merge([$me, $me], $connections);
} else {
    $sql .= " ORDER BY name ASC";
    $params = [$me, $me];
}
$stmt = $db->prepare($sql);
$stmt->execute($params);
jsonResponse(['success' => true, 'conversations' => $stmt->fetchAll()]);
