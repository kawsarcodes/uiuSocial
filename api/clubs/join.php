<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$clubId = (int) ($data['club_id'] ?? 0);
$db = getDB();
$c = $db->prepare("SELECT id, name, owner_id FROM clubs WHERE id = ?");
$c->execute([$clubId]);
$club = $c->fetch();
if (!$club) jsonResponse(['error' => 'Club not found'], 404);

$me = getCurrentUserId();
$check = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$check->execute([$clubId, $me]);
if ($row = $check->fetch()) {
    jsonResponse(['success' => true, 'status' => $row['role']]);
}

// Insert as 'requested' for approval
$db->prepare("INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, 'requested')")->execute([$clubId, $me]);
$ctx = ['club_id' => $clubId, 'club_name' => $club['name']];
notifyActivity('club_join_request', $me, [$club['owner_id']], $ctx);
notifyActivity('club_join_request', $me, adminIds(), $ctx);
jsonResponse(['success' => true, 'status' => 'requested']);