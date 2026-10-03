<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$target = (int) ($data['user_id'] ?? 0);
$me = getCurrentUserId();
if (!$target || $target === $me) {
    jsonResponse(['error' => 'Invalid user'], 400);
}

$db = getDB();
$exists = $db->prepare("SELECT id, status FROM users WHERE id = ? AND role != 'guest' AND status = 'approved'");
$exists->execute([$target]);
if (!$exists->fetch()) jsonResponse(['error' => 'User not found'], 404);

$check = $db->prepare("SELECT id, status FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)");
$check->execute([$me, $target, $target, $me]);
if ($row = $check->fetch()) {
    jsonResponse(['error' => 'Connection already exists', 'status' => $row['status']], 409);
}

$db->prepare("INSERT INTO connections (user_id, connected_user_id, status) VALUES (?, ?, 'pending')")->execute([$me, $target]);
notifyActivity('connection_request', $me, [$target]);
jsonResponse(['success' => true, 'status' => 'sent']);
