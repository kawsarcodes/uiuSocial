<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$clubId = (int) ($data['club_id'] ?? 0);
$userId = (int) ($data['user_id'] ?? 0);

if (!$clubId || !$userId) jsonResponse(['error' => 'Invalid parameters'], 400);

$me = getCurrentUserId();
if (!isClubManager($clubId, $me)) {
    jsonResponse(['error' => 'Not authorized'], 403);
}

$db = getDB();

// Check target user's role
$check = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$check->execute([$clubId, $userId]);
$row = $check->fetch();
if (!$row) jsonResponse(['error' => 'Member not found'], 404);
if (in_array($row['role'], ['owner', 'admin'])) jsonResponse(['error' => 'Cannot remove admin/owner'], 400);

// Remove member
$db->prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?")->execute([$clubId, $userId]);
$db->prepare("UPDATE clubs SET members_count = GREATEST(members_count - 1, 0) WHERE id = ?")->execute([$clubId]);

$club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
$club->execute([$clubId]);
notifyActivity('club_removed', $me, [$userId], [
    'club_id' => $clubId,
    'club_name' => $club->fetch()['name'] ?? 'the club',
]);

jsonResponse(['success' => true]);