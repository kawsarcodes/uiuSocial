<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$me = getCurrentUserId();
$db = getDB();
$stmt = $db->prepare("
    SELECT u.id, u.name, u.avatar, u.department, u.role,
           (SELECT COUNT(*) FROM connections c WHERE (c.user_id = ? OR c.connected_user_id = ?) AND c.status = 'accepted' AND (c.user_id = u.id OR c.connected_user_id = u.id)) as mutual
    FROM users u
    WHERE u.id != ? AND u.role != 'guest' AND u.status = 'approved'
    ORDER BY mutual DESC, u.name ASC LIMIT 20
");
$stmt->execute([$me, $me, $me]);
jsonResponse(['success' => true, 'users' => $stmt->fetchAll()]);
