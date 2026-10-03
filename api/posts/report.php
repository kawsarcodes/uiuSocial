<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$postId = (int) ($data['post_id'] ?? 0);
$reason = trim($data['reason'] ?? '');
$reasonLabel = trim($data['reason_label'] ?? $reason);
$details = trim($data['details'] ?? '');

if (!$postId || $reason === '') {
    jsonResponse(['error' => 'Post and reason are required'], 400);
}

$db = getDB();
$stmt = $db->prepare("SELECT id FROM posts WHERE id = ?");
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonResponse(['error' => 'Post not found'], 404);
}

$stmt = $db->prepare("INSERT INTO reports (post_id, reported_by, reason, reason_label, details, status) VALUES (?, ?, ?, ?, ?, 'pending')");
$stmt->execute([$postId, getCurrentUserId(), $reason, $reasonLabel, $details ?: null]);

notifyActivity('report', getCurrentUserId(), adminIds(), ['reason' => $reasonLabel]);
jsonResponse(['success' => true, 'message' => 'Report submitted']);
