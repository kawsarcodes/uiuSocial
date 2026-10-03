<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$clubId = (int)($data['club_id'] ?? 0);
$me = getCurrentUserId();
if (!$clubId) jsonResponse(['error' => 'Club ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$stmt->execute([$clubId, $me]);
$row = $stmt->fetch();
if (!$row) jsonResponse(['error' => 'Not a member'], 403);
$wasMember = $row['role'] === 'member';
$db->prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?")->execute([$clubId, $me]);
if ($wasMember) {
    $db->prepare("UPDATE clubs SET members_count = GREATEST(members_count - 1, 0) WHERE id = ?")->execute([$clubId]);
}
jsonResponse(['success' => true, 'message' => $wasMember ? 'Left club' : 'Join request cancelled']);