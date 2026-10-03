<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Post ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT p.*, u.id as author_id, u.name as author, u.role as author_role, u.department as author_dept, u.avatar as author_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?");
$stmt->execute([$id]);
$post = $stmt->fetch();
if (!$post) jsonResponse(['error' => 'Post not found'], 404);
$likeStmt = $db->prepare("SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?");
$likeStmt->execute([$id]);
$current = getCurrentUserId();
$liked = false;
if ($current) {
    $cl = $db->prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?");
    $cl->execute([$id, $current]);
    $liked = (bool)$cl->fetch();
}
$commentStmt = $db->prepare("SELECT c.id, c.content as text, c.parent_id, c.created_at, u.id as author_id, u.name as author, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC");
$commentStmt->execute([$id]);
$allComments = $commentStmt->fetchAll();
$byId = [];
foreach ($allComments as &$c) { $c['replies'] = []; $byId[$c['id']] = $c; }
unset($c);
$nested = [];
foreach ($allComments as $c) {
    if ($c['parent_id']) { if (isset($byId[$c['parent_id']])) $byId[$c['parent_id']]['replies'][] = $c; }
    else { $nested[] = &$byId[$c['id']]; }
}
jsonResponse(['success' => true, 'post' => [
    'id' => $post['id'], 'author' => $post['author'], 'author_id' => $post['author_id'],
    'role' => strtoupper($post['author_role']), 'dept' => $post['author_dept'],
    'time' => timeAgo($post['created_at']), 'avatar' => $post['author_avatar'],
    'content' => $post['content'], 'image' => $post['image'],
    'likes' => (int)$likeStmt->fetch()['count'], 'liked' => $liked,
    'comments' => array_values($nested), 'views_count' => (int)($post['views_count'] ?? 0),
    'shares_count' => (int)($post['shares_count'] ?? 0), 'edited_at' => $post['edited_at'] ?? null
]]);
