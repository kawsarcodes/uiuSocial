<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$clubId = (int)($_GET['club_id'] ?? 0);
if (!$clubId) jsonResponse(['error' => 'Club ID required'], 400);

$db = getDB();
$me = getCurrentUserId();

$stmt = $db->prepare("SELECT c.id FROM clubs c WHERE c.id = ?");
$stmt->execute([$clubId]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Club not found'], 404);

$stmt = $db->prepare("SELECT p.id, p.content, p.likes_count, p.comments_count, p.created_at,
               u.id as author_id, u.name as author_name, u.avatar as author_avatar, u.role as author_role
               FROM club_posts p JOIN users u ON p.user_id = u.id
               WHERE p.club_id = ? ORDER BY p.created_at DESC");
$stmt->execute([$clubId]);
$posts = $stmt->fetchAll();

$result = [];
foreach ($posts as $post) {
    $isLiked = false;
    if ($me) {
        $likeCheck = $db->prepare("SELECT id FROM club_post_likes WHERE post_id = ? AND user_id = ?");
        $likeCheck->execute([$post['id'], $me]);
        $isLiked = (bool) $likeCheck->fetch();
    }

    $comments = [];
    $cmtStmt = $db->prepare("SELECT c.id, c.content, c.created_at, u.id as author_id, u.name as author, u.avatar
                             FROM club_post_comments c JOIN users u ON c.user_id = u.id
                             WHERE c.post_id = ? ORDER BY c.created_at ASC");
    $cmtStmt->execute([$post['id']]);
    $comments = $cmtStmt->fetchAll();

    $result[] = [
        'id' => $post['id'],
        'author' => $post['author_name'],
        'author_id' => $post['author_id'],
        'author_avatar' => $post['author_avatar'],
        'role' => strtoupper($post['author_role']),
        'time' => timeAgo($post['created_at']),
        'content' => $post['content'],
        'likes' => (int) $post['likes_count'],
        'liked' => $isLiked,
        'comments' => $comments,
        'comments_count' => (int) $post['comments_count'],
    ];
}

jsonResponse(['success' => true, 'posts' => $result]);
