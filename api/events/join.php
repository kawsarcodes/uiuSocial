<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$eventId = (int) ($data['event_id'] ?? 0);
$me = getCurrentUserId();
$db = getDB();

$exists = $db->prepare("SELECT id, title, created_by, club_id FROM events WHERE id = ?");
$exists->execute([$eventId]);
$event = $exists->fetch();
if (!$event) jsonResponse(['error' => 'Event not found'], 404);

$check = $db->prepare("SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ?");
$check->execute([$eventId, $me]);
if ($row = $check->fetch()) {
    $db->prepare("DELETE FROM event_rsvps WHERE id = ?")->execute([$row['id']]);
    $joined = false;
} else {
    $db->prepare("INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)")->execute([$eventId, $me]);
    $joined = true;
    notifyActivity('event_rsvp', $me, [$event['created_by']], [
        'event_id' => $eventId,
        'event_name' => $event['title'] ?? 'your event',
    ]);
}
$cnt = $db->prepare("SELECT COUNT(*) c FROM event_rsvps WHERE event_id = ?");
$cnt->execute([$eventId]);
jsonResponse(['success' => true, 'joined' => $joined, 'attendees' => (int) $cnt->fetch()['c']]);
