<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Event ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT e.*, (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id) AS attendees, EXISTS(SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id AND r.user_id = ?) AS joined FROM events e WHERE e.id = ?");
$stmt->execute([getCurrentUserId(), $id]);
$event = $stmt->fetch();
if (!$event) jsonResponse(['error' => 'Event not found'], 404);
jsonResponse(['success' => true, 'event' => $event]);
