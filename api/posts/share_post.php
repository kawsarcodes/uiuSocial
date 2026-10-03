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
$db->prepare('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?')->execute([$postId]);
jsonResponse(['success' => true, 'message' => 'Post shared', 'url' => 'index.html#post-' . $postId]);
