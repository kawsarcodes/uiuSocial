<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$title = trim($_POST['title'] ?? '');
if ($title === '') jsonResponse(['error' => 'Title is required'], 400);
$image = uploadImage('image', 'events');
if (!$image && !empty($_POST['image_url'])) $image = trim($_POST['image_url']);

$db = getDB();
$stmt = $db->prepare("INSERT INTO events (title, description, category, event_date, event_time, location, image, event_type, organizer, created_by, club_id) VALUES (?,?,?,?,?,?,?,?,?,?, NULL)");
$stmt->execute([
    $title,
    trim($_POST['description'] ?? ''),
    trim($_POST['category'] ?? 'seminar'),
    $_POST['event_date'] ?? null,
    $_POST['event_time'] ?? null,
    trim($_POST['location'] ?? ''),
    $image,
    $_POST['event_type'] ?? 'in_person',
    trim($_POST['organizer'] ?? 'UIU Administration'),
    getCurrentUserId()
]);
jsonResponse(['success' => true, 'event_id' => $db->lastInsertId()], 201);
