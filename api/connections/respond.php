<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$fromId = (int) ($data['user_id'] ?? 0);
$action = $data['action'] ?? 'accept';
$me = getCurrentUserId();

$db = getDB();
$stmt = $db->prepare("SELECT id, user_id FROM connections WHERE user_id = ? AND connected_user_id = ? AND status = 'pending'");
$stmt->execute([$fromId, $me]);
$row = $stmt->fetch();
if (!$row) jsonResponse(['error' => 'Request not found'], 404);

if ($action === 'accept') {
    $db->prepare("UPDATE connections SET status = 'accepted' WHERE id = ?")->execute([$row['id']]);
    notifyActivity('connection_accepted', $me, [$fromId]);
    jsonResponse(['success' => true, 'status' => 'connected']);
}

$db->prepare("DELETE FROM connections WHERE id = ?")->execute([$row['id']]);
notifyActivity('connection_declined', $me, [$fromId]);
jsonResponse(['success' => true, 'status' => 'declined']);
