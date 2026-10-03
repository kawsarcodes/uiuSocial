<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$eventId = (int)($data['event_id'] ?? 0);
if (!$eventId) jsonResponse(['error' => 'Event ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT id FROM events WHERE id = ?");
$stmt->execute([$eventId]);
if (!$stmt->fetch()) jsonResponse(['error' => 'Event not found'], 404);
$db->prepare("DELETE FROM event_rsvps WHERE event_id = ?")->execute([$eventId]);
$db->prepare("DELETE FROM events WHERE id = ?")->execute([$eventId]);
jsonResponse(['success' => true, 'message' => 'Event deleted']);
