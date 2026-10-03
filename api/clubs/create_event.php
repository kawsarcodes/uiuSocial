<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$clubId = (int) ($_POST['club_id'] ?? 0);
if (!isClubManager($clubId)) jsonResponse(['error' => 'Only club owners and super admin can create events'], 403);

$title = trim($_POST['title'] ?? '');
if ($title === '') jsonResponse(['error' => 'Title is required'], 400);

$image = uploadImage('image', 'events');
if (!$image && !empty($_POST['image_url'])) $image = trim($_POST['image_url']);

$db = getDB();
$club = $db->prepare("SELECT name FROM clubs WHERE id = ?");
$club->execute([$clubId]);
$clubName = $club->fetch()['name'] ?? 'Club';

$stmt = $db->prepare("INSERT INTO events (title, description, category, event_date, event_time, location, image, event_type, organizer, created_by, club_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
$stmt->execute([
    $title,
    trim($_POST['description'] ?? ''),
    trim($_POST['category'] ?? 'workshop'),
    $_POST['event_date'] ?? null,
    $_POST['event_time'] ?? null,
    trim($_POST['location'] ?? ''),
    $image,
    $_POST['event_type'] ?? 'in_person',
    $clubName,
    getCurrentUserId(),
    $clubId
]);

jsonResponse(['success' => true, 'event_id' => $db->lastInsertId()], 201);
