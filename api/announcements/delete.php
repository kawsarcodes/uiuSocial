<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$annId = (int)($data['id'] ?? 0);
if (!$annId) jsonResponse(['error' => 'Announcement ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT club_id, created_by FROM announcements WHERE id = ?");
$stmt->execute([$annId]);
$ann = $stmt->fetch();
if (!$ann) jsonResponse(['error' => 'Announcement not found'], 404);
$isClubManager = $ann['club_id'] ? isClubManager($ann['club_id']) : false;
$isCreator = (int)($ann['created_by'] ?? 0) === (int) $me;
if (!$isClubManager && !isAdmin() && !isGroupModerator() && !$isCreator) jsonResponse(['error' => 'Not allowed'], 403);
$isAdminAction = (isAdmin() || isGroupModerator()) && !$isClubManager && !$isCreator;
$db->prepare("DELETE FROM announcement_comments WHERE announcement_id = ?")->execute([$annId]);
$db->prepare("DELETE FROM announcement_likes WHERE announcement_id = ?")->execute([$annId]);
$db->prepare("DELETE FROM announcements WHERE id = ?")->execute([$annId]);
if ($isAdminAction) {
    logAdminAction('delete_announcement', 'announcement', $annId, 'Removed an announcement outside its club');
    notifyUser((int) ($ann['created_by'] ?? 0), 'content_removed', 'Announcement removed by an administrator', 'An administrator removed one of your announcements.', 'index.html', getCurrentUserId());
}
jsonResponse(['success' => true, 'message' => 'Announcement deleted']);
