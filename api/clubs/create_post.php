<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$db = getDB();
$me = getCurrentUserId();
$clubId = (int)($_POST['club_id'] ?? 0);
$content = trim($_POST['content'] ?? '');

if (!$clubId) jsonResponse(['error' => 'Club ID required'], 400);
if ($content === '') jsonResponse(['error' => 'Content required'], 400);

$clubCheck = $db->prepare("SELECT id FROM clubs WHERE id = ?");
$clubCheck->execute([$clubId]);
if (!$clubCheck->fetch()) jsonResponse(['error' => 'Club not found'], 404);

$memCheck = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$memCheck->execute([$clubId, $me]);
$membership = $memCheck->fetch();
$isManager = $membership && in_array(strtolower($membership['role']), ['admin', 'owner']);

if (!$isManager && !isAdmin()) {
    jsonResponse(['error' => 'Only club managers and admins can post'], 403);
}

$stmt = $db->prepare("INSERT INTO club_posts (club_id, user_id, content) VALUES (?, ?, ?)");
$stmt->execute([$clubId, $me, $content]);

$postId = (int) $db->lastInsertId();

$club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
$club->execute([$clubId]);
$clubName = $club->fetch()['name'] ?? 'your club';
notifyActivity('new_club_post', $me, clubMemberIds($clubId), [
    'club_id' => $clubId,
    'post_id' => $postId,
    'club_name' => $clubName,
    'snippet' => $content,
]);

jsonResponse(['success' => true, 'message' => 'Post created', 'post_id' => $postId], 201);
