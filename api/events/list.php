<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();
$clubId = isset($_GET['club_id']) ? (int) $_GET['club_id'] : 0;
$campus = isset($_GET['campus']) && $_GET['campus'] === '1';
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;

$sql = "SELECT e.*,
        (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id) AS attendees_count,
        EXISTS(SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id AND r.user_id = ?) AS joined
        FROM events e";
$params = [$me];
$where = [];
if ($clubId) {
    $where[] = "e.club_id = ?";
    $params[] = $clubId;
} elseif ($campus) {
    $where[] = "e.club_id IS NULL";
} elseif (isset($_GET['club_latest'])) {
    $where[] = "e.club_id IS NOT NULL";
}
if ($where) $sql .= " WHERE " . implode(' AND ', $where);
$sql .= " ORDER BY e.event_date IS NULL, e.event_date ASC, e.created_at DESC LIMIT " . max(1, min($limit, 100));

$stmt = $db->prepare($sql);
$stmt->execute($params);
jsonResponse(['success' => true, 'events' => $stmt->fetchAll()]);
