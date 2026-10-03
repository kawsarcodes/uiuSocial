<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int)($data['group_id'] ?? 0);
$name = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
if ($groupId) {
    if (!isGroupManager($groupId) && !isGroupModerator()) jsonResponse(['error' => 'Not allowed'], 403);
    $fields = [];
    $params = [];
    if ($name !== '') { $fields[] = 'name = ?'; $params[] = $name; }
    if ($description !== '') { $fields[] = 'description = ?'; $params[] = $description; }
    if ($fields) {
        $params[] = $groupId;
        $db = getDB();
        $db->prepare("UPDATE groups_table SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    }
    jsonResponse(['success' => true, 'message' => 'Group updated']);
} else {
    jsonResponse(['error' => 'Group ID required'], 400);
}
