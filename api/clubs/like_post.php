<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$postId = (int)($data['post_id'] ?? 0);
$me = getCurrentUserId();

if (!$postId) jsonResponse(['error' => 'Post ID required'], 400);

$db = getDB();

$checkPost = $db->prepare("SELECT cp.id, cp.user_id, cp.content, cp.club_id FROM club_posts cp WHERE cp.id = ?");
$checkPost->execute([$postId]);
$post = $checkPost->fetch();
if (!$post) jsonResponse(['error' => 'Post not found'], 404);

$checkLike = $db->prepare("SELECT id FROM club_post_likes WHERE post_id = ? AND user_id = ?");
$checkLike->execute([$postId, $me]);
$liked = $checkLike->fetch();

if ($liked) {
    $db->prepare("DELETE FROM club_post_likes WHERE id = ?")->execute([$liked['id']]);
    $db->prepare("UPDATE club_posts SET likes_count = likes_count - 1 WHERE id = ?")->execute([$postId]);
    $status = 'unliked';
} else {
    $db->prepare("INSERT INTO club_post_likes (post_id, user_id) VALUES (?, ?)")->execute([$postId, $me]);
    $db->prepare("UPDATE club_posts SET likes_count = likes_count + 1 WHERE id = ?")->execute([$postId]);
    $status = 'liked';
    notifyActivity('like_club_post', $me, [$post['user_id']], [
        'post_id' => $postId,
        'club_id' => (int) $post['club_id'],
        'snippet' => $post['content'] ?? '',
        'item_name' => 'your club post',
    ]);
}

$cnt = $db->prepare("SELECT COUNT(*) c FROM club_post_likes WHERE post_id = ?");
$cnt->execute([$postId]);
$likes = (int) $cnt->fetch()['c'];

jsonResponse(['success' => true, 'status' => $status, 'likes' => $likes]);
