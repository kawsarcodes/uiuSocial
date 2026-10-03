<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = $_POST;
$name = trim($data['name'] ?? '');
if ($name === '') jsonResponse(['error' => 'Club name required'], 400);
$category = trim($data['category'] ?? 'General');
$image = uploadImage('image', 'clubs');
if (!$image && !empty($data['image_url'])) $image = trim($data['image_url']);
$db = getDB();
$stmt = $db->prepare("INSERT INTO clubs (name, slug, category, image, members_count, owner_id, founded) VALUES (?, ?, ?, ?, 1, ?, NOW())");
$slug = strtolower(preg_replace('/[^a-z0-9]+/', '-', $name));
$stmt->execute([$name, $slug, $category, $image ?: null, getCurrentUserId()]);
$clubId = $db->lastInsertId();
$db->prepare("INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, 'owner')")->execute([$clubId, getCurrentUserId()]);
jsonResponse(['success' => true, 'club_id' => $clubId], 201);
