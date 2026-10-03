<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$target = (int)($data['user_id'] ?? 0);
$me = getCurrentUserId();
if (!$target || $target === $me) jsonResponse(['error' => 'Invalid user'], 400);
$db = getDB();
$check = $db->prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?");
$check->execute([$me, $target]);
if ($check->fetch()) jsonResponse(['success' => true, 'following' => true]);
$db->prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)")->execute([$me, $target]);
notifyActivity('follow', $me, [$target]);
jsonResponse(['success' => true, 'following' => true]);
