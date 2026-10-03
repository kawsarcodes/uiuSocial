<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$userId = (int) ($_GET['id'] ?? 0);
if ($userId <= 0) jsonResponse(['error' => 'User ID required'], 400);

$db = getDB();

$stmt = $db->prepare("
    SELECT id, name, email, student_id, department, role, avatar, about,
           is_online, status, created_at, last_seen_at, is_banned, banned_reason, banned_until
    FROM users WHERE id = ?
");
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) jsonResponse(['error' => 'User not found'], 404);

$user['is_banned'] = (int) $user['is_banned'];
$user['is_online'] = (int) $user['is_online'];

$counts = [];
$countQueries = [
    'posts' => "SELECT COUNT(*) FROM posts WHERE user_id = ?",
    'comments' => "SELECT COUNT(*) FROM comments WHERE user_id = ?",
    'connections' => "SELECT COUNT(*) FROM connections WHERE (user_id = ? OR connected_user_id = ?) AND status = 'accepted'",
    'followers' => "SELECT COUNT(*) FROM follows WHERE following_id = ?",
    'following' => "SELECT COUNT(*) FROM follows WHERE follower_id = ?",
    'groups' => "SELECT COUNT(*) FROM group_members WHERE user_id = ? AND role != 'requested'",
    'clubs' => "SELECT COUNT(*) FROM club_members WHERE user_id = ? AND role != 'requested'",
    'events' => "SELECT COUNT(*) FROM events WHERE created_by = ?",
    'reports_filed' => "SELECT COUNT(*) FROM reports WHERE reported_by = ?",
    'reports_received' => "SELECT COUNT(*) FROM reports r JOIN posts p ON p.id = r.post_id WHERE p.user_id = ?",
    'messages_sent' => "SELECT COUNT(*) FROM messages WHERE sender_id = ?",
];
foreach ($countQueries as $key => $sql) {
    $q = $db->prepare($sql);
    $q->execute($key === 'connections' ? [$userId, $userId] : [$userId]);
    $counts[$key] = (int) $q->fetchColumn();
}

$stmt = $db->prepare("SELECT id, requested_role, status, created_at FROM verification_queue WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$userId]);
$verifications = $stmt->fetchAll();

$stmt = $db->prepare("
    SELECT l.id, l.action, l.target_type, l.target_id, l.details, l.created_at, u.name AS admin_name
    FROM admin_logs l
    LEFT JOIN users u ON u.id = l.admin_id
    WHERE (l.target_type = 'user' AND l.target_id = ?)
       OR (l.target_type = 'post' AND l.target_id IN (SELECT id FROM posts WHERE user_id = ?))
    ORDER BY l.created_at DESC
    LIMIT 25
");
$stmt->execute([$userId, $userId]);
$history = $stmt->fetchAll();
foreach ($history as &$h) {
    $h['time'] = timeAgo($h['created_at']);
}
unset($h);

$stmt = $db->prepare("
    SELECT r.id, r.reason, r.reason_label, r.status, r.created_at, p.id AS post_id, p.content
    FROM reports r
    JOIN posts p ON p.id = r.post_id
    WHERE p.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 15
");
$stmt->execute([$userId]);
$reports = $stmt->fetchAll();
foreach ($reports as &$r) {
    $r['content'] = mb_substr((string) $r['content'], 0, 160);
    $r['time'] = timeAgo($r['created_at']);
}
unset($r);

$stmt = $db->prepare("SELECT id, content, image, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
$stmt->execute([$userId]);
$recentPosts = $stmt->fetchAll();
foreach ($recentPosts as &$p) {
    $p['content'] = mb_substr((string) $p['content'], 0, 140);
    $p['time'] = timeAgo($p['created_at']);
}
unset($p);

jsonResponse([
    'success' => true,
    'user' => $user,
    'counts' => $counts,
    'verifications' => $verifications,
    'history' => $history,
    'reports' => $reports,
    'recent_posts' => $recentPosts,
]);
