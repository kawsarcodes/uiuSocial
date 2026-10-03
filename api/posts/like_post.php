<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['post_id'])) {
    jsonResponse(['error' => 'Post ID is required'], 400);
}

$post_id = (int) $data['post_id'];
$user_id = getCurrentUserId();

try {
    $db = getDB();
    $checkPost = $db->prepare("SELECT id, user_id, group_id, content FROM posts WHERE id = ?");
    $checkPost->execute([$post_id]);
    $post = $checkPost->fetch();
    if (!$post) {
        jsonResponse(['error' => 'Post not found'], 404);
    }

    $checkLike = $db->prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?");
    $checkLike->execute([$post_id, $user_id]);
    $liked = $checkLike->fetch();

    if ($liked) {
        $db->prepare("DELETE FROM post_likes WHERE id = ?")->execute([$liked['id']]);
        $status = 'unliked';
    } else {
        $db->prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)")->execute([$post_id, $user_id]);
        $status = 'liked';
        notifyActivity('like_post', $user_id, [$post['user_id']], [
            'post_id' => $post_id,
            'group_id' => $post['group_id'] ?? 0,
            'snippet' => $post['content'] ?? '',
            'item_name' => ($post['group_id'] ?? null) ? 'your group post' : 'your post',
        ]);
    }

    $countStmt = $db->prepare("SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?");
    $countStmt->execute([$post_id]);
    jsonResponse(['success' => true, 'status' => $status, 'likes' => (int) $countStmt->fetch()['count']]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
}
