<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int) ($data['group_id'] ?? 0);
$userId = (int) ($data['user_id'] ?? 0);
$action = strtolower($data['action'] ?? 'accept');

if (!isGroupManager($groupId) && !isGroupModerator()) jsonResponse(['error' => 'Not allowed'], 403);

$db = getDB();
$stmt = $db->prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'requested'");
$stmt->execute([$groupId, $userId]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Request not found'], 404);

$g = $db->prepare("SELECT name FROM groups_table WHERE id = ?");
$g->execute([$groupId]);
$groupName = $g->fetch()['name'] ?? 'the group';

$ctx = ['group_id' => $groupId, 'group_name' => $groupName];

if (in_array($action, ['accept', 'approve', 'approved'], true)) {
    $db->prepare("UPDATE group_members SET role = 'member' WHERE group_id = ? AND user_id = ?")->execute([$groupId, $userId]);
    notifyActivity('group_join_approved', getCurrentUserId(), [$userId], $ctx);
    jsonResponse(['success' => true, 'status' => 'member']);
}

$db->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")->execute([$groupId, $userId]);
notifyActivity('group_join_rejected', getCurrentUserId(), [$userId], $ctx);
jsonResponse(['success' => true, 'status' => 'declined']);
