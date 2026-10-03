<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

if (!isGroupModerator()) {
    jsonResponse(['error' => 'Only faculty and admin can create announcements'], 403);
}

$title = trim($_POST['title'] ?? '');
$content = trim($_POST['content'] ?? '');
if ($title === '' || $content === '') {
    jsonResponse(['error' => 'Title and content are required'], 400);
}

$db = getDB();
$me = getCurrentUserId();
$stmt = $db->prepare("INSERT INTO announcements (title, content, created_by, club_id) VALUES (?, ?, ?, NULL)");
$stmt->execute([$title, $content, $me]);
$announcementId = (int) $db->lastInsertId();

notifyActivity('new_announcement', $me, [], [
    'announcement_id' => $announcementId,
    'announcement_title' => $title,
    'club_id' => 0,
]);

jsonResponse(['success' => true, 'announcement_id' => $announcementId], 201);
