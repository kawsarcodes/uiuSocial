<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['post_id']) || !isset($data['content'])) {
    jsonResponse(['error' => 'Post ID and content are required'], 400);
}

$post_id = (int) $data['post_id'];
$content = trim($data['content']);
$parent_id = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
$user_id = getCurrentUserId();

if ($content === '') {
    jsonResponse(['error' => 'Comment cannot be empty'], 400);
}

try {
    $db = getDB();
    $checkPost = $db->prepare("SELECT id, user_id, group_id, content FROM posts WHERE id = ?");
    $checkPost->execute([$post_id]);
    $post = $checkPost->fetch();
    if (!$post) {
        jsonResponse(['error' => 'Post not found'], 404);
    }

    $parentAuthorId = null;
    if ($parent_id) {
        $p = $db->prepare("SELECT id, user_id FROM comments WHERE id = ? AND post_id = ?");
        $p->execute([$parent_id, $post_id]);
        $parent = $p->fetch();
        if (!$parent) {
            jsonResponse(['error' => 'Parent comment not found'], 404);
        }
        $parentAuthorId = (int) $parent['user_id'];
    } else {
        $parent_id = null;
    }

    $stmt = $db->prepare("INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)");
    $stmt->execute([$post_id, $user_id, $content, $parent_id]);
    $comment_id = $db->lastInsertId();

    $linkCtx = [
        'post_id' => $post_id,
        'group_id' => $post['group_id'] ?? 0,
        'snippet' => $content,
        'item_name' => ($post['group_id'] ?? null) ? 'your group post' : 'your post',
    ];

    if ($parentAuthorId) {
        notifyActivity('reply_comment', $user_id, [$parentAuthorId], $linkCtx);
    } else {
        notifyActivity('comment_post', $user_id, [$post['user_id']], $linkCtx);
    }

    $newCommentStmt = $db->prepare("
        SELECT c.id, c.content as text, c.parent_id, c.created_at,
               u.id as author_id, u.name as author, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $newCommentStmt->execute([$comment_id]);
    $newComment = $newCommentStmt->fetch();
    $newComment['replies'] = [];

    jsonResponse(['success' => true, 'message' => 'Comment added', 'comment' => $newComment], 201);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
}
