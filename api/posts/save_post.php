<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$postId = (int)($data['post_id'] ?? 0);
if (!$postId) jsonResponse(['error' => 'Post ID required'], 400);
$db = getDB();
$me = getCurrentUserId();
$stmt = $db->prepare('SELECT id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Post not found'], 404);
$check = $db->prepare('SELECT id FROM post_saves WHERE post_id = ? AND user_id = ?');
$check->execute([$postId, $me]);
if ($row = $check->fetch()) {
    $db->prepare('DELETE FROM post_saves WHERE id = ?')->execute([$row['id']]);
    jsonResponse(['success' => true, 'saved' => false]);
} else {
    $db->prepare('INSERT INTO post_saves (post_id, user_id) VALUES (?, ?)')->execute([$postId, $me]);
    jsonResponse(['success' => true, 'saved' => true]);
}
