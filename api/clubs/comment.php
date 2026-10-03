<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$postId = (int)($data['post_id'] ?? 0);
$content = trim($data['content'] ?? '');
$me = getCurrentUserId();

if (!$postId) jsonResponse(['error' => 'Post ID required'], 400);
if ($content === '') jsonResponse(['error' => 'Content required'], 400);

$db = getDB();

$checkPost = $db->prepare("SELECT cp.id, cp.user_id, cp.club_id FROM club_posts cp WHERE cp.id = ?");
$checkPost->execute([$postId]);
$post = $checkPost->fetch();
if (!$post) jsonResponse(['error' => 'Post not found'], 404);

$stmt = $db->prepare("INSERT INTO club_post_comments (post_id, user_id, content) VALUES (?, ?, ?)");
$stmt->execute([$postId, $me, $content]);

$commentId = (int) $db->lastInsertId();

$db->prepare("UPDATE club_posts SET comments_count = comments_count + 1 WHERE id = ?")->execute([$postId]);

notifyActivity('comment_club_post', $me, [$post['user_id']], [
    'post_id' => $postId,
    'club_id' => (int) $post['club_id'],
    'snippet' => $content,
]);

    $commentStmt = $db->prepare("SELECT c.id, c.content, c.created_at, u.id as author_id, u.name as author, u.avatar
                         FROM club_post_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?");
$commentStmt->execute([$commentId]);
$commentData = $commentStmt->fetch();

jsonResponse(['success' => true, 'message' => 'Comment added', 'comment' => $commentData], 201);
