<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true) ?: $_GET;
$announcementId = (int) ($data['announcement_id'] ?? 0);
if (!$announcementId) {
    jsonResponse(['error' => 'Announcement ID required'], 400);
}

$db = getDB();
$stmt = $db->prepare("
    SELECT ac.id, ac.content as text, ac.created_at,
           u.id as author_id, u.name as author, u.avatar
    FROM announcement_comments ac
    JOIN users u ON u.id = ac.user_id
    WHERE ac.announcement_id = ?
    ORDER BY ac.created_at ASC
");
$stmt->execute([$announcementId]);
$comments = $stmt->fetchAll();

jsonResponse(['success' => true, 'comments' => $comments]);