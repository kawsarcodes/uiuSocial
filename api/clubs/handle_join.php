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
$action = $data['action'] ?? '';

if (!$clubId || !$userId || !in_array($action, ['approve', 'reject'])) {
    jsonResponse(['error' => 'Invalid parameters'], 400);
}

$me = getCurrentUserId();
if (!isClubManager($clubId, $me)) {
    jsonResponse(['error' => 'Not authorized'], 403);
}

$db = getDB();

// Check if request exists
$check = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$check->execute([$clubId, $userId]);
$row = $check->fetch();
if (!$row) jsonResponse(['error' => 'Join request not found'], 404);
if ($row['role'] !== 'requested') jsonResponse(['error' => 'Request already processed'], 400);

if ($action === 'approve') {
    $db->prepare("UPDATE club_members SET role = 'member' WHERE club_id = ? AND user_id = ?")->execute([$clubId, $userId]);
    $db->prepare("UPDATE clubs SET members_count = members_count + 1 WHERE id = ?")->execute([$clubId]);
    $club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
    $club->execute([$clubId]);
    $clubName = $club->fetch()['name'] ?? 'the club';
    notifyActivity('club_join_approved', $me, [$userId], ['club_id' => $clubId, 'club_name' => $clubName]);
    jsonResponse(['success' => true, 'status' => 'approved']);
} else {
    $db->prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?")->execute([$clubId, $userId]);
    $club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
    $club->execute([$clubId]);
    $clubName = $club->fetch()['name'] ?? 'the club';
    notifyActivity('club_join_rejected', $me, [$userId], ['club_id' => $clubId, 'club_name' => $clubName]);
    jsonResponse(['success' => true, 'status' => 'rejected']);
}