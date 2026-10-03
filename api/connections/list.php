<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$me = getCurrentUserId();
$db = getDB();
$json = file_get_contents('php://input');
$data = json_decode($json, true);
if ($data && isset($data['user_id'])) {
    $target = (int)$data['user_id'];
    if ($target && $target !== $me) {
        $db->prepare("DELETE FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)")->execute([$me, $target, $target, $me]);
    }
}
$conn = $db->prepare("SELECT connected_user_id, status FROM connections WHERE user_id = ?");
$conn->execute([$me]);
$accepted = [];
$pending = [];
foreach ($conn->fetchAll() as $row) {
    if ($row['status'] === 'accepted') $accepted[] = $row['connected_user_id'];
    else $pending[] = $row['connected_user_id'];
}
$placeholdersA = implode(',', array_fill(0, count($accepted), '?'));
$sql = "SELECT id, name, email, department, role, avatar, is_online, status, 0 as connection FROM users WHERE id != ? AND role != 'guest' AND status = 'approved'";
$params = [$me];
if (count($accepted)) {
    $sql .= " AND id NOT IN ($placeholdersA)";
    $params = array_merge($params, $accepted);
}
$sql .= " ORDER BY name ASC LIMIT 50";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();
foreach ($users as &$u) {
    if (in_array($u['id'], $pending)) $u['connection'] = 'sent';
    else $u['connection'] = 'none';
}
jsonResponse(['success' => true, 'users' => $users]);
