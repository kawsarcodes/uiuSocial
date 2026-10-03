<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = (int) ($data['announcement_id'] ?? 0);
$me = getCurrentUserId();
$db = getDB();

$exists = $db->prepare("SELECT id, created_by, club_id, title FROM announcements WHERE id = ?");
$exists->execute([$id]);
$announcement = $exists->fetch();
if (!$announcement) jsonResponse(['error' => 'Not found'], 404);

$check = $db->prepare("SELECT id FROM announcement_likes WHERE announcement_id = ? AND user_id = ?");
$check->execute([$id, $me]);
if ($row = $check->fetch()) {
    $db->prepare("DELETE FROM announcement_likes WHERE id = ?")->execute([$row['id']]);
    $status = 'unliked';
} else {
    $db->prepare("INSERT INTO announcement_likes (announcement_id, user_id) VALUES (?, ?)")->execute([$id, $me]);
    $status = 'liked';
    notifyActivity('like_announcement', $me, [$announcement['created_by']], [
        'post_id' => (int) $id,
        'club_id' => $announcement['club_id'] ?? 0,
        'snippet' => $announcement['title'] ?? '',
        'item_name' => 'your announcement',
    ]);
}
$cnt = $db->prepare("SELECT COUNT(*) c FROM announcement_likes WHERE announcement_id = ?");
$cnt->execute([$id]);
jsonResponse(['success' => true, 'status' => $status, 'likes' => (int) $cnt->fetch()['c']]);
