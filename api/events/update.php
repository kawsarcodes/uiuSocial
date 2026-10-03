<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$eventId = (int)($data['event_id'] ?? 0);
if (!$eventId) jsonResponse(['error' => 'Event ID required'], 400);
$db = getDB();
$me = getCurrentUserId();
$user = getCurrentUser();
$stmt = $db->prepare("SELECT * FROM events WHERE id = ?");
$stmt->execute([$eventId]);
$event = $stmt->fetch();
if (!$event) jsonResponse(['error' => 'Event not found'], 404);
$isAdmin = isAdmin($user) || isFaculty($user);
if ((int) $event['created_by'] !== (int) $me && !$isAdmin) jsonResponse(['error' => 'Not allowed'], 403);
$fields = [];
$params = [];
foreach (['title', 'description', 'category', 'event_date', 'event_time', 'location', 'event_type', 'organizer'] as $f) {
    if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
}
if (isset($data['max_attendees'])) { $fields[] = 'max_attendees = ?'; $params[] = (int)$data['max_attendees']; }
if (isset($data['registration_deadline'])) { $fields[] = 'registration_deadline = ?'; $params[] = $data['registration_deadline']; }
if ($fields) {
    $params[] = $eventId;
    $db->prepare("UPDATE events SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?")->execute($params);
}
jsonResponse(['success' => true, 'message' => 'Event updated']);
