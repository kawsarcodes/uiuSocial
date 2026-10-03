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
$stmt = $db->prepare('SELECT id, user_id, group_id, content FROM posts WHERE id = ?');
$stmt->execute([$postId]);
$post = $stmt->fetch();
if (!$post) jsonResponse(['error' => 'Post not found'], 404);
if ((int)$post['user_id'] !== (int)$me && !isAdmin()) jsonResponse(['error' => 'Not allowed'], 403);
$content = trim($data['content'] ?? '');
if ($content === '') jsonResponse(['error' => 'Content required'], 400);
$db->prepare('UPDATE posts SET content = ?, edited_at = NOW() WHERE id = ?')->execute([$content, $postId]);
if ((int)$post['user_id'] !== (int)$me) {
    notifyActivity('post_edited', $me, [$post['user_id']], [
        'post_id' => $postId,
        'group_id' => $post['group_id'] ?? 0,
        'snippet' => $content,
    ]);
}
jsonResponse(['success' => true, 'message' => 'Post updated']);
