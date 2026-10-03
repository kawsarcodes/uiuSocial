<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? 'other');
if ($name === '') jsonResponse(['error' => 'Group name is required'], 400);

$image = uploadImage('image', 'groups');
if (!$image && !empty($_POST['image_url'])) $image = trim($_POST['image_url']);

$db = getDB();
$stmt = $db->prepare("INSERT INTO groups_table (name, description, image, category, members_count, created_by) VALUES (?, ?, ?, ?, 1, ?)");
$stmt->execute([$name, $description, $image, $category, getCurrentUserId()]);
$id = $db->lastInsertId();
$db->prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')")->execute([$id, getCurrentUserId()]);

jsonResponse(['success' => true, 'group_id' => $id], 201);
