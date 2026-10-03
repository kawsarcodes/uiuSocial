<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$notifId = (int)($data['id'] ?? 0);
$me = getCurrentUserId();
if (!$notifId) jsonResponse(['error' => 'Notification ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT * FROM notifications WHERE id = ? AND user_id = ?");
$stmt->execute([$notifId, $me]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Notification not found'], 404);
$db->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")->execute([$notifId, $me]);
jsonResponse(['success' => true, 'message' => 'Notification deleted']);
