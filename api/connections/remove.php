<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$target = (int)($data['user_id'] ?? 0);
$me = getCurrentUserId();
if (!$target) jsonResponse(['error' => 'User ID required'], 400);
$db = getDB();
$db->prepare("DELETE FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)")->execute([$me, $target, $target, $me]);
notifyActivity('connection_removed', $me, [$target]);
jsonResponse(['success' => true, 'message' => 'Connection removed']);
