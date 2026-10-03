<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$current = getCurrentUserId();
$groupId = isset($_GET['group_id']) ? (int) $_GET['group_id'] : 0;
$userId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;

$sql = "SELECT p.id, p.content, p.image, p.created_at, p.group_id,
               u.id as author_id, u.name as author_name, u.role as author_role, u.department as author_dept, u.avatar as author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id";
$where = [];
$params = [];
if ($groupId) {
    $where[] = "p.group_id = ?";
    $params[] = $groupId;
} else {
    $where[] = "p.group_id IS NULL";
}
if ($userId) {
    $where[] = "p.user_id = ?";
    $params[] = $userId;
}
$sql .= " WHERE " . implode(' AND ', $where) . " ORDER BY p.created_at DESC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$posts = $stmt->fetchAll();

$result = [];
foreach ($posts as $post) {
    $post_id = $post['id'];
    $likeStmt = $db->prepare("SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?");
    $likeStmt->execute([$post_id]);
    $likesCount = $likeStmt->fetch()['count'];

    $liked = false;
    if ($current) {
        $checkLikeStmt = $db->prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?");
        $checkLikeStmt->execute([$post_id, $current]);
        $liked = (bool) $checkLikeStmt->fetch();
    }

    $commentStmt = $db->prepare("
        SELECT c.id, c.content as text, c.parent_id, c.created_at,
               u.id as author_id, u.name as author, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ");
    $commentStmt->execute([$post_id]);
    $allComments = $commentStmt->fetchAll();
    $byId = [];
    foreach ($allComments as &$c) {
        $c['replies'] = [];
        $byId[$c['id']] = $c;
    }
    unset($c);
    $nested = [];
    foreach ($allComments as $c) {
        if ($c['parent_id']) {
            if (isset($byId[$c['parent_id']])) {
                $byId[$c['parent_id']]['replies'][] = $c;
            }
        } else {
            $nested[] = &$byId[$c['id']];
        }
    }

    $result[] = [
        'id' => $post['id'],
        'author' => $post['author_name'],
        'author_id' => $post['author_id'],
        'role' => strtoupper($post['author_role']),
        'dept' => $post['author_dept'],
        'time' => timeAgo($post['created_at']),
        'avatar' => $post['author_avatar'],
        'content' => $post['content'],
        'image' => $post['image'],
        'likes' => (int) $likesCount,
        'liked' => $liked,
        'comments' => array_values($nested),
        'group_id' => $post['group_id']
    ];
}

jsonResponse(['success' => true, 'posts' => $result]);
