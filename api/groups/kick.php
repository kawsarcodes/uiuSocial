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

if (!isGroupManager($groupId) && !isGroupModerator()) jsonResponse(['error' => 'Not allowed'], 403);

$db = getDB();
$g = $db->prepare("SELECT created_by FROM groups_table WHERE id = ?");
$g->execute([$groupId]);
$group = $g->fetch();
if ($group && (int) $group['created_by'] === $userId && !isGroupModerator()) {
    jsonResponse(['error' => 'Cannot remove the group creator'], 403);
}

$db->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")->execute([$groupId, $userId]);

$nameStmt = $db->prepare("SELECT name FROM groups_table WHERE id = ?");
$nameStmt->execute([$groupId]);
notifyActivity('group_removed', getCurrentUserId(), [$userId], [
    'group_id' => $groupId,
    'group_name' => $nameStmt->fetch()['name'] ?? 'the group',
]);

jsonResponse(['success' => true]);
