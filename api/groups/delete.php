<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$groupId = (int)($data['group_id'] ?? 0);
if (!$groupId) jsonResponse(['error' => 'Group ID required'], 400);
if (!isGroupManager($groupId) && !isGroupModerator()) jsonResponse(['error' => 'Not allowed'], 403);
$db = getDB();
$db->prepare("DELETE FROM group_members WHERE group_id = ?")->execute([$groupId]);
$db->prepare("DELETE FROM posts WHERE group_id = ?")->execute([$groupId]);
$db->prepare("DELETE FROM groups_table WHERE id = ?")->execute([$groupId]);
jsonResponse(['success' => true, 'message' => 'Group deleted']);
