<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$clubId = (int) ($_POST['club_id'] ?? 0);
if (!isClubManager($clubId)) jsonResponse(['error' => 'Only club owners and super admin can create announcements'], 403);

$title = trim($_POST['title'] ?? '');
$content = trim($_POST['content'] ?? '');
if ($title === '' || $content === '') jsonResponse(['error' => 'Title and content are required'], 400);

$db = getDB();
$me = getCurrentUserId();
$stmt = $db->prepare("INSERT INTO announcements (title, content, created_by, club_id) VALUES (?, ?, ?, ?)");
$stmt->execute([$title, $content, $me, $clubId]);
$announcementId = (int) $db->lastInsertId();

$club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
$club->execute([$clubId]);
notifyActivity('new_announcement', $me, clubMemberIds($clubId), [
    'club_id' => $clubId,
    'club_name' => $club->fetch()['name'] ?? 'your club',
    'snippet' => $title,
]);

jsonResponse(['success' => true, 'announcement_id' => $announcementId], 201);
