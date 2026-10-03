<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$me = getCurrentUserId();
$db = getDB();
$stmt = $db->prepare("SELECT f.id, u.id, u.name, u.avatar, u.department, u.role FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC");
$stmt->execute([$me]);
jsonResponse(['success' => true, 'followers' => $stmt->fetchAll()]);
