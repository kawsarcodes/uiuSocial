<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int)($data['group_id'] ?? 0);
$targetUserId = (int)($data['user_id'] ?? 0);
$action = $data['action'] ?? '';
$me = getCurrentUserId();
if (!$groupId || !$targetUserId) jsonResponse(['error' => 'IDs required'], 400);
if (!isGroupManager($groupId) && !isGroupModerator()) jsonResponse(['error' => 'Not allowed'], 403);
$db = getDB();
if ($action === 'admin') {
    $db->prepare("UPDATE group_members SET role = 'admin' WHERE group_id = ? AND user_id = ?")->execute([$groupId, $targetUserId]);
    jsonResponse(['success' => true, 'message' => 'Promoted to admin']);
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
