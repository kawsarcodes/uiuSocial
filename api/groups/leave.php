<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int)($data['group_id'] ?? 0);
$me = getCurrentUserId();
if (!$groupId) jsonResponse(['error' => 'Group ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?");
$stmt->execute([$groupId, $me]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Not a member'], 403);

$g = $db->prepare("SELECT created_by FROM groups_table WHERE id = ?");
$g->execute([$groupId]);
$group = $g->fetch();
if ($group && (int) $group['created_by'] === (int) $me && !isGroupModerator()) {
    jsonResponse(['error' => 'Group creators cannot leave. Use "Delete Group" to remove the group instead.'], 403);
}

$db->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")->execute([$groupId, $me]);
jsonResponse(['success' => true, 'message' => 'Left group']);
