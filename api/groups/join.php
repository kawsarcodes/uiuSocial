<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int) ($data['group_id'] ?? 0);
if (!$groupId) jsonResponse(['error' => 'Group id required'], 400);

$db = getDB();
$g = $db->prepare("SELECT id, name, created_by FROM groups_table WHERE id = ?");
$g->execute([$groupId]);
$group = $g->fetch();
if (!$group) jsonResponse(['error' => 'Group not found'], 404);

$me = getCurrentUserId();
$check = $db->prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?");
$check->execute([$groupId, $me]);
if ($row = $check->fetch()) {
    jsonResponse(['success' => true, 'status' => $row['role'] === 'requested' ? 'requested' : 'joined']);
}

$db->prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'requested')")->execute([$groupId, $me]);
$ctx = ['group_id' => $groupId, 'group_name' => $group['name']];
notifyActivity('group_join_request', $me, [$group['created_by']], $ctx);
notifyActivity('group_join_request', $me, adminIds(), $ctx);
jsonResponse(['success' => true, 'status' => 'requested']);
