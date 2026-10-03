<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$other = (int) ($data['user_id'] ?? 0);
$me = getCurrentUserId();
if (!$other || $other === $me) jsonResponse(['error' => 'Invalid user'], 400);

$db = getDB();
$check = $db->prepare("SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?");
$check->execute([$me, $other]);
if ($row = $check->fetch()) {
    $db->prepare("DELETE FROM blocked_users WHERE id = ?")->execute([$row['id']]);
    jsonResponse(['success' => true, 'blocked' => false]);
}
$db->prepare("INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)")->execute([$me, $other]);
jsonResponse(['success' => true, 'blocked' => true]);
