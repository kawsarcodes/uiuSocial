<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = (int) ($data['announcement_id'] ?? 0);
$content = trim($data['content'] ?? '');
if ($content === '') jsonResponse(['error' => 'Comment cannot be empty'], 400);

$db = getDB();
$me = getCurrentUserId();

$ann = $db->prepare("SELECT id, created_by, club_id, title FROM announcements WHERE id = ?");
$ann->execute([$id]);
$announcement = $ann->fetch();
if (!$announcement) jsonResponse(['error' => 'Announcement not found'], 404);

$stmt = $db->prepare("INSERT INTO announcement_comments (announcement_id, user_id, content) VALUES (?, ?, ?)");
$stmt->execute([$id, $me, $content]);
$cid = $db->lastInsertId();

notifyActivity('comment_announcement', $me, [$announcement['created_by']], [
    'post_id' => (int) $id,
    'club_id' => $announcement['club_id'] ?? 0,
    'snippet' => $content,
]);
$c = $db->prepare("SELECT ac.id, ac.content, ac.created_at, u.id as author_id, u.name as author, u.avatar FROM announcement_comments ac JOIN users u ON u.id = ac.user_id WHERE ac.id = ?");
$c->execute([$cid]);
jsonResponse(['success' => true, 'comment' => $c->fetch()], 201);
